/** 作業記録の時間計算と工数算出 */

// 型定義
export interface WorkRecord {
  作業記録ID: string;
  作業員ID: string;
  作業日: string;
  作業開始時刻: string;
  作業終了時刻: string | null;
  作業時間: number | null;
  プロジェクト名: string;
  作業場所: string;
  作業種別: string;
  作業内容: string;
  進捗状況: string;
  備考: string | null;
  承認状態: string;
  承認者ID: string | null;
  承認日時: string | null;
  作成日時: string;
  更新日時: string;
  作成者ID: string;
}

export interface InterruptionRecord {
  中断記録ID: string;
  作業記録ID: string;
  中断開始日時: string;
  中断終了日時: string | null;
  中断理由区分: string;
  中断理由詳細: string | null;
  中断時間: number | null;
  影響度: string | null;
  対応状況: string;
  記録者ID: string;
  作成日時: string;
  更新日時: string;
}

export interface WorkItem {
  作業項目ID: string;
  作業項目コード: string;
  作業項目名: string;
  作業項目説明: string | null;
  カテゴリ: string | null;
  標準工数時間: number | null;
  表示順序: number;
  有効フラグ: boolean;
  作成日時: string;
  更新日時: string;
  作成者ID: string;
  更新者ID: string;
}

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
  確認日時: string | null;
  対応メモ: string | null;
  検出日時: string;
  作成日時: string;
  更新日時: string;
}

/** 対応ルール: 作業開始時刻と終了時刻が存在する状態で → 開始時刻との差分で作業時間を自動計算する */
export function calculateWorkDuration(startTime: string, endTime: string | null): number | null {
  if (!endTime) {
    return null;
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  // 日時の妥当性チェック
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return null;
  }

  // 終了時刻が開始時刻より前の場合は異常値
  if (endDate < startDate) {
    return null;
  }

  // 差分を分単位で計算
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));

  // 24時間（1440分）を超える場合は異常値
  if (durationMinutes > 1440) {
    return null;
  }

  return durationMinutes;
}

/** 対応ルール: 実績工数と計画工数が存在する状態で → 実績工数÷計画工数×100で進捗率を計算する */
export function calculateProgressRate(actualHours: number, plannedHours: number): number {
  if (plannedHours <= 0) {
    return 0;
  }

  if (actualHours < 0) {
    return 0;
  }

  const progressRate = (actualHours / plannedHours) * 100;
  
  // 小数点第1位で四捨五入
  return Math.round(progressRate * 10) / 10;
}

/** 対応ルール: 実績工数と計画工数が存在する状態で → 実績工数と計画工数の乖離率を算出する */
export function calculateDeviationRate(actualHours: number, plannedHours: number): number {
  if (plannedHours <= 0) {
    return 0;
  }

  if (actualHours < 0) {
    return 0;
  }

  const deviationRate = Math.abs(actualHours - plannedHours) / plannedHours * 100;
  
  // 小数点第1位で四捨五入
  return Math.round(deviationRate * 10) / 10;
}

/** 対応ルール: 中断開始時刻と終了時刻が存在する状態で → 中断開始時刻と終了時刻の差分を自動計算して待機時間として記録する */
export function calculateInterruptionDuration(startTime: string, endTime: string | null): number | null {
  if (!endTime) {
    return null;
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  // 日時の妥当性チェック
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return null;
  }

  // 終了時刻が開始時刻より前の場合は異常値
  if (endDate < startDate) {
    return null;
  }

  // 差分を分単位で計算
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));

  // 8時間（480分）を超える場合は異常値として検出
  if (durationMinutes > 480) {
    return null;
  }

  return durationMinutes;
}

/** 対応ルール: 工数データが記録される際に → 異常値（24時間超過、負の値等）が検出されたとき異常値アラートを表示する */
export function detectWorkTimeAnomaly(workTimeMinutes: number): boolean {
  // 負の値は異常
  if (workTimeMinutes < 0) {
    return true;
  }

  // 24時間（1440分）を超える場合は異常
  if (workTimeMinutes > 1440) {
    return true;
  }

  // 30分未満の場合は短時間作業として異常扱い
  if (workTimeMinutes < 30) {
    return true;
  }

  return false;
}

