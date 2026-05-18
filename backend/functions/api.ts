import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { hasPermission, validateRole, Role } from './rbac';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.MAIN_TABLE!;

interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  pathParameters?: { [key: string]: string };
  queryStringParameters?: { [key: string]: string };
  headers?: { [key: string]: string };
  body?: string;
}

interface APIGatewayResponse {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
}

function createResponse(statusCode: number, body: any): APIGatewayResponse {
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

function getUserRole(event: APIGatewayEvent): Role {
  const role = event.headers?.['x-user-role'] || 'viewer';
  return validateRole(role) ? role : 'viewer';
}

function getUserId(event: APIGatewayEvent): string {
  return event.headers?.['x-user-id'] || 'anonymous';
}

async function createAuditLog(action: string, userId: string, details: any): Promise<void> {
  const auditLog = {
    pk: 'AUDIT',
    sk: `${Date.now()}_${randomUUID()}`,
    action,
    userId,
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

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayResponse> => {
  try {
    const userRole = getUserRole(event);
    const userId = getUserId(event);
    const method = event.httpMethod;
    const path = event.path;

    // OPTIONS request for CORS
    if (method === 'OPTIONS') {
      return createResponse(200, {});
    }

    // GET /resources
    if (method === 'GET' && path === '/resources') {
      if (!hasPermission(userRole, 'read')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      try {
        const resources = {
          users: [],
          workRecords: [],
          interruptions: [],
          workItems: [],
          anomalyLogs: []
        };

        // Get users
        const usersResult = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(pk, :pk)',
          ExpressionAttributeValues: { ':pk': 'USER#' }
        }));
        resources.users = usersResult.Items || [];

        // Get work records
        const workRecordsResult = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(pk, :pk)',
          ExpressionAttributeValues: { ':pk': 'WORK_RECORD#' }
        }));
        resources.workRecords = workRecordsResult.Items || [];

        // Get interruptions
        const interruptionsResult = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(pk, :pk)',
          ExpressionAttributeValues: { ':pk': 'INTERRUPTION#' }
        }));
        resources.interruptions = interruptionsResult.Items || [];

        // Get work items
        const workItemsResult = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(pk, :pk)',
          ExpressionAttributeValues: { ':pk': 'WORK_ITEM#' }
        }));
        resources.workItems = workItemsResult.Items || [];

        // Get anomaly logs
        const anomalyLogsResult = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(pk, :pk)',
          ExpressionAttributeValues: { ':pk': 'ANOMALY_LOG#' }
        }));
        resources.anomalyLogs = anomalyLogsResult.Items || [];

        return createResponse(200, resources);
      } catch (error) {
        console.error('Error fetching resources:', error);
        return createResponse(500, { error: 'Internal server error' });
      }
    }

    // Bulk import endpoints
    const bulkMatch = path.match(/^\/api\/(\d+)\/bulk$/);
    if (method === 'POST' && bulkMatch) {
      const tableIndex = bulkMatch[1];
      
      if (!hasPermission(userRole, 'write')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      if (!event.body) {
        return createResponse(400, { error: 'Request body is required' });
      }

      try {
        const { items } = JSON.parse(event.body);
        
        if (!Array.isArray(items)) {
          return createResponse(400, { error: 'Items must be an array' });
        }

        const tablePrefix = getTablePrefix(tableIndex);
        const now = new Date().toISOString();
        let imported = 0;
        let failed = 0;
        const errors: string[] = [];

        // Process items in batches of 25 (DynamoDB BatchWrite limit)
        for (let i = 0; i < items.length; i += 25) {
          const batch = items.slice(i, i + 25);
          const writeRequests = batch.map((item, index) => {
            try {
              const id = item.id || randomUUID();
              const processedItem = {
                ...item,
                pk: `${tablePrefix}#${id}`,
                sk: `${tablePrefix}#${id}`,
                id,
                createdAt: now,
                updatedAt: now,
                createdBy: userId
              };

              return {
                PutRequest: {
                  Item: processedItem
                }
              };
            } catch (error) {
              failed++;
              errors.push(`Item ${i + index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              return null;
            }
          }).filter(Boolean);

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
              errors.push(`Batch ${Math.floor(i / 25)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Create audit log
        await createAuditLog('BULK_IMPORT', userId, {
          tableIndex,
          tablePrefix,
          totalItems: items.length,
          imported,
          failed
        });

        return createResponse(200, { imported, failed, errors });
      } catch (error) {
        console.error('Error in bulk import:', error);
        return createResponse(500, { error: 'Internal server error' });
      }
    }

    // Individual resource endpoints
    const resourceMatch = path.match(/^\/api\/(\d+)(?:\/(\w+))?$/);
    if (resourceMatch) {
      const tableIndex = resourceMatch[1];
      const resourceId = resourceMatch[2];
      const tablePrefix = getTablePrefix(tableIndex);

      // GET /api/{tableIndex} - List resources
      if (method === 'GET' && !resourceId) {
        if (!hasPermission(userRole, 'read')) {
          return createResponse(403, { error: 'Insufficient permissions' });
        }

        try {
          const result = await docClient.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(pk, :pk)',
            ExpressionAttributeValues: { ':pk': `${tablePrefix}#` }
          }));

          return createResponse(200, { items: result.Items || [] });
        } catch (error) {
          console.error('Error listing resources:', error);
          return createResponse(500, { error: 'Internal server error' });
        }
      }

      // GET /api/{tableIndex}/{id} - Get resource by ID
      if (method === 'GET' && resourceId) {
        if (!hasPermission(userRole, 'read')) {
          return createResponse(403, { error: 'Insufficient permissions' });
        }

        try {
          const result = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
              pk: `${tablePrefix}#${resourceId}`,
              sk: `${tablePrefix}#${resourceId}`
            }
          }));

          if (!result.Item) {
            return createResponse(404, { error: 'Resource not found' });
          }

          return createResponse(200, result.Item);
        } catch (error) {
          console.error('Error getting resource:', error);
          return createResponse(500, { error: 'Internal server error' });
        }
      }

      // POST /api/{tableIndex} - Create resource
      if (method === 'POST' && !resourceId) {
        if (!hasPermission(userRole, 'write')) {
          return createResponse(403, { error: 'Insufficient permissions' });
        }

        if (!event.body) {
          return createResponse(400, { error: 'Request body is required' });
        }

        try {
          const data = JSON.parse(event.body);
          const id = randomUUID();
          const now = new Date().toISOString();

          const item = {
            ...data,
            pk: `${tablePrefix}#${id}`,
            sk: `${tablePrefix}#${id}`,
            id,
            createdAt: now,
            updatedAt: now,
            createdBy: userId
          };

          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item
          }));

          await createAuditLog('CREATE', userId, { tablePrefix, id, data });

          return createResponse(201, item);
        } catch (error) {
          console.error('Error creating resource:', error);
          return createResponse(500, { error: 'Internal server error' });
        }
      }

      // PUT /api/{tableIndex}/{id} - Update resource
      if (method === 'PUT' && resourceId) {
        if (!hasPermission(userRole, 'write')) {
          return createResponse(403, { error: 'Insufficient permissions' });
        }

        if (!event.body) {
          return createResponse(400, { error: 'Request body is required' });
        }

        try {
          const data = JSON.parse(event.body);
          const now = new Date().toISOString();

          // Check if resource exists
          const existing = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
              pk: `${tablePrefix}#${resourceId}`,
              sk: `${tablePrefix}#${resourceId}`
            }
          }));

          if (!existing.Item) {
            return createResponse(404, { error: 'Resource not found' });
          }

          const item = {
            ...existing.Item,
            ...data,
            pk: `${tablePrefix}#${resourceId}`,
            sk: `${tablePrefix}#${resourceId}`,
            id: resourceId,
            updatedAt: now,
            updatedBy: userId
          };

          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item
          }));

          await createAuditLog('UPDATE', userId, { tablePrefix, id: resourceId, data });

          return createResponse(200, item);
        } catch (error) {
          console.error('Error updating resource:', error);
          return createResponse(500, { error: 'Internal server error' });
        }
      }

      // DELETE /api/{tableIndex}/{id} - Delete resource
      if (method === 'DELETE' && resourceId) {
        if (!hasPermission(userRole, 'delete')) {
          return createResponse(403, { error: 'Insufficient permissions' });
        }

        try {
          // Check if resource exists
          const existing = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
              pk: `${tablePrefix}#${resourceId}`,
              sk: `${tablePrefix}#${resourceId}`
            }
          }));

          if (!existing.Item) {
            return createResponse(404, { error: 'Resource not found' });
          }

          await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
              pk: `${tablePrefix}#${resourceId}`,
              sk: `${tablePrefix}#${resourceId}`
            }
          }));

          await createAuditLog('DELETE', userId, { tablePrefix, id: resourceId });

          return createResponse(204, {});
        } catch (error) {
          console.error('Error deleting resource:', error);
          return createResponse(500, { error: 'Internal server error' });
        }
      }
    }

    return createResponse(404, { error: 'Endpoint not found' });
  } catch (error) {
    console.error('Unhandled error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};