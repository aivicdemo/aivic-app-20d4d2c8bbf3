import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { User, hasPermission } from './rbac';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.MAIN_TABLE!;

interface ErrorResponse {
  error: string;
  message: string;
}

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

function createErrorResponse(statusCode: number, error: string, message: string): APIGatewayProxyResult {
  return createResponse(statusCode, { error, message });
}

function getCurrentUser(event: APIGatewayProxyEvent): User {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) {
    throw new Error('Authorization header required');
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return {
      id: decoded.sub || decoded.userId,
      role: decoded.role || 'viewer',
      username: decoded.username,
      name: decoded.name,
      department: decoded.department,
      jobTitle: decoded.jobTitle,
      permissionLevel: decoded.permissionLevel || 'general',
      isActive: decoded.isActive !== false
    };
  } catch {
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

function validateRequired(data: any, fields: string[]): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  }
  return errors;
}

function getResourceType(path: string): string {
  const pathMap: Record<string, string> = {
    '/resources': 'users',
    '/users': 'users',
    '/work-records': 'workRecords',
    '/interruption-records': 'interruptionRecords',
    '/work-items': 'workItems',
    '/anomaly-logs': 'anomalyLogs'
  };
  
  for (const [key, value] of Object.entries(pathMap)) {
    if (path.startsWith(key)) {
      return value;
    }
  }
  return 'unknown';
}

function getTableIndex(resource: string): string {
  const indexMap: Record<string, string> = {
    'users': '0',
    'workRecords': '1',
    'interruptionRecords': '2',
    'workItems': '3',
    'anomalyLogs': '4'
  };
  return indexMap[resource] || '0';
}

function getPkPrefix(resource: string): string {
  const prefixMap: Record<string, string> = {
    'users': 'USER',
    'workRecords': 'WORK_RECORD',
    'interruptionRecords': 'INTERRUPTION',
    'workItems': 'WORK_ITEM',
    'anomalyLogs': 'ANOMALY_LOG'
  };
  return prefixMap[resource] || 'ITEM';
}

async function handleGetResources(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getCurrentUser(event);
    
    if (!hasPermission(user, 'users', 'read')) {
      return createErrorResponse(403, 'Forbidden', 'Insufficient permissions');
    }

    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(pk, :pk)',
      ExpressionAttributeValues: {
        ':pk': 'USER#'
      }
    });

    const result = await docClient.send(command);
    
    const users = (result.Items || []).map(item => ({
      id: item.pk?.replace('USER#', ''),
      username: item.username,
      name: item.name,
      department: item.department,
      jobTitle: item.jobTitle,
      permissionLevel: item.permissionLevel,
      isActive: item.isActive,
      lastLoginAt: item.lastLoginAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    return createResponse(200, { users, total: users.length });
  } catch (error) {
    console.error('Error getting resources:', error);
    if (error instanceof Error && error.message.includes('Authorization')) {
      return createErrorResponse(401, 'Unauthorized', error.message);
    }
    return createErrorResponse(500, 'Internal Server Error', 'Failed to get resources');
  }
}

async function handleBulkImport(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getCurrentUser(event);
    const pathParts = event.path.split('/');
    const tableIndex = pathParts[pathParts.indexOf('api') + 1];
    
    const resourceMap: Record<string, string> = {
      '0': 'users',
      '1': 'workRecords', 
      '2': 'interruptionRecords',
      '3': 'workItems',
      '4': 'anomalyLogs'
    };
    
    const resource = resourceMap[tableIndex];
    if (!resource) {
      return createErrorResponse(400, 'Bad Request', 'Invalid table index');
    }
    
    if (!hasPermission(user, resource, 'bulk')) {
      return createErrorResponse(403, 'Forbidden', 'Insufficient permissions for bulk import');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Bad Request', 'Request body is required');
    }

    const { items } = JSON.parse(event.body);
    if (!Array.isArray(items)) {
      return createErrorResponse(400, 'Bad Request', 'Items must be an array');
    }

    const pkPrefix = getPkPrefix(resource);
    const now = new Date().toISOString();
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches of 25 (DynamoDB BatchWrite limit)
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      const writeRequests = [];

      for (const item of batch) {
        try {
          const id = item.id || randomUUID();
          const processedItem = {
            ...item,
            pk: `${pkPrefix}#${id}`,
            sk: id,
            id,
            createdAt: item.createdAt || now,
            updatedAt: now,
            createdBy: item.createdBy || user.id
          };

          writeRequests.push({
            PutRequest: {
              Item: processedItem
            }
          });
        } catch (error) {
          failed++;
          errors.push(`Item ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          errors.push(`Batch ${Math.floor(i/25)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    await createAuditLog('BULK_IMPORT', resource, user.id, { imported, failed, total: items.length });

    return createResponse(200, { imported, failed, errors });
  } catch (error) {
    console.error('Error in bulk import:', error);
    if (error instanceof Error && error.message.includes('Authorization')) {
      return createErrorResponse(401, 'Unauthorized', error.message);
    }
    return createErrorResponse(500, 'Internal Server Error', 'Failed to import data');
  }
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const method = event.httpMethod;
    const path = event.path;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return createResponse(200, {});
    }

    // Handle bulk import endpoints
    if (method === 'POST' && path.includes('/api/') && path.endsWith('/bulk')) {
      return await handleBulkImport(event);
    }

    // Handle specific endpoints
    if (method === 'GET' && path === '/resources') {
      return await handleGetResources(event);
    }

    return createErrorResponse(404, 'Not Found', `Endpoint ${method} ${path} not found`);
  } catch (error) {
    console.error('Unhandled error:', error);
    return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
  }
};