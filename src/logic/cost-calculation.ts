/**
 * 人件費率と原価計算モジュール
 * 工数実績データと売上データの照合、ROI分析、投資効果検証を行う
 */

// 基本型定義
export interface LaborCostCalculationInput {
  totalLaborCost: number;
  totalRevenue: number;
}

export interface ROICalculationInput {
  annualSavings: number;
  operatingCost: number;
  initialInvestment: number;
}

export interface PaybackPeriodInput {
  initialInvestment: number;
  annualSavings: number;
}

export interface CostAnalysisResult {
  laborCostRate: number;
  roi: number;
  paybackPeriod: number;
  isViable: boolean;
}

export interface InvestmentViabilityInput {
  roi: number;
  paybackPeriodMonths: number;
}

// 閾値定数
export const INVESTMENT_THRESHOLDS = {
  MIN_ROI_PERCENT: 15,
  MAX_PAYBACK_MONTHS: 24,
  RISK_COEFFICIENT: 0.8
} as const;

/**
 * 対応ルール: 工数実績データと売上データが存在する状態で売上データとの照合処理が実行されたとき → 工数実績データと売上データを自動照合し、人件費率を算出して基準値との乖離をチェックする
 */
export function calculateLaborCostRate(totalLaborCost: number, totalRevenue: number): number {
  if (totalRevenue <= 0) {
    throw new Error('売上高は0より大きい値である必要があります');
  }
  
  if (totalLaborCost < 0) {
    throw new Error('人件費は0以上の値である必要があります');
  }

  return (totalLaborCost / totalRevenue) * 100;
}

/**
 * 対応ルール: 工数削減効果と導入コストが算出されている状態でROI実績算出が実行されたとき → （年間工数削減による人件費削減額 - 年間システム運用費）÷ 初期導入費用 × 100でROI率を計算する
 */
export function calculateROI(annualSavings: number, operatingCost: number, initialInvestment: number): number {
  if (initialInvestment <= 0) {
    throw new Error('初期投資額は0より大きい値である必要があります');
  }

  const netAnnualSavings = annualSavings - operatingCost;
  return (netAnnualSavings / initialInvestment) * 100;
}

/**
 * 対応ルール: ROI実績がマイナス値を示している状態で全国展開判定が実行されたとき → 展開計画を保留し、改善施策の検討を推奨するアラートを生成する
 */
export function isROIPositive(roi: number): boolean {
  return roi > 0;
}

/**
 * 対応ルール: 投資回収期間が24ヶ月以内かつROI15%以上の場合に投資効果ありと判定する → 投資回収期間が3年以内かつROI15%以上の場合に投資効果ありと判定する
 */
export function calculatePaybackPeriod(initialInvestment: number, annualSavings: number): number {
  if (annualSavings <= 0) {
    throw new Error('年間削減効果は0より大きい値である必要があります');
  }

  if (initialInvestment <= 0) {
    throw new Error('初期投資額は0より大きい値である必要があります');
  }

  return initialInvestment / annualSavings;
}

/**
 * 対応ルール: 投資回収期間が24ヶ月以内かつROI15%以上の計画のみ承認対象とし、段階的実施スケジュールを確定する
 */
export function isInvestmentViable(roi: number, paybackPeriodMonths: number): boolean {
  return roi >= INVESTMENT_THRESHOLDS.MIN_ROI_PERCENT && 
         paybackPeriodMonths <= INVESTMENT_THRESHOLDS.MAX_PAYBACK_MONTHS;
}

/**
 * 対応ルール: 全国展開を想定したROI分析において投資回収シミュレーションが実行されたとき → スモールスタート実績データを基に全国680名展開時の効果を線形スケールで予測し、リスク係数0.8を適用して保守的なROIを算出する
 */
export function calculateConservativeROI(baseROI: number): number {
  return baseROI * INVESTMENT_THRESHOLDS.RISK_COEFFICIENT;
}

/**
 * 対応ルール: 拠点別に工数実績を集計し、売上高に対する人件費率と作業効率指標を算出して拠点間比較レポートを生成する
 */
export function calculateSiteEfficiencyMetrics(
  laborCost: number, 
  revenue: number, 
  totalWorkHours: number, 
  completedTasks: number
): { laborCostRate: number; efficiency: number } {
  const laborCostRate = calculateLaborCostRate(laborCost, revenue);
  
  if (totalWorkHours <= 0) {
    throw new Error('総作業時間は0より大きい値である必要があります');
  }

  const efficiency = completedTasks / totalWorkHours;
  
  return {
    laborCostRate,
    efficiency
  };
}

/**
 * 対応ルール: 人件費率が業界標準値を大幅に上回っている拠点において採算性分析結果が確定したとき → 該当拠点を要改善拠点として分類し、作業プロセス最適化の優先対象に設定する
 */
export function identifyImprovementSites(
  laborCostRate: number, 
  industryStandard: number, 
  thresholdPercent: number = 20
): boolean {
  const deviationPercent = ((laborCostRate - industryStandard) / industryStandard) * 100;
  return deviationPercent > thresholdPercent;
}

/**
 * 対応ルール: 現在の工数実績をベースラインとし、改善後の予想工数削減率を適用して年間削減効果を算出し、初期投資額との比較でROIを計算する
 */
export function calculateImprovementROI(
  currentAnnualLaborCost: number,
  reductionRate: number,
  initialInvestment: number,
  annualOperatingCost: number
): number {
  if (reductionRate < 0 || reductionRate > 1) {
    throw new Error('削減率は0から1の間の値である必要があります');
  }

  const annualSavings = currentAnnualLaborCost * reductionRate;
  return calculateROI(annualSavings, annualOperatingCost, initialInvestment);
}

/**
 * 対応ルール: 工数データを基にした作業効率改善効果と人件費削減効果を定量化し、ROI計算による投資回収期間を算出する
 */
export function analyzeCostBenefit(
  currentLaborCost: number,
  projectedSavings: number,
  initialInvestment: number,
  operatingCost: number
): CostAnalysisResult {
  const roi = calculateROI(projectedSavings, operatingCost, initialInvestment);
  const paybackPeriod = calculatePaybackPeriod(initialInvestment, projectedSavings - operatingCost);
  const paybackPeriodMonths = paybackPeriod * 12;
  
  return {
    laborCostRate: 0, // この関数では人件費率は計算対象外
    roi,
    paybackPeriod,
    isViable: isInvestmentViable(roi, paybackPeriodMonths)
  };
}

/**
 * 対応ルール: 各拠点の時間当たり作業完了件数を算出し、平均値からの乖離率で生産性ランキングを作成する
 */
export function calculateProductivityScore(
  completedTasks: number,
  totalHours: number,
  averageTasksPerHour: number
): number {
  if (totalHours <= 0) {
    throw new Error('総時間は0より大きい値である必要があります');
  }

  const tasksPerHour = completedTasks / totalHours;
  return ((tasksPerHour - averageTasksPerHour) / averageTasksPerHour) * 100;
}

/**
 * 対応ルール: 生産性上位3拠点をベストプラクティス候補とし、下位拠点には改善アクションプランの策定を必須とする
 */
export function categorizePerformance(productivityScore: number): 'top' | 'average' | 'improvement_required' {
  if (productivityScore >= 25) {
    return 'top';
  } else if (productivityScore >= -10) {
    return 'average';
  } else {
    return 'improvement_required';
  }
}