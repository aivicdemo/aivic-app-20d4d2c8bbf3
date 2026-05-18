// 人件費計算と原価分析のための純関数モジュール

export interface WorkRecord {
  作業記録ID: string;
  作業員ID: string;
  作業日: Date;
  作業開始時刻: Date;
  作業終了時刻: Date | null;
  作業時間: number | null;
  プロジェクト名: string;
  作業場所: string;
  作業種別: string;
  作業内容: string;
  進捗状況: string;
  備考: string | null;
  承認状態: string;
  承認者ID: string | null;
  承認日時: Date | null;
  作成日時: Date;
  更新日時: Date;
  作成者ID: string;
}

export interface InterruptionRecord {
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

export interface CostCalculationResult {
  laborCostRate: number;
  emergencyResponseCost: number;
  roi: number;
  profitabilityIndex: number;
}

export interface EmergencyResponseData {
  emergencyHours: number;
  additionalStaff: number;
  hourlyRate: number;
  totalCost: number;
}

export interface ROIAnalysisData {
  annualSavings: number;
  operationCost: number;
  initialInvestment: number;
  roiPercentage: number;
  paybackPeriod: number;
}

export interface ProfitabilityData {
  revenue: number;
  laborCost: number;
  operationCost: number;
  profitMargin: number;
  profitabilityIndex: number;
}

/** 対応ルール: 工数実績データと売上データが存在する状態で売上データとの照合処理が実行されたとき → 工数実績データと売上データを自動照合し、人件費率を算出して基準値との乖離をチェックする */
export const calculateLaborCostRate = (totalHours: number, totalRevenue: number, hourlyRate: number): number => {
  if (totalRevenue <= 0) {
    return 0;
  }
  
  const totalLaborCost = totalHours * hourlyRate;
  const laborCostRate = (totalLaborCost / totalRevenue) * 100;
  
  return Math.round(laborCostRate * 100) / 100;
};

/** 対応ルール: 緊急対応が完了した状態で緊急対応フローが終了したとき → 対応開始から完了までの総工数と追加人件費を自動算出し、緊急対応コストレポートを生成する */
export const calculateEmergencyResponseCost = (emergencyHours: number, additionalStaff: number, hourlyRate: number): number => {
  const baseCost = emergencyHours * hourlyRate;
  const additionalStaffCost = additionalStaff * hourlyRate * emergencyHours;
  const totalCost = baseCost + additionalStaffCost;
  
  return Math.round(totalCost * 100) / 100;
};

/** 対応ルール: ROI実績が算出されている状態でROI実績算出が実行されたとき → （年間工数削減による人件費削減額 - 年間システム運用費）÷ 初期導入費用 × 100でROI率を計算する */
export const calculateROI = (annualSavings: number, operationCost: number, initialInvestment: number): number => {
  if (initialInvestment <= 0) {
    return 0;
  }
  
  const netAnnualBenefit = annualSavings - operationCost;
  const roiPercentage = (netAnnualBenefit / initialInvestment) * 100;
  
  return Math.round(roiPercentage * 100) / 100;
};

/** 対応ルール: 各拠点の工数データと売上データが揃っている状態で拠点別採算性分析が実行されたとき → 拠点別に工数実績を集計し、売上高に対する人件費率と作業効率指標を算出して拠点間比較レポートを生成する */
export const calculateProfitabilityIndex = (revenue: number, laborCost: number, operationCost: number): number => {
  if (revenue <= 0) {
    return 0;
  }
  
  const totalCost = laborCost + operationCost;
  const profit = revenue - totalCost;
  const profitabilityIndex = (profit / revenue) * 100;
  
  return Math.round(profitabilityIndex * 100) / 100;
};

export const calculatePaybackPeriod = (initialInvestment: number, annualSavings: number, operationCost: number): number => {
  const netAnnualBenefit = annualSavings - operationCost;
  
  if (netAnnualBenefit <= 0) {
    return Infinity;
  }
  
  const paybackPeriod = initialInvestment / netAnnualBenefit;
  return Math.round(paybackPeriod * 100) / 100;
};

export const calculateWorkEfficiencyRate = (actualHours: number, plannedHours: number): number => {
  if (plannedHours <= 0) {
    return 0;
  }
  
  const efficiencyRate = (plannedHours / actualHours) * 100;
  return Math.round(efficiencyRate * 100) / 100;
};

export const calculateProgressRate = (actualHours: number, plannedHours: number): number => {
  if (plannedHours <= 0) {
    return 0;
  }
  
  const progressRate = (actualHours / plannedHours) * 100;
  return Math.round(progressRate * 100) / 100;
};

export const calculateDeviationRate = (actualValue: number, plannedValue: number): number => {
  if (plannedValue <= 0) {
    return 0;
  }
  
  const deviationRate = ((actualValue - plannedValue) / plannedValue) * 100;
  return Math.round(deviationRate * 100) / 100;
};

export const isAnomalousWorkHours = (workHours: number): boolean => {
  return workHours > 24 || workHours < 0;
};

export const isShortWorkSession = (workHours: number): boolean => {
  return workHours < 0.5; // 30分未満
};

export const isExcessiveWorkHours = (workHours: number): boolean => {
  return workHours > 8; // 8時間超過
};

export const calculateInterruptionImpact = (interruptionHours: number, totalWorkHours: number): number => {
  if (totalWorkHours <= 0) {
    return 0;
  }
  
  const impactRate = (interruptionHours / totalWorkHours) * 100;
  return Math.round(impactRate * 100) / 100;
};

export const calculateProductivityIndex = (completedTasks: number, totalHours: number): number => {
  if (totalHours <= 0) {
    return 0;
  }
  
  const productivityIndex = completedTasks / totalHours;
  return Math.round(productivityIndex * 100) / 100;
};

export const calculateCostReductionEffect = (beforeCost: number, afterCost: number): number => {
  if (beforeCost <= 0) {
    return 0;
  }
  
  const reductionRate = ((beforeCost - afterCost) / beforeCost) * 100;
  return Math.round(reductionRate * 100) / 100;
};

export const isInvestmentViable = (roi: number, paybackPeriod: number): boolean => {
  return roi >= 15 && paybackPeriod <= 3;
};

export const calculateSeasonalVariation = (currentValue: number, previousYearValue: number): number => {
  if (previousYearValue <= 0) {
    return 0;
  }
  
  const variationRate = ((currentValue - previousYearValue) / previousYearValue) * 100;
  return Math.round(variationRate * 100) / 100;
};

export const isSignificantVariation = (variationRate: number): boolean => {
  return Math.abs(variationRate) > 20;
};

export const calculateOptimalStaffAllocation = (totalWorkload: number, averageProductivity: number): number => {
  if (averageProductivity <= 0) {
    return 0;
  }
  
  const requiredStaff = Math.ceil(totalWorkload / averageProductivity);
  return requiredStaff;
};

export const calculateQualityIndex = (defectCount: number, totalTasks: number): number => {
  if (totalTasks <= 0) {
    return 100;
  }
  
  const qualityIndex = ((totalTasks - defectCount) / totalTasks) * 100;
  return Math.round(qualityIndex * 100) / 100;
};