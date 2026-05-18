import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { User, checkPermission, Permission } from './rbac';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.MAIN_TABLE!;

interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const TABLE_MAPPINGS: Record<string, { pk: string; name: string }> = {
  '0': { pk: 'USER', name: 'users' },
  '1': { pk: 'WORK_RECORD', name: 'work-records' },
  '2': { pk: 'INTERRUPTION_RECORD', name: 'interruption-records' },
  '3': { pk: 'WORK_ITEM', name: 'work-items' },
  '4': { pk: 'ANOMALY_LOG', name: 'anomaly-logs' }
};

function createResponse(statusCode: number, body: any): ApiResponse {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

function getUserFromEvent(event: APIGatewayProxyEvent): User {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return {
      id: payload.sub || payload.userId,
      role: payload.role || 'viewer',
      department: payload.department,
      position: payload.position
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

async function createAuditLog(action: string, resource: string, userId: string, details?: any): Promise<void> {
  const auditLog = {
    pk: 'AUDIT',
    sk: `${Date.now()}_${randomUUID()}`,
    action,
    resource,
    userId,
    details,
    timestamp: new Date().toISOString()
  };
  
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: auditLog
  }));
}

function validateRequired(item: any, requiredFields: string[]): string[] {
  const errors: string[] = [];
  for (const field of requiredFields) {
    if (!item[field]) {
      errors.push(`${field} is required`);
    }
  }
  return errors;
}

