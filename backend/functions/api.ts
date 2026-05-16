import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
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

async function createAuditLog(action: string, resourceType: string, resourceId: string, userId: string, details?: any) {
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
  if (!item.username) errors.push('ユーザー名は必須です');
  if (!item.passwordHash) errors.push('パスワードハッシュは必須です');
  if (!item.fullName) errors.push('氏名は必須です');
  if (!item.permissionLevel) errors.push('権限レベルは必須です');
  if (typeof item.isActive !== 'boolean') errors.push('有効フラグは必須です');
  if (!item.createdBy) errors.push('作成者は必須です');
  return errors;
}

function validateWorkRecord(item: any): string[] {
  const errors: string[] = [];
  if (!item.workerId) errors.push('作業員IDは必須です');
  if (!item.workDate) errors.push('作業日は必須です');
  if (!item.startTime) errors.push('作業開始時刻は必須です');
  if (!item.projectName) errors.push('プロジェクト名は必須です');
  if (!item.workLocation) errors.push('作業場所は必須です');
  if (!item.workType) errors.push('作業種別は必須です');
  if (!item.workContent) errors.push('作業内容は必須です');
  if (!item.progressStatus) errors.push('進捗状況は必須です');
  if (!item.approvalStatus) errors.push('承認状態は必須です');
  if (!item.createdById) errors.push('作成者IDは必須です');
  return errors;
}

function validateInterruptionRecord(item: any): string[] {
  const errors: string[] = [];
  if (!item.workRecordId) errors.push('作業記録IDは必須です');
  if (!item.interruptionStartTime) errors.push('中断開始日時は必須です');
  if (!item.interruptionReasonCategory) errors.push('中断理由区分は必須です');
  if (!item.responseStatus) errors.push('対応状況は必須です');
  if (!item.recorderId) errors.push('記録者IDは必須です');
  return errors;
}

function validateWorkItemMaster(item: any): string[] {
  const errors: string[] = [];
  if (!item.workItemCode) errors.push('作業項目コードは必須です');
  if (!item.workItemName) errors.push('作業項目名は必須です');
  if (typeof item.displayOrder !== 'number') errors.push('表示順序は必須です');
  if (typeof item.isActive !== 'boolean') errors.push('有効フラグは必須です');
  if (!item.createdById) errors.push('作成者IDは必須です');
  if (!item.updatedById) errors.push('更新者IDは必須です');
  return errors;
}

function validateAnomalyDetectionLog(item: any): string[] {
  const errors: string[] = [];
  if (!item.targetTable) errors.push('検出対象テーブルは必須です');
  if (!item.targetRecordId) errors.push('検出対象レコードIDは必須です');
  if (!item.userId) errors.push('ユーザーIDは必須です');
  if (!item.anomalyType) errors.push('異常値種別は必須です');
  if (!item.detectionItem) errors.push('検出項目は必須です');
  if (!item.detectedValue) errors.push('検出値は必須です');
  if (!item.threshold) errors.push('閾値は必須です');
  if (!item.severity) errors.push('重要度は必須です');
  if (!item.confirmationStatus) errors.push('確認状況は必須です');
  if (typeof item.notificationSent !== 'boolean') errors.push('通知送信フラグは必須です');
  return errors;
}

function getValidationFunction(tableIndex: string) {
  switch (tableIndex) {
    case '0': return validateUser;
    case '1': return validateWorkRecord;
    case '2': return validateInterruptionRecord;
    case '3': return validateWorkItemMaster;
    case '4': return validateAnomalyDetectionLog;
    default: return () => [];
  }
}

function getTablePrefix(tableIndex: string): string {
  switch (tableIndex) {
    case '0': return 'USER';
    case '1': return 'WORK_RECORD';
    case '2': return 'INTERRUPTION';
    case '3': return 'WORK_ITEM';
    case '4': return 'ANOMALY_LOG';
    default: return 'UNKNOWN';
  }
}

