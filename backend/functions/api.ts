import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { hasPermission, getResourceFromIndex, extractUserFromEvent, User } from './rbac';
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
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: auditLog
  }));
}

function validateWorkRecord(item: any): string[] {
  const errors: string[] = [];
  
  if (!item.workerId) errors.push('workerId is required');
  if (!item.workDate) errors.push('workDate is required');
  if (!item.workStartTime) errors.push('workStartTime is required');
  if (!item.projectName) errors.push('projectName is required');
  if (!item.workLocation) errors.push('workLocation is required');
  if (!item.workType) errors.push('workType is required');
  if (!item.workContent) errors.push('workContent is required');
  if (!item.progressStatus) errors.push('progressStatus is required');
  if (!item.approvalStatus) errors.push('approvalStatus is required');
  
  return errors;
}

function validateUser(item: any): string[] {
  const errors: string[] = [];
  
  if (!item.username) errors.push('username is required');
  if (!item.passwordHash) errors.push('passwordHash is required');
  if (!item.name) errors.push('name is required');
  if (!item.permissionLevel) errors.push('permissionLevel is required');
  if (typeof item.isActive !== 'boolean') errors.push('isActive must be boolean');
  
  return errors;
}

function validateInterruptionRecord(item: any): string[] {
  const errors: string[] = [];
  
  if (!item.workRecordId) errors.push('workRecordId is required');
  if (!item.interruptionStartTime) errors.push('interruptionStartTime is required');
  if (!item.interruptionReasonCategory) errors.push('interruptionReasonCategory is required');
  if (!item.responseStatus) errors.push('responseStatus is required');
  if (!item.recorderId) errors.push('recorderId is required');
  
  return errors;
}

function validateWorkItem(item: any): string[] {
  const errors: string[] = [];
  
  if (!item.workItemCode) errors.push('workItemCode is required');
  if (!item.workItemName) errors.push('workItemName is required');
  if (typeof item.displayOrder !== 'number') errors.push('displayOrder must be number');
  if (typeof item.isActive !== 'boolean') errors.push('isActive must be boolean');
  
  return errors;
}

function validateAnomalyLog(item: any): string[] {
  const errors: string[] = [];
  
  if (!item.detectionTargetTable) errors.push('detectionTargetTable is required');
  if (!item.detectionTargetRecordId) errors.push('detectionTargetRecordId is required');
  if (!item.userId) errors.push('userId is required');
  if (!item.anomalyType) errors.push('anomalyType is required');
  if (!item.detectionItem) errors.push('detectionItem is required');
  if (!item.detectionValue) errors.push('detectionValue is required');
  if (!item.threshold) errors.push('threshold is required');
  if (!item.severity) errors.push('severity is required');
  if (!item.confirmationStatus) errors.push('confirmationStatus is required');
  if (typeof item.notificationSent !== 'boolean') errors.push('notificationSent must be boolean');
  
  return errors;
}

function getValidationFunction(tableIndex: string) {
  switch (tableIndex) {
    case '0': return validateUser;
    case '1': return validateWorkRecord;
    case '2': return validateInterruptionRecord;
    case '3': return validateWorkItem;
    case '4': return validateAnomalyLog;
    default: return () => [];
  }
}

function getPkPrefix(tableIndex: string): string {
  switch (tableIndex) {
    case '0': return 'USER';
    case '1': return 'WORK_RECORD';
    case '2': return 'INTERRUPTION';
    case '3': return 'WORK_ITEM';
    case '4': return 'ANOMALY_LOG';
    default: return 'UNKNOWN';
  }
}

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayResponse> => {
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  try {
    const user = extractUserFromEvent(event);
    
    if (!user.isActive) {
      return createErrorResponse(403, 'Account is inactive');
    }

    const path = event.path;
    const method = event.httpMethod;
    
    // GET /resources
    if (method === 'GET' && path === '/resources') {
      if (!hasPermission(user, 'work-items', 'read')) {
        return createErrorResponse(403, 'Insufficient permissions');
      }

      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(pk, :prefix)',
        ExpressionAttributeValues: {
          ':prefix': 'WORK_ITEM'
        }
      });

      const result = await docClient.send(command);
      return createResponse(200, { items: result.Items || [] });
    }

    // Bulk import endpoints: POST /api/{tableIndex}/bulk
    const bulkMatch = path.match(/^\/api\/(\d+)\/bulk$/);
    if (method === 'POST' && bulkMatch) {
      const tableIndex = bulkMatch[1];
      const resource = getResourceFromIndex(tableIndex);
      
      if (!hasPermission(user, resource, 'bulk')) {
        return createErrorResponse(403, 'Insufficient permissions for bulk operations');
      }

      if (!event.body) {
        return createErrorResponse(400, 'Request body is required');
      }

      let requestBody;
      try {
        requestBody = JSON.parse(event.body);
      } catch (error) {
        return createErrorResponse(400, 'Invalid JSON in request body');
      }

      if (!requestBody.items || !Array.isArray(requestBody.items)) {
        return createErrorResponse(400, 'items array is required');
      }

      const items = requestBody.items;
      const validateFn = getValidationFunction(tableIndex);
      const pkPrefix = getPkPrefix(tableIndex);
      const errors: string[] = [];
      let imported = 0;
      let failed = 0;

      // Validate all items first
      for (let i = 0; i < items.length; i++) {
        const validationErrors = validateFn(items[i]);
        if (validationErrors.length > 0) {
          errors.push(`Item ${i}: ${validationErrors.join(', ')}`);
          failed++;
        }
      }

      // Process valid items in batches of 25
      const validItems = items.filter((_, index) => {
        const validationErrors = validateFn(items[index]);
        return validationErrors.length === 0;
      });

      for (let i = 0; i < validItems.length; i += 25) {
        const batch = validItems.slice(i, i + 25);
        const writeRequests = batch.map(item => {
          const now = new Date().toISOString();
          const id = item.id || randomUUID();
          
          return {
            PutRequest: {
              Item: {
                ...item,
                pk: `${pkPrefix}#${id}`,
                sk: id,
                id,
                createdAt: now,
                updatedAt: now,
                createdBy: user.id
              }
            }
          };
        });

        try {
          await docClient.send(new BatchWriteCommand({
            RequestItems: {
              [TABLE_NAME]: writeRequests
            }
          }));
          imported += batch.length;
        } catch (error) {
          failed += batch.length;
          errors.push(`Batch write failed: ${error}`);
        }
      }

      // Create audit log
      await createAuditLog(user, 'BULK_IMPORT', resource, {
        tableIndex,
        totalItems: items.length,
        imported,
        failed
      });

      return createResponse(200, { imported, failed, errors });
    }

    return createErrorResponse(404, 'Endpoint not found');

  } catch (error) {
    console.error('Handler error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authorization') || error.message.includes('token')) {
        return createErrorResponse(401, 'Authentication failed');
      }
    }
    
    return createErrorResponse(500, 'Internal server error');
  }
};