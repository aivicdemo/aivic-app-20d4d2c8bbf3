import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { checkPermission, User } from './rbac';
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
  '4': { name: 'anomaly-logs', pkPrefix: 'ANOM#', requiredFields: ['targetTable', 'targetRecordId', 'userId', 'anomalyType', 'detectedField', 'detectedValue', 'threshold', 'severity', 'confirmationStatus', 'notificationSent', 'detectedAt'] }
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

function getUserFromEvent(event: APIGatewayProxyEvent): User {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) {
    throw new Error('Authorization header required');
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

async function createAuditLog(action: string, resource: string, userId: string, details: any): Promise<void> {
  const auditLog = {
    pk: 'AUDIT',
    sk: `${Date.now()}#${randomUUID()}`,
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

function validateRequiredFields(item: any, requiredFields: string[]): string[] {
  const errors: string[] = [];
  for (const field of requiredFields) {
    if (item[field] === undefined || item[field] === null || item[field] === '') {
      errors.push(`Field '${field}' is required`);
    }
  }
  return errors;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const path = event.path;
    const method = event.httpMethod;
    
    if (method === 'OPTIONS') {
      return createResponse(200, {});
    }

    if (path === '/resources' && method === 'GET') {
      return createResponse(200, {
        resources: Object.entries(RESOURCES).map(([index, config]) => ({
          index,
          name: config.name,
          requiredFields: config.requiredFields
        }))
      });
    }

    const pathMatch = path.match(/^\/api\/(\d+)(?:\/(bulk|[^/]+))?$/);
    if (!pathMatch) {
      return createResponse(404, { error: 'Endpoint not found' });
    }

    const [, tableIndex, pathParam] = pathMatch;
    const resource = RESOURCES[tableIndex];
    if (!resource) {
      return createResponse(404, { error: 'Resource not found' });
    }

    let user: User;
    try {
      user = getUserFromEvent(event);
    } catch (error) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    // Bulk import endpoint
    if (pathParam === 'bulk' && method === 'POST') {
      try {
        checkPermission(user, resource.name, 'bulk');
      } catch (error) {
        return createResponse(403, { error: error.message });
      }

      const body = JSON.parse(event.body || '{}');
      if (!body.items || !Array.isArray(body.items)) {
        return createResponse(400, { error: 'Request body must contain items array' });
      }

      let imported = 0;
      let failed = 0;
      const errors: string[] = [];
      const now = new Date().toISOString();

      // Process in batches of 25 (DynamoDB BatchWrite limit)
      for (let i = 0; i < body.items.length; i += 25) {
        const batch = body.items.slice(i, i + 25);
        const writeRequests = [];

        for (const item of batch) {
          const validationErrors = validateRequiredFields(item, resource.requiredFields);
          if (validationErrors.length > 0) {
            failed++;
            errors.push(`Item ${i + batch.indexOf(item)}: ${validationErrors.join(', ')}`);
            continue;
          }

          const id = item.id || randomUUID();
          const enrichedItem = {
            ...item,
            pk: `${resource.pkPrefix}${id}`,
            sk: id,
            id,
            createdAt: now,
            updatedAt: now
          };

          writeRequests.push({
            PutRequest: {
              Item: enrichedItem
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
            errors.push(`Batch write failed: ${error.message}`);
          }
        }
      }

      await createAuditLog('BULK_IMPORT', resource.name, user.id, { imported, failed, total: body.items.length });

      return createResponse(200, { imported, failed, errors });
    }

    // CRUD operations
    switch (method) {
      case 'GET':
        try {
          checkPermission(user, resource.name, 'read');
        } catch (error) {
          return createResponse(403, { error: error.message });
        }

        if (pathParam && pathParam !== 'bulk') {
          // Get single item
          const result = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
              pk: `${resource.pkPrefix}${pathParam}`,
              sk: pathParam
            }
          }));

          if (!result.Item) {
            return createResponse(404, { error: 'Item not found' });
          }

          return createResponse(200, result.Item);
        } else {
          // List items
          const result = await docClient.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(pk, :prefix)',
            ExpressionAttributeValues: {
              ':prefix': resource.pkPrefix
            }
          }));

          return createResponse(200, {
            items: result.Items || [],
            count: result.Count || 0
          });
        }

      case 'POST':
        try {
          checkPermission(user, resource.name, 'create');
        } catch (error) {
          return createResponse(403, { error: error.message });
        }

        const createBody = JSON.parse(event.body || '{}');
        const createValidationErrors = validateRequiredFields(createBody, resource.requiredFields);
        if (createValidationErrors.length > 0) {
          return createResponse(400, { error: 'Validation failed', details: createValidationErrors });
        }

        const newId = createBody.id || randomUUID();
        const now = new Date().toISOString();
        const newItem = {
          ...createBody,
          pk: `${resource.pkPrefix}${newId}`,
          sk: newId,
          id: newId,
          createdAt: now,
          updatedAt: now
        };

        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: newItem
        }));

        await createAuditLog('CREATE', resource.name, user.id, { id: newId });

        return createResponse(201, newItem);

      case 'PUT':
        if (!pathParam || pathParam === 'bulk') {
          return createResponse(400, { error: 'ID required for update' });
        }

        try {
          checkPermission(user, resource.name, 'update');
        } catch (error) {
          return createResponse(403, { error: error.message });
        }

        const updateBody = JSON.parse(event.body || '{}');
        const updateValidationErrors = validateRequiredFields(updateBody, resource.requiredFields);
        if (updateValidationErrors.length > 0) {
          return createResponse(400, { error: 'Validation failed', details: updateValidationErrors });
        }

        const existingItem = await docClient.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            pk: `${resource.pkPrefix}${pathParam}`,
            sk: pathParam
          }
        }));

        if (!existingItem.Item) {
          return createResponse(404, { error: 'Item not found' });
        }

        const updatedItem = {
          ...existingItem.Item,
          ...updateBody,
          updatedAt: new Date().toISOString()
        };

        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: updatedItem
        }));

        await createAuditLog('UPDATE', resource.name, user.id, { id: pathParam });

        return createResponse(200, updatedItem);

      case 'DELETE':
        if (!pathParam || pathParam === 'bulk') {
          return createResponse(400, { error: 'ID required for delete' });
        }

        try {
          checkPermission(user, resource.name, 'delete');
        } catch (error) {
          return createResponse(403, { error: error.message });
        }

        const deleteItem = await docClient.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            pk: `${resource.pkPrefix}${pathParam}`,
            sk: pathParam
          }
        }));

        if (!deleteItem.Item) {
          return createResponse(404, { error: 'Item not found' });
        }

        await docClient.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            pk: `${resource.pkPrefix}${pathParam}`,
            sk: pathParam
          }
        }));

        await createAuditLog('DELETE', resource.name, user.id, { id: pathParam });

        return createResponse(200, { message: 'Item deleted successfully' });

      default:
        return createResponse(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { error: 'Internal server error', message: error.message });
  }
};