function addTimestamps(item: any, isUpdate: boolean = false): any {
  const now = new Date().toISOString();
  const result = { ...item };
  
  if (!isUpdate) {
    result.createdAt = now;
  }
  result.updatedAt = now;
  
  return result;
}

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayResponse> => {
  try {
    const userRole = getUserRole(event);
    const method = event.httpMethod;
    const path = event.path;

    if (method === 'OPTIONS') {
      return createResponse(200, {});
    }

    // GET /resources
    if (method === 'GET' && path === '/resources') {
      if (!hasPermission(userRole, 'read')) {
        return createResponse(403, { error: 'アクセス権限がありません' });
      }

      try {
        const resources = {
          users: [],
          workRecords: [],
          interruptionRecords: [],
          workItemMasters: [],
          anomalyDetectionLogs: []
        };

        // ユーザー取得
        const usersResult = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(pk, :prefix)',
          ExpressionAttributeValues: { ':prefix': 'USER#' }
        }));
        resources.users = usersResult.Items || [];

        // 作業記録取得
        const workRecordsResult = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(pk, :prefix)',
          ExpressionAttributeValues: { ':prefix': 'WORK_RECORD#' }
        }));
        resources.workRecords = workRecordsResult.Items || [];

        // 中断記録取得
        const interruptionRecordsResult = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(pk, :prefix)',
          ExpressionAttributeValues: { ':prefix': 'INTERRUPTION#' }
        }));
        resources.interruptionRecords = interruptionRecordsResult.Items || [];

        // 作業項目マスタ取得
        const workItemMastersResult = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(pk, :prefix)',
          ExpressionAttributeValues: { ':prefix': 'WORK_ITEM#' }
        }));
        resources.workItemMasters = workItemMastersResult.Items || [];

        // 異常値検出ログ取得
        const anomalyLogsResult = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(pk, :prefix)',
          ExpressionAttributeValues: { ':prefix': 'ANOMALY_LOG#' }
        }));
        resources.anomalyDetectionLogs = anomalyLogsResult.Items || [];

        return createResponse(200, resources);
      } catch (error) {
        console.error('Error fetching resources:', error);
        return createResponse(500, { error: 'リソースの取得に失敗しました' });
      }
    }

    // 一括インポートエンドポイント
    const bulkImportMatch = path.match(/^\/api\/(\d+)\/bulk$/);
    if (method === 'POST' && bulkImportMatch) {
      const tableIndex = bulkImportMatch[1];
      
      if (!hasPermission(userRole, 'write')) {
        return createResponse(403, { error: 'アクセス権限がありません' });
      }

      if (!event.body) {
        return createResponse(400, { error: 'リクエストボディが必要です' });
      }

      let requestBody;
      try {
        requestBody = JSON.parse(event.body);
      } catch {
        return createResponse(400, { error: '無効なJSONです' });
      }

      if (!requestBody.items || !Array.isArray(requestBody.items)) {
        return createResponse(400, { error: 'itemsフィールドが必要です' });
      }

      const validateFn = getValidationFunction(tableIndex);
      const tablePrefix = getTablePrefix(tableIndex);
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];

      // 25件ずつに分割してバッチ処理
      const batchSize = 25;
      for (let i = 0; i < requestBody.items.length; i += batchSize) {
        const batch = requestBody.items.slice(i, i + batchSize);
        const writeRequests = [];

        for (const item of batch) {
          const validationErrors = validateFn(item);
          if (validationErrors.length > 0) {
            failed++;
            errors.push(`Item ${i + batch.indexOf(item)}: ${validationErrors.join(', ')}`);
            continue;
          }

          const id = randomUUID();
          const processedItem = addTimestamps({
            ...item,
            pk: `${tablePrefix}#${id}`,
            sk: id,
            id
          });

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

      // 監査ログ記録
      await createAuditLog(
        'BULK_IMPORT',
        tablePrefix,
        `batch_${Date.now()}`,
        'system',
        { imported, failed, totalItems: requestBody.items.length }
      );

      return createResponse(200, { imported, failed, errors });
    }

    return createResponse(404, { error: 'エンドポイントが見つかりません' });

  } catch (error) {
    console.error('Unexpected error:', error);
    return createResponse(500, { error: '内部サーバーエラーが発生しました' });
  }
};