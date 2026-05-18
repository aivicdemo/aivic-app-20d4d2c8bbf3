import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, DeleteCommand, UpdateCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
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
  interruptionReason: string;
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

async function createAuditLog(action: string, targetTable: string, targetId: string, userId: string, details?: any) {
  const auditLog = {
    pk: 'AUDIT',
    sk: `${Date.now()}_${randomUUID()}`,
    action,
    targetTable,
    targetId,
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
  if (!record.interruptionReason) errors.push('interruptionReason is required');
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

async function handleBulkImport(tableIndex: string, items: Record<string, unknown>[], userId: string): Promise<{ imported: number; failed: number; errors: string[] }> {
  const result = { imported: 0, failed: 0, errors: [] as string[] };
  const now = new Date().toISOString();
  
  // Process items in batches of 25 (DynamoDB BatchWrite limit)
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    const writeRequests = [];
    
    for (const item of batch) {
      try {
        let processedItem: any;
        
        switch (tableIndex) {
          case '0': // Users
            processedItem = {
              ...item,
              pk: 'USER',
              sk: item.userId || randomUUID(),
              userId: item.userId || randomUUID(),
              createdAt: item.createdAt || now,
              updatedAt: now
            };
            break;
          case '1': // Work Records
            processedItem = {
              ...item,
              pk: 'WORK_RECORD',
              sk: item.workRecordId || randomUUID(),
              workRecordId: item.workRecordId || randomUUID(),
              createdAt: item.createdAt || now,
              updatedAt: now
            };
            break;
          case '2': // Interruption Records
            processedItem = {
              ...item,
              pk: 'INTERRUPTION_RECORD',
              sk: item.interruptionRecordId || randomUUID(),
              interruptionRecordId: item.interruptionRecordId || randomUUID(),
              createdAt: item.createdAt || now,
              updatedAt: now
            };
            break;
          case '3': // Work Item Master
            processedItem = {
              ...item,
              pk: 'WORK_ITEM_MASTER',
              sk: item.workItemId || randomUUID(),
              workItemId: item.workItemId || randomUUID(),
              createdAt: item.createdAt || now,
              updatedAt: now
            };
            break;
          case '4': // Anomaly Detection Log
            processedItem = {
              ...item,
              pk: 'ANOMALY_DETECTION_LOG',
              sk: item.anomalyDetectionLogId || randomUUID(),
              anomalyDetectionLogId: item.anomalyDetectionLogId || randomUUID(),
              createdAt: item.createdAt || now,
              updatedAt: now
            };
            break;
          default:
            throw new Error(`Invalid table index: ${tableIndex}`);
        }
        
        writeRequests.push({
          PutRequest: {
            Item: processedItem
          }
        });
      } catch (error) {
        result.failed++;
        result.errors.push(`Item ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    if (writeRequests.length > 0) {
      try {
        await docClient.send(new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: writeRequests
          }
        }));
        result.imported += writeRequests.length;
      } catch (error) {
        result.failed += writeRequests.length;
        result.errors.push(`Batch write error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  // Create audit log
  await createAuditLog('BULK_IMPORT', `table_${tableIndex}`, 'bulk', userId, {
    totalItems: items.length,
    imported: result.imported,
    failed: result.failed
  });
  
  return result;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { httpMethod, pathParameters, resource } = event;
    const userRole = getUserRole(event);
    const userId = getUserId(event);
    
    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }
    
    // Handle bulk import endpoints
    if (resource === '/api/{tableIndex}/bulk' && httpMethod === 'POST') {
      if (!hasPermission(userRole, 'write')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }
      
      const tableIndex = pathParameters?.tableIndex;
      if (!tableIndex || !['0', '1', '2', '3', '4'].includes(tableIndex)) {
        return createResponse(400, { error: 'Invalid table index' });
      }
      
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return createResponse(400, { error: 'Invalid JSON body' });
      }
      
      if (!Array.isArray(body.items)) {
        return createResponse(400, { error: 'items must be an array' });
      }
      
      const result = await handleBulkImport(tableIndex, body.items, userId);
      return createResponse(200, result);
    }
    
    // Handle /resources endpoint
    if (resource === '/resources' && httpMethod === 'GET') {
      if (!hasPermission(userRole, 'read')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }
      
      const resources = {
        users: [],
        workRecords: [],
        interruptionRecords: [],
        workItemMasters: [],
        anomalyDetectionLogs: []
      };
      
      // Scan all tables
      const scanPromises = [
        docClient.send(new ScanCommand({ TableName: TABLE_NAME, FilterExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': 'USER' } })),
        docClient.send(new ScanCommand({ TableName: TABLE_NAME, FilterExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': 'WORK_RECORD' } })),
        docClient.send(new ScanCommand({ TableName: TABLE_NAME, FilterExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': 'INTERRUPTION_RECORD' } })),
        docClient.send(new ScanCommand({ TableName: TABLE_NAME, FilterExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': 'WORK_ITEM_MASTER' } })),
        docClient.send(new ScanCommand({ TableName: TABLE_NAME, FilterExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': 'ANOMALY_DETECTION_LOG' } }))
      ];
      
      const results = await Promise.all(scanPromises);
      
      resources.users = results[0].Items || [];
      resources.workRecords = results[1].Items || [];
      resources.interruptionRecords = results[2].Items || [];
      resources.workItemMasters = results[3].Items || [];
      resources.anomalyDetectionLogs = results[4].Items || [];
      
      return createResponse(200, resources);
    }
    
    return createResponse(404, { error: 'Endpoint not found' });
    
  } catch (error) {
    console.error('Handler error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};