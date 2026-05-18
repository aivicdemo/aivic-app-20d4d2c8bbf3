import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { User, hasPermission, requirePermission } from './rbac';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.MAIN_TABLE || 'WorkManagementTable';

interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  pathParameters?: { [key: string]: string };
  queryStringParameters?: { [key: string]: string };
  body?: string;
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

function getUser(event: APIGatewayEvent): User {
  const user = event.requestContext.authorizer?.user;
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
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

function validateRequired(data: any, fields: string[]): void {
  for (const field of fields) {
    if (!data[field]) {
      throw new Error(`Required field missing: ${field}`);
    }
  }
}

function getResourceFromPath(path: string): string {
  const pathMap: { [key: string]: string } = {
    '/resources': 'users',
    '/users': 'users',
    '/work-records': 'work-records',
    '/interruption-records': 'interruption-records',
    '/work-items': 'work-items',
    '/anomaly-logs': 'anomaly-logs'
  };
  
  for (const [pathPattern, resource] of Object.entries(pathMap)) {
    if (path.startsWith(pathPattern)) {
      return resource;
    }
  }
  return 'unknown';
}

function getTableIndex(path: string): string {
  if (path.includes('/0/') || path.endsWith('/0')) return 'users';
  if (path.includes('/1/') || path.endsWith('/1')) return 'work-records';
  if (path.includes('/2/') || path.endsWith('/2')) return 'interruption-records';
  if (path.includes('/3/') || path.endsWith('/3')) return 'work-items';
  if (path.includes('/4/') || path.endsWith('/4')) return 'anomaly-logs';
  return getResourceFromPath(path);
}

async function handleBulkImport(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  try {
    const user = getUser(event);
    const tableIndex = getTableIndex(event.path);
    const resource = tableIndex;
    
    requirePermission(user, resource, 'bulk');
    
    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }
    
    const { items } = JSON.parse(event.body);
    
    if (!Array.isArray(items)) {
      return createResponse(400, { error: 'Items must be an array' });
    }
    
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];
    
    // Process in batches of 25 (DynamoDB BatchWrite limit)
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      const writeRequests = [];
      
      for (const item of batch) {
        try {
          const now = new Date().toISOString();
          const processedItem = {
            ...item,
            id: item.id || randomUUID(),
            createdAt: item.createdAt || now,
            updatedAt: now,
            pk: resource.toUpperCase(),
            sk: item.id || randomUUID()
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
          errors.push(`Batch write error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    await createAuditLog('BULK_IMPORT', resource, user.id, { imported, failed });
    
    return createResponse(200, { imported, failed, errors });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return createResponse(401, { error: 'Unauthorized' });
    }
    if (error instanceof Error && error.message.startsWith('Access denied')) {
      return createResponse(403, { error: error.message });
    }
    return createResponse(500, { error: error instanceof Error ? error.message : 'Internal server error' });
  }
}

async function handleGetResources(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  try {
    const user = getUser(event);
    requirePermission(user, 'users', 'read');
    
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': 'USERS'
      }
    });
    
    const result = await docClient.send(command);
    
    return createResponse(200, {
      items: result.Items || [],
      count: result.Count || 0
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return createResponse(401, { error: 'Unauthorized' });
    }
    if (error instanceof Error && error.message.startsWith('Access denied')) {
      return createResponse(403, { error: error.message });
    }
    return createResponse(500, { error: error instanceof Error ? error.message : 'Internal server error' });
  }
}

async function handleGetUser(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  try {
    const user = getUser(event);
    requirePermission(user, 'users', 'read');
    
    const userId = event.pathParameters?.id;
    if (!userId) {
      return createResponse(400, { error: 'User ID is required' });
    }
    
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: 'USERS',
        sk: userId
      }
    });
    
    const result = await docClient.send(command);
    
    if (!result.Item) {
      return createResponse(404, { error: 'User not found' });
    }
    
    return createResponse(200, result.Item);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return createResponse(401, { error: 'Unauthorized' });
    }
    if (error instanceof Error && error.message.startsWith('Access denied')) {
      return createResponse(403, { error: error.message });
    }
    return createResponse(500, { error: error instanceof Error ? error.message : 'Internal server error' });
  }
}

async function handleCreateUser(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  try {
    const user = getUser(event);
    requirePermission(user, 'users', 'create');
    
    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }
    
    const userData = JSON.parse(event.body);
    
    validateRequired(userData, ['username', 'passwordHash', 'name', 'permissionLevel']);
    
    const now = new Date().toISOString();
    const userId = randomUUID();
    
    const newUser = {
      ...userData,
      pk: 'USERS',
      sk: userId,
      id: userId,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      createdAt: now,
      updatedAt: now,
      createdBy: user.id
    };
    
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: newUser
    });
    
    await docClient.send(command);
    await createAuditLog('CREATE', 'users', user.id, { userId });
    
    return createResponse(201, newUser);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return createResponse(401, { error: 'Unauthorized' });
    }
    if (error instanceof Error && error.message.startsWith('Access denied')) {
      return createResponse(403, { error: error.message });
    }
    if (error instanceof Error && error.message.startsWith('Required field')) {
      return createResponse(400, { error: error.message });
    }
    return createResponse(500, { error: error instanceof Error ? error.message : 'Internal server error' });
  }
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  try {
    const { httpMethod, path } = event;
    
    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }
    
    // Handle bulk import endpoints
    if (httpMethod === 'POST' && path.includes('/bulk')) {
      return await handleBulkImport(event);
    }
    
    // Handle specific endpoints
    if (httpMethod === 'GET' && path === '/resources') {
      return await handleGetResources(event);
    }
    
    if (httpMethod === 'GET' && path.startsWith('/users/')) {
      return await handleGetUser(event);
    }
    
    if (httpMethod === 'POST' && path === '/users') {
      return await handleCreateUser(event);
    }
    
    return createResponse(404, { error: 'Endpoint not found' });
  } catch (error) {
    console.error('Handler error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}