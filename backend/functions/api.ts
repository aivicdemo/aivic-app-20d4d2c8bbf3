import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
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
  return validateRole(role);
}

function getUserId(event: APIGatewayProxyEvent): string {
  return event.headers['x-user-id'] || event.headers['X-User-Id'] || 'anonymous';
}

async function createAuditLog(action: string, targetTable: string, targetId: string, userId: string, details?: any): Promise<void> {
  const auditLog = {
    pk: 'AUDIT',
    sk: `${Date.now()}_${crypto.randomUUID()}`,
    action,
    targetTable,
    targetId,
    userId,
    details: details || {},
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
  if (!log.detectedValue) errors.push('detectedValue is required');
  if (!log.threshold) errors.push('threshold is required');
  if (!log.severity) errors.push('severity is required');
  if (!log.confirmationStatus) errors.push('confirmationStatus is required');
  if (log.notificationSent === undefined) errors.push('notificationSent is required');
  if (!log.detectedAt) errors.push('detectedAt is required');
  return errors;
}

async function handleGetResources(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const role = getUserRole(event);
    
    if (!hasPermission(role, 'read')) {
      return createResponse(403, { error: 'Insufficient permissions' });
    }

    const resources = {
      users: {
        endpoint: '/api/users',
        description: '現場作業員のアカウント情報と認証情報を管理する',
        permissions: {
          read: hasPermission(role, 'read'),
          write: hasPermission(role, 'write'),
          delete: hasPermission(role, 'delete')
        }
      },
      workRecords: {
        endpoint: '/api/work-records',
        description: '現場作業員の日々の作業時間と内容を記録し、工数管理と実績分析を行う',
        permissions: {
          read: hasPermission(role, 'read'),
          write: hasPermission(role, 'write'),
          delete: hasPermission(role, 'delete')
        }
      },
      interruptionRecords: {
        endpoint: '/api/interruption-records',
        description: '作業中断の発生理由、時間、影響を記録し、作業効率分析と改善に活用する',
        permissions: {
          read: hasPermission(role, 'read'),
          write: hasPermission(role, 'write'),
          delete: hasPermission(role, 'delete')
        }
      },
      workItemMaster: {
        endpoint: '/api/work-item-master',
        description: '現場作業員が工数記録時に選択する作業項目の定義と管理を行う',
        permissions: {
          read: hasPermission(role, 'read'),
          write: hasPermission(role, 'write'),
          delete: hasPermission(role, 'delete')
        }
      },
      anomalyDetectionLogs: {
        endpoint: '/api/anomaly-detection-logs',
        description: '作業記録や中断記録の異常値を自動検出し、管理者への通知や確認を行う',
        permissions: {
          read: hasPermission(role, 'read'),
          write: hasPermission(role, 'write'),
          delete: hasPermission(role, 'delete')
        }
      }
    };

    return createResponse(200, {
      resources,
      userRole: role,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in handleGetResources:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}

async function handleBulkImport(event: APIGatewayProxyEvent, tableIndex: string): Promise<APIGatewayProxyResult> {
  try {
    const role = getUserRole(event);
    const userId = getUserId(event);
    
    if (!hasPermission(role, 'write')) {
      return createResponse(403, { error: 'Insufficient permissions for bulk import' });
    }

    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const { items } = JSON.parse(event.body);
    if (!Array.isArray(items)) {
      return createResponse(400, { error: 'items must be an array' });
    }

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];
    const now = new Date().toISOString();

    // Process items in batches of 25 (DynamoDB BatchWrite limit)
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      const writeRequests = [];

      for (const item of batch) {
        try {
          let processedItem: any = { ...item };
          
          // Add required fields based on table type
          switch (tableIndex) {
            case 'users':
              processedItem.userId = processedItem.userId || crypto.randomUUID();
              processedItem.pk = 'USER';
              processedItem.sk = processedItem.userId;
              break;
            case 'work-records':
              processedItem.workRecordId = processedItem.workRecordId || crypto.randomUUID();
              processedItem.pk = 'WORK_RECORD';
              processedItem.sk = processedItem.workRecordId;
              break;
            case 'interruption-records':
              processedItem.interruptionRecordId = processedItem.interruptionRecordId || crypto.randomUUID();
              processedItem.pk = 'INTERRUPTION_RECORD';
              processedItem.sk = processedItem.interruptionRecordId;
              break;
            case 'work-item-master':
              processedItem.workItemId = processedItem.workItemId || crypto.randomUUID();
              processedItem.pk = 'WORK_ITEM_MASTER';
              processedItem.sk = processedItem.workItemId;
              break;
            case 'anomaly-detection-logs':
              processedItem.anomalyDetectionLogId = processedItem.anomalyDetectionLogId || crypto.randomUUID();
              processedItem.pk = 'ANOMALY_DETECTION_LOG';
              processedItem.sk = processedItem.anomalyDetectionLogId;
              break;
            default:
              throw new Error(`Unknown table index: ${tableIndex}`);
          }

          processedItem.createdAt = processedItem.createdAt || now;
          processedItem.updatedAt = now;

          writeRequests.push({
            PutRequest: {
              Item: processedItem
            }
          });
        } catch (error) {
          failed++;
          errors.push(`Item ${i + batch.indexOf(item)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    // Create audit log
    await createAuditLog('BULK_IMPORT', tableIndex, 'multiple', userId, {
      imported,
      failed,
      totalItems: items.length
    });

    return createResponse(200, {
      imported,
      failed,
      errors
    });
  } catch (error) {
    console.error('Error in handleBulkImport:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const path = event.path;
    const method = event.httpMethod;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return createResponse(200, {});
    }

    // Route handling
    if (method === 'GET' && path === '/resources') {
      return await handleGetResources(event);
    }

    // Bulk import endpoints
    const bulkImportMatch = path.match(/^\/api\/([^/]+)\/bulk$/);
    if (method === 'POST' && bulkImportMatch) {
      const tableIndex = bulkImportMatch[1];
      return await handleBulkImport(event, tableIndex);
    }

    return createResponse(404, { error: 'Endpoint not found' });
  } catch (error) {
    console.error('Unhandled error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};