/** 対応ルール: 作業効率分析が実行されたとき → 過去データとの比較により効率低下を検出し、閾値を下回る場合はアラート通知する */
export function detectEfficiencyDecline(currentEfficiency: number, pastAverageEfficiency: number, threshold: number = 0.8): boolean {
  if (pastAverageEfficiency <= 0) {
    return false;
  }

  const efficiencyRatio = currentEfficiency / pastAverageEfficiency;
  
  // 閾値（デフォルト80%）を下回る場合は効率低下として検出
  return efficiencyRatio < threshold;
}

/** 対応ルール: 中断・待機時間のデータが蓄積されている状態で → 中断理由別の発生頻度と平均時間を集計し、ボトルネック要因を特定する */
export function analyzeInterruptionPattern(interruptions: InterruptionRecord[]): { [reason: string]: { count: number; averageMinutes: number } } {
  const reasonStats: { [reason: string]: { totalMinutes: number; count: number } } = {};

  interruptions.forEach(interruption => {
    const reason = interruption.中断理由区分;
    const minutes = interruption.中断時間 || 0;

    if (!reasonStats[reason]) {
      reasonStats[reason] = { totalMinutes: 0, count: 0 };
    }

    reasonStats[reason].totalMinutes += minutes;
    reasonStats[reason].count += 1;
  });

  const result: { [reason: string]: { count: number; averageMinutes: number } } = {};

  Object.keys(reasonStats).forEach(reason => {
    const stats = reasonStats[reason];
    result[reason] = {
      count: stats.count,
      averageMinutes: stats.count > 0 ? Math.round(stats.totalMinutes / stats.count) : 0
    };
  });

  return result;
}

/** 対応ルール: ROI分析・投資効果検証が実行されるとき → 投資回収期間が3年以内かつROIが15%以上の場合に投資効果ありと判定する */
export function evaluateROI(annualSavings: number, initialInvestment: number, targetROI: number = 15): { isViable: boolean; roi: number; paybackYears: number } {
  if (initialInvestment <= 0 || annualSavings <= 0) {
    return { isViable: false, roi: 0, paybackYears: 0 };
  }

  const roi = (annualSavings / initialInvestment) * 100;
  const paybackYears = initialInvestment / annualSavings;

  const isViable = roi >= targetROI && paybackYears <= 3;

  return {
    isViable,
    roi: Math.round(roi * 10) / 10,
    paybackYears: Math.round(paybackYears * 10) / 10
  };
}

/** 対応ルール: 季節変動パターン分析が実行されたとき → 月別・四半期別の工数変動率を算出し、前年同期比±20%を超える変動を異常値として検出する */
export function detectSeasonalAnomaly(currentPeriodHours: number, previousYearSamePeriodHours: number, threshold: number = 0.2): boolean {
  if (previousYearSamePeriodHours <= 0) {
    return false;
  }

  const variationRate = Math.abs(currentPeriodHours - previousYearSamePeriodHours) / previousYearSamePeriodHours;
  
  return variationRate > threshold;
}

/** 対応ルール: 拠点別生産性指標を算出し → 標準偏差による異常値を検出する */
export function calculateProductivityStats(productivityValues: number[]): { mean: number; standardDeviation: number; anomalyThreshold: number } {
  if (productivityValues.length === 0) {
    return { mean: 0, standardDeviation: 0, anomalyThreshold: 0 };
  }

  const mean = productivityValues.reduce((sum, value) => sum + value, 0) / productivityValues.length;
  
  const variance = productivityValues.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / productivityValues.length;
  const standardDeviation = Math.sqrt(variance);
  
  // 平均±3σを異常値の閾値とする
  const anomalyThreshold = mean + (3 * standardDeviation);

  return {
    mean: Math.round(mean * 100) / 100,
    standardDeviation: Math.round(standardDeviation * 100) / 100,
    anomalyThreshold: Math.round(anomalyThreshold * 100) / 100
  };
}

/** 対応ルール: 人件費率が業界標準値を大幅に上回っている拠点において → 該当拠点を要改善拠点として分類する */
export function classifyImprovementPriority(laborCostRate: number, industryStandard: number, threshold: number = 1.2): 'high' | 'medium' | 'low' {
  const ratio = laborCostRate / industryStandard;
  
  if (ratio >= threshold * 1.5) {
    return 'high';
  } else if (ratio >= threshold) {
    return 'medium';
  } else {
    return 'low';
  }
}