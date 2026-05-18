// 工数記録データの型定義
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

// 月次集計結果の型定義
export interface MonthlyAggregation {
  totalHours: number;
  averageHours: number;
  recordCount: number;
}

// カテゴリ別集計結果の型定義
export interface CategoryAggregation {
  [category: string]: {
    totalHours: number;
    count: number;
  };
}

// 拠点生産性結果の型定義
export interface SiteProductivity {
  siteId: string;
  productivity: number;
  ranking: number;
}

/** 対応ルール: 月末日になった状態 → 当月1日から月末日までの全工数データを対象として自動集計処理を実行する */
export function aggregateMonthlyHours(
  records: WorkRecord[],
  month: number,
  year: number
): MonthlyAggregation {
  // 指定された年月の工数データをフィルタリング
  const monthlyRecords = records.filter(record => {
    const recordDate = new Date(record.作業日);
    return recordDate.getFullYear() === year && recordDate.getMonth() + 1 === month;
  });

  // 作業時間が記録されているレコードのみを対象とする
  const validRecords = monthlyRecords.filter(record => 
    record.作業時間 !== null && record.作業時間 > 0
  );

  const totalHours = validRecords.reduce((sum, record) => {
    return sum + (record.作業時間 || 0);
  }, 0);

  const recordCount = validRecords.length;
  const averageHours = recordCount > 0 ? totalHours / recordCount : 0;

  return {
    totalHours: Math.round(totalHours),
    averageHours: Math.round(averageHours * 100) / 100,
    recordCount
  };
}

/** 対応ルール: 工数データ自動集計が実行される状態 → 作業員別・作業種別・拠点別の工数合計値と平均値を算出 */
export function aggregateByCategory(records: WorkRecord[]): CategoryAggregation {
  const categoryMap: { [category: string]: { totalHours: number; count: number } } = {};

  // 作業種別ごとに集計
  records.forEach(record => {
    if (record.作業時間 !== null && record.作業時間 > 0) {
      const category = record.作業種別;
      
      if (!categoryMap[category]) {
        categoryMap[category] = { totalHours: 0, count: 0 };
      }
      
      categoryMap[category].totalHours += record.作業時間;
      categoryMap[category].count += 1;
    }
  });

  // 作業場所（拠点）ごとに集計
  records.forEach(record => {
    if (record.作業時間 !== null && record.作業時間 > 0) {
      const locationCategory = `拠点_${record.作業場所}`;
      
      if (!categoryMap[locationCategory]) {
        categoryMap[locationCategory] = { totalHours: 0, count: 0 };
      }
      
      categoryMap[locationCategory].totalHours += record.作業時間;
      categoryMap[locationCategory].count += 1;
    }
  });

  // 作業員別に集計
  records.forEach(record => {
    if (record.作業時間 !== null && record.作業時間 > 0) {
      const workerCategory = `作業員_${record.作業員ID}`;
      
      if (!categoryMap[workerCategory]) {
        categoryMap[workerCategory] = { totalHours: 0, count: 0 };
      }
      
      categoryMap[workerCategory].totalHours += record.作業時間;
      categoryMap[workerCategory].count += 1;
    }
  });

  return categoryMap;
}

/** 対応ルール: 複数拠点の工数データが収集されている状態 → 各拠点の時間当たり作業完了件数を算出し、平均値からの乖離率で生産性ランキングを作成する */
export function calculateSiteProductivity(siteRecords: WorkRecord[]): SiteProductivity[] {
  // 拠点別に作業完了件数と総作業時間を集計
  const siteStats: { [siteId: string]: { completedTasks: number; totalHours: number } } = {};

  siteRecords.forEach(record => {
    const siteId = record.作業場所;
    
    if (!siteStats[siteId]) {
      siteStats[siteId] = { completedTasks: 0, totalHours: 0 };
    }

    // 完了した作業のみカウント
    if (record.進捗状況 === '完了' && record.作業時間 !== null && record.作業時間 > 0) {
      siteStats[siteId].completedTasks += 1;
      siteStats[siteId].totalHours += record.作業時間;
    }
  });

  // 各拠点の時間当たり作業完了件数（生産性）を計算
  const productivityData: SiteProductivity[] = Object.entries(siteStats)
    .filter(([_, stats]) => stats.totalHours > 0)
    .map(([siteId, stats]) => ({
      siteId,
      productivity: Math.round((stats.completedTasks / (stats.totalHours / 60)) * 100) / 100, // 時間当たり件数
      ranking: 0 // 後で設定
    }));

  // 生産性の平均値を計算
  const averageProductivity = productivityData.length > 0 
    ? productivityData.reduce((sum, site) => sum + site.productivity, 0) / productivityData.length
    : 0;

  // 生産性順にソートしてランキングを設定
  productivityData.sort((a, b) => b.productivity - a.productivity);
  productivityData.forEach((site, index) => {
    site.ranking = index + 1;
  });

  return productivityData;
}

