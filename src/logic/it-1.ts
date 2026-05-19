// SIG-PLAN:
// - 関数名: startWorkRecording
//   呼び出し例 (テスト中): startWorkRecording(workData, currentTime)
//     ※ workData = { employeeId: "EMP001", workType: "maintenance", facilityId: "FAC001" }
//     ※ currentTime = "2024-12-01T09:00:00Z"
//   await されてる?: はい
//   アクセスされるプロパティ: result.startTime, result.status, result.employeeId, result.workType, result.facilityId
//   → 結論: async function startWorkRecording(workData: WorkData, currentTime: string): Promise<WorkRecordResult>
//   → WorkData = { employeeId: string; workType: string; facilityId: string }
//   → WorkRecordResult = { workRecordId?: string; startTime: string; status: string; employeeId: string; workType: string; facilityId: string }
// - 関数名: validateWorkRecordingStart
//   呼び出し例 (テスト中): validateWorkRecordingStart(invalidWorkData)
//     ※ invalidWorkData = { employeeId: "", workType: "", facilityId: "" }
//   await されてる?: いいえ
//   アクセスされるプロパティ: validationResult.isValid, validationResult.errors, validationResult.missingFields
//   → 結論: function validateWorkRecordingStart(workData: WorkData): ValidationResult
//   → ValidationResult = { isValid: boolean; errors: string[]; missingFields: string[] }
// - 関数名: checkActiveWorkRecord
//   呼び出し例 (テスト中): checkActiveWorkRecord("EMP001")
//   await されてる?: いいえ
//   戻り値: boolean
//   → 結論: function checkActiveWorkRecord(employeeId: string): boolean

interface WorkData {
  employeeId: string;
  workType: string;
  facilityId: string;
}

interface WorkRecordResult {
  workRecordId?: string;
  startTime: string;
  status: string;
  employeeId: string;
  workType: string;
  facilityId: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  missingFields: string[];
}

// アクティブな作業記録を管理するためのメモリストレージ
const activeWorkRecords = new Map<string, { workRecordId: string; status: string; startTime: string }>();

export function validateWorkRecordingStart(workData: WorkData): ValidationResult {
  const errors: string[] = [];
  const missingFields: string[] = [];

  // 必須項目のバリデーション
  if (!workData.employeeId || workData.employeeId.trim() === "") {
    errors.push("作業員IDが未入力です");
    missingFields.push("employeeId");
  }

  if (!workData.workType || workData.workType.trim() === "") {
    errors.push("作業種別が未入力です");
    missingFields.push("workType");
  }

  if (!workData.facilityId || workData.facilityId.trim() === "") {
    errors.push("施設IDが未入力です");
    missingFields.push("facilityId");
  }

  return {
    isValid: errors.length === 0,
    errors,
    missingFields
  };
}

export function checkActiveWorkRecord(employeeId: string): boolean {
  const activeRecord = activeWorkRecords.get(employeeId);
  return activeRecord !== undefined && activeRecord.status === "active";
}

export async function startWorkRecording(workData: WorkData, currentTime: string): Promise<WorkRecordResult> {
  // バリデーションチェック
  const validation = validateWorkRecordingStart(workData);
  if (!validation.isValid) {
    throw new Error(`バリデーションエラー: ${validation.errors.join(", ")}`);
  }

  // アクティブな作業記録の重複チェック
  if (checkActiveWorkRecord(workData.employeeId)) {
    const error = new Error("既に作業が開始されています。既存の記録を継続してください。") as any;
    error.code = "WORK_ALREADY_ACTIVE";
    throw error;
  }

  try {
    // クラウドAPIに工数記録開始を送信
    const response = await fetch("/api/work-records/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        employeeId: workData.employeeId,
        workType: workData.workType,
        facilityId: workData.facilityId,
        startTime: currentTime
      })
    });

    if (!response.ok) {
      if (response.status === 409) {
        const errorData = await response.json();
        const error = new Error(errorData.message) as any;
        error.code = errorData.error;
        throw error;
      }
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();

    // アクティブ記録をメモリに保存
    activeWorkRecords.set(workData.employeeId, {
      workRecordId: result.workRecordId,
      status: result.status,
      startTime: result.startTime
    });

    return {
      workRecordId: result.workRecordId,
      startTime: result.startTime,
      status: result.status,
      employeeId: result.employeeId,
      workType: result.workType,
      facilityId: result.facilityId
    };

  } catch (error: any) {
    if (error.code) {
      throw error;
    }
    throw new Error(`工数記録開始に失敗しました: ${error.message}`);
  }
}