function addTimestamps(item: any, isUpdate = false): any {
  const now = new Date().toISOString();
  if (!isUpdate) {
    item.createdAt = now;
  }
  item.updatedAt = now;
  return item;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }

    const user = getUserFromEvent(event);
    const path = event.path;
    const method = event.httpMethod;
    const pathParams = event.pathParameters || {};

    // GET /resources
    if (method === 'GET' && path === '/resources') {
      checkPermission(user, 'work-items', 'read');
      
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'pk = :pk AND #active = :active',
        ExpressionAttributeNames: {
          '#active': 'active'
        },
        ExpressionAttributeValues: {
          ':pk': 'WORK_ITEM',
          ':active': true
        }
      });
      
      const result = await docClient.send(command);
      return createResponse(200, { items: result.Items || [] });
    }

    // Bulk import endpoints
    const bulkMatch = path.match(/^\/api\/(\d+)\/bulk$/);
    if (method === 'POST' && bulkMatch) {
      const tableIndex = bulkMatch[1];
      const tableConfig = TABLE_MAPPINGS[tableIndex];
      
      if (!tableConfig) {
        return createResponse(404, { error: 'Table not found' });
      }
      
      checkPermission(user, tableConfig.name, 'bulk');
      
      const body = JSON.parse(event.body || '{}');
      const items = body.items || [];
      
      if (!Array.isArray(items)) {
        return createResponse(400, { error: 'Items must be an array' });
      }
      
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];
      
      // Process in batches of 25 (DynamoDB limit)
      for (let i = 0; i < items.length; i += 25) {
        const batch = items.slice(i, i + 25);
        const writeRequests = [];
        
        for (const item of batch) {
          try {
            const processedItem = {
              ...item,
              pk: tableConfig.pk,
              sk: item.id || randomUUID(),
              id: item.id || randomUUID(),
              ...addTimestamps(item)
            };
            
            writeRequests.push({
              PutRequest: {
                Item: processedItem
              }
            });
          } catch (error) {
            failed++;
            errors.push(`Item ${i}: ${error}`);
          }
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
      
      await createAuditLog('BULK_IMPORT', tableConfig.name, user.id, { imported, failed });
      
      return createResponse(200, { imported, failed, errors });
    }

    // Table-specific CRUD operations
    const tableMatch = path.match(/^\/api\/(\d+)(?:\/(\w+))?$/);
    if (tableMatch) {
      const tableIndex = tableMatch[1];
      const itemId = tableMatch[2];
      const tableConfig = TABLE_MAPPINGS[tableIndex];
      
      if (!tableConfig) {
        return createResponse(404, { error: 'Table not found' });
      }
      
      // GET /api/{tableIndex} - List items
      if (method === 'GET' && !itemId) {
        checkPermission(user, tableConfig.name, 'read');
        
        const command = new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'pk = :pk',
          ExpressionAttributeValues: {
            ':pk': tableConfig.pk
          }
        });
        
        const result = await docClient.send(command);
        return createResponse(200, { items: result.Items || [] });
      }
      
      // GET /api/{tableIndex}/{id} - Get item
      if (method === 'GET' && itemId) {
        checkPermission(user, tableConfig.name, 'read');
        
        const command = new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            pk: tableConfig.pk,
            sk: itemId
          }
        });
        
        const result = await docClient.send(command);
        if (!result.Item) {
          return createResponse(404, { error: 'Item not found' });
        }
        
        return createResponse(200, result.Item);
      }
      
      // POST /api/{tableIndex} - Create item
      if (method === 'POST' && !itemId) {
        checkPermission(user, tableConfig.name, 'create');
        
        const body = JSON.parse(event.body || '{}');
        const id = randomUUID();
        
        const item = {
          ...body,
          pk: tableConfig.pk,
          sk: id,
          id,
          createdBy: user.id,
          ...addTimestamps(body)
        };
        
        // Basic validation based on table type
        let requiredFields: string[] = [];
        switch (tableConfig.pk) {
          case 'USER':
            requiredFields = ['username', 'passwordHash', 'fullName', 'permissionLevel', 'active'];
            break;
          case 'WORK_RECORD':
            requiredFields = ['workerId', 'workDate', 'startTime', 'projectName', 'workLocation', 'workType', 'workContent', 'progressStatus', 'approvalStatus'];
            break;
          case 'INTERRUPTION_RECORD':
            requiredFields = ['workRecordId', 'interruptionStartTime', 'reasonCategory', 'responseStatus', 'recorderId'];
            break;
          case 'WORK_ITEM':
            requiredFields = ['workItemCode', 'workItemName', 'displayOrder', 'active'];
            break;
          case 'ANOMALY_LOG':
            requiredFields = ['targetTable', 'targetRecordId', 'userId', 'anomalyType', 'detectedField', 'detectedValue', 'threshold', 'severity', 'confirmationStatus', 'notificationSent'];
            break;
        }
        
        const validationErrors = validateRequired(item, requiredFields);
        if (validationErrors.length > 0) {
          return createResponse(400, { errors: validationErrors });
        }
        
        const command = new PutCommand({
          TableName: TABLE_NAME,
          Item: item
        });
        
        await docClient.send(command);
        await createAuditLog('CREATE', tableConfig.name, user.id, { itemId: id });
        
        return createResponse(201, item);
      }
      
      // PUT /api/{tableIndex}/{id} - Update item
      if (method === 'PUT' && itemId) {
        checkPermission(user, tableConfig.name, 'update');
        
        const body = JSON.parse(event.body || '{}');
        
        // Check if item exists
        const getCommand = new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            pk: tableConfig.pk,
            sk: itemId
          }
        });
        
        const existingItem = await docClient.send(getCommand);
        if (!existingItem.Item) {
          return createResponse(404, { error: 'Item not found' });
        }
        
        const updatedItem = {
          ...existingItem.Item,
          ...body,
          pk: tableConfig.pk,
          sk: itemId,
          id: itemId,
          ...addTimestamps(body, true)
        };
        
        const command = new PutCommand({
          TableName: TABLE_NAME,
          Item: updatedItem
        });
        
        await docClient.send(command);
        await createAuditLog('UPDATE', tableConfig.name, user.id, { itemId });
        
        return createResponse(200, updatedItem);
      }
      
      // DELETE /api/{tableIndex}/{id} - Delete item
      if (method === 'DELETE' && itemId) {
        checkPermission(user, tableConfig.name, 'delete');
        
        const command = new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            pk: tableConfig.pk,
            sk: itemId
          },
          ReturnValues: 'ALL_OLD'
        });
        
        const result = await docClient.send(command);
        if (!result.Attributes) {
          return createResponse(404, { error: 'Item not found' });
        }
        
        await createAuditLog('DELETE', tableConfig.name, user.id, { itemId });
        
        return createResponse(200, { message: 'Item deleted successfully' });
      }
    }
    
    return createResponse(404, { error: 'Endpoint not found' });
    
  } catch (error: any) {
    console.error('API Error:', error);
    
    if (error.message.includes('Insufficient permissions')) {
      return createResponse(403, { error: 'Forbidden' });
    }
    
    if (error.message.includes('Missing authorization') || error.message.includes('Invalid token')) {
      return createResponse(401, { error: 'Unauthorized' });
    }
    
    return createResponse(500, { error: 'Internal server error' });
  }
};