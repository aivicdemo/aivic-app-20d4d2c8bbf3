// 作業記録の基本型定義
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

// 中断記録の型定義
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

// 生産性指標の計算結果型
export interface ProductivityMetrics {
  completionRate: number;
  adoptionRate: number;
  efficiencyImprovement: number;
  isViable: boolean;
}

// ROI分析結果型
export interface ROIAnalysis {
  roi: number;
  paybackPeriod: number;
  isViable: boolean;
  annualSavings: number;
  initialInvestment: number;
}

// 効率性分析結果型
export interface EfficiencyAnalysis {
  beforeEfficiency: number;
  afterEfficiency: number;
  improvementRate: number;
  isSignificant: boolean;
}

/** 対応ルール: 各拠点の時間当たり作業完了件数を算出し、平均値からの乖離率で生産性ランキングを作成する */
export const calculateWorkCompletionRate = (completedTasks: number, totalTasks: number): number => {
  if (totalTasks === 0) {
    return 0;
  }
  
  if (completedTasks < 0 || totalTasks < 0) {
    return 0;
  }
  
  if (completedTasks > totalTasks) {
    return 100;
  }
  
  return Math.round((completedTasks / totalTasks) * 100 * 100) / 100;
};

/** 対応ルール: 総作業回数に対する工数入力完了回数の比率を算出し、80%以上を定着成功とする */
export const calculateInputAdoptionRate = (completedInputs: number, totalWorkSessions: number): number => {
  if (totalWorkSessions === 0) {
    return 0;
  }
  
  if (completedInputs < 0 || totalWorkSessions < 0) {
    return 0;
  }
  
  if (completedInputs > totalWorkSessions) {
    return 100;
  }
  
  const adoptionRate = (completedInputs / totalWorkSessions) * 100;
  return Math.round(adoptionRate * 100) / 100;
};

/** 対応ルール: 導入前の推定工数と実績工数を比較し、削減率を百分率で算出する */
export const calculateEfficiencyImprovement = (beforeHours: number, afterHours: number): number => {
  if (beforeHours <= 0) {
    return 0;
  }
  
  if (afterHours < 0) {
    return 0;
  }
  
  if (afterHours >= beforeHours) {
    return 0;
  }
  
  const improvementRate = ((beforeHours - afterHours) / beforeHours) * 100;
  return Math.round(improvementRate * 100) / 100;
};

/** 対応ルール: 投資回収期間が24ヶ月以内かつROI15%以上の計画のみ承認対象とする */
export const isInvestmentViable = (roi: number, paybackPeriod: number): boolean => {
  return roi >= 15 && paybackPeriod <= 24;
};

/** 対応ルール: 実績工数÷計画工数×100で進捗率を計算し、乖離率も同時に算出する */
export const calculateProgressRate = (actualHours: number, plannedHours: number): { progressRate: number; deviationRate: number } => {
  if (plannedHours <= 0) {
    return { progressRate: 0, deviationRate: 0 };
  }
  
  if (actualHours < 0) {
    return { progressRate: 0, deviationRate: 0 };
  }
  
  const progressRate = Math.round((actualHours / plannedHours) * 100 * 100) / 100;
  const deviationRate = Math.round(Math.abs(progressRate - 100) * 100) / 100;
  
  return { progressRate, deviationRate };
};

/** 対応ルール: 工数実績と売上データを自動照合し人件費率を算出する */
export const calculateLaborCostRatio = (totalLaborCost: number, totalRevenue: number): number => {
  if (totalRevenue <= 0) {
    return 0;
  }
  
  if (totalLaborCost < 0) {
    return 0;
  }
  
  const laborCostRatio = (totalLaborCost / totalRevenue) * 100;
  return Math.round(laborCostRatio * 100) / 100;
};

/** 対応ルール: （年間工数削減による人件費削減額 - 年間システム運用費）÷ 初期導入費用 × 100でROI率を計算する */
export const calculateROI = (annualLaborSavings: number, annualOperatingCost: number, initialInvestment: number): number => {
  if (initialInvestment <= 0) {
    return 0;
  }
  
  const netAnnualBenefit = annualLaborSavings - annualOperatingCost;
  const roi = (netAnnualBenefit / initialInvestment) * 100;
  
  return Math.round(roi * 100) / 100;
};

/** 対応ルール: 投資回収期間が3年以内かつROI15%以上の場合に投資効果ありと判定する */
export const evaluateInvestmentEffectiveness = (roi: number, paybackPeriod: number): boolean => {
  return roi >= 15 && paybackPeriod <= 36;
};

/** 対応ルール: 作業時間が24時間を超える、または作業開始時刻が終了時刻より後の場合は異常値として検出する */
export const detectWorkTimeAnomalies = (startTime: Date, endTime: Date | null): boolean => {
  if (!endTime) {
    return false;
  }
  
  const workTimeHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  
  if (workTimeHours > 24) {
    return true;
  }
  
  if (startTime.getTime() > endTime.getTime()) {
    return true;
  }
  
  return false;
};

/** 対応ルール: 標準偏差の2倍を超える値を異常値として抽出する */
export const detectStatisticalAnomalies = (values: number[], threshold: number = 2): number[] => {
  if (values.length === 0) {
    return [];
  }
  
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  
  const upperBound = mean + (threshold * standardDeviation);
  const lowerBound = mean - (threshold * standardDeviation);
  
  return values.filter(value => value > upperBound || value < lowerBound);
};

