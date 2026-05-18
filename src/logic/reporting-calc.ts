// 作業記録の型定義
export interface WorkRecord {
  作業記録ID: string;
  作業員ID: string;
  作業日: Date;
  作業開始時刻: Date;
  作業終了時刻?: Date;
  作業時間?: number;
  プロジェクト名: string;
  作業場所: string;
  作業種別: string;
  作業内容: string;
  進捗状況: string;
  備考?: string;
  承認状態: string;
  承認者ID?: string;
  承認日時?: Date;
  作成日時: Date;
  更新日時: Date;
  作成者ID: string;
}

// 中断記録の型定義
export interface InterruptionRecord {
  中断記録ID: string;
  作業記録ID: string;
  中断開始日時: Date;
  中断終了日時?: Date;
  中断理由区分: string;
  中断理由詳細?: string;
  中断時間?: number;
  影響度?: string;
  対応状況: string;
  記録者ID: string;
  作成日時: Date;
  更新日時: Date;
}

// 効果測定結果の型定義
export interface EffectMeasurementResult {
  reductionRate: number;
  absoluteReduction: number;
}

// 予算差異分析結果の型定義
export interface BudgetVarianceResult {
  variance: number;
  variancePercent: number;
}

// 比較指標結果の型定義
export interface ComparisonMetricsResult {
  improvement: number;
  trend: string;
}

/** 対応ルール: 導入前の推定工数と実績工数を比較し、削減率を百分率で算出 */
export function calculateEffectMeasurement(
  beforeHours: number,
  afterHours: number
): EffectMeasurementResult {
  if (beforeHours <= 0) {
    return { reductionRate: 0, absoluteReduction: 0 };
  }

  const absoluteReduction = beforeHours - afterHours;
  const reductionRate = (absoluteReduction / beforeHours) * 100;

  return {
    reductionRate: Math.max(0, reductionRate),
    absoluteReduction: Math.max(0, absoluteReduction)
  };
}

/** 対応ルール: 総作業回数に対する工数入力完了回数の比率を算出し、80%以上を定着成功とする */
export function calculateAdoptionRate(
  completedInputs: number,
  totalWorkSessions: number
): number {
  if (totalWorkSessions <= 0) {
    return 0;
  }

  const adoptionRate = (completedInputs / totalWorkSessions) * 100;
  return Math.min(100, Math.max(0, adoptionRate));
}

/** 対応ルール: 計画工数との乖離率を算出 */
export function generateBudgetVariance(
  actualCost: number,
  budgetedCost: number
): BudgetVarianceResult {
  if (budgetedCost <= 0) {
    return { variance: 0, variancePercent: 0 };
  }

  const variance = actualCost - budgetedCost;
  const variancePercent = (variance / budgetedCost) * 100;

  return {
    variance,
    variancePercent
  };
}

/** 対応ルール: 前月比較と予算対比を含む分析レポートを自動生成 */
export function createComparisonMetrics(
  currentPeriod: WorkRecord[],
  previousPeriod: WorkRecord[]
): ComparisonMetricsResult {
  const currentTotalHours = currentPeriod.reduce((sum, record) => {
    return sum + (record.作業時間 || 0);
  }, 0);

  const previousTotalHours = previousPeriod.reduce((sum, record) => {
    return sum + (record.作業時間 || 0);
  }, 0);

  if (previousTotalHours <= 0) {
    return { improvement: 0, trend: 'stable' };
  }

  const improvement = ((currentTotalHours - previousTotalHours) / previousTotalHours) * 100;

  let trend: string;
  if (improvement > 5) {
    trend = 'increasing';
  } else if (improvement < -5) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }

  return {
    improvement,
    trend
  };
}

/** 対応ルール: 実績工数と計画工数を比較して進捗率と乖離率を算出 */
export function calculateProgressRate(
  actualHours: number,
  plannedHours: number
): { progressRate: number; deviationRate: number } {
  if (plannedHours <= 0) {
    return { progressRate: 0, deviationRate: 0 };
  }

  const progressRate = (actualHours / plannedHours) * 100;
  const deviationRate = Math.abs(progressRate - 100);

  return {
    progressRate: Math.max(0, progressRate),
    deviationRate
  };
}

