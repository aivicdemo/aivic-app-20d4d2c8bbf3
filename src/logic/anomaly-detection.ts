// 中断記録の型定義
export interface BreakRecord {
  中断記録ID: string;
  作業記録ID: string;
  中断開始日時: Date;
  中断終了日時: Date | null;
  中断理由区分: string;
  中断理由詳細: string | null;
  中断時間: number | null;
  影響度: string | null;
  対応状況: string;
  記録者ID: string;
  作成日時: Date;
  更新日時: Date;
}

// 異常値検出ログの型定義
export interface AnomalyDetectionLog {
  異常値検出ログID: string;
  検出対象テーブル: string;
  検出対象レコードID: string;
  ユーザーID: string;
  異常値種別: string;
  検出項目: string;
  検出値: string;
  閾値: string;
  重要度: string;
  確認状況: string;
  通知送信フラグ: boolean;
  確認者ID: string | null;
  確認日時: Date | null;
  対応メモ: string | null;
  検出日時: Date;
  作成日時: Date;
  更新日時: Date;
}

/** 対応ルール: 工数データで異常値（24時間超過、負の値等）が検出された場合 → アラートを表示する */
export function detectWorkTimeAnomaly(workDuration: number, threshold: number): boolean {
  // 負の値または閾値を超える場合は異常値
  return workDuration < 0 || workDuration > threshold;
}

/** 対応ルール: 待機時間が8時間を超える場合 → アラートを表示し承認者の確認を必須とする */
export function detectBreakTimeAnomaly(breakDuration: number): boolean {
  const BREAK_TIME_THRESHOLD = 8 * 60; // 8時間を分単位で表現
  return breakDuration > BREAK_TIME_THRESHOLD;
}

/** 対応ルール: 頻繁な中断が発生している場合 → 異常値として検出する */
export function detectFrequentBreaks(breakRecords: BreakRecord[]): boolean {
  // 1日あたりの中断回数が5回以上の場合を頻繁な中断とする
  const FREQUENT_BREAK_THRESHOLD = 5;
  
  // 日付別に中断回数をカウント
  const breakCountByDate = new Map<string, number>();
  
  breakRecords.forEach(record => {
    const dateKey = record.中断開始日時.toISOString().split('T')[0];
    const currentCount = breakCountByDate.get(dateKey) || 0;
    breakCountByDate.set(dateKey, currentCount + 1);
  });
  
  // いずれかの日で閾値を超えている場合は異常
  for (const count of breakCountByDate.values()) {
    if (count >= FREQUENT_BREAK_THRESHOLD) {
      return true;
    }
  }
  
  return false;
}

/** 対応ルール: 標準偏差の2倍を超える値 → 異常値として抽出する */
export function calculateAnomalyScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) {
    return 0;
  }
  
  // Z-scoreを計算（平均からの標準偏差倍数）
  const zScore = Math.abs(value - mean) / stdDev;
  return zScore;
}

/** 対応ルール: 通常の1.5倍を超える工数 → 異常値として自動フラグを立てる */
export function isEmergencyWorkTime(workDuration: number, normalThreshold: number): boolean {
  const EMERGENCY_MULTIPLIER = 1.5;
  return workDuration > normalThreshold * EMERGENCY_MULTIPLIER;
}

/** 対応ルール: 工数データの整合性チェック → 作業開始時刻が終了時刻より後の場合は異常値として検出 */
export function detectTimeSequenceAnomaly(startTime: Date, endTime: Date): boolean {
  return startTime.getTime() >= endTime.getTime();
}

/** 対応ルール: 短時間作業として確認が必要 → 作業時間が30分未満の場合 */
export function detectShortWorkTime(workDuration: number): boolean {
  const SHORT_WORK_THRESHOLD = 30; // 30分
  return workDuration < SHORT_WORK_THRESHOLD && workDuration > 0;
}

