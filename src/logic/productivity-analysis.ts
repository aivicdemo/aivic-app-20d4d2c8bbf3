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
export interface BreakRecord {
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

// 中断理由分析結果の型定義
export interface BreakAnalysisResult {
  [reason: string]: number;
}

/** 対応ルール: 実績工数と標準工数が存在する状態で → 実績工数÷標準工数で作業効率率を算出する */
export const calculateEfficiencyRate = (actualTime: number, standardTime: number): number => {
  if (standardTime <= 0) {
    return 0;
  }
  return actualTime / standardTime;
};

/** 対応ルール: 進捗率と乖離率が算出された状態で → 進捗率が80%未満または乖離率が20%以上の作業をボトルネックとして検出する */
export const detectBottleneck = (progressRate: number, deviationRate: number): boolean => {
  return progressRate < 80 || deviationRate >= 20;
};

/** 対応ルール: 中断・待機時間のデータが蓄積されている状態で → 中断理由別の発生頻度と平均時間を集計しボトルネック要因を特定する */
export const analyzeBreakReasons = (breakRecords: BreakRecord[]): BreakAnalysisResult => {
  const reasonStats: { [reason: string]: { totalTime: number; count: number } } = {};
  
  breakRecords.forEach(record => {
    const reason = record.中断理由区分;
    const breakTime = record.中断時間 || 0;
    
    if (!reasonStats[reason]) {
      reasonStats[reason] = { totalTime: 0, count: 0 };
    }
    
    reasonStats[reason].totalTime += breakTime;
    reasonStats[reason].count += 1;
  });
  
  const result: BreakAnalysisResult = {};
  Object.keys(reasonStats).forEach(reason => {
    const stats = reasonStats[reason];
    result[reason] = stats.count > 0 ? stats.totalTime / stats.count : 0;
  });
  
  return result;
};

/** 対応ルール: 各拠点の工数データが収集完了した状態で → 拠点別生産性指標（時間当たり作業量、人件費率、効率指数）を算出する */
export const calculateProductivityIndex = (workRecords: WorkRecord[]): number => {
  if (workRecords.length === 0) {
    return 0;
  }
  
  const totalWorkTime = workRecords.reduce((sum, record) => {
    return sum + (record.作業時間 || 0);
  }, 0);
  
  const completedWorks = workRecords.filter(record => record.進捗状況 === '完了').length;
  
  if (totalWorkTime === 0) {
    return 0;
  }
  
  // 時間当たり作業完了件数を生産性指標とする
  return (completedWorks / totalWorkTime) * 60; // 1時間あたりの作業完了件数
};

/** 対応ルール: 作業効率分析が実行されたとき → 閾値を下回る場合はアラート通知する */
export const isEfficiencyAlert = (efficiencyRate: number, threshold: number): boolean => {
  return efficiencyRate < threshold;
};