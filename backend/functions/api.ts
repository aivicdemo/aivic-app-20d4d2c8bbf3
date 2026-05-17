import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { hasPermission, validateRole, Role } from './rbac';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.MAIN_TABLE!;

interface User {
  userId: string;
  username: string;
  passwordHash: string;
  fullName: string;
  department?: string;
  jobTitle?: string;
  permissionLevel: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface WorkRecord {
  workRecordId: string;
  workerId: string;
  workDate: string;
  startTime: string;
  endTime?: string;
  workDuration?: number;
  projectName: string;
  workLocation: string;
  workType: string;
  workContent: string;
  progressStatus: string;
  remarks?: string;
  approvalStatus: string;
  approverId?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

interface InterruptionRecord {
  interruptionRecordId: string;
  workRecordId: string;
  interruptionStartTime: string;
  interruptionEndTime?: string;
  interruptionReasonCategory: string;
  interruptionReasonDetail?: string;
  interruptionDuration?: number;
  impactLevel?: string;
  responseStatus: string;
  recorderId: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkItemMaster {
  workItemId: string;
  workItemCode: string;
  workItemName: string;
  workItemDescription?: string;
  category?: string;
  standardWorkHours?: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string;
}

interface AnomalyDetectionLog {
  anomalyDetectionLogId: string;
  targetTable: string;
  targetRecordId: string;
  userId: string;
  anomalyType: string;
  detectionItem: string;
  detectedValue: string;
  threshold: string;
  severity: string;
  confirmationStatus: string;
  notificationSent: boolean;
  confirmerId?: string;
  confirmedAt?: string;
  responseNote?: string;
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
}

type ResourceType = 'users' | 'work-records' | 'interruption-records' | 'work-item-masters' | 'anomaly-detection-logs';

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

function getUserRole(event: APIGatewayProxyEvent): Role {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) return 'viewer';
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return validateRole(payload.role) ? payload.role : 'viewer';
  } catch {
    return 'viewer';
  }
}

function getUserId(event: APIGatewayProxyEvent): string {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) return 'anonymous';
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.userId || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

async function createAuditLog(action: string, resourceType: string, resourceId: string, userId: string, details?: any): Promise<void> {
  const auditLog = {
    pk: 'AUDIT',
    sk: `${Date.now()}_${randomUUID()}`,
    action,
    resourceType,
    resourceId,
    userId,
    details,
    timestamp: new Date().toISOString()
  };
  
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: auditLog
  }));
}

function getPartitionKey(resourceType: ResourceType): string {
  const keyMap: Record<ResourceType, string> = {
    'users': 'USER',
    'work-records': 'WORK_RECORD',
    'interruption-records': 'INTERRUPTION_RECORD',
    'work-item-masters': 'WORK_ITEM_MASTER',
    'anomaly-detection-logs': 'ANOMALY_DETECTION_LOG'
  };
  return keyMap[resourceType];
}

async function getResources(resourceType: ResourceType, role: Role): Promise<any[]> {
  if (!hasPermission(role, 'read')) {
    throw new Error('Insufficient permissions');
  }

  const pk = getPartitionKey(resourceType);
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'pk = :pk',
    ExpressionAttributeValues: {
      ':pk': pk
    }
  });

  const result = await docClient.send(command);
  return result.Items || [];
}

async function getResourceById(resourceType: ResourceType, id: string, role: Role): Promise<any> {
  if (!hasPermission(role, 'read')) {
    throw new Error('Insufficient permissions');
  }

  const pk = getPartitionKey(resourceType);
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk, sk: id }
  });

  const result = await docClient.send(command);
  if (!result.Item) {
    throw new Error('Resource not found');
  }
  return result.Item;
}

async function createResource(resourceType: ResourceType, data: any, role: Role, userId: string): Promise<any> {
  if (!hasPermission(role, 'write')) {
    throw new Error('Insufficient permissions');
  }

  const pk = getPartitionKey(resourceType);
  const id = randomUUID();
  const now = new Date().toISOString();
  
  const item = {
    pk,
    sk: id,
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: userId
  };

  // Add resource-specific ID field
  switch (resourceType) {
    case 'users':
      item.userId = id;
      break;
    case 'work-records':
      item.workRecordId = id;
      item.createdById = userId;
      break;
    case 'interruption-records':
      item.interruptionRecordId = id;
      break;
    case 'work-item-masters':
      item.workItemId = id;
      item.createdById = userId;
      item.updatedById = userId;
      break;
    case 'anomaly-detection-logs':
      item.anomalyDetectionLogId = id;
      break;
  }

  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: item
  });

  await docClient.send(command);
  await createAuditLog('CREATE', resourceType, id, userId, data);
  
  return item;
}

async function updateResource(resourceType: ResourceType, id: string, data: any, role: Role, userId: string): Promise<any> {
  if (!hasPermission(role, 'write')) {
    throw new Error('Insufficient permissions');
  }

  const pk = getPartitionKey(resourceType);
  const now = new Date().toISOString();
  
  // Build update expression
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};
  
  Object.keys(data).forEach((key, index) => {
    const attrName = `#attr${index}`;
    const attrValue = `:val${index}`;
    updateExpressions.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = key;
    expressionAttributeValues[attrValue] = data[key];
  });
  
  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = now;
  
  if (resourceType === 'work-item-masters') {
    updateExpressions.push('#updatedById = :updatedById');
    expressionAttributeNames['#updatedById'] = 'updatedById';
    expressionAttributeValues[':updatedById'] = userId;
  }

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { pk, sk: id },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  });

  const result = await docClient.send(command);
  await createAuditLog('UPDATE', resourceType, id, userId, data);
  
  return result.Attributes;
}

