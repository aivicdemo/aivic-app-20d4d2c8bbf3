import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
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
  responseNote?: string;
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
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
  const role = event.headers['x-user-role'] || event.headers['X-User-Role'] || 'viewer';
  return validateRole(role) ? role : 'viewer';
}

function getUserId(event: APIGatewayProxyEvent): string {
  return event.headers['x-user-id'] || event.headers['X-User-Id'] || 'anonymous';
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

const TABLE_CONFIGS = {
  '0': { // Users
    pkPrefix: 'USER',
    validator: validateUser,
    name: 'users'
  },
  '1': { // Work Records
    pkPrefix: 'WORK_RECORD',
    validator: validateWorkRecord,
    name: 'work_records'
  },
  '2': { // Interruption Records
    pkPrefix: 'INTERRUPTION',
    validator: validateInterruptionRecord,
    name: 'interruption_records'
  },
  '3': { // Work Item Master
    pkPrefix: 'WORK_ITEM',
    validator: validateWorkItemMaster,
    name: 'work_item_master'
  },
  '4': { // Anomaly Detection Log
    pkPrefix: 'ANOMALY_LOG',
    validator: validateAnomalyDetectionLog,
    name: 'anomaly_detection_logs'
  }
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const method = event.httpMethod;
    const path = event.path;
    const role = getUserRole(event);
    const userId = getUserId(event);

    console.log(`${method} ${path} - Role: ${role}, User: ${userId}`);

    if (method === 'OPTIONS') {
      return createResponse(200, {});
    }

    // GET /resources - リソース一覧取得
    if (method === 'GET' && path === '/resources') {
      if (!hasPermission(role, 'read')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      const resources = {
        users: '/api/0',
        workRecords: '/api/1',
        interruptionRecords: '/api/2',
        workItemMaster: '/api/3',
        anomalyDetectionLogs: '/api/4'
      };

      return createResponse(200, { resources });
    }

    // API routes pattern: /api/{tableIndex}[/{id}] or /api/{tableIndex}/bulk
    const apiMatch = path.match(/^\/api\/(\d+)(?:\/(\w+|bulk))?$/);
    if (!apiMatch) {
      return createResponse(404, { error: 'Not found' });
    }

    const tableIndex = apiMatch[1];
    const resourceId = apiMatch[2];
    const config = TABLE_CONFIGS[tableIndex as keyof typeof TABLE_CONFIGS];

    if (!config) {
      return createResponse(404, { error: 'Table not found' });
    }

    // Bulk import endpoint
    if (method === 'POST' && resourceId === 'bulk') {
      if (!hasPermission(role, 'write')) {
        return createResponse(403, { error: 'Insufficient permissions for bulk import' });
      }

      const body = JSON.parse(event.body || '{}');
      if (!body.items || !Array.isArray(body.items)) {
        return createResponse(400, { error: 'Invalid request body. Expected { items: [] }' });
      }

      const items = body.items;
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];
      const now = new Date().toISOString();

      // Process in batches of 25 (DynamoDB BatchWrite limit)
      for (let i = 0; i < items.length; i += 25) {
        const batch = items.slice(i, i + 25);
        const writeRequests = [];

        for (const item of batch) {
          try {
            const validationErrors = config.validator(item);
            if (validationErrors.length > 0) {
              failed++;
              errors.push(`Item ${i + batch.indexOf(item)}: ${validationErrors.join(', ')}`);
              continue;
            }

            const id = item.id || randomUUID();
            const enrichedItem = {
              ...item,
              pk: config.pkPrefix,
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
          } catch (error) {
            failed++;
            errors.push(`Item ${i + batch.indexOf(item)}: ${error}`);
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
            errors.push(`Batch write error: ${error}`);
          }
        }
      }

      await createAuditLog('BULK_IMPORT', userId, {
        table: config.name,
        imported,
        failed,
        totalItems: items.length
      });

      return createResponse(200, { imported, failed, errors });
    }

    // GET /api/{tableIndex} - 一覧取得
    if (method === 'GET' && !resourceId) {
      if (!hasPermission(role, 'read')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      const result = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'pk = :pk',
        ExpressionAttributeValues: {
          ':pk': config.pkPrefix
        }
      }));

      return createResponse(200, { items: result.Items || [] });
    }

    // GET /api/{tableIndex}/{id} - 詳細取得
    if (method === 'GET' && resourceId && resourceId !== 'bulk') {
      if (!hasPermission(role, 'read')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: config.pkPrefix,
          sk: resourceId
        }
      }));

      if (!result.Item) {
        return createResponse(404, { error: 'Item not found' });
      }

      return createResponse(200, result.Item);
    }

    // POST /api/{tableIndex} - 新規作成
    if (method === 'POST' && !resourceId) {
      if (!hasPermission(role, 'write')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      const body = JSON.parse(event.body || '{}');
      const validationErrors = config.validator(body);
      
      if (validationErrors.length > 0) {
        return createResponse(400, { error: 'Validation failed', details: validationErrors });
      }

      const id = randomUUID();
      const now = new Date().toISOString();
      const item = {
        ...body,
        pk: config.pkPrefix,
        sk: id,
        id,
        createdAt: now,
        updatedAt: now
      };

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));

      await createAuditLog('CREATE', userId, { table: config.name, id, item });

      return createResponse(201, item);
    }

    // PUT /api/{tableIndex}/{id} - 更新
    if (method === 'PUT' && resourceId && resourceId !== 'bulk') {
      if (!hasPermission(role, 'write')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      const body = JSON.parse(event.body || '{}');
      const validationErrors = config.validator(body);
      
      if (validationErrors.length > 0) {
        return createResponse(400, { error: 'Validation failed', details: validationErrors });
      }

      // Check if item exists
      const existing = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: config.pkPrefix,
          sk: resourceId
        }
      }));

      if (!existing.Item) {
        return createResponse(404, { error: 'Item not found' });
      }

      const now = new Date().toISOString();
      const item = {
        ...existing.Item,
        ...body,
        pk: config.pkPrefix,
        sk: resourceId,
        id: resourceId,
        updatedAt: now
      };

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));

      await createAuditLog('UPDATE', userId, { table: config.name, id: resourceId, item });

      return createResponse(200, item);
    }

    // DELETE /api/{tableIndex}/{id} - 削除
    if (method === 'DELETE' && resourceId && resourceId !== 'bulk') {
      if (!hasPermission(role, 'delete')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      // Check if item exists
      const existing = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: config.pkPrefix,
          sk: resourceId
        }
      }));

      if (!existing.Item) {
        return createResponse(404, { error: 'Item not found' });
      }

      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: config.pkPrefix,
          sk: resourceId
        }
      }));

      await createAuditLog('DELETE', userId, { table: config.name, id: resourceId });

      return createResponse(200, { message: 'Item deleted successfully' });
    }

    return createResponse(405, { error: 'Method not allowed' });

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
};