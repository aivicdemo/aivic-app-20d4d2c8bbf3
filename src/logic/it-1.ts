// SIG-PLAN:
// - 関数名: startWorkRecording
//   呼び出し例 (テスト中): startWorkRecording(workData, currentTime)
//     ※ workData = { employeeId, workType, facilityId }, currentTime = "2024-12-01T09:00:00Z"
//   await されてる?: はい
//   アクセスされるプロパティ: result.startTime, result.status, result.employeeId, result.workType, result.facilityId
//   → 結論: async function startWorkRecording(workData: WorkData, currentTime: string): Promise<WorkRecordResult>
// - 関数名: validateWorkRecordingStart
//   呼び出し例 (テスト中): validateWorkRecordingStart(invalidWorkData)
//     ※ invalidWorkData = { employeeId: "", workType: "", facilityId: "" }
//   await されてる?: いいえ
//   アクセスされるプロパティ: validationResult.isValid, validationResult.errors, validationResult.missingFields
//   → 結論: function validateWorkRecordingStart(workData: WorkData): ValidationResult
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
const activeWorkRecords: Map<string, any> = new Map();

export async function startWorkRecording(workData: WorkData, currentTime: string): Promise<WorkRecordResult> {
  // 前提: 現場作業員がスマートフォンアプリを使用している状態で
  // 発生条件: 工数記録開始ボタンがタップされたとき
  // 結果: 現在時刻を作業開始時刻として自動記録し、記録状態をアクティブに変更する
  
  // 前提: 作業開始記録が既にアクティブ状態で
  // 発生条件: 重複して開始ボタンがタップされたとき
  // 結果: エラーメッセージを表示し、既存の記録を継続する
  if (checkActiveWorkRecord(workData.employeeId)) {
    throw {
      code: "WORK_ALREADY_ACTIVE",
      message: "既に作業が開始されています。既存の記録を継続してください。"
    };
  }

  // 必須項目バリデーション
  const validation = validateWorkRecordingStart(workData);
  if (!validation.isValid) {
    throw {
      code: "VALIDATION_ERROR",
      message: "必須項目が未入力です",
      errors: validation.errors
    };
  }

  try {
    const response = await fetch('/api/work-records/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...workData,
        startTime: currentTime
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
    
    // アクティブ記録として登録
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
  // 前提: 工数データが入力される際に
  // 発生条件: 必須項目が未入力の状態で保存が実行されたとき
  // 結果: バリデーションエラーを表示し、必須項目の入力を促す
  
  const errors: string[] = [];
  const missingFields: string[] = [];

  // 必須項目チェック: 作業員ID、作業種別、施設ID
  if (!workData.employeeId || workData.employeeId.trim() === '') {
    errors.push("作業員IDが未入力です");
    missingFields.push("employeeId");
  }

  if (!workData.workType || workData.workType.trim() === '') {
    errors.push("作業種別が未入力です");
    missingFields.push("workType");
  }

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
  // 前提: 同一作業員が複数の作業を並行して実行する状態で
  // 発生条件: 新しい作業開始ボタンがタップされた場合
  // 結果: 前の作業の終了確認ダイアログを表示し、明示的な終了操作を求める
  
  const activeRecord = activeWorkRecords.get(employeeId);
  return activeRecord && activeRecord.status === 'active';
}

// 作業完了時の工数記録終了機能
export async function completeWorkRecording(employeeId: string, endTime: string): Promise<WorkRecordResult> {
  // 前提: 工数記録がアクティブ状態で
  // 発生条件: 作業完了ボタンがタップされたとき
  // 結果: 現在時刻を作業終了時刻として記録し、開始時刻との差分で作業時間を自動計算してクラウドに保存する
  
  const activeRecord = activeWorkRecords.get(employeeId);
  if (!activeRecord) {
    throw {
      code: "NO_ACTIVE_WORK",
      message: "アクティブな作業記録が見つかりません"
    };
  }

  try {
    const response = await fetch('/api/work-records/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workRecordId: activeRecord.workRecordId,
        endTime: endTime
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    
    // アクティブ記録から削除
    activeWorkRecords.delete(employeeId);

    return result;
  } catch (error) {
    throw {
      code: "NETWORK_ERROR",
      message: "作業完了の記録に失敗しました"
    };
  }
}

// 中断記録機能
export async function recordWorkInterruption(workRecordId: string, interruptionData: {
  startTime: string;
  reason: string;
  reasonDetail?: string;
}): Promise<any> {
  // 前提: 現場作業員が作業中断する状況で
  // 発生条件: 中断ボタンがタップされたとき
  // 結果: 中断理由の選択を求め、中断時刻と理由を記録する
  
  try {
    const response = await fetch('/api/work-interruptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workRecordId,
        interruptionStartTime: interruptionData.startTime,
        interruptionReason: interruptionData.reason,
        interruptionReasonDetail: interruptionData.reasonDetail
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw {
      code: "NETWORK_ERROR",
      message: "中断記録の保存に失敗しました"
    };
  }
}

// 異常値検出機能
export function detectAnomalousWorkTime(workTimeMinutes: number): { isAnomalous: boolean; reason?: string } {
  // 前提: 工数データが記録される際に
  // 発生条件: 異常値（24時間超過、負の値等）が検出されたとき
  // 結果: 異常値アラートを表示し、データの確認を求める
  
  if (workTimeMinutes < 0) {
    return {
      isAnomalous: true,
      reason: "作業時間が負の値です"
    };
  }

  if (workTimeMinutes > 24 * 60) { // 24時間 = 1440分
    return {
      isAnomalous: true,
      reason: "作業時間が24時間を超えています"
    };
  }

  if (workTimeMinutes < 30) { // 30分未満
    return {
      isAnomalous: true,
      reason: "作業時間が30分未満です"
    };
  }

  return { isAnomalous: false };
}

// 工数データの整合性チェック
export function validateWorkTimeConsistency(startTime: string, endTime: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (isNaN(start.getTime())) {
    errors.push("作業開始時刻の形式が正しくありません");
  }
  
  if (isNaN(end.getTime())) {
    errors.push("作業終了時刻の形式が正しくありません");
  }
  
  if (start.getTime() >= end.getTime()) {
    errors.push("作業開始時刻が終了時刻より後になっています");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 作業時間自動計算
export function calculateWorkDuration(startTime: string, endTime: string, interruptionMinutes: number = 0): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  const totalMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  return Math.max(0, totalMinutes - interruptionMinutes);
}

// ローカルストレージ機能（オフライン対応）
export function saveToLocalStorage(workData: any): void {
  // 前提: 工数データがクラウドに保存される際に
  // 発生条件: ネットワーク接続が不安定または切断されているとき
  // 結果: ローカルストレージに一時保存し、接続復旧時に自動同期する
  
  try {
    const existingData = JSON.parse(localStorage.getItem('pendingWorkRecords') || '[]');
    existingData.push({
      ...workData,
      timestamp: new Date().toISOString(),
      synced: false
    });
    localStorage.setItem('pendingWorkRecords', JSON.stringify(existingData));
  } catch (error) {
    console.error('ローカルストレージへの保存に失敗しました:', error);
  }
}

// 同期処理
export async function syncPendingRecords(): Promise<{ success: number; failed: number }> {
  try {
    const pendingRecords = JSON.parse(localStorage.getItem('pendingWorkRecords') || '[]');
    const unsyncedRecords = pendingRecords.filter((record: any) => !record.synced);
    
    let successCount = 0;
    let failedCount = 0;
    
    for (const record of unsyncedRecords) {
      try {
        await fetch('/api/work-records/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(record)
        });
        
        record.synced = true;
        successCount++;
      } catch (error) {
        failedCount++;
      }
    }
    
    // 同期済みレコードを更新
    localStorage.setItem('pendingWorkRecords', JSON.stringify(pendingRecords));
    
    return { success: successCount, failed: failedCount };
  } catch (error) {
    return { success: 0, failed: 0 };
  }
}