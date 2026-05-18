// 作業記録の型定義
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

// 月別データの型定義
export interface MonthlyData {
  month: number;
  hours: number;
}

// 季節変動分析結果の型定義
export interface SeasonalVariation {
  month: number;
  variationRate: number;
}

// 作業負荷予測結果の型定義
export interface WorkloadPrediction {
  predictedHours: number;
  confidence: number;
}

// 人員配置最適化結果の型定義
export interface OptimalStaffing {
  requiredStaff: number;
  efficiency: number;
}

/**
 * 対応ルール: 過去の工数実績データを分析して当日の作業量予測と必要人員数を自動算出する機能が要求されたとき → 過去の工数実績データを分析して当日の作業量予測と必要人員数を自動算出する
 */
export function predictWorkload(historicalData: WorkRecord[], targetDate: string): number {
  if (!historicalData || historicalData.length === 0) {
    return 0;
  }

  const targetDateObj = new Date(targetDate);
  const targetDayOfWeek = targetDateObj.getDay();
  const targetMonth = targetDateObj.getMonth() + 1;

  // 同じ曜日・同じ月のデータを抽出
  const relevantRecords = historicalData.filter(record => {
    if (!record.作業時間 || record.作業時間 <= 0) return false;
    
    const recordDate = new Date(record.作業日);
    const recordDayOfWeek = recordDate.getDay();
    const recordMonth = recordDate.getMonth() + 1;
    
    return recordDayOfWeek === targetDayOfWeek && recordMonth === targetMonth;
  });

  if (relevantRecords.length === 0) {
    // 同じ曜日のデータがない場合は全データの平均を使用
    const allValidRecords = historicalData.filter(record => 
      record.作業時間 && record.作業時間 > 0
    );
    
    if (allValidRecords.length === 0) return 0;
    
    const totalHours = allValidRecords.reduce((sum, record) => sum + (record.作業時間 || 0), 0);
    return Math.round(totalHours / allValidRecords.length);
  }

  // 関連データの平均工数を計算
  const totalHours = relevantRecords.reduce((sum, record) => sum + (record.作業時間 || 0), 0);
  const averageHours = totalHours / relevantRecords.length;

  // 季節変動係数を適用（夏季・冬季は1.2倍、春季・秋季は1.1倍）
  let seasonalFactor = 1.0;
  if (targetMonth === 6 || targetMonth === 7 || targetMonth === 8 || targetMonth === 12 || targetMonth === 1 || targetMonth === 2) {
    seasonalFactor = 1.2; // 夏季・冬季
  } else if (targetMonth === 3 || targetMonth === 4 || targetMonth === 5 || targetMonth === 9 || targetMonth === 10 || targetMonth === 11) {
    seasonalFactor = 1.1; // 春季・秋季
  }

  return Math.round(averageHours * seasonalFactor);
}

/**
 * 対応ルール: 緊急対応時の最適人員配置を自動算出する機能が要求されたとき → 緊急対応時の最適人員配置を自動算出する
 */
export function calculateOptimalStaffing(predictedWorkload: number, standardProductivity: number): number {
  if (predictedWorkload <= 0 || standardProductivity <= 0) {
    return 0;
  }

  // 基本必要人員数を計算
  const baseStaffRequired = predictedWorkload / standardProductivity;

  // 緊急対応時は通常の1.3倍の人員を配置（余裕率30%）
  const emergencyFactor = 1.3;
  const optimalStaff = Math.ceil(baseStaffRequired * emergencyFactor);

  // 最低1名は必要
  return Math.max(1, optimalStaff);
}

/**
 * 対応ルール: 季節変動パターン分析が実行されたとき → 月別・四半期別の工数変動率を算出し、前年同期比±20%を超える変動を異常値として検出する
 */
export function analyzeSeasonalVariation(monthlyData: MonthlyData[]): SeasonalVariation[] {
  if (!monthlyData || monthlyData.length === 0) {
    return [];
  }

  // 年間平均工数を計算
  const totalHours = monthlyData.reduce((sum, data) => sum + data.hours, 0);
  const averageHours = totalHours / monthlyData.length;

  // 各月の変動率を計算
  return monthlyData.map(data => {
    const variationRate = averageHours > 0 ? 
      ((data.hours - averageHours) / averageHours) * 100 : 0;

    return {
      month: data.month,
      variationRate: Math.round(variationRate * 100) / 100 // 小数点第2位まで
    };
  }).filter(result => {
    // ±20%を超える変動を異常値として検出
    return Math.abs(result.variationRate) > 20;
  });
}

/**
 * 対応ルール: 翌年度予算案作成が開始されたとき → 過去実績の平均値に季節変動係数を乗じ、さらに成長率予測値を加味して予算工数を算出する
 */
export function calculateBudgetAllocation(historicalAverage: number, seasonalFactor: number, growthRate: number): number {
  if (historicalAverage <= 0) {
    return 0;
  }

  // 季節変動係数を適用
  const seasonalAdjustedHours = historicalAverage * seasonalFactor;

  // 成長率予測値を加味（成長率は百分率で入力されると仮定）
  const growthFactor = 1 + (growthRate / 100);
  const budgetHours = seasonalAdjustedHours * growthFactor;

  return Math.round(budgetHours);
}

// 人員配置最適化のための補助関数
export function calculateWorkloadDistribution(workRecords: WorkRecord[], staffCount: number): { staffId: string; allocatedHours: number }[] {
  if (!workRecords || workRecords.length === 0 || staffCount <= 0) {
    return [];
  }

  // 作業員別の工数を集計
  const staffWorkload = new Map<string, number>();
  
  workRecords.forEach(record => {
    if (record.作業時間 && record.作業時間 > 0) {
      const currentHours = staffWorkload.get(record.作業員ID) || 0;
      staffWorkload.set(record.作業員ID, currentHours + record.作業時間);
    }
  });

  // 総工数を計算
  const totalHours = Array.from(staffWorkload.values()).reduce((sum, hours) => sum + hours, 0);
  
  // 人員数で均等配分
  const hoursPerStaff = totalHours / staffCount;

  return Array.from(staffWorkload.entries()).map(([staffId, hours]) => ({
    staffId,
    allocatedHours: Math.round(hoursPerStaff)
  }));
}

// 予測精度を評価する補助関数
export function evaluatePredictionAccuracy(predictions: number[], actuals: number[]): number {
  if (predictions.length !== actuals.length || predictions.length === 0) {
    return 0;
  }

  let totalError = 0;
  let validPairs = 0;

  for (let i = 0; i < predictions.length; i++) {
    if (actuals[i] > 0) {
      const errorRate = Math.abs(predictions[i] - actuals[i]) / actuals[i];
      totalError += errorRate;
      validPairs++;
    }
  }

  if (validPairs === 0) return 0;

  const averageErrorRate = totalError / validPairs;
  return Math.max(0, Math.round((1 - averageErrorRate) * 100)); // 精度を百分率で返す
}