// 作業記録の型定義
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

// 作業項目マスタの型定義
export interface WorkItemMaster {
  作業項目ID: string;
  作業項目コード: string;
  作業項目名: string;
  作業項目説明: string | null;
  カテゴリ: string | null;
  標準工数時間: number | null;
  表示順序: number;
  有効フラグ: boolean;
  作成日時: Date;
  更新日時: Date;
  作成者ID: string;
  更新者ID: string;
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

// 人員配置最適化結果の型定義
export interface StaffAllocationResult {
  staffId: string;
  assignedWorkload: number;
  estimatedCompletionTime: number;
  travelTimeRequired: number;
}

// 緊急対応人員算出結果の型定義
export interface EmergencyStaffingResult {
  requiredStaffCount: number;
  estimatedWorkHours: number;
  skillRequirements: string[];
}

/**
 * 対応ルール: 過去の工数実績データを分析して当日の作業量予測と必要人員数を自動算出する機能が要求されたとき → 過去の工数実績データを分析して当日の作業量予測と必要人員数を自動算出する
 */
export function predictWorkload(historicalData: WorkRecord[], seasonalFactors: number[]): number {
  if (!historicalData || historicalData.length === 0) {
    return 0;
  }

  // 過去実績の平均工数を算出
  const validRecords = historicalData.filter(record => 
    record.作業時間 !== null && record.作業時間 > 0
  );

  if (validRecords.length === 0) {
    return 0;
  }

  const totalWorkHours = validRecords.reduce((sum, record) => sum + (record.作業時間 || 0), 0);
  const averageWorkHours = totalWorkHours / validRecords.length;

  // 季節変動係数を適用（月別の変動率）
  const currentMonth = new Date().getMonth();
  const seasonalFactor = seasonalFactors[currentMonth] || 1.0;

  // 作業種別別の工数分析
  const workTypeGroups = new Map<string, number[]>();
  validRecords.forEach(record => {
    if (!workTypeGroups.has(record.作業種別)) {
      workTypeGroups.set(record.作業種別, []);
    }
    workTypeGroups.get(record.作業種別)!.push(record.作業時間!);
  });

  // 作業種別別の平均工数を算出
  let weightedWorkload = 0;
  let totalWeight = 0;

  workTypeGroups.forEach((workHours, workType) => {
    const avgHours = workHours.reduce((sum, hours) => sum + hours, 0) / workHours.length;
    const weight = workHours.length; // 作業頻度を重みとする
    weightedWorkload += avgHours * weight;
    totalWeight += weight;
  });

  const baseWorkload = totalWeight > 0 ? weightedWorkload / totalWeight : averageWorkHours;

  // 季節変動を考慮した予測工数
  const predictedWorkload = baseWorkload * seasonalFactor;

  // 異常値検出（前日比20%以上の変動）
  const recentAverage = validRecords
    .slice(-7) // 直近7日間
    .reduce((sum, record) => sum + (record.作業時間 || 0), 0) / Math.min(7, validRecords.length);

  const variationRate = Math.abs(predictedWorkload - recentAverage) / recentAverage;
  
  // 20%以上の変動がある場合は保守的な予測値を採用
  if (variationRate > 0.2) {
    return Math.min(predictedWorkload, recentAverage * 1.2);
  }

  return Math.round(predictedWorkload);
}

/**
 * 対応ルール: 緊急対応時の最適人員配置を自動算出する機能が要求されたとき → 移動時間と作業効率を考慮して最適な人員配置パターンを算出し、配置指示を生成する
 */
export function optimizeStaffAllocation(availableStaff: number[], workload: number[], travelTime: number[]): number[] {
  if (!availableStaff || !workload || !travelTime || 
      availableStaff.length === 0 || workload.length === 0) {
    return [];
  }

  const staffCount = availableStaff.length;
  const workloadCount = workload.length;
  const allocation: number[] = new Array(staffCount).fill(0);

  // 作業効率を考慮した配置最適化
  // 各作業員の効率指数を算出（移動時間が短いほど効率が高い）
  const staffEfficiency = availableStaff.map((capacity, index) => {
    const avgTravelTime = travelTime[index] || 0;
    // 移動時間が長いほど効率が下がる（最大50%減）
    const efficiencyPenalty = Math.min(avgTravelTime / 120, 0.5); // 2時間で最大ペナルティ
    return capacity * (1 - efficiencyPenalty);
  });

  // 総作業量を算出
  const totalWorkload = workload.reduce((sum, load) => sum + load, 0);
  
  // 各作業員の効率に基づいて作業量を配分
  const totalEfficiency = staffEfficiency.reduce((sum, eff) => sum + eff, 0);
  
  if (totalEfficiency === 0) {
    return allocation;
  }

  // 効率比率に基づいて作業量を配分
  staffEfficiency.forEach((efficiency, index) => {
    const allocationRatio = efficiency / totalEfficiency;
    allocation[index] = Math.round(totalWorkload * allocationRatio);
  });

  // 配分調整（総作業量との差を最も効率の高い作業員に割り当て）
  const allocatedTotal = allocation.reduce((sum, alloc) => sum + alloc, 0);
  const difference = totalWorkload - allocatedTotal;
  
  if (difference !== 0) {
    const mostEfficientIndex = staffEfficiency.indexOf(Math.max(...staffEfficiency));
    allocation[mostEfficientIndex] += difference;
  }

  // 各作業員の能力上限を超えないよう調整
  for (let i = 0; i < staffCount; i++) {
    if (allocation[i] > availableStaff[i]) {
      const excess = allocation[i] - availableStaff[i];
      allocation[i] = availableStaff[i];
      
      // 超過分を他の作業員に再配分
      for (let j = 0; j < staffCount; j++) {
        if (j !== i && allocation[j] < availableStaff[j]) {
          const canTake = Math.min(excess, availableStaff[j] - allocation[j]);
          allocation[j] += canTake;
          // excess -= canTake; // 使用されていない変数のため削除
          if (excess <= 0) break;
        }
      }
    }
  }

  return allocation;
}

/**
 * 対応ルール: 中断理由が「設備故障」として記録された状態で緊急対応の人員配置算出が要求されたとき → 過去の同種故障対応実績から必要工数を予測し、最適な技術者配置を自動算出する
 */
export function calculateEmergencyStaffing(emergencyType: string, historicalEmergencyData: WorkRecord[]): number {
  if (!historicalEmergencyData || historicalEmergencyData.length === 0) {
    // 緊急対応のデフォルト人員数
    return emergencyType === '設備故障' ? 3 : 2;
  }

  // 同種の緊急対応実績を抽出
  const relevantRecords = historicalEmergencyData.filter(record => 
    record.作業種別.includes(emergencyType) || 
    record.作業内容.includes(emergencyType) ||
    record.備考?.includes(emergencyType)
  );

  if (relevantRecords.length === 0) {
    // 全体の緊急対応実績から推定
    const allEmergencyRecords = historicalEmergencyData.filter(record =>
      record.作業内容.includes('緊急') || 
      record.作業内容.includes('故障') ||
      record.備考?.includes('緊急')
    );

    if (allEmergencyRecords.length === 0) {
      return emergencyType === '設備故障' ? 3 : 2;
    }

    const avgWorkHours = allEmergencyRecords
      .filter(record => record.作業時間 !== null && record.作業時間 > 0)
      .reduce((sum, record) => sum + (record.作業時間 || 0), 0) / allEmergencyRecords.length;

    // 8時間を1人日として換算
    return Math.max(1, Math.ceil(avgWorkHours / 480)); // 480分 = 8時間
  }

  // 同種対応実績から必要工数を算出
  const validRecords = relevantRecords.filter(record => 
    record.作業時間 !== null && record.作業時間 > 0
  );

  if (validRecords.length === 0) {
    return emergencyType === '設備故障' ? 3 : 2;
  }

  // 平均工数を算出
  const totalWorkHours = validRecords.reduce((sum, record) => sum + (record.作業時間 || 0), 0);
  const averageWorkHours = totalWorkHours / validRecords.length;

  // 最大工数も考慮（最悪ケースへの備え）
  const maxWorkHours = Math.max(...validRecords.map(record => record.作業時間 || 0));

  // 平均と最大の中間値を採用（リスクを考慮）
  const estimatedWorkHours = (averageWorkHours + maxWorkHours) / 2;

  // 緊急対応では通常の1.5倍の工数がかかると想定
  const emergencyAdjustedHours = estimatedWorkHours * 1.5;

  // 8時間を1人日として人員数を算出
  const requiredStaff = Math.ceil(emergencyAdjustedHours / 480); // 480分 = 8時間

  // 緊急対応の最小人員数を確保
  const minStaff = emergencyType === '設備故障' ? 2 : 1;
  const maxStaff = 10; // 現実的な上限

  return Math.max(minStaff, Math.min(maxStaff, requiredStaff));
}

/**
 * 対応ルール: 翌年度予算案作成が開始されたとき → 過去実績の平均値に季節変動係数を乗じ、さらに成長率予測値を加味して予算工数を算出する
 */
export function calculateBudgetAllocation(historicalAverage: number, seasonalFactor: number, growthRate: number): number {
  if (historicalAverage <= 0) {
    return 0;
  }

  // 季節変動係数の妥当性チェック（0.5〜2.0の範囲）
  const validSeasonalFactor = Math.max(0.5, Math.min(2.0, seasonalFactor));

  // 成長率の妥当性チェック（-50%〜+100%の範囲）
  const validGrowthRate = Math.max(-0.5, Math.min(1.0, growthRate));

  // 基本予算 = 過去実績平均 × 季節変動係数
  const seasonalAdjustedBudget = historicalAverage * validSeasonalFactor;

  // 成長率を適用
  const growthAdjustedBudget = seasonalAdjustedBudget * (1 + validGrowthRate);

  // 予算の最小値を設定（過去実績の50%を下回らない）
  const minimumBudget = historicalAverage * 0.5;

  // 予算の最大値を設定（過去実績の300%を上回らない）
  const maximumBudget = historicalAverage * 3.0;

  // 最終予算額を算出
  const finalBudget = Math.max(minimumBudget, Math.min(maximumBudget, growthAdjustedBudget));

  return Math.round(finalBudget);
}