/** 対応ルール: 異常値の重要度レベルを判定 → 高、中、低で分類 */
export function calculateAnomalySeverity(anomalyScore: number): string {
  if (anomalyScore >= 3.0) {
    return '高';
  } else if (anomalyScore >= 2.0) {
    return '中';
  } else {
    return '低';
  }
}

/** 対応ルール: 前後3日間の平均値で異常値を補正 → データ補正処理 */
export function calculateCorrectionValue(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/** 対応ルール: 平均±3σ超の値を異常値として除外 → 分析対象から除外 */
export function isOutlier(value: number, mean: number, stdDev: number): boolean {
  const OUTLIER_THRESHOLD = 3.0;
  const zScore = Math.abs(value - mean) / stdDev;
  return zScore > OUTLIER_THRESHOLD;
}

/** 対応ルール: 重要な変動（前日比20%以上）を検出 → 即座に関係者に通知 */
export function detectSignificantVariation(currentValue: number, previousValue: number): boolean {
  if (previousValue === 0) {
    return currentValue > 0;
  }
  
  const VARIATION_THRESHOLD = 0.2; // 20%
  const variationRate = Math.abs(currentValue - previousValue) / previousValue;
  return variationRate >= VARIATION_THRESHOLD;
}

/** 対応ルール: 工数データの完全性チェック → 必須項目の未入力を検出 */
export function validateRequiredFields(record: {
  作業開始時刻?: Date;
  作業終了時刻?: Date;
  作業種別?: string;
  作業員ID?: string;
}): string[] {
  const missingFields: string[] = [];
  
  if (!record.作業開始時刻) {
    missingFields.push('作業開始時刻');
  }
  if (!record.作業終了時刻) {
    missingFields.push('作業終了時刻');
  }
  if (!record.作業種別) {
    missingFields.push('作業種別');
  }
  if (!record.作業員ID) {
    missingFields.push('作業員ID');
  }
  
  return missingFields;
}

/** 対応ルール: データ品質レベルの算出 → 異常値の割合に基づく品質評価 */
export function calculateDataQualityScore(totalRecords: number, anomalousRecords: number): number {
  if (totalRecords === 0) {
    return 0;
  }
  
  const qualityRate = (totalRecords - anomalousRecords) / totalRecords;
  return Math.max(0, Math.min(100, qualityRate * 100));
}

/** 対応ルール: 異常値検出アルゴリズムの統合判定 → 複数条件での総合評価 */
export function performComprehensiveAnomalyDetection(
  workDuration: number,
  breakDuration: number,
  breakRecords: BreakRecord[],
  historicalMean: number,
  historicalStdDev: number
): {
  hasAnomaly: boolean;
  anomalyTypes: string[];
  severity: string;
  score: number;
} {
  const anomalyTypes: string[] = [];
  let maxScore = 0;
  
  // 作業時間異常チェック（24時間 = 1440分）
  if (detectWorkTimeAnomaly(workDuration, 1440)) {
    anomalyTypes.push('長時間作業');
  }
  
  // 中断時間異常チェック
  if (detectBreakTimeAnomaly(breakDuration)) {
    anomalyTypes.push('長時間中断');
  }
  
  // 頻繁中断チェック
  if (detectFrequentBreaks(breakRecords)) {
    anomalyTypes.push('頻繁中断');
  }
  
  // 短時間作業チェック
  if (detectShortWorkTime(workDuration)) {
    anomalyTypes.push('短時間作業');
  }
  
  // 統計的異常チェック
  const anomalyScore = calculateAnomalyScore(workDuration, historicalMean, historicalStdDev);
  if (anomalyScore > 2.0) {
    anomalyTypes.push('統計的異常');
    maxScore = Math.max(maxScore, anomalyScore);
  }
  
  const severity = calculateAnomalySeverity(maxScore);
  
  return {
    hasAnomaly: anomalyTypes.length > 0,
    anomalyTypes,
    severity,
    score: maxScore
  };
}