/** 対応ルール: 工数データに異常値または入力漏れが検出された状態 → 必須項目の未入力を入力漏れとして一覧表示する */
export function detectMissingData(records: WorkRecord[], expectedRecordCount: number): string[] {
  const missingDataIssues: string[] = [];

  // 期待されるレコード数と実際のレコード数の差をチェック
  if (records.length < expectedRecordCount) {
    missingDataIssues.push(`期待レコード数: ${expectedRecordCount}, 実際: ${records.length} - ${expectedRecordCount - records.length}件のレコードが不足`);
  }

  // 各レコードの必須項目をチェック
  records.forEach((record, index) => {
    const recordId = record.作業記録ID || `レコード${index + 1}`;

    // 必須項目のチェック
    if (!record.作業員ID) {
      missingDataIssues.push(`${recordId}: 作業員IDが未入力`);
    }
    if (!record.作業開始時刻) {
      missingDataIssues.push(`${recordId}: 作業開始時刻が未入力`);
    }
    if (!record.プロジェクト名) {
      missingDataIssues.push(`${recordId}: プロジェクト名が未入力`);
    }
    if (!record.作業場所) {
      missingDataIssues.push(`${recordId}: 作業場所が未入力`);
    }
    if (!record.作業種別) {
      missingDataIssues.push(`${recordId}: 作業種別が未入力`);
    }
    if (!record.作業内容) {
      missingDataIssues.push(`${recordId}: 作業内容が未入力`);
    }
    if (!record.進捗状況) {
      missingDataIssues.push(`${recordId}: 進捗状況が未入力`);
    }
    if (!record.承認状態) {
      missingDataIssues.push(`${recordId}: 承認状態が未入力`);
    }
    if (!record.作成者ID) {
      missingDataIssues.push(`${recordId}: 作成者IDが未入力`);
    }

    // 作業時間の整合性チェック
    if (record.作業終了時刻 && record.作業開始時刻) {
      const startTime = new Date(record.作業開始時刻);
      const endTime = new Date(record.作業終了時刻);
      
      if (endTime <= startTime) {
        missingDataIssues.push(`${recordId}: 作業終了時刻が開始時刻より前または同じ`);
      }
      
      // 作業時間が24時間を超える場合は異常値として検出
      const calculatedHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      if (calculatedHours > 1440) { // 24時間 = 1440分
        missingDataIssues.push(`${recordId}: 作業時間が24時間を超過 (${Math.round(calculatedHours / 60 * 100) / 100}時間)`);
      }
    }

    // 完了状態なのに終了時刻がない場合
    if (record.進捗状況 === '完了' && !record.作業終了時刻) {
      missingDataIssues.push(`${recordId}: 完了状態だが作業終了時刻が未入力`);
    }

    // 完了状態なのに作業時間がない場合
    if (record.進捗状況 === '完了' && (record.作業時間 === null || record.作業時間 <= 0)) {
      missingDataIssues.push(`${recordId}: 完了状態だが作業時間が未記録または0以下`);
    }
  });

  return missingDataIssues;
}

// 追加の集計関数

/** 対応ルール: 工数データが蓄積されている状態 → 過去データとの比較により効率低下を検出し、閾値を下回る場合はアラート通知する */
export function detectEfficiencyDecline(
  currentRecords: WorkRecord[],
  previousRecords: WorkRecord[],
  threshold: number = 0.8
): { workerId: string; currentEfficiency: number; previousEfficiency: number; decline: number }[] {
  const currentEfficiency = calculateWorkerEfficiency(currentRecords);
  const previousEfficiency = calculateWorkerEfficiency(previousRecords);
  
  const declines: { workerId: string; currentEfficiency: number; previousEfficiency: number; decline: number }[] = [];

  Object.keys(currentEfficiency).forEach(workerId => {
    const current = currentEfficiency[workerId];
    const previous = previousEfficiency[workerId];
    
    if (previous && current < previous * threshold) {
      declines.push({
        workerId,
        currentEfficiency: current,
        previousEfficiency: previous,
        decline: Math.round((1 - current / previous) * 100) / 100
      });
    }
  });

  return declines;
}

/** 作業員別効率性を計算するヘルパー関数 */
function calculateWorkerEfficiency(records: WorkRecord[]): { [workerId: string]: number } {
  const workerStats: { [workerId: string]: { totalHours: number; completedTasks: number } } = {};

  records.forEach(record => {
    const workerId = record.作業員ID;
    
    if (!workerStats[workerId]) {
      workerStats[workerId] = { totalHours: 0, completedTasks: 0 };
    }

    if (record.作業時間 !== null && record.作業時間 > 0) {
      workerStats[workerId].totalHours += record.作業時間;
      
      if (record.進捗状況 === '完了') {
        workerStats[workerId].completedTasks += 1;
      }
    }
  });

  const efficiency: { [workerId: string]: number } = {};
  
  Object.entries(workerStats).forEach(([workerId, stats]) => {
    if (stats.totalHours > 0) {
      efficiency[workerId] = Math.round((stats.completedTasks / (stats.totalHours / 60)) * 100) / 100;
    }
  });

  return efficiency;
}

/** 対応ルール: 実績工数と計画工数が存在する状態 → 実績工数÷計画工数×100で進捗率を計算し、乖離率も同時に算出する */
export function calculateProgressRate(
  actualHours: number,
  plannedHours: number
): { progressRate: number; deviationRate: number } {
  if (plannedHours <= 0) {
    return { progressRate: 0, deviationRate: 0 };
  }

  const progressRate = Math.round((actualHours / plannedHours) * 100 * 100) / 100;
  const deviationRate = Math.round(Math.abs(progressRate - 100) * 100) / 100;

  return {
    progressRate,
    deviationRate
  };
}

/** 対応ルール: 工数データと売上データが両方存在する状態 → 工数実績データと売上データを自動照合し、人件費率を算出する */
export function calculateLaborCostRate(
  totalHours: number,
  hourlyRate: number,
  revenue: number
): number {
  if (revenue <= 0) {
    return 0;
  }

  const totalLaborCost = totalHours * hourlyRate;
  const laborCostRate = Math.round((totalLaborCost / revenue) * 100 * 100) / 100;

  return laborCostRate;
}