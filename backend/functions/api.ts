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

interface AuditLog {
  pk: string;
  sk: string;
  action: string;
  userId: string;
  targetTable: string;
  targetId?: string;
  details: any;
  timestamp: string;
}

function getRole(event: APIGatewayProxyEvent): Role {
  const role = event.headers['x-user-role'] || event.headers['X-User-Role'] || 'viewer';
  return validateRole(role) ? role : 'viewer';
}

function getUserId(event: APIGatewayProxyEvent): string {
  return event.headers['x-user-id'] || event.headers['X-User-Id'] || 'anonymous';
}

async function createAuditLog(action: string, userId: string, targetTable: string, targetId?: string, details?: any): Promise<void> {
  const auditLog: AuditLog = {
    pk: 'AUDIT',
    sk: `${Date.now()}_${randomUUID()}`,
    action,
    userId,
    targetTable,
    targetId,
    details,
    timestamp: new Date().toISOString()
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: auditLog
  }));
}

function createResponse(statusCode: number, body: any): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Role, X-User-Id'
    },
    body: JSON.stringify(body)
  };
}

function createErrorResponse(statusCode: number, message: string): APIGatewayProxyResult {
  return createResponse(statusCode, { error: message });
}

function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function validateUser(user: Partial<User>): string[] {
  const errors: string[] = [];
  
  if (!user.username || user.username.length > 100) {
    errors.push('Username is required and must be <= 100 characters');
  }
  if (!user.passwordHash || user.passwordHash.length > 100) {
    errors.push('Password hash is required and must be <= 100 characters');
  }
  if (!user.fullName || user.fullName.length > 100) {
    errors.push('Full name is required and must be <= 100 characters');
  }
  if (!user.permissionLevel) {
    errors.push('Permission level is required');
  }
  if (user.isActive === undefined || user.isActive === null) {
    errors.push('Active flag is required');
  }
  if (!user.createdBy) {
    errors.push('Created by is required');
  }
  
  return errors;
}

function validateWorkRecord(record: Partial<WorkRecord>): string[] {
  const errors: string[] = [];
  
  if (!record.workerId || !validateUUID(record.workerId)) {
    errors.push('Valid worker ID is required');
  }
  if (!record.workDate) {
    errors.push('Work date is required');
  }
  if (!record.startTime) {
    errors.push('Start time is required');
  }
  if (!record.projectName || record.projectName.length > 100) {
    errors.push('Project name is required and must be <= 100 characters');
  }
  if (!record.workLocation || record.workLocation.length > 100) {
    errors.push('Work location is required and must be <= 100 characters');
  }
  if (!record.workType || record.workType.length > 100) {
    errors.push('Work type is required and must be <= 100 characters');
  }
  if (!record.workContent) {
    errors.push('Work content is required');
  }
  if (!record.progressStatus || record.progressStatus.length > 100) {
    errors.push('Progress status is required and must be <= 100 characters');
  }
  if (!record.approvalStatus || record.approvalStatus.length > 100) {
    errors.push('Approval status is required and must be <= 100 characters');
  }
  if (!record.createdById || !validateUUID(record.createdById)) {
    errors.push('Valid created by ID is required');
  }
  
  return errors;
}

async function handleGetResources(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const role = getRole(event);
    
    if (!hasPermission(role, 'read')) {
      return createErrorResponse(403, 'Insufficient permissions');
    }

    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'attribute_exists(userId)'
    }));

    const users = result.Items || [];
    return createResponse(200, { users, count: users.length });
  } catch (error) {
    console.error('Error getting resources:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

async function handleBulkImport(event: APIGatewayProxyEvent, tableType: string): Promise<APIGatewayProxyResult> {
  try {
    const role = getRole(event);
    const userId = getUserId(event);
    
    if (!hasPermission(role, 'write')) {
      return createErrorResponse(403, 'Insufficient permissions for bulk import');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const { items } = JSON.parse(event.body);
    
    if (!Array.isArray(items)) {
      return createErrorResponse(400, 'Items must be an array');
    }

    const now = new Date().toISOString();
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process items in batches of 25 (DynamoDB BatchWrite limit)
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      const writeRequests = [];

      for (const item of batch) {
        try {
          const processedItem = {
            ...item,
            createdAt: now,
            updatedAt: now
          };

          // Add appropriate ID field based on table type
          switch (tableType) {
            case 'users':
              processedItem.userId = processedItem.userId || randomUUID();
              const userErrors = validateUser(processedItem);
              if (userErrors.length > 0) {
                errors.push(`User validation: ${userErrors.join(', ')}`);
                failed++;
                continue;
              }
              break;
            case 'work-records':
              processedItem.workRecordId = processedItem.workRecordId || randomUUID();
              const workRecordErrors = validateWorkRecord(processedItem);
              if (workRecordErrors.length > 0) {
                errors.push(`Work record validation: ${workRecordErrors.join(', ')}`);
                failed++;
                continue;
              }
              break;
            case 'interruption-records':
              processedItem.interruptionRecordId = processedItem.interruptionRecordId || randomUUID();
              break;
            case 'work-items':
              processedItem.workItemId = processedItem.workItemId || randomUUID();
              break;
            case 'anomaly-logs':
              processedItem.anomalyDetectionLogId = processedItem.anomalyDetectionLogId || randomUUID();
              break;
            default:
              processedItem.id = processedItem.id || randomUUID();
          }

          writeRequests.push({
            PutRequest: {
              Item: processedItem
            }
          });
        } catch (error) {
          errors.push(`Item processing error: ${error}`);
          failed++;
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
          errors.push(`Batch write error: ${error}`);
          failed += writeRequests.length;
        }
      }
    }

    // Create audit log
    await createAuditLog(
      'BULK_IMPORT',
      userId,
      tableType,
      undefined,
      { imported, failed, totalItems: items.length }
    );

    return createResponse(200, { imported, failed, errors });
  } catch (error) {
    console.error('Error in bulk import:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { httpMethod, path } = event;
    
    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }

    // Route handling
    if (httpMethod === 'GET' && path === '/resources') {
      return await handleGetResources(event);
    }

    // Bulk import endpoints
    const bulkImportMatch = path.match(/^\/api\/(users|work-records|interruption-records|work-items|anomaly-logs)\/bulk$/);
    if (httpMethod === 'POST' && bulkImportMatch) {
      return await handleBulkImport(event, bulkImportMatch[1]);
    }

    return createErrorResponse(404, 'Endpoint not found');
  } catch (error) {
    console.error('Unhandled error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};