import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { hasPermission, extractUserFromEvent, User } from './rbac';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.MAIN_TABLE || 'WorkRecordApp';

interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  pathParameters?: { [key: string]: string };
  queryStringParameters?: { [key: string]: string };
  body?: string;
  headers?: { [key: string]: string };
}

interface APIGatewayResponse {
  statusCode: number;
  headers?: { [key: string]: string };
  body: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

function createResponse(statusCode: number, body: any): APIGatewayResponse {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

function createAuditLog(user: User, action: string, resource: string, details?: any) {
  return {
    pk: 'AUDIT',
    sk: `${Date.now()}_${randomUUID()}`,
    userId: user.id,
    userName: user.name,
    action,
    resource,
    details,
    timestamp: new Date().toISOString()
  };
}

function validateRequired(data: any, fields: string[]): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  }
  return errors;
}

function getTableConfig(tableIndex: string) {
  const configs = {
    'users': {
      pk: 'USER',
      name: 'ユーザー',
      requiredFields: ['userName', 'passwordHash', 'fullName', 'permissionLevel', 'isActive', 'createdBy']
    },
    'work-records': {
      pk: 'WORK_RECORD',
      name: '作業記録',
      requiredFields: ['workerId', 'workDate', 'startTime', 'projectName', 'workLocation', 'workType', 'workContent', 'progressStatus', 'approvalStatus', 'createdById']
    },
    'interruption-records': {
      pk: 'INTERRUPTION',
      name: '中断記録',
      requiredFields: ['workRecordId', 'interruptionStartTime', 'reasonCategory', 'responseStatus', 'recorderId']
    },
    'work-items': {
      pk: 'WORK_ITEM',
      name: '作業項目マスタ',
      requiredFields: ['workItemCode', 'workItemName', 'displayOrder', 'isActive', 'createdById', 'updatedById']
    },
    'anomaly-logs': {
      pk: 'ANOMALY_LOG',
      name: '異常値検出ログ',
      requiredFields: ['targetTable', 'targetRecordId', 'userId', 'anomalyType', 'detectionItem', 'detectionValue', 'threshold', 'severity', 'confirmationStatus', 'notificationSent', 'detectionTime']
    }
  };
  return configs[tableIndex as keyof typeof configs];
}

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayResponse> => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }

    let user: User;
    try {
      user = extractUserFromEvent(event);
    } catch (error) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    const path = event.path;
    const method = event.httpMethod;
    const pathParts = path.split('/').filter(p => p);

    // GET /resources
    if (method === 'GET' && path === '/resources') {
      if (!hasPermission(user, 'resources', 'read')) {
        return createResponse(403, { error: 'Forbidden' });
      }

      try {
        const command = new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(pk, :pk)',
          ExpressionAttributeValues: {
            ':pk': 'RESOURCE'
          }
        });
        const result = await docClient.send(command);
        return createResponse(200, { items: result.Items || [] });
      } catch (error) {
        return createResponse(500, { error: 'Internal server error' });
      }
    }

    // Bulk import endpoints: POST /api/{tableIndex}/bulk
    if (method === 'POST' && pathParts.length === 3 && pathParts[0] === 'api' && pathParts[2] === 'bulk') {
      const tableIndex = pathParts[1];
      const tableConfig = getTableConfig(tableIndex);
      
      if (!tableConfig) {
        return createResponse(404, { error: 'Table not found' });
      }

      if (!hasPermission(user, tableIndex, 'bulk')) {
        return createResponse(403, { error: 'Forbidden' });
      }

      let requestBody;
      try {
        requestBody = JSON.parse(event.body || '{}');
      } catch (error) {
        return createResponse(400, { error: 'Invalid JSON' });
      }

      if (!requestBody.items || !Array.isArray(requestBody.items)) {
        return createResponse(400, { error: 'items array is required' });
      }

      const items = requestBody.items;
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process in batches of 25 (DynamoDB BatchWrite limit)
      for (let i = 0; i < items.length; i += 25) {
        const batch = items.slice(i, i + 25);
        const putRequests = [];

        for (const item of batch) {
          const validationErrors = validateRequired(item, tableConfig.requiredFields);
          if (validationErrors.length > 0) {
            failed++;
            errors.push(`Item ${i + batch.indexOf(item)}: ${validationErrors.join(', ')}`);
            continue;
          }

          const now = new Date().toISOString();
          const enrichedItem = {
            ...item,
            pk: tableConfig.pk,
            sk: item.id || randomUUID(),
            id: item.id || randomUUID(),
            createdAt: now,
            updatedAt: now
          };

          putRequests.push({
            PutRequest: {
              Item: enrichedItem
            }
          });
        }

        if (putRequests.length > 0) {
          try {
            const batchCommand = new BatchWriteCommand({
              RequestItems: {
                [TABLE_NAME]: putRequests
              }
            });
            await docClient.send(batchCommand);
            imported += putRequests.length;
          } catch (error) {
            failed += putRequests.length;
            errors.push(`Batch write failed: ${error}`);
          }
        }
      }

      // Create audit log
      try {
        const auditLog = createAuditLog(user, 'BULK_IMPORT', tableConfig.name, {
          totalItems: items.length,
          imported,
          failed
        });
        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: auditLog
        }));
      } catch (error) {
        // Audit log failure shouldn't fail the main operation
      }

      return createResponse(200, { imported, failed, errors });
    }

    // Table-specific CRUD operations: /api/{tableIndex}
    if (pathParts.length >= 2 && pathParts[0] === 'api') {
      const tableIndex = pathParts[1];
      const tableConfig = getTableConfig(tableIndex);
      
      if (!tableConfig) {
        return createResponse(404, { error: 'Table not found' });
      }

      const itemId = pathParts[2];

      // GET /api/{tableIndex} - List items
      if (method === 'GET' && !itemId) {
        if (!hasPermission(user, tableIndex, 'read')) {
          return createResponse(403, { error: 'Forbidden' });
        }

        try {
          const command = new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'pk = :pk',
            ExpressionAttributeValues: {
              ':pk': tableConfig.pk
            }
          });
          const result = await docClient.send(command);
          return createResponse(200, { items: result.Items || [] });
        } catch (error) {
          return createResponse(500, { error: 'Internal server error' });
        }
      }

      // GET /api/{tableIndex}/{id} - Get item by ID
      if (method === 'GET' && itemId) {
        if (!hasPermission(user, tableIndex, 'read')) {
          return createResponse(403, { error: 'Forbidden' });
        }

        try {
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
        } catch (error) {
          return createResponse(500, { error: 'Internal server error' });
        }
      }

      // POST /api/{tableIndex} - Create item
      if (method === 'POST' && !itemId) {
        if (!hasPermission(user, tableIndex, 'create')) {
          return createResponse(403, { error: 'Forbidden' });
        }

        let requestBody;
        try {
          requestBody = JSON.parse(event.body || '{}');
        } catch (error) {
          return createResponse(400, { error: 'Invalid JSON' });
        }

        const validationErrors = validateRequired(requestBody, tableConfig.requiredFields);
        if (validationErrors.length > 0) {
          return createResponse(400, { error: 'Validation failed', details: validationErrors });
        }

        const now = new Date().toISOString();
        const newItem = {
          ...requestBody,
          pk: tableConfig.pk,
          sk: randomUUID(),
          id: randomUUID(),
          createdAt: now,
          updatedAt: now
        };

        try {
          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: newItem
          }));

          // Create audit log
          const auditLog = createAuditLog(user, 'CREATE', tableConfig.name, { itemId: newItem.id });
          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: auditLog
          }));

          return createResponse(201, newItem);
        } catch (error) {
          return createResponse(500, { error: 'Internal server error' });
        }
      }

      // PUT /api/{tableIndex}/{id} - Update item
      if (method === 'PUT' && itemId) {
        if (!hasPermission(user, tableIndex, 'update')) {
          return createResponse(403, { error: 'Forbidden' });
        }

        let requestBody;
        try {
          requestBody = JSON.parse(event.body || '{}');
        } catch (error) {
          return createResponse(400, { error: 'Invalid JSON' });
        }

        // Check if item exists
        try {
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
            ...requestBody,
            pk: tableConfig.pk,
            sk: itemId,
            updatedAt: new Date().toISOString()
          };

          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: updatedItem
          }));

          // Create audit log
          const auditLog = createAuditLog(user, 'UPDATE', tableConfig.name, { itemId });
          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: auditLog
          }));

          return createResponse(200, updatedItem);
        } catch (error) {
          return createResponse(500, { error: 'Internal server error' });
        }
      }

      // DELETE /api/{tableIndex}/{id} - Delete item
      if (method === 'DELETE' && itemId) {
        if (!hasPermission(user, tableIndex, 'delete')) {
          return createResponse(403, { error: 'Forbidden' });
        }

        try {
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

          await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
              pk: tableConfig.pk,
              sk: itemId
            }
          }));

          // Create audit log
          const auditLog = createAuditLog(user, 'DELETE', tableConfig.name, { itemId });
          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: auditLog
          }));

          return createResponse(200, { message: 'Item deleted successfully' });
        } catch (error) {
          return createResponse(500, { error: 'Internal server error' });
        }
      }
    }

    return createResponse(404, { error: 'Endpoint not found' });

  } catch (error) {
    console.error('Handler error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};