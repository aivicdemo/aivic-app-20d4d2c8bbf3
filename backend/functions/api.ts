import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { hasPermission, getResourceFromPath, getActionFromMethod, User } from './rbac';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.MAIN_TABLE!;

interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

function createResponse(statusCode: number, body: any): ApiResponse {
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

function getUserFromEvent(event: APIGatewayProxyEvent): User {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) {
    throw new Error('Unauthorized');
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return {
      id: payload.sub || payload.userId,
      role: payload.role || 'viewer',
      department: payload.department,
      position: payload.position
    };
  } catch (error) {
    throw new Error('Invalid token');
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

function validateUser(item: any): string[] {
  const errors: string[] = [];
  
  if (!item.username || typeof item.username !== 'string' || item.username.length > 100) {
    errors.push('ユーザー名は必須で100文字以内である必要があります');
  }
  
  if (!item.passwordHash || typeof item.passwordHash !== 'string' || item.passwordHash.length > 100) {
    errors.push('パスワードハッシュは必須で100文字以内である必要があります');
  }
  
  if (!item.fullName || typeof item.fullName !== 'string' || item.fullName.length > 100) {
    errors.push('氏名は必須で100文字以内である必要があります');
  }
  
  if (!item.permissionLevel || typeof item.permissionLevel !== 'string' || item.permissionLevel.length > 100) {
    errors.push('権限レベルは必須で100文字以内である必要があります');
  }
  
  if (typeof item.isActive !== 'boolean') {
    errors.push('有効フラグは必須でboolean型である必要があります');
  }
  
  if (!item.createdBy || typeof item.createdBy !== 'string' || item.createdBy.length > 100) {
    errors.push('作成者は必須で100文字以内である必要があります');
  }
  
  return errors;
}

function validateWorkRecord(item: any): string[] {
  const errors: string[] = [];
  
  if (!item.workerId || typeof item.workerId !== 'string') {
    errors.push('作業員IDは必須です');
  }
  
  if (!item.workDate) {
    errors.push('作業日は必須です');
  }
  
  if (!item.startTime) {
    errors.push('作業開始時刻は必須です');
  }
  
  if (!item.projectName || typeof item.projectName !== 'string' || item.projectName.length > 100) {
    errors.push('プロジェクト名は必須で100文字以内である必要があります');
  }
  
  if (!item.workLocation || typeof item.workLocation !== 'string' || item.workLocation.length > 100) {
    errors.push('作業場所は必須で100文字以内である必要があります');
  }
  
  if (!item.workType || typeof item.workType !== 'string' || item.workType.length > 100) {
    errors.push('作業種別は必須で100文字以内である必要があります');
  }
  
  if (!item.workContent || typeof item.workContent !== 'string') {
    errors.push('作業内容は必須です');
  }
  
  if (!item.progressStatus || typeof item.progressStatus !== 'string' || item.progressStatus.length > 100) {
    errors.push('進捗状況は必須で100文字以内である必要があります');
  }
  
  if (!item.approvalStatus || typeof item.approvalStatus !== 'string' || item.approvalStatus.length > 100) {
    errors.push('承認状態は必須で100文字以内である必要があります');
  }
  
  if (!item.createdById || typeof item.createdById !== 'string') {
    errors.push('作成者IDは必須です');
  }
  
  return errors;
}

function validateInterruptionRecord(item: any): string[] {
  const errors: string[] = [];
  
  if (!item.workRecordId || typeof item.workRecordId !== 'string') {
    errors.push('作業記録IDは必須です');
  }
  
  if (!item.interruptionStartTime) {
    errors.push('中断開始日時は必須です');
  }
  
  if (!item.reasonCategory || typeof item.reasonCategory !== 'string' || item.reasonCategory.length > 100) {
    errors.push('中断理由区分は必須で100文字以内である必要があります');
  }
  
  if (!item.responseStatus || typeof item.responseStatus !== 'string' || item.responseStatus.length > 100) {
    errors.push('対応状況は必須で100文字以内である必要があります');
  }
  
  if (!item.recorderId || typeof item.recorderId !== 'string') {
    errors.push('記録者IDは必須です');
  }
  
  return errors;
}

function validateWorkItem(item: any): string[] {
  const errors: string[] = [];
  
  if (!item.workItemCode || typeof item.workItemCode !== 'string' || item.workItemCode.length > 100) {
    errors.push('作業項目コードは必須で100文字以内である必要があります');
  }
  
  if (!item.workItemName || typeof item.workItemName !== 'string' || item.workItemName.length > 100) {
    errors.push('作業項目名は必須で100文字以内である必要があります');
  }
  
  if (typeof item.displayOrder !== 'number') {
    errors.push('表示順序は必須で数値である必要があります');
  }
  
  if (typeof item.isActive !== 'boolean') {
    errors.push('有効フラグは必須でboolean型である必要があります');
  }
  
  if (!item.createdById || typeof item.createdById !== 'string') {
    errors.push('作成者IDは必須です');
  }
  
  if (!item.updatedById || typeof item.updatedById !== 'string') {
    errors.push('更新者IDは必須です');
  }
  
  return errors;
}

function validateAnomalyLog(item: any): string[] {
  const errors: string[] = [];
  
  if (!item.targetTable || typeof item.targetTable !== 'string' || item.targetTable.length > 100) {
    errors.push('検出対象テーブルは必須で100文字以内である必要があります');
  }
  
  if (!item.targetRecordId || typeof item.targetRecordId !== 'string') {
    errors.push('検出対象レコードIDは必須です');
  }
  
  if (!item.userId || typeof item.userId !== 'string') {
    errors.push('ユーザーIDは必須です');
  }
  
  if (!item.anomalyType || typeof item.anomalyType !== 'string' || item.anomalyType.length > 100) {
    errors.push('異常値種別は必須で100文字以内である必要があります');
  }
  
  if (!item.detectedField || typeof item.detectedField !== 'string' || item.detectedField.length > 100) {
    errors.push('検出項目は必須で100文字以内である必要があります');
  }
  
  if (!item.detectedValue || typeof item.detectedValue !== 'string' || item.detectedValue.length > 100) {
    errors.push('検出値は必須で100文字以内である必要があります');
  }
  
  if (!item.threshold || typeof item.threshold !== 'string' || item.threshold.length > 100) {
    errors.push('閾値は必須で100文字以内である必要があります');
  }
  
  if (!item.severity || typeof item.severity !== 'string' || item.severity.length > 100) {
    errors.push('重要度は必須で100文字以内である必要があります');
  }
  
  if (!item.confirmationStatus || typeof item.confirmationStatus !== 'string' || item.confirmationStatus.length > 100) {
    errors.push('確認状況は必須で100文字以内である必要があります');
  }
  
  if (typeof item.notificationSent !== 'boolean') {
    errors.push('通知送信フラグは必須でboolean型である必要があります');
  }
  
  return errors;
}

function getValidatorByTableIndex(tableIndex: string): (item: any) => string[] {
  switch (tableIndex) {
    case '0': return validateUser;
    case '1': return validateWorkRecord;
    case '2': return validateInterruptionRecord;
    case '3': return validateWorkItem;
    case '4': return validateAnomalyLog;
    default: return () => [];
  }
}

function getTableTypeByIndex(tableIndex: string): string {
  const types = {
    '0': 'USER',
    '1': 'WORK_RECORD',
    '2': 'INTERRUPTION_RECORD',
    '3': 'WORK_ITEM',
    '4': 'ANOMALY_LOG'
  };
  return types[tableIndex as keyof typeof types] || 'UNKNOWN';
}

function addTimestamps(item: any, isUpdate: boolean = false): any {
  const now = new Date().toISOString();
  
  if (!isUpdate) {
    item.id = item.id || randomUUID();
    item.createdAt = now;
  }
  
  item.updatedAt = now;
  return item;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const method = event.httpMethod;
    const path = event.path;
    const pathParameters = event.pathParameters || {};
    
    if (method === 'OPTIONS') {
      return createResponse(200, {});
    }
    
    let user: User;
    try {
      user = getUserFromEvent(event);
    } catch (error) {
      return createResponse(401, { error: 'Unauthorized' });
    }
    
    const resource = getResourceFromPath(path);
    const action = getActionFromMethod(method, path);
    
    if (!hasPermission(user, resource, action)) {
      return createResponse(403, { error: 'Forbidden' });
    }
    
    // GET /resources
    if (method === 'GET' && path === '/resources') {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'attribute_exists(username)'
      });
      
      const result = await docClient.send(command);
      return createResponse(200, { items: result.Items || [] });
    }
    
    // API routes
    const apiMatch = path.match(/^\/api\/(\d+)(?:\/(\w+))?(?:\/(\w+))?/);
    if (!apiMatch) {
      return createResponse(404, { error: 'Not Found' });
    }
    
    const [, tableIndex, operation, id] = apiMatch;
    const tableType = getTableTypeByIndex(tableIndex);
    
    // Bulk import endpoint
    if (method === 'POST' && operation === 'bulk') {
      if (!hasPermission(user, resource, 'bulk')) {
        return createResponse(403, { error: 'Forbidden' });
      }
      
      const body = JSON.parse(event.body || '{}');
      const items = body.items || [];
      
      if (!Array.isArray(items)) {
        return createResponse(400, { error: 'items must be an array' });
      }
      
      const validator = getValidatorByTableIndex(tableIndex);
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];
      
      // Process in batches of 25 (DynamoDB BatchWrite limit)
      for (let i = 0; i < items.length; i += 25) {
        const batch = items.slice(i, i + 25);
        const writeRequests = [];
        
        for (const item of batch) {
          const validationErrors = validator(item);
          if (validationErrors.length > 0) {
            failed++;
            errors.push(`Item ${i + batch.indexOf(item)}: ${validationErrors.join(', ')}`);
            continue;
          }
          
          const processedItem = addTimestamps({ ...item });
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
      
      await createAuditLog('BULK_IMPORT', tableType, tableIndex, user.id, { imported, failed });
      
      return createResponse(200, { imported, failed, errors });
    }
    
    // List items
    if (method === 'GET' && !operation) {
      const command = new ScanCommand({
        TableName: TABLE_NAME
      });
      
      const result = await docClient.send(command);
      return createResponse(200, { items: result.Items || [] });
    }
    
    // Get item by ID
    if (method === 'GET' && operation && !id) {
      const itemId = operation;
      
      const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: itemId }
      });
      
      const result = await docClient.send(command);
      
      if (!result.Item) {
        return createResponse(404, { error: 'Item not found' });
      }
      
      return createResponse(200, result.Item);
    }
    
    // Create item
    if (method === 'POST' && !operation) {
      const body = JSON.parse(event.body || '{}');
      const validator = getValidatorByTableIndex(tableIndex);
      
      const validationErrors = validator(body);
      if (validationErrors.length > 0) {
        return createResponse(400, { error: 'Validation failed', details: validationErrors });
      }
      
      const item = addTimestamps({ ...body });
      
      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      });
      
      await docClient.send(command);
      await createAuditLog('CREATE', tableType, item.id, user.id, item);
      
      return createResponse(201, item);
    }
    
    // Update item
    if (method === 'PUT' && operation && !id) {
      const itemId = operation;
      const body = JSON.parse(event.body || '{}');
      const validator = getValidatorByTableIndex(tableIndex);
      
      const validationErrors = validator(body);
      if (validationErrors.length > 0) {
        return createResponse(400, { error: 'Validation failed', details: validationErrors });
      }
      
      // Check if item exists
      const getCommand = new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: itemId }
      });
      
      const existingItem = await docClient.send(getCommand);
      if (!existingItem.Item) {
        return createResponse(404, { error: 'Item not found' });
      }
      
      const updatedItem = addTimestamps({ ...body, id: itemId }, true);
      
      const putCommand = new PutCommand({
        TableName: TABLE_NAME,
        Item: updatedItem
      });
      
      await docClient.send(putCommand);
      await createAuditLog('UPDATE', tableType, itemId, user.id, updatedItem);
      
      return createResponse(200, updatedItem);
    }
    
    // Delete item
    if (method === 'DELETE' && operation && !id) {
      const itemId = operation;
      
      // Check if item exists
      const getCommand = new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: itemId }
      });
      
      const existingItem = await docClient.send(getCommand);
      if (!existingItem.Item) {
        return createResponse(404, { error: 'Item not found' });
      }
      
      const deleteCommand = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id: itemId }
      });
      
      await docClient.send(deleteCommand);
      await createAuditLog('DELETE', tableType, itemId, user.id, existingItem.Item);
      
      return createResponse(200, { message: 'Item deleted successfully' });
    }
    
    return createResponse(404, { error: 'Not Found' });
    
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { error: 'Internal Server Error' });
  }
};