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
  pathParameters?: { [key: string]: string };
  queryStringParameters?: { [key: string]: string };
  headers?: { [key: string]: string };
  body?: string;
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

function getUserRole(event: APIGatewayEvent): Role {
  const authHeader = event.headers?.['Authorization'] || event.headers?.['authorization'];
  if (!authHeader) return 'viewer';
  
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return validateRole(payload.role) ? payload.role : 'viewer';
  } catch {
    return 'viewer';
  }
}

async function createAuditLog(action: string, userId: string, details: any) {
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

function getTablePrefix(tableIndex: string): string {
  const tableMap: { [key: string]: string } = {
    '1': 'USER',
    '2': 'WORK_RECORD',
    '3': 'INTERRUPTION_RECORD',
    '4': 'WORK_ITEM_MASTER',
    '5': 'ANOMALY_DETECTION_LOG'
  };
  return tableMap[tableIndex] || 'UNKNOWN';
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
  if (!item.fullName) errors.push('fullName is required');
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

function validateWorkItemMaster(item: any): string[] {
  const errors: string[] = [];
  if (!item.workItemCode) errors.push('workItemCode is required');
  if (!item.workItemName) errors.push('workItemName is required');
  if (typeof item.displayOrder !== 'number') errors.push('displayOrder must be number');
  if (typeof item.isActive !== 'boolean') errors.push('isActive must be boolean');
  return errors;
}

function validateAnomalyDetectionLog(item: any): string[] {
  const errors: string[] = [];
  if (!item.targetTable) errors.push('targetTable is required');
  if (!item.targetRecordId) errors.push('targetRecordId is required');
  if (!item.userId) errors.push('userId is required');
  if (!item.anomalyType) errors.push('anomalyType is required');
  if (!item.detectedField) errors.push('detectedField is required');
  if (!item.detectedValue) errors.push('detectedValue is required');
  if (!item.threshold) errors.push('threshold is required');
  if (!item.severity) errors.push('severity is required');
  if (!item.confirmationStatus) errors.push('confirmationStatus is required');
  if (typeof item.notificationSent !== 'boolean') errors.push('notificationSent must be boolean');
  return errors;
}

function validateItem(tableIndex: string, item: any): string[] {
  switch (tableIndex) {
    case '1': return validateUser(item);
    case '2': return validateWorkRecord(item);
    case '3': return validateInterruptionRecord(item);
    case '4': return validateWorkItemMaster(item);
    case '5': return validateAnomalyDetectionLog(item);
    default: return ['Invalid table index'];
  }
}

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayResponse> => {
  try {
    const userRole = getUserRole(event);
    const method = event.httpMethod;
    const path = event.path;

    if (method === 'OPTIONS') {
      return createResponse(200, {});
    }

    if (path === '/resources' && method === 'GET') {
      if (!hasPermission(userRole, 'read')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      const resources = {
        tables: [
          { id: '1', name: 'users', description: 'ユーザー管理' },
          { id: '2', name: 'work_records', description: '作業記録' },
          { id: '3', name: 'interruption_records', description: '中断記録' },
          { id: '4', name: 'work_item_masters', description: '作業項目マスタ' },
          { id: '5', name: 'anomaly_detection_logs', description: '異常値検出ログ' }
        ],
        permissions: {
          read: hasPermission(userRole, 'read'),
          write: hasPermission(userRole, 'write'),
          delete: hasPermission(userRole, 'delete')
        }
      };

      return createResponse(200, resources);
    }

    const pathMatch = path.match(/^\/api\/(\d+)(?:\/(\w+))?(?:\/(\w+))?$/);
    if (!pathMatch) {
      return createResponse(404, { error: 'Endpoint not found' });
    }

    const [, tableIndex, action, itemId] = pathMatch;
    const tablePrefix = getTablePrefix(tableIndex);

    if (action === 'bulk' && method === 'POST') {
      if (!hasPermission(userRole, 'write')) {
        return createResponse(403, { error: 'Insufficient permissions for bulk import' });
      }

      const body = event.body ? JSON.parse(event.body) : {};
      const items = body.items || [];

      if (!Array.isArray(items)) {
        return createResponse(400, { error: 'Items must be an array' });
      }

      let imported = 0;
      let failed = 0;
      const errors: string[] = [];

      const chunks = [];
      for (let i = 0; i < items.length; i += 25) {
        chunks.push(items.slice(i, i + 25));
      }

      for (const chunk of chunks) {
        const writeRequests = [];
        
        for (const item of chunk) {
          const validationErrors = validateItem(tableIndex, item);
          if (validationErrors.length > 0) {
            failed++;
            errors.push(`Validation failed: ${validationErrors.join(', ')}`);
            continue;
          }

          const now = new Date().toISOString();
          const processedItem = {
            ...item,
            pk: tablePrefix,
            sk: item.id || randomUUID(),
            createdAt: now,
            updatedAt: now
          };

          writeRequests.push({
            PutRequest: {
              Item: processedItem
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

      await createAuditLog('BULK_IMPORT', 'system', {
        tableIndex,
        imported,
        failed,
        totalItems: items.length
      });

      return createResponse(200, { imported, failed, errors });
    }

    if (!action && method === 'GET') {
      if (!hasPermission(userRole, 'read')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'pk = :pk',
        ExpressionAttributeValues: {
          ':pk': tablePrefix
        }
      });

      const result = await docClient.send(command);
      return createResponse(200, { items: result.Items || [] });
    }

    if (!action && method === 'POST') {
      if (!hasPermission(userRole, 'write')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      const body = event.body ? JSON.parse(event.body) : {};
      const validationErrors = validateItem(tableIndex, body);
      
      if (validationErrors.length > 0) {
        return createResponse(400, { error: 'Validation failed', details: validationErrors });
      }

      const now = new Date().toISOString();
      const item = {
        ...body,
        pk: tablePrefix,
        sk: body.id || randomUUID(),
        createdAt: now,
        updatedAt: now
      };

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));

      await createAuditLog('CREATE', 'system', { tableIndex, itemId: item.sk });

      return createResponse(201, item);
    }

    if (itemId && method === 'GET') {
      if (!hasPermission(userRole, 'read')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: tablePrefix,
          sk: itemId
        }
      });

      const result = await docClient.send(command);
      if (!result.Item) {
        return createResponse(404, { error: 'Item not found' });
      }

      return createResponse(200, result.Item);
    }

    if (itemId && method === 'PUT') {
      if (!hasPermission(userRole, 'write')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      const body = event.body ? JSON.parse(event.body) : {};
      const validationErrors = validateItem(tableIndex, body);
      
      if (validationErrors.length > 0) {
        return createResponse(400, { error: 'Validation failed', details: validationErrors });
      }

      const item = {
        ...body,
        pk: tablePrefix,
        sk: itemId,
        updatedAt: new Date().toISOString()
      };

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));

      await createAuditLog('UPDATE', 'system', { tableIndex, itemId });

      return createResponse(200, item);
    }

    if (itemId && method === 'DELETE') {
      if (!hasPermission(userRole, 'delete')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: tablePrefix,
          sk: itemId
        }
      }));

      await createAuditLog('DELETE', 'system', { tableIndex, itemId });

      return createResponse(200, { message: 'Item deleted successfully' });
    }

    return createResponse(404, { error: 'Endpoint not found' });

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};