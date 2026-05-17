import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAuthHeader, requirePermission, User } from './rbac';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.MAIN_TABLE!;

interface ResourceConfig {
  name: string;
  pkPrefix: string;
  requiredFields: string[];
}

const RESOURCES: Record<string, ResourceConfig> = {
  '0': { name: 'users', pkPrefix: 'USER#', requiredFields: ['username', 'passwordHash', 'fullName', 'permissionLevel', 'isActive', 'createdBy'] },
  '1': { name: 'work-records', pkPrefix: 'WORK#', requiredFields: ['workerId', 'workDate', 'startTime', 'projectName', 'workLocation', 'workType', 'workContent', 'progressStatus', 'approvalStatus', 'createdById'] },
  '2': { name: 'interruption-records', pkPrefix: 'INT#', requiredFields: ['workRecordId', 'startTime', 'reasonCategory', 'status', 'recorderId'] },
  '3': { name: 'work-items', pkPrefix: 'ITEM#', requiredFields: ['itemCode', 'itemName', 'displayOrder', 'isActive', 'createdById', 'updatedById'] },
  '4': { name: 'anomaly-logs', pkPrefix: 'ANOM#', requiredFields: ['targetTable', 'targetRecordId', 'userId', 'anomalyType', 'detectedField', 'detectedValue', 'threshold', 'severity', 'confirmationStatus', 'notificationSent'] }
};

function createResponse(statusCode: number, body: any): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify(body)
  };
}

async function createAuditLog(user: User, action: string, resource: string, details: any): Promise<void> {
  const auditLog = {
    pk: 'AUDIT',
    sk: `${Date.now()}#${randomUUID()}`,
    userId: user.id,
    action,
    resource,
    details,
    timestamp: new Date().toISOString()
  };
  
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: auditLog
  }));
}

