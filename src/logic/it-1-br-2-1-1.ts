// SIG-PLAN:
// - 関数名: startWorkRecord
//   呼び出し例 (テスト中): startWorkRecord(userId, workItemId, currentTime)
//     ※ userId = "USER-001", workItemId = "WORK-ITEM-001", currentTime = new Date("2024-01-15T09:00:00Z")
//   await されてる?: はい
//   アクセスされるプロパティ: result.workRecordId, result.startTime, result.status
//   → 結論: async function startWorkRecord(userId: string, workItemId: string, currentTime: Date): Promise<WorkRecordResult>
//   → WorkRecordResult = { workRecordId: string; startTime: string; status: string }
// - 関数名: isRecordActive
//   呼び出し例 (テスト中): isRecordActive(userId, activeRecord)
//     ※ userId = "USER-002", activeRecord = { workRecordId, userId, startTime, status }
//   await されてる?: いいえ
//   アクセスされるプロパティ: 戻り値は boolean
//   → 結論: function isRecordActive(userId: string, activeRecord: ActiveRecord): boolean
//   → ActiveRecord = { workRecordId: string; userId: string; startTime: string; status: string }
// - 関数名: validateWorkStartOperation
//   呼び出し例 (テスト中): validateWorkStartOperation(userId, activeRecord)
//     ※ userId = "USER-002", activeRecord = { workRecordId, userId, startTime, status }
//   await されてる?: いいえ
//   アクセスされるプロパティ: result.isValid, result.errorMessage, result.existingRecord
//   → 結論: function validateWorkStartOperation(userId: string, activeRecord: ActiveRecord): ValidationResult
//   → ValidationResult = { isValid: boolean; errorMessage: string; existingRecord: ActiveRecord }

interface WorkRecordResult {
  workRecordId: string;
  startTime: string;
  status: string;
}

interface ActiveRecord {
  workRecordId: string;
  userId: string;
  startTime: string;
  status: string;
}

interface ValidationResult {
  isValid: boolean;
  errorMessage: string;
  existingRecord: ActiveRecord;
}

export async function startWorkRecord(
  userId: string,
  workItemId: string,
  currentTime: Date
): Promise<WorkRecordResult> {
  // 前提: 現場作業員がスマートフォンアプリを使用している状態で
  // 発生条件: 工数記録開始ボタンがタップされたとき
  // 結果: 現在時刻を作業開始時刻として自動記録し、記録状態をアクティブに変更する
  
  const requestBody = {
    userId,
    workItemId,
    startTime: currentTime.toISOString(),
    status: "ACTIVE"
  };

  const response = await fetch("/work-records", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Failed to start work record: ${response.status}`);
  }

  const result = await response.json();
  
  return {
    workRecordId: result.workRecordId,
    startTime: result.startTime,
    status: result.status
  };
}

export function isRecordActive(userId: string, activeRecord: ActiveRecord): boolean {
  // 前提: 作業開始記録が既にアクティブ状態で
  // 発生条件: 重複して開始ボタンがタップされたとき
  // 結果: エラーメッセージを表示し、既存の記録を継続する
  
  if (!activeRecord) {
    return false;
  }

  return activeRecord.userId === userId && activeRecord.status === "ACTIVE";
}

export function validateWorkStartOperation(
  userId: string,
  activeRecord: ActiveRecord
): ValidationResult {
  // 前提: 作業開始記録が既にアクティブ状態で
  // 発生条件: 重複して開始ボタンがタップされたとき
  // 結果: エラーメッセージを表示し、既存の記録を継続する
  
  const isActive = isRecordActive(userId, activeRecord);
  
  if (isActive) {
    return {
      isValid: false,
      errorMessage: "作業記録が既にアクティブ状態です。既存の記録を継続してください。",
      existingRecord: activeRecord
    };
  }

  return {
    isValid: true,
    errorMessage: "",
    existingRecord: activeRecord
  };
}