/** 対応ルール: 拠点別生産性指標を算出し、標準偏差による異常値を検出する */
export const calculateSiteProductivityMetrics = (siteData: { siteId: string; completedTasks: number; totalHours: number }[]): { siteId: string; productivity: number; isAnomaly: boolean }[] => {
  const productivityData = siteData.map(site => ({
    siteId: site.siteId,
    productivity: site.totalHours > 0 ? Math.round((site.completedTasks / site.totalHours) * 100) / 100 : 0
  }));
  
  const productivityValues = productivityData.map(data => data.productivity);
  const anomalies = detectStatisticalAnomalies(productivityValues);
  
  return productivityData.map(data => ({
    ...data,
    isAnomaly: anomalies.includes(data.productivity)
  }));
};

/** 対応ルール: 過去の工数実績データを分析して当日の作業量予測と必要人員数を自動算出する */
export const predictDailyWorkload = (historicalData: { date: Date; totalHours: number; workerCount: number }[], targetDate: Date): { predictedHours: number; requiredWorkers: number } => {
  if (historicalData.length === 0) {
    return { predictedHours: 0, requiredWorkers: 0 };
  }
  
  // 同じ曜日のデータを抽出
  const targetDayOfWeek = targetDate.getDay();
  const sameDayData = historicalData.filter(data => data.date.getDay() === targetDayOfWeek);
  
  if (sameDayData.length === 0) {
    // 同じ曜日のデータがない場合は全データの平均を使用
    const avgHours = historicalData.reduce((sum, data) => sum + data.totalHours, 0) / historicalData.length;
    const avgWorkers = historicalData.reduce((sum, data) => sum + data.workerCount, 0) / historicalData.length;
    
    return {
      predictedHours: Math.round(avgHours * 100) / 100,
      requiredWorkers: Math.ceil(avgWorkers)
    };
  }
  
  const avgHours = sameDayData.reduce((sum, data) => sum + data.totalHours, 0) / sameDayData.length;
  const avgWorkers = sameDayData.reduce((sum, data) => sum + data.workerCount, 0) / sameDayData.length;
  
  return {
    predictedHours: Math.round(avgHours * 100) / 100,
    requiredWorkers: Math.ceil(avgWorkers)
  };
};

/** 対応ルール: 緊急対応時の最適人員配置を自動算出し、優先度の高い作業から人員を割り当てる */
export const calculateOptimalStaffAllocation = (
  emergencyTasks: { taskId: string; priority: number; estimatedHours: number; requiredSkills: string[] }[],
  availableWorkers: { workerId: string; skills: string[]; maxHours: number }[]
): { taskId: string; assignedWorkers: string[]; totalHours: number }[] => {
  // 優先度順にタスクをソート（高い順）
  const sortedTasks = [...emergencyTasks].sort((a, b) => b.priority - a.priority);
  const workerAvailability = new Map(availableWorkers.map(worker => [worker.workerId, worker.maxHours]));
  const allocation: { taskId: string; assignedWorkers: string[]; totalHours: number }[] = [];
  
  for (const task of sortedTasks) {
    const suitableWorkers = availableWorkers.filter(worker => 
      task.requiredSkills.every(skill => worker.skills.includes(skill)) &&
      (workerAvailability.get(worker.workerId) || 0) > 0
    );
    
    if (suitableWorkers.length === 0) {
      allocation.push({ taskId: task.taskId, assignedWorkers: [], totalHours: 0 });
      continue;
    }
    
    // 利用可能時間順にソート
    suitableWorkers.sort((a, b) => (workerAvailability.get(b.workerId) || 0) - (workerAvailability.get(a.workerId) || 0));
    
    const assignedWorkers: string[] = [];
    let remainingHours = task.estimatedHours;
    
    for (const worker of suitableWorkers) {
      if (remainingHours <= 0) break;
      
      const availableHours = workerAvailability.get(worker.workerId) || 0;
      if (availableHours > 0) {
        const assignedHours = Math.min(remainingHours, availableHours);
        assignedWorkers.push(worker.workerId);
        workerAvailability.set(worker.workerId, availableHours - assignedHours);
        remainingHours -= assignedHours;
      }
    }
    
    allocation.push({
      taskId: task.taskId,
      assignedWorkers,
      totalHours: task.estimatedHours - remainingHours
    });
  }
  
  return allocation;
};

/** 対応ルール: 過去データとの比較により効率低下を検出し、閾値を下回る場合はアラート通知する */
export const detectEfficiencyDecline = (currentEfficiency: number, historicalEfficiency: number[], alertThreshold: number = 0.8): { isDecline: boolean; declineRate: number; shouldAlert: boolean } => {
  if (historicalEfficiency.length === 0) {
    return { isDecline: false, declineRate: 0, shouldAlert: false };
  }
  
  const avgHistoricalEfficiency = historicalEfficiency.reduce((sum, eff) => sum + eff, 0) / historicalEfficiency.length;
  
  if (avgHistoricalEfficiency <= 0) {
    return { isDecline: false, declineRate: 0, shouldAlert: false };
  }
  
  const efficiencyRatio = currentEfficiency / avgHistoricalEfficiency;
  const declineRate = Math.round((1 - efficiencyRatio) * 100 * 100) / 100;
  
  const isDecline = efficiencyRatio < 1;
  const shouldAlert = efficiencyRatio < alertThreshold;
  
  return { isDecline, declineRate, shouldAlert };
};