import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { hasPermission, validateRole, Role } from './rbac';
import * as crypto from 'crypto';

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
  notes?: string;
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
  interruptionStartAt: string;
  interruptionEndAt?: string;
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
  detectionValue: string;
  threshold: string;
  severity: string;
  confirmationStatus: string;
  notificationSent: boolean;
  confirmerId?: string;
  confirmedAt?: string;
  responseNotes?: string;
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
}

type ResourceType = 'users' | 'work-records' | 'interruption-records' | 'work-item-masters' | 'anomaly-detection-logs';

function getPartitionKey(resourceType: ResourceType): string {
  switch (resourceType) {
    case 'users': return 'USER';
    case 'work-records': return 'WORK_RECORD';
    case 'interruption-records': return 'INTERRUPTION_RECORD';
    case 'work-item-masters': return 'WORK_ITEM_MASTER';
    case 'anomaly-detection-logs': return 'ANOMALY_DETECTION_LOG';
    default: throw new Error(`Unknown resource type: ${resourceType}`);
  }
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

function getUserRole(event: APIGatewayProxyEvent): Role {
  const role = event.headers.Authorization?.replace('Bearer ', '') || event.headers.authorization?.replace('Bearer ', '') || 'viewer';
  return validateRole(role) ? role as Role : 'viewer';
}

async function createAuditLog(action: string, resourceType: string, resourceId: string, userId: string, details?: any): Promise<void> {
  const auditLog = {
    pk: 'AUDIT',
    sk: `${Date.now()}-${crypto.randomUUID()}`,
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

function validateUser(user: Partial<User>): string[] {
  const errors: string[] = [];
  if (!user.username) errors.push('username is required');
  if (!user.passwordHash) errors.push('passwordHash is required');
  if (!user.fullName) errors.push('fullName is required');
  if (!user.permissionLevel) errors.push('permissionLevel is required');
  if (user.isActive === undefined) errors.push('isActive is required');
  if (!user.createdBy) errors.push('createdBy is required');
  return errors;
}

function validateWorkRecord(record: Partial<WorkRecord>): string[] {
  const errors: string[] = [];
  if (!record.workerId) errors.push('workerId is required');
  if (!record.workDate) errors.push('workDate is required');
  if (!record.startTime) errors.push('startTime is required');
  if (!record.projectName) errors.push('projectName is required');
  if (!record.workLocation) errors.push('workLocation is required');
  if (!record.workType) errors.push('workType is required');
  if (!record.workContent) errors.push('workContent is required');
  if (!record.progressStatus) errors.push('progressStatus is required');
  if (!record.approvalStatus) errors.push('approvalStatus is required');
  if (!record.createdById) errors.push('createdById is required');
  return errors;
}

function validateInterruptionRecord(record: Partial<InterruptionRecord>): string[] {
  const errors: string[] = [];
  if (!record.workRecordId) errors.push('workRecordId is required');
  if (!record.interruptionStartAt) errors.push('interruptionStartAt is required');
  if (!record.interruptionReasonCategory) errors.push('interruptionReasonCategory is required');
  if (!record.responseStatus) errors.push('responseStatus is required');
  if (!record.recorderId) errors.push('recorderId is required');
  return errors;
}

function validateWorkItemMaster(item: Partial<WorkItemMaster>): string[] {
  const errors: string[] = [];
  if (!item.workItemCode) errors.push('workItemCode is required');
  if (!item.workItemName) errors.push('workItemName is required');
  if (item.displayOrder === undefined) errors.push('displayOrder is required');
  if (item.isActive === undefined) errors.push('isActive is required');
  if (!item.createdById) errors.push('createdById is required');
  if (!item.updatedById) errors.push('updatedById is required');
  return errors;
}

function validateAnomalyDetectionLog(log: Partial<AnomalyDetectionLog>): string[] {
  const errors: string[] = [];
  if (!log.targetTable) errors.push('targetTable is required');
  if (!log.targetRecordId) errors.push('targetRecordId is required');
  if (!log.userId) errors.push('userId is required');
  if (!log.anomalyType) errors.push('anomalyType is required');
  if (!log.detectionItem) errors.push('detectionItem is required');
  if (!log.detectionValue) errors.push('detectionValue is required');
  if (!log.threshold) errors.push('threshold is required');
  if (!log.severity) errors.push('severity is required');
  if (!log.confirmationStatus) errors.push('confirmationStatus is required');
  if (log.notificationSent === undefined) errors.push('notificationSent is required');
  if (!log.detectedAt) errors.push('detectedAt is required');
  return errors;
}

function getValidator(resourceType: ResourceType): (item: any) => string[] {
  switch (resourceType) {
    case 'users': return validateUser;
    case 'work-records': return validateWorkRecord;
    case 'interruption-records': return validateInterruptionRecord;
    case 'work-item-masters': return validateWorkItemMaster;
    case 'anomaly-detection-logs': return validateAnomalyDetectionLog;
    default: return () => [];
  }
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { httpMethod, pathParameters, body } = event;
    const role = getUserRole(event);
    const userId = event.requestContext.authorizer?.userId || 'system';

    if (httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }

    if (httpMethod === 'GET' && event.path === '/resources') {
      if (!hasPermission(role, 'read')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      const resources = {
        users: 'User management',
        'work-records': 'Work record management',
        'interruption-records': 'Interruption record management',
        'work-item-masters': 'Work item master management',
        'anomaly-detection-logs': 'Anomaly detection log management'
      };

      return createResponse(200, { resources });
    }

    const pathParts = event.path.split('/').filter(p => p);
    if (pathParts.length < 2 || pathParts[0] !== 'api') {
      return createResponse(404, { error: 'Not found' });
    }

    const resourceIndex = pathParts[1];
    const resourceTypes: ResourceType[] = ['users', 'work-records', 'interruption-records', 'work-item-masters', 'anomaly-detection-logs'];
    const resourceType = resourceTypes[parseInt(resourceIndex)] || resourceIndex as ResourceType;
    
    if (!resourceTypes.includes(resourceType)) {
      return createResponse(404, { error: 'Resource not found' });
    }

    const pk = getPartitionKey(resourceType);

    // Bulk import endpoint
    if (httpMethod === 'POST' && pathParts[2] === 'bulk') {
      if (!hasPermission(role, 'write')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      if (!body) {
        return createResponse(400, { error: 'Request body is required' });
      }

      let requestData;
      try {
        requestData = JSON.parse(body);
      } catch {
        return createResponse(400, { error: 'Invalid JSON in request body' });
      }

      if (!requestData.items || !Array.isArray(requestData.items)) {
        return createResponse(400, { error: 'items array is required' });
      }

      const validator = getValidator(resourceType);
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];
      const now = new Date().toISOString();

      // Process in batches of 25 (DynamoDB BatchWrite limit)
      for (let i = 0; i < requestData.items.length; i += 25) {
        const batch = requestData.items.slice(i, i + 25);
        const writeRequests = [];

        for (const item of batch) {
          const validationErrors = validator(item);
          if (validationErrors.length > 0) {
            failed++;
            errors.push(`Item ${i + batch.indexOf(item)}: ${validationErrors.join(', ')}`);
            continue;
          }

          const id = item.id || crypto.randomUUID();
          const enrichedItem = {
            ...item,
            pk,
            sk: id,
            createdAt: now,
            updatedAt: now
          };

          // Add resource-specific ID field
          switch (resourceType) {
            case 'users':
              enrichedItem.userId = id;
              break;
            case 'work-records':
              enrichedItem.workRecordId = id;
              break;
            case 'interruption-records':
              enrichedItem.interruptionRecordId = id;
              break;
            case 'work-item-masters':
              enrichedItem.workItemId = id;
              break;
            case 'anomaly-detection-logs':
              enrichedItem.anomalyDetectionLogId = id;
              break;
          }

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
            errors.push(`Batch write failed: ${error}`);
          }
        }
      }

      await createAuditLog('BULK_IMPORT', resourceType, 'multiple', userId, { imported, failed });

      return createResponse(200, { imported, failed, errors });
    }

    // List resources
    if (httpMethod === 'GET' && !pathParameters?.id) {
      if (!hasPermission(role, 'read')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      const result = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'pk = :pk',
        ExpressionAttributeValues: {
          ':pk': pk
        }
      }));

      return createResponse(200, { items: result.Items || [] });
    }

    // Get single resource
    if (httpMethod === 'GET' && pathParameters?.id) {
      if (!hasPermission(role, 'read')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk,
          sk: pathParameters.id
        }
      }));

      if (!result.Item) {
        return createResponse(404, { error: 'Resource not found' });
      }

      return createResponse(200, result.Item);
    }

    // Create or update resource
    if (httpMethod === 'POST' || httpMethod === 'PUT') {
      if (!hasPermission(role, 'write')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      if (!body) {
        return createResponse(400, { error: 'Request body is required' });
      }

      let requestData;
      try {
        requestData = JSON.parse(body);
      } catch {
        return createResponse(400, { error: 'Invalid JSON in request body' });
      }

      const validator = getValidator(resourceType);
      const validationErrors = validator(requestData);
      if (validationErrors.length > 0) {
        return createResponse(400, { error: 'Validation failed', details: validationErrors });
      }

      const id = pathParameters?.id || crypto.randomUUID();
      const now = new Date().toISOString();
      const isUpdate = httpMethod === 'PUT' && pathParameters?.id;

      const item = {
        ...requestData,
        pk,
        sk: id,
        updatedAt: now
      };

      if (!isUpdate) {
        item.createdAt = now;
      }

      // Add resource-specific ID field
      switch (resourceType) {
        case 'users':
          item.userId = id;
          break;
        case 'work-records':
          item.workRecordId = id;
          break;
        case 'interruption-records':
          item.interruptionRecordId = id;
          break;
        case 'work-item-masters':
          item.workItemId = id;
          break;
        case 'anomaly-detection-logs':
          item.anomalyDetectionLogId = id;
          break;
      }

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));

      await createAuditLog(isUpdate ? 'UPDATE' : 'CREATE', resourceType, id, userId, requestData);

      return createResponse(isUpdate ? 200 : 201, item);
    }

    // Delete resource
    if (httpMethod === 'DELETE' && pathParameters?.id) {
      if (!hasPermission(role, 'delete')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      // Check if resource exists
      const existing = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk,
          sk: pathParameters.id
        }
      }));

      if (!existing.Item) {
        return createResponse(404, { error: 'Resource not found' });
      }

      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk,
          sk: pathParameters.id
        }
      }));

      await createAuditLog('DELETE', resourceType, pathParameters.id, userId);

      return createResponse(204, {});
    }

    return createResponse(405, { error: 'Method not allowed' });

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};