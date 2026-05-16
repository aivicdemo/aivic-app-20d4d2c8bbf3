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
  pathParameters?: { [key: string]: string } | null;
  queryStringParameters?: { [key: string]: string } | null;
  headers?: { [key: string]: string };
  body?: string | null;
}

interface APIGatewayResponse {
  statusCode: number;
  headers?: { [key: string]: string };
  body: string;
}

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
  responseMemo?: string;
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
}

function createResponse(statusCode: number, body: any, headers?: { [key: string]: string }): APIGatewayResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers
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

function validateUser(user: any): string[] {
  const errors: string[] = [];
  if (!user.username) errors.push('username is required');
  if (!user.passwordHash) errors.push('passwordHash is required');
  if (!user.fullName) errors.push('fullName is required');
  if (!user.permissionLevel) errors.push('permissionLevel is required');
  if (typeof user.isActive !== 'boolean') errors.push('isActive must be boolean');
  if (!user.createdBy) errors.push('createdBy is required');
  return errors;
}

function validateWorkRecord(record: any): string[] {
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

function validateInterruptionRecord(record: any): string[] {
  const errors: string[] = [];
  if (!record.workRecordId) errors.push('workRecordId is required');
  if (!record.interruptionStartAt) errors.push('interruptionStartAt is required');
  if (!record.interruptionReasonCategory) errors.push('interruptionReasonCategory is required');
  if (!record.responseStatus) errors.push('responseStatus is required');
  if (!record.recorderId) errors.push('recorderId is required');
  return errors;
}

function validateWorkItemMaster(item: any): string[] {
  const errors: string[] = [];
  if (!item.workItemCode) errors.push('workItemCode is required');
  if (!item.workItemName) errors.push('workItemName is required');
  if (typeof item.displayOrder !== 'number') errors.push('displayOrder must be number');
  if (typeof item.isActive !== 'boolean') errors.push('isActive must be boolean');
  if (!item.createdById) errors.push('createdById is required');
  if (!item.updatedById) errors.push('updatedById is required');
  return errors;
}

function validateAnomalyDetectionLog(log: any): string[] {
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
  if (typeof log.notificationSent !== 'boolean') errors.push('notificationSent must be boolean');
  if (!log.detectedAt) errors.push('detectedAt is required');
  return errors;
}

async function handleBulkImport(tableIndex: string, items: any[], userId: string, userRole: Role): Promise<APIGatewayResponse> {
  if (!hasPermission(userRole, 'write')) {
    return createResponse(403, { error: 'Insufficient permissions' });
  }

  const results = {
    imported: 0,
    failed: 0,
    errors: [] as string[]
  };

  const validators: { [key: string]: (item: any) => string[] } = {
    '0': validateUser,
    '1': validateWorkRecord,
    '2': validateInterruptionRecord,
    '3': validateWorkItemMaster,
    '4': validateAnomalyDetectionLog
  };

  const idFields: { [key: string]: string } = {
    '0': 'userId',
    '1': 'workRecordId',
    '2': 'interruptionRecordId',
    '3': 'workItemId',
    '4': 'anomalyDetectionLogId'
  };

  const validator = validators[tableIndex];
  const idField = idFields[tableIndex];

  if (!validator || !idField) {
    return createResponse(400, { error: 'Invalid table index' });
  }

  const now = new Date().toISOString();
  const processedItems = [];

  for (const item of items) {
    const validationErrors = validator(item);
    if (validationErrors.length > 0) {
      results.failed++;
      results.errors.push(`Validation failed: ${validationErrors.join(', ')}`);
      continue;
    }

    const processedItem = {
      ...item,
      [idField]: item[idField] || randomUUID(),
      createdAt: now,
      updatedAt: now
    };

    processedItems.push(processedItem);
  }

  // Process in batches of 25 (DynamoDB BatchWrite limit)
  for (let i = 0; i < processedItems.length; i += 25) {
    const batch = processedItems.slice(i, i + 25);
    const putRequests = batch.map(item => ({
      PutRequest: { Item: item }
    }));

    try {
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: putRequests
        }
      }));
      results.imported += batch.length;
    } catch (error) {
      results.failed += batch.length;
      results.errors.push(`Batch write failed: ${error}`);
    }
  }

  await createAuditLog('BULK_IMPORT', userId, {
    tableIndex,
    imported: results.imported,
    failed: results.failed
  });

  return createResponse(200, results);
}

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayResponse> => {
  try {
    const userRole = getUserRole(event);
    const userId = getUserId(event);
    const method = event.httpMethod;
    const path = event.path;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return createResponse(200, {});
    }

    // Handle bulk import endpoints
    const bulkImportMatch = path.match(/^\/api\/(\d+)\/bulk$/);
    if (bulkImportMatch && method === 'POST') {
      const tableIndex = bulkImportMatch[1];
      const body = event.body ? JSON.parse(event.body) : {};
      const items = body.items || [];
      return await handleBulkImport(tableIndex, items, userId, userRole);
    }

    // Handle /resources endpoint
    if (path === '/resources' && method === 'GET') {
      if (!hasPermission(userRole, 'read')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      try {
        const result = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME
        }));

        const resources = {
          users: result.Items?.filter(item => item.userId) || [],
          workRecords: result.Items?.filter(item => item.workRecordId) || [],
          interruptionRecords: result.Items?.filter(item => item.interruptionRecordId) || [],
          workItemMasters: result.Items?.filter(item => item.workItemId) || [],
          anomalyDetectionLogs: result.Items?.filter(item => item.anomalyDetectionLogId) || []
        };

        return createResponse(200, resources);
      } catch (error) {
        console.error('Error fetching resources:', error);
        return createResponse(500, { error: 'Internal server error' });
      }
    }

    return createResponse(404, { error: 'Endpoint not found' });
  } catch (error) {
    console.error('Handler error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};