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

// 月次集計結果の型定義
export interface MonthlyAggregation {
  [workerId: string]: number;
}

// カテゴリ別集計結果の型定義
export interface CategoryAggregation {
  [category: string]: number;
}

// リアルタイムデータ集計結果の型定義
export interface RealTimeAggregation {
  totalHours: number;
  activeWorkers: number;
}

/** 対応ルール: 当月1日から月末日までの全工数データを対象として自動集計処理を実行する */
export function aggregateMonthlyHours(workRecords: WorkRecord[]): MonthlyAggregation {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // 当月1日から月末日までの範囲を設定
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
  
  const aggregation: MonthlyAggregation = {};
  
  workRecords.forEach(record => {
    const workDate = new Date(record.作業日);
    
    // 当月のデータのみを対象とする
    if (workDate >= monthStart && workDate <= monthEnd) {
      // 作業時間が記録されている場合のみ集計
      if (record.作業時間 !== null && record.作業時間 > 0) {
        if (!aggregation[record.作業員ID]) {
          aggregation[record.作業員ID] = 0;
        }
        aggregation[record.作業員ID] += record.作業時間;
      }
    }
  });
  
  return aggregation;
}

/** 対応ルール: 作業員別・作業種別・拠点別の工数合計値と平均値を算出する */
export function aggregateByCategory(workRecords: WorkRecord[]): CategoryAggregation {
  const categoryTotals: { [category: string]: { total: number; count: number } } = {};
  
  workRecords.forEach(record => {
    // 作業時間が記録されている場合のみ集計
    if (record.作業時間 !== null && record.作業時間 > 0) {
      const category = record.作業種別;
      
      if (!categoryTotals[category]) {
        categoryTotals[category] = { total: 0, count: 0 };
      }
      
      categoryTotals[category].total += record.作業時間;
      categoryTotals[category].count += 1;
    }
  });
  
  // 平均値を算出して返却
  const result: CategoryAggregation = {};
  Object.keys(categoryTotals).forEach(category => {
    const data = categoryTotals[category];
    result[category] = data.count > 0 ? data.total / data.count : 0;
  });
  
  return result;
}

/** 対応ルール: 月別・四半期別の工数変動率を算出し、前年同期比±20%を超える変動を検出する */
export function calculateSeasonalVariation(monthlyData: number[]): number[] {
  if (monthlyData.length < 24) {
    // 最低2年分のデータが必要
    return monthlyData.map(() => 0);
  }
  
  const variations: number[] = [];
  const currentYearStart = monthlyData.length - 12;
  
  for (let i = 0; i < 12; i++) {
    const currentMonthValue = monthlyData[currentYearStart + i];
    const previousYearValue = monthlyData[currentYearStart + i - 12];
    
    if (previousYearValue > 0) {
      const variation = ((currentMonthValue - previousYearValue) / previousYearValue) * 100;
      
      // ±20%を超える変動を異常値として検出
      if (Math.abs(variation) > 20) {
        variations.push(variation);
      } else {
        variations.push(0);
      }
    } else {
      variations.push(0);
    }
  }
  
  return variations;
}

/** 対応ルール: 当日の中断・待機時間を含む工数実績をリアルタイムで集計する */
export function aggregateRealTimeData(workRecords: WorkRecord[]): RealTimeAggregation {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  
  let totalHours = 0;
  const activeWorkerIds = new Set<string>();
  
  workRecords.forEach(record => {
    const workDate = new Date(record.作業日);
    
    // 当日のデータのみを対象とする
    if (workDate >= todayStart && workDate <= todayEnd) {
      // 作業中または完了した記録を対象
      if (record.進捗状況 === '作業中' || record.進捗状況 === '完了') {
        activeWorkerIds.add(record.作業員ID);
        
        // 作業時間が記録されている場合は合計に加算
        if (record.作業時間 !== null && record.作業時間 > 0) {
          totalHours += record.作業時間;
        } else if (record.作業開始時刻 && record.進捗状況 === '作業中') {
          // 作業中の場合は現在時刻までの経過時間を計算
          const elapsedMinutes = Math.floor((today.getTime() - new Date(record.作業開始時刻).getTime()) / (1000 * 60));
          if (elapsedMinutes > 0) {
            totalHours += elapsedMinutes;
          }
        }
      }
    }
  });
  
  return {
    totalHours: Math.round(totalHours),
    activeWorkers: activeWorkerIds.size
  };
}

