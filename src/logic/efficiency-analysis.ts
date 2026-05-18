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

// ボトルネック検出結果の型定義
export interface BottleneckResult {
  workType: string;
  efficiency: number;
}

/** 対応ルール: 実績工数と標準工数が存在する状態で → 実績工数÷標準工数×100で効率率を計算 */
export function calculateEfficiencyRate(actualTime: number, standardTime: number): number {
  if (standardTime <= 0) {
    return 0;
  }
  return (actualTime / standardTime) * 100;
}

/** 対応ルール: 効率率が算出された状態で → 閾値を下回る場合はアラート通知する */
export function isEfficiencyBelowThreshold(efficiencyRate: number, threshold: number): boolean {
  return efficiencyRate < threshold;
}

/** 対応ルール: 作業実績データが存在する状態で → 進捗率が80%未満または乖離率が20%以上の作業をボトルネックとして自動検出 */
export function identifyBottlenecks(workRecords: WorkRecord[]): BottleneckResult[] {
  const bottlenecks: BottleneckResult[] = [];
  const workTypeStats = new Map<string, { totalActual: number; totalStandard: number; count: number }>();

  // 作業種別ごとの統計を計算
  workRecords.forEach(record => {
    if (record.作業時間 === null || record.作業時間 <= 0) {
      return;
    }

    const workType = record.作業種別;
    const actualTime = record.作業時間;
    
    // 標準工数時間は作業項目マスタから取得する想定だが、ここでは平均値を使用
    if (!workTypeStats.has(workType)) {
      workTypeStats.set(workType, { totalActual: 0, totalStandard: 0, count: 0 });
    }
    
    const stats = workTypeStats.get(workType)!;
    stats.totalActual += actualTime;
    stats.count += 1;
  });

  // 各作業種別の平均を標準時間として使用し、効率を計算
  workTypeStats.forEach((stats, workType) => {
    if (stats.count === 0) return;
    
    const averageTime = stats.totalActual / stats.count;
    const standardTime = averageTime * 0.8; // 平均の80%を標準とする
    const efficiency = calculateEfficiencyRate(averageTime, standardTime);
    
    // 効率が80%未満（進捗率が80%未満に相当）または乖離率が20%以上の場合
    if (efficiency < 80 || Math.abs(efficiency - 100) >= 20) {
      bottlenecks.push({
        workType: workType,
        efficiency: efficiency
      });
    }
  });

  return bottlenecks.sort((a, b) => a.efficiency - b.efficiency);
}

/** 対応ルール: 作業完了件数と総作業時間が存在する状態で → 時間当たり作業完了件数を算出 */
export function calculateProductivityIndex(completedTasks: number, totalTime: number): number {
  if (totalTime <= 0) {
    return 0;
  }
  return completedTasks / totalTime;
}

/** 対応ルール: 工数データが蓄積されている状態で → 中断理由別の発生頻度と平均時間を集計し、ボトルネック要因を特定 */
export function analyzeInterruptionPatterns(interruptions: InterruptionRecord[]): { reason: string; frequency: number; averageTime: number }[] {
  const reasonStats = new Map<string, { count: number; totalTime: number }>();

  interruptions.forEach(interruption => {
    if (interruption.中断時間 === null || interruption.中断時間 <= 0) {
      return;
    }

    const reason = interruption.中断理由区分;
    if (!reasonStats.has(reason)) {
      reasonStats.set(reason, { count: 0, totalTime: 0 });
    }

    const stats = reasonStats.get(reason)!;
    stats.count += 1;
    stats.totalTime += interruption.中断時間;
  });

  const results = Array.from(reasonStats.entries()).map(([reason, stats]) => ({
    reason: reason,
    frequency: stats.count,
    averageTime: stats.totalTime / stats.count
  }));

  return results.sort((a, b) => b.frequency - a.frequency);
}

/** 対応ルール: 作業記録データが存在する状態で → 作業時間が8時間を超過している場合は異常値として警告を表示 */
export function detectAnomalousWorkTime(workRecords: WorkRecord[]): WorkRecord[] {
  const EIGHT_HOURS_IN_MINUTES = 8 * 60;
  
  return workRecords.filter(record => {
    return record.作業時間 !== null && record.作業時間 > EIGHT_HOURS_IN_MINUTES;
  });
}

/** 対応ルール: 作業記録データが存在する状態で → 作業時間が30分未満の場合は短時間作業として確認が必要 */
export function detectShortWorkTime(workRecords: WorkRecord[]): WorkRecord[] {
  const THIRTY_MINUTES = 30;
  
  return workRecords.filter(record => {
    return record.作業時間 !== null && record.作業時間 > 0 && record.作業時間 < THIRTY_MINUTES;
  });
}

/** 対応ルール: 拠点別工数データが存在する状態で → 拠点別生産性指標を算出し、標準偏差による異常値を検出 */
export function calculateLocationProductivity(workRecords: WorkRecord[]): { location: string; productivity: number; isAnomaly: boolean }[] {
  const locationStats = new Map<string, { completedTasks: number; totalTime: number }>();

  // 完了した作業のみを対象とする
  const completedRecords = workRecords.filter(record => 
    record.進捗状況 === '完了' && record.作業時間 !== null && record.作業時間 > 0
  );

  completedRecords.forEach(record => {
    const location = record.作業場所;
    if (!locationStats.has(location)) {
      locationStats.set(location, { completedTasks: 0, totalTime: 0 });
    }

    const stats = locationStats.get(location)!;
    stats.completedTasks += 1;
    stats.totalTime += record.作業時間!;
  });

  // 各拠点の生産性を計算
  const productivityData = Array.from(locationStats.entries()).map(([location, stats]) => ({
    location: location,
    productivity: calculateProductivityIndex(stats.completedTasks, stats.totalTime)
  }));

  // 平均と標準偏差を計算
  const productivityValues = productivityData.map(data => data.productivity);
  const mean = productivityValues.reduce((sum, val) => sum + val, 0) / productivityValues.length;
  const variance = productivityValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / productivityValues.length;
  const standardDeviation = Math.sqrt(variance);

  // 異常値判定（平均±2σを超える場合）
  return productivityData.map(data => ({
    ...data,
    isAnomaly: Math.abs(data.productivity - mean) > 2 * standardDeviation
  }));
}

/** 対応ルール: 工数データが存在する状態で → 実績工数と計画工数を比較し、進捗率と乖離率を自動算出 */
export function calculateProgressAndDeviation(actualHours: number, plannedHours: number): { progressRate: number; deviationRate: number } {
  if (plannedHours <= 0) {
    return { progressRate: 0, deviationRate: 0 };
  }

  const progressRate = (actualHours / plannedHours) * 100;
  const deviationRate = Math.abs(progressRate - 100);

  return {
    progressRate: progressRate,
    deviationRate: deviationRate
  };
}