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
//   戻り値の使用: expect(isActive).toBe(true)
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

// アクティブな作業記録を管理するためのインメモリストレージ
const activeWorkRecords: Map<string, { workRecordId: string; status: string; startTime: string }> = new Map();

export async function startWorkRecording(workData: WorkData, currentTime: string): Promise<WorkRecordResult> {
  // 前提: 現場作業員がスマートフォンアプリを使用している状態で
  // 発生条件: 工数記録開始ボタンがタップされたとき
  // 結果: 現在時刻を作業開始時刻として自動記録し、記録状態をアクティブに変更する
  
  // 既にアクティブな作業があるかチェック
  if (checkActiveWorkRecord(workData.employeeId)) {
    throw {
      code: "WORK_ALREADY_ACTIVE",
      message: "既に作業が開始されています。既存の記録を継続してください。"
    };
  }

  // 必須項目のバリデーション
  const validation = validateWorkRecordingStart(workData);
  if (!validation.isValid) {
    throw {
      code: "VALIDATION_ERROR",
      message: "必須項目が未入力です",
      errors: validation.errors
    };
  }

  try {
    const response = await fetch('/api/work-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        employeeId: workData.employeeId,
        workType: workData.workType,
        facilityId: workData.facilityId,
        startTime: currentTime,
        status: 'active'
      })
    });

    if (!response.ok) {
      if (response.status === 409) {
        const errorData = await response.json();
        throw {
          code: errorData.error,
          message: errorData.message
        };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    
    // アクティブな作業記録として記録
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
    throw {
      code: "NETWORK_ERROR",
      message: "ネットワークエラーが発生しました"
    };
  }
}

export function validateWorkRecordingStart(workData: WorkData): ValidationResult {
  // 前提: 現場作業員がスマートフォンアプリで工数記録を開始する状態で
  // 発生条件: 工数記録開始ボタンがタップされたとき
  // 結果: 作業開始時刻を自動的に記録し、必須項目（作業員ID、作業種別、施設ID）の入力状態をチェックする
  
  const errors: string[] = [];
  const missingFields: string[] = [];

  // 作業員IDのチェック
  if (!workData.employeeId || workData.employeeId.trim() === '') {
    errors.push("作業員IDが未入力です");
    missingFields.push("employeeId");
  }

  // 作業種別のチェック
  if (!workData.workType || workData.workType.trim() === '') {
    errors.push("作業種別が未入力です");
    missingFields.push("workType");
  }

  // 施設IDのチェック
  if (!workData.facilityId || workData.facilityId.trim() === '') {
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
  // 前提: 作業開始記録が既にアクティブ状態で
  // 発生条件: 重複して開始ボタンがタップされたとき
  // 結果: エラーメッセージを表示し、既存の記録を継続する
  
  const activeRecord = activeWorkRecords.get(employeeId);
  return activeRecord !== undefined && activeRecord.status === 'active';
}