/** 対応ルール: 作業時間が24時間を超える、または作業開始時刻が終了時刻より後の場合は異常値として検出 */
export function detectAnomalousValues(record: WorkRecord): boolean {
  // 作業時間が24時間（1440分）を超える場合
  if (record.作業時間 && record.作業時間 > 1440) {
    return true;
  }

  // 作業開始時刻が終了時刻より後の場合
  if (record.作業終了時刻&& record.作業開始時刻.getTime() > record.作業終了時刻.getTime()) {
    return true;
  }

  // 作業時間が負の値の場合
  if (record.作業時間 && record.作業時間 < 0) {
    return true;
  }

  return false;
}

/** 対応ルール: 中断時間が8時間を超える場合はアラートを表示 */
export function validateInterruptionTime(interruption: InterruptionRecord): boolean {
  if (interruption.中断時間 && interruption.中断時間 > 480) { // 8時間 = 480分
    return false; // アラート対象
  }
  return true;
}

/** 対応ルール: 作業時間が30分未満の場合は短時間作業として確認が必要 */
export function isShortDurationWork(workHours: number): boolean {
  return workHours < 30; // 30分未満
}

/** 対応ルール: ROI計算による投資回収期間を算出 */
export function calculateROI(
  annualSavings: number,
  annualOperatingCost: number,
  initialInvestment: number
): { roiPercent: number; paybackPeriod: number } {
  const netAnnualBenefit = annualSavings - annualOperatingCost;
  
  if (initialInvestment <= 0) {
    return { roiPercent: 0, paybackPeriod: 0 };
  }

  const roiPercent = (netAnnualBenefit / initialInvestment) * 100;
  const paybackPeriod = netAnnualBenefit > 0 ? initialInvestment / netAnnualBenefit : 0;

  return {
    roiPercent,
    paybackPeriod
  };
}

/** 対応ルール: 投資回収期間が3年以内かつROI15%以上の場合に投資効果ありと判定 */
export function evaluateInvestmentViability(
  roiPercent: number,
  paybackPeriod: number
): boolean {
  return paybackPeriod <= 3 && roiPercent >= 15;
}

/** 対応ルール: 拠点別生産性指標を算出し、標準偏差による異常値を検出 */
export function calculateProductivityMetrics(
  workRecords: WorkRecord[]
): { averageHoursPerTask: number; productivityIndex: number } {
  if (workRecords.length === 0) {
    return { averageHoursPerTask: 0, productivityIndex: 0 };
  }

  const totalHours = workRecords.reduce((sum, record) => sum + (record.作業時間 || 0), 0);
  const averageHoursPerTask = totalHours / workRecords.length;
  
  // 生産性指標は時間当たりの作業完了件数として計算
  const productivityIndex = totalHours > 0 ? (workRecords.length / totalHours) * 60 : 0; // 1時間あたりの作業件数

  return {
    averageHoursPerTask,
    productivityIndex
  };
}

/** 対応ルール: 人件費率を算出 */
export function calculateLaborCostRatio(
  totalLaborCost: number,
  totalRevenue: number
): number {
  if (totalRevenue <= 0) {
    return 0;
  }

  return (totalLaborCost / totalRevenue) * 100;
}

/** 対応ルール: 季節変動係数を算出 */
export function calculateSeasonalVariation(
  monthlyData: number[]
): { variationCoefficient: number; peakMonth: number; lowMonth: number } {
  if (monthlyData.length === 0) {
    return { variationCoefficient: 0, peakMonth: 0, lowMonth: 0 };
  }

  const average = monthlyData.reduce((sum, value) => sum + value, 0) / monthlyData.length;
  const variance = monthlyData.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / monthlyData.length;
  const standardDeviation = Math.sqrt(variance);
  
  const variationCoefficient = average > 0 ? (standardDeviation / average) * 100 : 0;
  
  const maxValue = Math.max(...monthlyData);
  const minValue = Math.min(...monthlyData);
  const peakMonth = monthlyData.indexOf(maxValue) + 1;
  const lowMonth = monthlyData.indexOf(minValue) + 1;

  return {
    variationCoefficient,
    peakMonth,
    lowMonth
  };
}