// 異常値検出関数
export function detectAnomalies(workRecords: WorkRecord[]): AnomalyDetectionLog[] {
  const anomalies: AnomalyDetectionLog[] = [];
  
  workRecords.forEach(record => {
    // 24時間を超える作業時間の検出
    if (record.作業時間 !== null && record.作業時間 > 1440) { // 1440分 = 24時間
      anomalies.push({
        異常値検出ログID: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        検出対象テーブル: '作業記録',
        検出対象レコードID: record.作業記録ID,
        ユーザーID: record.作業員ID,
        異常値種別: '長時間作業',
        検出項目: '作業時間',
        検出値: record.作業時間.toString(),
        閾値: '1440',
        重要度: '高',
        確認状況: '未確認',
        通知送信フラグ: false,
        確認者ID: null,
        確認日時: null,
        対応メモ: null,
        検出日時: new Date(),
        作成日時: new Date(),
        更新日時: new Date()
      });
    }
    
    // 作業開始時刻が終了時刻より後の場合の検出
    if (record.作業開始時刻 && record.作業終了時刻) {
      if (new Date(record.作業開始時刻) > new Date(record.作業終了時刻)) {
        anomalies.push({
          異常値検出ログID: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          検出対象テーブル: '作業記録',
          検出対象レコードID: record.作業記録ID,
          ユーザーID: record.作業員ID,
          異常値種別: '時刻整合性エラー',
          検出項目: '作業開始時刻',
          検出値: record.作業開始時刻.toString(),
          閾値: record.作業終了時刻.toString(),
          重要度: '高',
          確認状況: '未確認',
          通知送信フラグ: false,
          確認者ID: null,
          確認日時: null,
          対応メモ: null,
          検出日時: new Date(),
          作成日時: new Date(),
          更新日時: new Date()
        });
      }
    }
  });
  
  return anomalies;
}

// 進捗率と乖離率の計算
export function calculateProgressAndDeviation(actualHours: number, plannedHours: number): { progressRate: number; deviationRate: number } {
  if (plannedHours <= 0) {
    return { progressRate: 0, deviationRate: 0 };
  }
  
  const progressRate = (actualHours / plannedHours) * 100;
  const deviationRate = Math.abs(progressRate - 100);
  
  return {
    progressRate: Math.round(progressRate * 100) / 100,
    deviationRate: Math.round(deviationRate * 100) / 100
  };
}

// 作業効率分析
export function analyzeWorkEfficiency(workRecords: WorkRecord[], standardHours: { [workType: string]: number }): { [workType: string]: number } {
  const efficiencyMap: { [workType: string]: { totalActual: number; totalStandard: number; count: number } } = {};
  
  workRecords.forEach(record => {
    if (record.作業時間 !== null && record.作業時間 > 0) {
      const workType = record.作業種別;
      const standardTime = standardHours[workType] || 0;
      
      if (standardTime > 0) {
        if (!efficiencyMap[workType]) {
          efficiencyMap[workType] = { totalActual: 0, totalStandard: 0, count: 0 };
        }
        
        efficiencyMap[workType].totalActual += record.作業時間;
        efficiencyMap[workType].totalStandard += standardTime;
        efficiencyMap[workType].count += 1;
      }
    }
  });
  
  const result: { [workType: string]: number } = {};
  Object.keys(efficiencyMap).forEach(workType => {
    const data = efficiencyMap[workType];
    if (data.totalActual > 0) {
      result[workType] = (data.totalStandard / data.totalActual) * 100;
    } else {
      result[workType] = 0;
    }
  });
  
  return result;
}