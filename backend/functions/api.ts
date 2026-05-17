import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { hasPermission, extractUserFromEvent, User } from './rbac';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.MAIN_TABLE!;

interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  pathParameters?: { [key: string]: string };
  queryStringParameters?: { [key: string]: string };
  body?: string;
  headers: { [key: string]: string };
}

interface APIGatewayResponse {
  statusCode: number;
  headers: { [key: string]: string };
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

function validateRequired(data: any, fields: string[]): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  }
  return errors;
}

async function createAuditLog(user: User, action: string, resource: string, details: any = {}) {
  const auditLog = {
    pk: 'AUDIT',
    sk: `${Date.now()}_${randomUUID()}`,
    userId: user.userId,
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

function getTablePrefix(tableIndex: string): string {
  const tableMap: { [key: string]: string } = {
    '1': 'USER',
    '2': 'WORK_RECORD',
    '3': 'INTERRUPTION',
    '4': 'WORK_ITEM',
    '5': 'ANOMALY_LOG'
  };
  return tableMap[tableIndex] || 'UNKNOWN';
}

function getRequiredFields(tableIndex: string): string[] {
  const fieldMap: { [key: string]: string[] } = {
    '1': ['userName', 'passwordHash', 'fullName', 'permissionLevel', 'isActive', 'createdBy'],
    '2': ['workerId', 'workDate', 'startTime', 'projectName', 'workLocation', 'workType', 'workContent', 'progressStatus', 'approvalStatus', 'createdById'],
    '3': ['workRecordId', 'interruptionStartTime', 'reasonCategory', 'responseStatus', 'recorderId'],
    '4': ['workItemCode', 'workItemName', 'displayOrder', 'isActive', 'createdById', 'updatedById'],
    '5': ['targetTable', 'targetRecordId', 'userId', 'anomalyType', 'detectionItem', 'detectionValue', 'threshold', 'severity', 'confirmationStatus', 'notificationSent']
  };
  return fieldMap[tableIndex] || [];
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
    
    // GET /resources
    if (method === 'GET' && path === '/resources') {
      if (!hasPermission(user, 'resources', 'read')) {
        return createResponse(403, { error: 'Forbidden' });
      }

      try {
        const resources = {
          tables: [
            { id: '1', name: 'ユーザー', prefix: 'USER' },
            { id: '2', name: '作業記録', prefix: 'WORK_RECORD' },
            { id: '3', name: '中断記録', prefix: 'INTERRUPTION' },
            { id: '4', name: '作業項目マスタ', prefix: 'WORK_ITEM' },
            { id: '5', name: '異常値検出ログ', prefix: 'ANOMALY_LOG' }
          ],
          permissions: {
            canCreate: hasPermission(user, '*', 'create'),
            canUpdate: hasPermission(user, '*', 'update'),
            canDelete: hasPermission(user, '*', 'delete'),
            canBulk: hasPermission(user, '*', 'bulk')
          }
        };
        
        return createResponse(200, resources);
      } catch (error) {
        return createResponse(500, { error: 'Internal server error' });
      }
    }

    // Bulk import endpoints: POST /api/{tableIndex}/bulk
    const bulkMatch = path.match(/^\/api\/(\d+)\/bulk$/);
    if (method === 'POST' && bulkMatch) {
      const tableIndex = bulkMatch[1];
      
      if (!hasPermission(user, 'bulk', 'bulk')) {
        return createResponse(403, { error: 'Forbidden' });
      }

      try {
        const body = JSON.parse(event.body || '{}');
        const items = body.items || [];
        
        if (!Array.isArray(items)) {
          return createResponse(400, { error: 'items must be an array' });
        }

        const tablePrefix = getTablePrefix(tableIndex);
        const requiredFields = getRequiredFields(tableIndex);
        const now = new Date().toISOString();
        let imported = 0;
        let failed = 0;
        const errors: string[] = [];

        // Process in batches of 25 (DynamoDB BatchWrite limit)
        for (let i = 0; i < items.length; i += 25) {
          const batch = items.slice(i, i + 25);
          const writeRequests = [];

          for (const item of batch) {
            const validationErrors = validateRequired(item, requiredFields);
            if (validationErrors.length > 0) {
              failed++;
              errors.push(`Item ${i + batch.indexOf(item)}: ${validationErrors.join(', ')}`);
              continue;
            }

            const processedItem = {
              ...item,
              pk: tablePrefix,
              sk: item.id || randomUUID(),
              id: item.id || randomUUID(),
              createdAt: now,
              updatedAt: now
            };

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

        await createAuditLog(user, 'BULK_IMPORT', tablePrefix, { imported, failed, total: items.length });

        return createResponse(200, { imported, failed, errors });
      } catch (error) {
        return createResponse(400, { error: 'Invalid JSON body' });
      }
    }

    // Table-specific CRUD operations: /api/{tableIndex}
    const tableMatch = path.match(/^\/api\/(\d+)(?:\/(\w+))?$/);
    if (tableMatch) {
      const tableIndex = tableMatch[1];
      const itemId = tableMatch[2];
      const tablePrefix = getTablePrefix(tableIndex);
      const requiredFields = getRequiredFields(tableIndex);

      // GET /api/{tableIndex} - List items
      if (method === 'GET' && !itemId) {
        if (!hasPermission(user, tablePrefix, 'read')) {
          return createResponse(403, { error: 'Forbidden' });
        }

        try {
          const result = await docClient.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'pk = :pk',
            ExpressionAttributeValues: {
              ':pk': tablePrefix
            }
          }));

          return createResponse(200, { items: result.Items || [] });
        } catch (error) {
          return createResponse(500, { error: 'Internal server error' });
        }
      }

      // GET /api/{tableIndex}/{id} - Get item
      if (method === 'GET' && itemId) {
        if (!hasPermission(user, tablePrefix, 'read')) {
          return createResponse(403, { error: 'Forbidden' });
        }

        try {
          const result = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
              pk: tablePrefix,
              sk: itemId
            }
          }));

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
        if (!hasPermission(user, tablePrefix, 'create')) {
          return createResponse(403, { error: 'Forbidden' });
        }

        try {
          const body = JSON.parse(event.body || '{}');
          const validationErrors = validateRequired(body, requiredFields);
          
          if (validationErrors.length > 0) {
            return createResponse(400, { error: 'Validation failed', details: validationErrors });
          }

          const now = new Date().toISOString();
          const id = randomUUID();
          const item = {
            ...body,
            pk: tablePrefix,
            sk: id,
            id,
            createdAt: now,
            updatedAt: now
          };

          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item
          }));

          await createAuditLog(user, 'CREATE', tablePrefix, { id });

          return createResponse(201, item);
        } catch (error) {
          return createResponse(400, { error: 'Invalid JSON body' });
        }
      }

      // PUT /api/{tableIndex}/{id} - Update item
      if (method === 'PUT' && itemId) {
        if (!hasPermission(user, tablePrefix, 'update')) {
          return createResponse(403, { error: 'Forbidden' });
        }

        try {
          const body = JSON.parse(event.body || '{}');
          const now = new Date().toISOString();

          const item = {
            ...body,
            pk: tablePrefix,
            sk: itemId,
            id: itemId,
            updatedAt: now
          };

          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item
          }));

          await createAuditLog(user, 'UPDATE', tablePrefix, { id: itemId });

          return createResponse(200, item);
        } catch (error) {
          return createResponse(400, { error: 'Invalid JSON body' });
        }
      }

      // DELETE /api/{tableIndex}/{id} - Delete item
      if (method === 'DELETE' && itemId) {
        if (!hasPermission(user, tablePrefix, 'delete')) {
          return createResponse(403, { error: 'Forbidden' });
        }

        try {
          await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
              pk: tablePrefix,
              sk: itemId
            }
          }));

          await createAuditLog(user, 'DELETE', tablePrefix, { id: itemId });

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