// SIG-PLAN:
// - 関数名: startWorkRecord
//   呼び出し例 (テスト中): startWorkRecord(userId, workItemId, currentTime)
//   await されてる?: はい
//   アクセスされるプロパティ: result.workRecordId, result.startTime, result.status
//   → 結論: async function startWorkRecord(userId: string, workItemId: string, currentTime: Date): Promise<WorkRecordResult>
//   → WorkRecordResult = { workRecordId: string; startTime: string; status: string }
// - 関数名: isRecordActive
//   呼び出し例 (テスト中): isRecordActive(userId, activeRecord)
//   await されてる?: いいえ
//   アクセスされるプロパティ: 戻り値は boolean
//   → 結論: function isRecordActive(userId: string, activeRecord: ActiveRecord): boolean
//   → ActiveRecord = { workRecordId: string; userId: string; startTime: string; status: string }
// - 関数名: validateWorkStartOperation
//   呼び出し例 (テスト中): validateWorkStartOperation(userId, activeRecord)
//   await されてる?: いいえ
//   アクセスされるプロパティ: result.isValid, result.errorMessage, result.existingRecord
//   → 結論: function validateWorkStartOperation(userId: string, activeRecord: ActiveRecord): ValidationResult
//   → ValidationResult = { isValid: boolean; errorMessage?: string; existingRecord?: ActiveRecord }

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
  errorMessage?: string;
  existingRecord?: ActiveRecord;
}

export async function startWorkRecord(
  userId: string,
  workItemId: string,
  currentTime: Date
): Promise<WorkRecordResult> {
  // 作業開始時刻を自動記録し、記録状態をアクティブに変更する
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
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return {
    workRecordId: data.workRecordId,
    startTime: data.startTime,
    status: data.status
  };
}

export function isRecordActive(userId: string, activeRecord: ActiveRecord | null): boolean {
  // 指定されたユーザーIDの作業記録がアクティブ状態かどうかを判定
  if (!activeRecord) {
    return false;
  }
  
  return activeRecord.userId === userId && activeRecord.status === "ACTIVE";
}

export function validateWorkStartOperation(
  userId: string,
  activeRecord: ActiveRecord | null
): ValidationResult {
  // 作業開始操作の妥当性を検証し、重複開始を防ぐ
  if (activeRecord && isRecordActive(userId, activeRecord)) {
    return {
      isValid: false,
      errorMessage: "作業記録が既にアクティブ状態です。既存の記録を継続してください。",
      existingRecord: activeRecord
    };
  }

  return {
    isValid: true
  };
}