async function deleteResource(resourceType: ResourceType, id: string, role: Role, userId: string): Promise<void> {
  if (!hasPermission(role, 'delete')) {
    throw new Error('Insufficient permissions');
  }

  const pk = getPartitionKey(resourceType);
  const command = new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { pk, sk: id }
  });

  await docClient.send(command);
  await createAuditLog('DELETE', resourceType, id, userId);
}

async function bulkImport(resourceType: ResourceType, items: Record<string, unknown>[], role: Role, userId: string): Promise<{ imported: number; failed: number; errors: string[] }> {
  if (!hasPermission(role, 'write')) {
    throw new Error('Insufficient permissions');
  }

  const pk = getPartitionKey(resourceType);
  const now = new Date().toISOString();
  const errors: string[] = [];
  let imported = 0;
  let failed = 0;

  // Process items in batches of 25 (DynamoDB BatchWrite limit)
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    const writeRequests = batch.map((item, index) => {
      try {
        const id = randomUUID();
        const processedItem = {
          pk,
          sk: id,
          ...item,
          createdAt: now,
          updatedAt: now,
          createdBy: userId
        };

        // Add resource-specific ID field
        switch (resourceType) {
          case 'users':
            processedItem.userId = id;
            break;
          case 'work-records':
            processedItem.workRecordId = id;
            processedItem.createdById = userId;
            break;
          case 'interruption-records':
            processedItem.interruptionRecordId = id;
            break;
          case 'work-item-masters':
            processedItem.workItemId = id;
            processedItem.createdById = userId;
            processedItem.updatedById = userId;
            break;
          case 'anomaly-detection-logs':
            processedItem.anomalyDetectionLogId = id;
            break;
        }

        return {
          PutRequest: {
            Item: processedItem
          }
        };
      } catch (error) {
        errors.push(`Item ${i + index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
        return null;
      }
    }).filter(req => req !== null);

    if (writeRequests.length > 0) {
      try {
        const command = new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: writeRequests
          }
        });

        await docClient.send(command);
        imported += writeRequests.length;
      } catch (error) {
        errors.push(`Batch ${Math.floor(i / 25)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed += writeRequests.length;
      }
    }
  }

  await createAuditLog('BULK_IMPORT', resourceType, 'bulk', userId, { imported, failed, totalItems: items.length });

  return { imported, failed, errors };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { httpMethod, pathParameters, body } = event;
    const role = getUserRole(event);
    const userId = getUserId(event);
    
    // Handle OPTIONS requests for CORS
    if (httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }

    // Parse path
    const path = event.path || '';
    const pathSegments = path.split('/').filter(segment => segment !== '');
    
    // Handle /resources endpoint
    if (pathSegments.length === 1 && pathSegments[0] === 'resources') {
      if (httpMethod === 'GET') {
        const allResources = {
          users: await getResources('users', role),
          workRecords: await getResources('work-records', role),
          interruptionRecords: await getResources('interruption-records', role),
          workItemMasters: await getResources('work-item-masters', role),
          anomalyDetectionLogs: await getResources('anomaly-detection-logs', role)
        };
        return createResponse(200, allResources);
      }
    }

    // Handle resource-specific endpoints
    if (pathSegments.length >= 2 && pathSegments[0] === 'api') {
      const resourceIndex = parseInt(pathSegments[1]);
      const resourceTypes: ResourceType[] = ['users', 'work-records', 'interruption-records', 'work-item-masters', 'anomaly-detection-logs'];
      
      if (resourceIndex < 0 || resourceIndex >= resourceTypes.length) {
        return createResponse(404, { error: 'Invalid resource index' });
      }
      
      const resourceType = resourceTypes[resourceIndex];
      
      // Handle bulk import
      if (pathSegments.length === 3 && pathSegments[2] === 'bulk' && httpMethod === 'POST') {
        if (!hasPermission(role, 'write')) {
          return createResponse(403, { error: 'Insufficient permissions' });
        }
        
        const requestBody = JSON.parse(body || '{}');
        if (!requestBody.items || !Array.isArray(requestBody.items)) {
          return createResponse(400, { error: 'Invalid request body. Expected { items: Array }' });
        }
        
        const result = await bulkImport(resourceType, requestBody.items, role, userId);
        return createResponse(200, result);
      }
      
      // Handle individual resource operations
      if (pathSegments.length === 2) {
        switch (httpMethod) {
          case 'GET':
            const resources = await getResources(resourceType, role);
            return createResponse(200, resources);
          
          case 'POST':
            const requestBody = JSON.parse(body || '{}');
            const newResource = await createResource(resourceType, requestBody, role, userId);
            return createResponse(201, newResource);
        }
      }
      
      if (pathSegments.length === 3) {
        const resourceId = pathSegments[2];
        
        switch (httpMethod) {
          case 'GET':
            const resource = await getResourceById(resourceType, resourceId, role);
            return createResponse(200, resource);
          
          case 'PUT':
            const updateBody = JSON.parse(body || '{}');
            const updatedResource = await updateResource(resourceType, resourceId, updateBody, role, userId);
            return createResponse(200, updatedResource);
          
          case 'DELETE':
            await deleteResource(resourceType, resourceId, role, userId);
            return createResponse(204, {});
        }
      }
    }

    return createResponse(404, { error: 'Endpoint not found' });
    
  } catch (error) {
    console.error('Error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return createResponse(403, { error: error.message });
      }
      if (error.message === 'Resource not found') {
        return createResponse(404, { error: error.message });
      }
      if (error.message.includes('validation') || error.message.includes('Invalid')) {
        return createResponse(400, { error: error.message });
      }
    }
    
    return createResponse(500, { error: 'Internal server error' });
  }
};