function validateRequiredFields(item: any, requiredFields: string[]): string[] {
  const errors: string[] = [];
  for (const field of requiredFields) {
    if (item[field] === undefined || item[field] === null || item[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }
  return errors;
}

function addTimestamps(item: any, isUpdate: boolean = false): any {
  const now = new Date().toISOString();
  if (!isUpdate) {
    item.createdAt = now;
  }
  item.updatedAt = now;
  return item;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const path = event.path;
    const method = event.httpMethod;
    
    if (method === 'OPTIONS') {
      return createResponse(200, {});
    }

    if (path === '/resources') {
      return createResponse(200, {
        resources: Object.entries(RESOURCES).map(([index, config]) => ({
          index,
          name: config.name,
          endpoint: `/api/${index}`
        }))
      });
    }

    let user: User;
    try {
      user = parseAuthHeader(event.headers.Authorization || event.headers.authorization);
    } catch (error) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    const pathParts = path.split('/').filter(p => p);
    
    if (pathParts.length < 2 || pathParts[0] !== 'api') {
      return createResponse(404, { error: 'Not found' });
    }

    const resourceIndex = pathParts[1];
    const resourceConfig = RESOURCES[resourceIndex];
    
    if (!resourceConfig) {
      return createResponse(404, { error: 'Resource not found' });
    }

    const isBulkEndpoint = pathParts[2] === 'bulk';
    const itemId = pathParts[2] && !isBulkEndpoint ? pathParts[2] : null;

    try {
      if (isBulkEndpoint && method === 'POST') {
        requirePermission(user, resourceConfig.name, 'bulk');
        
        const body = JSON.parse(event.body || '{}');
        if (!body.items || !Array.isArray(body.items)) {
          return createResponse(400, { error: 'Invalid request body. Expected { items: [] }' });
        }

        let imported = 0;
        let failed = 0;
        const errors: string[] = [];

        // Process in batches of 25 (DynamoDB BatchWrite limit)
        for (let i = 0; i < body.items.length; i += 25) {
          const batch = body.items.slice(i, i + 25);
          const writeRequests = [];

          for (const item of batch) {
            const validationErrors = validateRequiredFields(item, resourceConfig.requiredFields);
            if (validationErrors.length > 0) {
              errors.push(...validationErrors);
              failed++;
              continue;
            }

            const processedItem = {
              ...item,
              pk: `${resourceConfig.pkPrefix}${item.id || randomUUID()}`,
              sk: item.id || randomUUID(),
              id: item.id || randomUUID()
            };
            
            addTimestamps(processedItem);
            
            writeRequests.push({
              PutRequest: {
                Item: processedItem
              }
            });
          }

          if (writeRequests.length > 0) {
            try {
              await docClient.send(new BatchWriteCommand({
                RequestItems: {
                  [TABLE_NAME]: writeRequests
                }
              }));
              imported += writeRequests.length;
            } catch (error) {
              failed += writeRequests.length;
              errors.push(`Batch write failed: ${error}`);
            }
          }
        }

        await createAuditLog(user, 'BULK_IMPORT', resourceConfig.name, { imported, failed, total: body.items.length });
        
        return createResponse(200, { imported, failed, errors });
      }

      switch (method) {
        case 'GET':
          requirePermission(user, resourceConfig.name, 'read');
          
          if (itemId) {
            const result = await docClient.send(new GetCommand({
              TableName: TABLE_NAME,
              Key: {
                pk: `${resourceConfig.pkPrefix}${itemId}`,
                sk: itemId
              }
            }));
            
            if (!result.Item) {
              return createResponse(404, { error: 'Item not found' });
            }
            
            return createResponse(200, result.Item);
          } else {
            const result = await docClient.send(new ScanCommand({
              TableName: TABLE_NAME,
              FilterExpression: 'begins_with(pk, :prefix)',
              ExpressionAttributeValues: {
                ':prefix': resourceConfig.pkPrefix
              }
            }));
            
            return createResponse(200, { items: result.Items || [] });
          }

        case 'POST':
          requirePermission(user, resourceConfig.name, 'create');
          
          const createBody = JSON.parse(event.body || '{}');
          const createValidationErrors = validateRequiredFields(createBody, resourceConfig.requiredFields);
          
          if (createValidationErrors.length > 0) {
            return createResponse(400, { errors: createValidationErrors });
          }
          
          const newId = randomUUID();
          const newItem = {
            ...createBody,
            pk: `${resourceConfig.pkPrefix}${newId}`,
            sk: newId,
            id: newId
          };
          
          addTimestamps(newItem);
          
          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: newItem
          }));
          
          await createAuditLog(user, 'CREATE', resourceConfig.name, { id: newId });
          
          return createResponse(201, newItem);

        case 'PUT':
          if (!itemId) {
            return createResponse(400, { error: 'Item ID required for update' });
          }
          
          requirePermission(user, resourceConfig.name, 'update');
          
          const updateBody = JSON.parse(event.body || '{}');
          const updateValidationErrors = validateRequiredFields(updateBody, resourceConfig.requiredFields);
          
          if (updateValidationErrors.length > 0) {
            return createResponse(400, { errors: updateValidationErrors });
          }
          
          const updatedItem = {
            ...updateBody,
            pk: `${resourceConfig.pkPrefix}${itemId}`,
            sk: itemId,
            id: itemId
          };
          
          addTimestamps(updatedItem, true);
          
          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: updatedItem
          }));
          
          await createAuditLog(user, 'UPDATE', resourceConfig.name, { id: itemId });
          
          return createResponse(200, updatedItem);

        case 'DELETE':
          if (!itemId) {
            return createResponse(400, { error: 'Item ID required for deletion' });
          }
          
          requirePermission(user, resourceConfig.name, 'delete');
          
          await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
              pk: `${resourceConfig.pkPrefix}${itemId}`,
              sk: itemId
            }
          }));
          
          await createAuditLog(user, 'DELETE', resourceConfig.name, { id: itemId });
          
          return createResponse(200, { message: 'Item deleted successfully' });

        default:
          return createResponse(405, { error: 'Method not allowed' });
      }
    } catch (permissionError) {
      return createResponse(403, { error: 'Forbidden: ' + permissionError.message });
    }
  } catch (error) {
    console.error('Handler error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};