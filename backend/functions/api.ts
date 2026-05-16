import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { User, hasPermission } from './rbac';
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
  requestContext: {
    authorizer?: {
      user?: User;
    };
  };
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
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function createErrorResponse(statusCode: number, message: string): APIGatewayResponse {
  return createResponse(statusCode, { error: message });
}

async function createAuditLog(user: User, action: string, resource: string, details: any): Promise<void> {
  const auditLog = {
    pk: 'AUDIT',
    sk: `${Date.now()}_${randomUUID()}`,
    userId: user.id,
    username: user.username,
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

function getResourceFromPath(path: string): string {
  const pathParts = path.split('/');
  if (pathParts.length >= 3 && pathParts[1] === 'resources') {
    return 'resources';
  }
  if (pathParts.length >= 4 && pathParts[1] === 'api') {
    const tableIndex = pathParts[2];
    switch (tableIndex) {
      case '0': return 'users';
      case '1': return 'work-records';
      case '2': return 'interruption-records';
      case '3': return 'work-items';
      case '4': return 'anomaly-logs';
      default: return 'unknown';
    }
  }
  return 'unknown';
}

function getTablePrefix(tableIndex: string): string {
  switch (tableIndex) {
    case '0': return 'USER';
    case '1': return 'WORK_RECORD';
    case '2': return 'INTERRUPTION';
    case '3': return 'WORK_ITEM';
    case '4': return 'ANOMALY_LOG';
    default: throw new Error('Invalid table index');
  }
}

function validateUser(item: any): void {
  if (!item.username || !item.passwordHash || !item.name || !item.permissionLevel) {
    throw new Error('Missing required fields: username, passwordHash, name, permissionLevel');
  }
}

function validateWorkRecord(item: any): void {
  if (!item.workerId || !item.workDate || !item.startTime || !item.projectName || !item.workLocation || !item.workType || !item.workContent || !item.progressStatus || !item.approvalStatus) {
    throw new Error('Missing required fields for work record');
  }
}

function validateInterruptionRecord(item: any): void {
  if (!item.workRecordId || !item.interruptionStartTime || !item.reasonCategory || !item.responseStatus || !item.recorderId) {
    throw new Error('Missing required fields for interruption record');
  }
}

function validateWorkItem(item: any): void {
  if (!item.workItemCode || !item.workItemName || !item.displayOrder) {
    throw new Error('Missing required fields for work item');
  }
}

function validateAnomalyLog(item: any): void {
  if (!item.targetTable || !item.targetRecordId || !item.userId || !item.anomalyType || !item.detectionItem || !item.detectionValue || !item.threshold || !item.severity || !item.confirmationStatus) {
    throw new Error('Missing required fields for anomaly log');
  }
}

function validateItem(tableIndex: string, item: any): void {
  switch (tableIndex) {
    case '0': validateUser(item); break;
    case '1': validateWorkRecord(item); break;
    case '2': validateInterruptionRecord(item); break;
    case '3': validateWorkItem(item); break;
    case '4': validateAnomalyLog(item); break;
    default: throw new Error('Invalid table index');
  }
}

function enrichItem(tableIndex: string, item: any, user: User): any {
  const now = new Date().toISOString();
  const prefix = getTablePrefix(tableIndex);
  
  const enriched = {
    ...item,
    pk: prefix,
    sk: item.id || randomUUID(),
    createdAt: item.createdAt || now,
    updatedAt: now,
    createdBy: item.createdBy || user.id
  };

  // Table-specific enrichments
  switch (tableIndex) {
    case '0': // users
      enriched.isActive = enriched.isActive !== undefined ? enriched.isActive : true;
      break;
    case '1': // work-records
      if (enriched.endTime && enriched.startTime) {
        const start = new Date(enriched.startTime).getTime();
        const end = new Date(enriched.endTime).getTime();
        enriched.workDuration = Math.floor((end - start) / (1000 * 60));
      }
      break;
    case '2': // interruption-records
      if (enriched.interruptionEndTime && enriched.interruptionStartTime) {
        const start = new Date(enriched.interruptionStartTime).getTime();
        const end = new Date(enriched.interruptionEndTime).getTime();
        enriched.interruptionDuration = Math.floor((end - start) / (1000 * 60));
      }
      break;
    case '3': // work-items
      enriched.isActive = enriched.isActive !== undefined ? enriched.isActive : true;
      enriched.updatedBy = user.id;
      break;
    case '4': // anomaly-logs
      enriched.notificationSent = enriched.notificationSent !== undefined ? enriched.notificationSent : false;
      enriched.detectionTime = enriched.detectionTime || now;
      break;
  }

  return enriched;
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }

    const user = event.requestContext.authorizer?.user;
    if (!user) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const { httpMethod, path, pathParameters, queryStringParameters, body } = event;
    const resource = getResourceFromPath(path);

    // Handle GET /resources endpoint
    if (httpMethod === 'GET' && path === '/resources') {
      if (!hasPermission(user, 'resources', 'read')) {
        return createErrorResponse(403, 'Insufficient permissions');
      }

      const resources = [
        { id: '0', name: 'users', description: 'User management' },
        { id: '1', name: 'work-records', description: 'Work record management' },
        { id: '2', name: 'interruption-records', description: 'Interruption record management' },
        { id: '3', name: 'work-items', description: 'Work item master data' },
        { id: '4', name: 'anomaly-logs', description: 'Anomaly detection logs' }
      ];

      return createResponse(200, { resources });
    }

    // Handle bulk import endpoints
    const bulkMatch = path.match(/^\/api\/(\d+)\/bulk$/);
    if (httpMethod === 'POST' && bulkMatch) {
      const tableIndex = bulkMatch[1];
      const resourceName = getResourceFromPath(`/api/${tableIndex}`);
      
      if (!hasPermission(user, resourceName, 'bulk')) {
        return createErrorResponse(403, 'Insufficient permissions for bulk operations');
      }

      if (!body) {
        return createErrorResponse(400, 'Request body is required');
      }

      let requestData;
      try {
        requestData = JSON.parse(body);
      } catch (error) {
        return createErrorResponse(400, 'Invalid JSON in request body');
      }

      if (!requestData.items || !Array.isArray(requestData.items)) {
        return createErrorResponse(400, 'Request body must contain an items array');
      }

      let imported = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process items in batches of 25 (DynamoDB BatchWrite limit)
      const batchSize = 25;
      for (let i = 0; i < requestData.items.length; i += batchSize) {
        const batch = requestData.items.slice(i, i + batchSize);
        const writeRequests = [];

        for (const item of batch) {
          try {
            validateItem(tableIndex, item);
            const enrichedItem = enrichItem(tableIndex, item, user);
            writeRequests.push({
              PutRequest: {
                Item: enrichedItem
              }
            });
          } catch (error) {
            failed++;
            errors.push(`Item ${i + writeRequests.length}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            errors.push(`Batch write failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Create audit log
      await createAuditLog(user, 'BULK_IMPORT', resourceName, {
        totalItems: requestData.items.length,
        imported,
        failed
      });

      return createResponse(200, { imported, failed, errors });
    }

    // Handle other API endpoints
    const apiMatch = path.match(/^\/api\/(\d+)(?:\/(\w+))?$/);
    if (apiMatch) {
      const tableIndex = apiMatch[1];
      const itemId = apiMatch[2];
      const resourceName = getResourceFromPath(`/api/${tableIndex}`);
      const prefix = getTablePrefix(tableIndex);

      switch (httpMethod) {
        case 'GET':
          if (!hasPermission(user, resourceName, 'read')) {
            return createErrorResponse(403, 'Insufficient permissions');
          }

          if (itemId) {
            // Get single item
            const result = await docClient.send(new GetCommand({
              TableName: TABLE_NAME,
              Key: { pk: prefix, sk: itemId }
            }));

            if (!result.Item) {
              return createErrorResponse(404, 'Item not found');
            }

            return createResponse(200, result.Item);
          } else {
            // List items
            const result = await docClient.send(new ScanCommand({
              TableName: TABLE_NAME,
              FilterExpression: 'pk = :pk',
              ExpressionAttributeValues: {
                ':pk': prefix
              }
            }));

            return createResponse(200, { items: result.Items || [] });
          }

        case 'POST':
          if (!hasPermission(user, resourceName, 'create')) {
            return createErrorResponse(403, 'Insufficient permissions');
          }

          if (!body) {
            return createErrorResponse(400, 'Request body is required');
          }

          let createData;
          try {
            createData = JSON.parse(body);
          } catch (error) {
            return createErrorResponse(400, 'Invalid JSON in request body');
          }

          try {
            validateItem(tableIndex, createData);
            const enrichedItem = enrichItem(tableIndex, createData, user);

            await docClient.send(new PutCommand({
              TableName: TABLE_NAME,
              Item: enrichedItem
            }));

            await createAuditLog(user, 'CREATE', resourceName, { itemId: enrichedItem.sk });

            return createResponse(201, enrichedItem);
          } catch (error) {
            return createErrorResponse(400, error instanceof Error ? error.message : 'Validation failed');
          }

        case 'PUT':
          if (!itemId) {
            return createErrorResponse(400, 'Item ID is required for updates');
          }

          if (!hasPermission(user, resourceName, 'update')) {
            return createErrorResponse(403, 'Insufficient permissions');
          }

          if (!body) {
            return createErrorResponse(400, 'Request body is required');
          }

          let updateData;
          try {
            updateData = JSON.parse(body);
          } catch (error) {
            return createErrorResponse(400, 'Invalid JSON in request body');
          }

          try {
            // Check if item exists
            const existingItem = await docClient.send(new GetCommand({
              TableName: TABLE_NAME,
              Key: { pk: prefix, sk: itemId }
            }));

            if (!existingItem.Item) {
              return createErrorResponse(404, 'Item not found');
            }

            validateItem(tableIndex, updateData);
            const enrichedItem = enrichItem(tableIndex, { ...updateData, id: itemId }, user);

            await docClient.send(new PutCommand({
              TableName: TABLE_NAME,
              Item: enrichedItem
            }));

            await createAuditLog(user, 'UPDATE', resourceName, { itemId });

            return createResponse(200, enrichedItem);
          } catch (error) {
            return createErrorResponse(400, error instanceof Error ? error.message : 'Update failed');
          }

        case 'DELETE':
          if (!itemId) {
            return createErrorResponse(400, 'Item ID is required for deletion');
          }

          if (!hasPermission(user, resourceName, 'delete')) {
            return createErrorResponse(403, 'Insufficient permissions');
          }

          try {
            // Check if item exists
            const existingItem = await docClient.send(new GetCommand({
              TableName: TABLE_NAME,
              Key: { pk: prefix, sk: itemId }
            }));

            if (!existingItem.Item) {
              return createErrorResponse(404, 'Item not found');
            }

            await docClient.send(new DeleteCommand({
              TableName: TABLE_NAME,
              Key: { pk: prefix, sk: itemId }
            }));

            await createAuditLog(user, 'DELETE', resourceName, { itemId });

            return createResponse(200, { message: 'Item deleted successfully' });
          } catch (error) {
            return createErrorResponse(500, 'Delete operation failed');
          }

        default:
          return createErrorResponse(405, 'Method not allowed');
      }
    }

    return createErrorResponse(404, 'Endpoint not found');

  } catch (error) {
    console.error('Handler error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}