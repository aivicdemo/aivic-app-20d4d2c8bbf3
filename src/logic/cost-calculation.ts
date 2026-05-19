/**
 * 人件費率計算と採算性分析モジュール
 */

// 基本型定義
export interface LaborCostCalculation {
  totalHours: number;
  totalRevenue: number;
  hourlyRate: number;
  laborCostRate: number;
}

export interface ROICalculation {
  annualSavings: number;
  operationalCost: number;
  initialInvestment: number;
  roi: number;
}

export interface PaybackAnalysis {
  initialInvestment: number;
  annualSavings: number;
  paybackPeriod: number;
}

export interface InvestmentViability {
  roi: number;
  paybackPeriod: number;
  isViable: boolean;
}

export interface ProfitabilityAnalysis {
  laborCostRate: number;
  roi: number;
  paybackPeriod: number;
  isViable: boolean;
  totalLaborCost: number;
  netAnnualSavings: number;
}

/** 対応ルール: 工数実績と売上データが存在する状態で売上データとの照合処理が実行されたとき → 工数実績データと売上データを自動照合し、人件費率を算出して基準値との乖離をチェックする */
export const calculateLaborCostRate = (
  totalHours: number,
  totalRevenue: number,
  hourlyRate: number
): number => {
  if (totalRevenue <= 0) {
    return 0;
  }
  
  const totalLaborCost = totalHours * hourlyRate;
  const laborCostRate = (totalLaborCost / totalRevenue) * 100;
  
  return Math.round(laborCostRate * 100) / 100;
};

/** 対応ルール: 工数削減効果と導入コストが算出されている状態でROI実績算出が実行されたとき → （年間工数削減による人件費削減額 - 年間システム運用費）÷ 初期導入費用 × 100でROI率を計算する */
export const calculateROI = (
  annualSavings: number,
  operationalCost: number,
  initialInvestment: number
): number => {
  if (initialInvestment <= 0) {
    return 0;
  }
  
  const netAnnualSavings = annualSavings - operationalCost;
  const roi = (netAnnualSavings / initialInvestment) * 100;
  
  return Math.round(roi * 100) / 100;
};

/** 対応ルール: ROI分析で投資効果ありと判定された改善提案について投資回収シミュレーションが実行されたとき → 投資回収期間を算出する */
export const calculatePaybackPeriod = (
  initialInvestment: number,
  annualSavings: number
): number => {
  if (annualSavings <= 0) {
    return Infinity;
  }
  
  const paybackPeriod = initialInvestment / annualSavings;
  
  return Math.round(paybackPeriod * 100) / 100;
};

/** 対応ルール: ROI分析結果が投資効果ありと判定された状態で予算計画承認プロセスが開始されたとき → 投資回収期間が3年以内かつROI15%以上の場合に投資効果ありと判定する */
export const isInvestmentViable = (
  roi: number,
  paybackPeriod: number
): boolean => {
  const ROI_THRESHOLD = 15;
  const PAYBACK_THRESHOLD = 3;
  
  return roi >= ROI_THRESHOLD && paybackPeriod <= PAYBACK_THRESHOLD;
};

/** 対応ルール: 各拠点の工数データと売上データが揃っている状態で拠点別採算性分析が実行されたとき → 拠点別に工数実績を集計し、売上高に対する人件費率と作業効率指標を算出して拠点間比較レポートを生成する */
export const analyzeProfitability = (
  totalHours: number,
  totalRevenue: number,
  hourlyRate: number,
  annualSavings: number,
  operationalCost: number,
  initialInvestment: number
): ProfitabilityAnalysis => {
  const laborCostRate = calculateLaborCostRate(totalHours, totalRevenue, hourlyRate);
  const roi = calculateROI(annualSavings, operationalCost, initialInvestment);
  const paybackPeriod = calculatePaybackPeriod(initialInvestment, annualSavings);
  const isViable = isInvestmentViable(roi, paybackPeriod);
  const totalLaborCost = totalHours * hourlyRate;
  const netAnnualSavings = annualSavings - operationalCost;
  
  return {
    laborCostRate,
    roi,
    paybackPeriod,
    isViable,
    totalLaborCost,
    netAnnualSavings
  };
};

/** 対応ルール: 人件費率が業界標準値を大幅に上回っている拠点において採算性分析結果が確定したとき → 該当拠点を要改善拠点として分類し、作業プロセス最適化の優先対象に設定する */
export const identifyImprovementTargets = (
  laborCostRate: number,
  industryStandard: number = 30
): boolean => {
  const DEVIATION_THRESHOLD = 1.2; // 20%以上の乖離
  
  return laborCostRate > (industryStandard * DEVIATION_THRESHOLD);
};

/** 対応ルール: 全国展開を想定したROI分析において投資回収シミュレーションが実行されたとき → スモールスタート実績データを基に全国680名展開時の効果を線形スケールで予測し、リスク係数0.8を適用して保守的なROIを算出する */
export const calculateNationalExpansionROI = (
  smallStartROI: number,
  smallStartScale: number,
  nationalScale: number = 680
): number => {
  const RISK_COEFFICIENT = 0.8;
  const scaleMultiplier = nationalScale / smallStartScale;
  const projectedROI = smallStartROI * scaleMultiplier * RISK_COEFFICIENT;
  
  return Math.round(projectedROI * 100) / 100;
};

/** 対応ルール: 改善計画が策定された状態で経営陣による承認プロセスが開始されたとき → 投資回収期間が24ヶ月以内かつROI15%以上の計画のみ承認対象とし、段階的実施スケジュールを確定する */
export const isImprovementPlanApproved = (
  roi: number,
  paybackPeriodMonths: number
): boolean => {
  const ROI_THRESHOLD = 15;
  const PAYBACK_THRESHOLD_MONTHS = 24;
  
  return roi >= ROI_THRESHOLD && paybackPeriodMonths <= PAYBACK_THRESHOLD_MONTHS;
};

/** 対応ルール: 投資額に対する年間削減効果を算出し、投資回収期間が3年以内かつROIが15%以上の場合に投資効果ありと判定する */
export const calculateInvestmentEffectiveness = (
  investmentAmount: number,
  annualReduction: number
): { roi: number; paybackPeriod: number; isEffective: boolean } => {
  const roi = (annualReduction / investmentAmount) * 100;
  const paybackPeriod = investmentAmount / annualReduction;
  const isEffective = roi >= 15 && paybackPeriod <= 3;
  
  return {
    roi: Math.round(roi * 100) / 100,
    paybackPeriod: Math.round(paybackPeriod * 100) / 100,
    isEffective
  };
};

/** 対応ルール: ROI実績がマイナス値を示している状態で全国展開判定が実行されたとき → 展開計画を保留し、改善施策の検討を推奨するアラートを生成する */
export const shouldProceedWithExpansion = (roi: number): boolean => {
  return roi > 0;
};