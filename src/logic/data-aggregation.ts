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

// 月次集計結果の型定義
export interface MonthlyAggregation {
  totalHours: number;
  averageHours: number;
}

// 中断理由別集計結果の型定義
export interface InterruptionAggregation {
  count: number;
  totalDuration: number;
}

/** 対応ルール: 当月1日から月末日までの全工数データを対象として自動集計する → 当月の全工数データを集計し総時間と平均時間を算出する */
export function aggregateMonthlyHours(records: WorkRecord[], targetMonth: string): MonthlyAggregation {
  const targetDate = new Date(targetMonth);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  // 対象月の開始日と終了日を計算
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  
  // 対象月の作業記録をフィルタリング
  const monthlyRecords = records.filter(record => {
    const workDate = new Date(record.作業日);
    return workDate >= startOfMonth && workDate <= endOfMonth && 
           record.作業時間 !== null && record.作業時間 > 0;
  });
  
  // 総工数時間を計算（分単位から時間単位に変換）
  const totalMinutes = monthlyRecords.reduce((sum, record) => {
    return sum + (record.作業時間 || 0);
  }, 0);
  
  const totalHours = totalMinutes / 60;
  const averageHours = monthlyRecords.length > 0 ? totalHours / monthlyRecords.length : 0;
  
  return {
    totalHours: Math.round(totalHours * 100) / 100,
    averageHours: Math.round(averageHours * 100) / 100
  };
}

/** 対応ルール: 作業員別・作業種別・拠点別の工数合計値と平均値を算出する → カテゴリ別に工数データを集計し合計値を返す */
export function aggregateByCategory(records: WorkRecord[], category: string): Record<string, number> {
  const aggregation: Record<string, number> = {};
  
  records.forEach(record => {
    if (record.作業時間 === null || record.作業時間 <= 0) {
      return;
    }
    
    let categoryValue: string;
    
    // カテゴリに応じて集計キーを決定
    switch (category) {
      case '作業員':
        categoryValue = record.作業員ID;
        break;
      case '作業種別':
        categoryValue = record.作業種別;
        break;
      case '拠点':
        categoryValue = record.作業場所;
        break;
      default:
        categoryValue = 'その他';
        break;
    }
    
    // 分単位から時間単位に変換して集計
    const hours = record.作業時間 / 60;
    aggregation[categoryValue] = (aggregation[categoryValue] || 0) + hours;
  });
  
  // 小数点以下2桁で丸める
  Object.keys(aggregation).forEach(key => {
    aggregation[key] = Math.round(aggregation[key] * 100) / 100;
  });
  
  return aggregation;
}

/** 対応ルール: 時間当たり作業量を算出して生産性指標を計算する → 実績工数とベースライン工数を比較して生産性指数を算出する */
export function calculateProductivityIndex(records: WorkRecord[], baselineHours: number): number {
  if (baselineHours <= 0) {
    return 0;
  }
  
  // 完了した作業記録のみを対象とする
  const completedRecords = records.filter(record => 
    record.進捗状況 === '完了' && 
    record.作業時間 !== null && 
    record.作業時間 > 0
  );
  
  if (completedRecords.length === 0) {
    return 0;
  }
  
  // 総実績工数を計算（分単位から時間単位に変換）
  const totalActualHours = completedRecords.reduce((sum, record) => {
    return sum + (record.作業時間 || 0);
  }, 0) / 60;
  
  // 完了作業件数
  const completedTaskCount = completedRecords.length;
  
  // 時間当たり作業完了件数を算出
  const actualProductivity = totalActualHours > 0 ? completedTaskCount / totalActualHours : 0;
  const baselineProductivity = 1 / baselineHours; // ベースライン時間当たりの作業完了件数
  
  // 生産性指数を算出（ベースラインを100とした指数）
  const productivityIndex = baselineProductivity > 0 ? 
    (actualProductivity / baselineProductivity) * 100 : 0;
  
  return Math.round(productivityIndex * 100) / 100;
}

/** 対応ルール: 中断理由別の発生頻度と平均時間を集計する → 中断理由区分ごとに発生回数と総中断時間を集計する */
export function aggregateInterruptionsByReason(interruptions: InterruptionRecord[]): Record<string, InterruptionAggregation> {
  const aggregation: Record<string, InterruptionAggregation> = {};
  
  interruptions.forEach(interruption => {
    const reason = interruption.中断理由区分;
    const duration = interruption.中断時間 || 0;
    
    // 中断時間が0以下の場合はスキップ
    if (duration <= 0) {
      return;
    }
    
    if (!aggregation[reason]) {
      aggregation[reason] = {
        count: 0,
        totalDuration: 0
      };
    }
    
    aggregation[reason].count += 1;
    aggregation[reason].totalDuration += duration;
  });
  
  // 総中断時間を分単位から時間単位に変換
  Object.keys(aggregation).forEach(reason => {
    aggregation[reason].totalDuration = Math.round((aggregation[reason].totalDuration / 60) * 100) / 100;
  });
  
  return aggregation;
}

// 統計計算用のヘルパー関数
export function calculateEfficiencyRate(actualHours: number, plannedHours: number): number {
  if (plannedHours <= 0) {
    return 0;
  }
  return Math.round((actualHours / plannedHours) * 10000) / 100;
}

export function calculateDeviationRate(actualValue: number, plannedValue: number): number {
  if (plannedValue <= 0) {
    return 0;
  }
  const deviation = ((actualValue - plannedValue) / plannedValue) * 100;
  return Math.round(deviation * 100) / 100;
}

export function detectAnomalousValues(values: number[], threshold: number = 2): number[] {
  if (values.length === 0) {
    return [];
  }
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  
  return values.filter(value => 
    Math.abs(value - mean) > threshold * standardDeviation
  );
}