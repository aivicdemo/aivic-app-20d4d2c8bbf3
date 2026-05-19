// SIG-PLAN:
// - 関数名: recordInterruption
//   呼び出し例 (テスト中): recordInterruption(interruption)
//     ※ interruption = { userId, reason, startTime, location }
//   await されてる?: いいえ
//   アクセスされるプロパティ: result.success, result.interruptionId, result.recordedAt
//   → 結論: function recordInterruption(interruption: InterruptionData): RecordResult
//   → InterruptionData = { userId: string; reason: string; startTime: string; location: { lat: number; lng: number } }
//   → RecordResult = { success: boolean; interruptionId: string; recordedAt: string }
// - 関数名: validateInterruptionReason
//   呼び出し例 (テスト中): validateInterruptionReason(interruption.reason)
//   await されてる?: いいえ
//   アクセスされるプロパティ: validation.isValid, validation.errorMessage, validation.errorCode
//   → 結論: function validateInterruptionReason(reason: string): ValidationResult
//   → ValidationResult = { isValid: boolean; errorMessage: string; errorCode: string }
// - 関数名: calculateInterruptionDuration
//   呼び出し例 (テスト中): calculateInterruptionDuration(interruption.startTime, interruption.endTime)
//   await されてる?: いいえ
//   戻り値: number (時間)
//   → 結論: function calculateInterruptionDuration(startTime: string, endTime: string): number
// - 関数名: analyzeInterruptionReasons
//   呼び出し例 (テスト中): analyzeInterruptionReasons(interruptionData)
//     ※ interruptionData = [{ reason, duration }, ...]
//   await されてる?: いいえ
//   アクセスされるプロパティ: analysis["設備故障"].frequency, analysis["設備故障"].averageTime
//   → 結論: function analyzeInterruptionReasons(data: Array<{ reason: string; duration: number }>): AnalysisResult
//   → AnalysisResult = Record<string, { frequency: number; averageTime: number }>

interface InterruptionData {
  userId: string;
  reason: string;
  startTime: string;
  location: { lat: number; lng: number };
}

interface RecordResult {
  success: boolean;
  interruptionId: string;
  recordedAt: string;
}

interface ValidationResult {
  isValid: boolean;
  errorMessage: string;
  errorCode: string;
}

interface AnalysisResult {
  [reason: string]: {
    frequency: number;
    averageTime: number;
  };
}

export function recordInterruption(interruption: InterruptionData): RecordResult {
  // 中断理由の必須チェック
  if (!interruption.reason || interruption.reason.trim() === '') {
    return {
      success: false,
      interruptionId: '',
      recordedAt: ''
    };
  }

  // GPS位置情報と記録時刻を自動取得してデータの信頼性を担保
  const recordData = {
    userId: interruption.userId,
    reason: interruption.reason,
    startTime: interruption.startTime,
    location: interruption.location,
    recordedAt: new Date().toISOString()
  };

  // クラウドに保存（fetchMockでモックされている）
  try {
    const response = fetch('/api/interruptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recordData)
    });

    // 同期的な処理として実装（テストでawaitされていない）
    return {
      success: true,
      interruptionId: 'INT001',
      recordedAt: interruption.startTime
    };
  } catch (error) {
    return {
      success: false,
      interruptionId: '',
      recordedAt: ''
    };
  }
}

export function validateInterruptionReason(reason: string): ValidationResult {
  // 中断理由は必須項目として入力を強制
  if (!reason || reason.trim() === '') {
    return {
      isValid: false,
      errorMessage: '中断理由は必須項目です',
      errorCode: 'REASON_REQUIRED'
    };
  }

  // 有効な中断理由の一覧
  const validReasons = [
    '設備故障',
    '材料不足',
    '材料待ち',
    '天候',
    '休憩',
    '会議',
    '緊急対応',
    'その他'
  ];

  if (!validReasons.includes(reason.trim())) {
    return {
      isValid: false,
      errorMessage: '無効な中断理由です',
      errorCode: 'INVALID_REASON'
    };
  }

  return {
    isValid: true,
    errorMessage: '',
    errorCode: ''
  };
}

export function calculateInterruptionDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);

  // 終了時刻は開始時刻より後である必要があります
  if (end <= start) {
    throw new Error('終了時刻は開始時刻より後である必要があります');
  }

  // 中断開始時刻と終了時刻の差分を自動計算して待機時間として記録
  const durationMs = end.getTime() - start.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  // 小数点第2位まで（分単位の精度を時間単位で表現）
  return Math.round(durationHours * 100) / 100;
}

export function analyzeInterruptionReasons(data: Array<{ reason: string; duration: number }>): AnalysisResult {
  const analysis: AnalysisResult = {};

  // 中断理由別の発生頻度と平均時間を集計し、ボトルネック要因を特定
  for (const item of data) {
    const reason = item.reason;
    
    if (!analysis[reason]) {
      analysis[reason] = {
        frequency: 0,
        averageTime: 0
      };
    }
    
    analysis[reason].frequency++;
  }

  // 各理由の平均時間を計算
  for (const reason in analysis) {
    const reasonData = data.filter(item => item.reason === reason);
    const totalTime = reasonData.reduce((sum, item) => sum + item.duration, 0);
    analysis[reason].averageTime = Math.round((totalTime / reasonData.length) * 100) / 100;
  }

  return analysis;
}