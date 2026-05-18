// 作業記録の基本型定義
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

// 中断記録の型定義
export interface InterruptionRecord {
  中断記録ID: string;
  作業記録ID: string;
  中断開始日時: string;
  中断終了日時: string | null;
  中断理由区分: string;
  中断理由詳細: string | null;
  中断時間: number | null;
  影響度: string | null;
  対応状況: string;
  記録者ID: string;
  作成日時: string;
  更新日時: string;
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
  作成日時: string;
  更新日時: string;
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
  確認日時: string | null;
  対応メモ: string | null;
  検出日時: string;
  作成日時: string;
  更新日時: string;
}

// 進捗率計算結果の型定義
export interface ProgressCalculationResult {
  progressRate: number;
  deviationRate: number;
  status: 'normal' | 'delayed' | 'ahead';
}

// 作業時間検証結果の型定義
export interface WorkTimeValidationResult {
  isValid: boolean;
  errorType?: 'invalid_time_order' | 'excessive_duration' | 'negative_duration' | 'missing_end_time';
  message?: string;
}

/** 対応ルール: 作業開始時刻と終了時刻が入力された状態で → 開始時刻との差分で作業時間を自動計算してクラウドに保存する */
export function calculateWorkDuration(startTime: string, endTime: string | null): number | null {
  if (!endTime) {
    return null;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return null;
  }

  if (end <= start) {
    return null;
  }

  // 分単位で作業時間を計算
  const durationMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  
  return durationMinutes;
}

/** 対応ルール: 作業実績と計画工数が存在する状態で → 実績工数÷計画工数×100で進捗率を計算し、乖離率も同時に算出する */
export function calculateProgressRate(actualHours: number, plannedHours: number): number {
  if (plannedHours <= 0) {
    return 0;
  }

  const progressRate = (actualHours / plannedHours) * 100;
  return Math.round(progressRate * 100) / 100; // 小数点第2位まで
}

/** 対応ルール: 作業実績と計画工数が存在する状態で → 実績工数÷計画工数×100で進捗率を計算し、乖離率も同時に算出する */
export function calculateDeviationRate(actualHours: number, plannedHours: number): number {
  if (plannedHours <= 0) {
    return 0;
  }

  const progressRate = calculateProgressRate(actualHours, plannedHours);
  const deviationRate = Math.abs(progressRate - 100);
  return Math.round(deviationRate * 100) / 100; // 小数点第2位まで
}

/** 対応ルール: 工数データが記録される際に → 異常値（24時間超過、負の値等）が検出されたとき異常値アラートを表示し、データの確認を求める */
export function isWorkTimeValid(startTime: string, endTime: string | null): boolean {
  if (!endTime) {
    return true; // 作業中の場合は有効とする
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  // 日時の妥当性チェック
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }

  // 開始時刻が終了時刻より後の場合は異常
  if (end <= start) {
    return false;
  }

  // 24時間（1440分）を超える作業時間は異常値
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  if (durationMinutes > 1440) {
    return false;
  }

  return true;
}

/** 対応ルール: 工数データが蓄積されている状態で → 過去データとの比較により効率低下を検出し、閾値を下回る場合はアラート通知する */
export function detectEfficiencyAnomaly(
  currentEfficiency: number,
  historicalAverage: number,
  standardDeviation: number
): boolean {
  // 平均値から標準偏差の2倍以上下回る場合を異常とする
  const threshold = historicalAverage - (standardDeviation * 2);
  return currentEfficiency < threshold;
}

/** 対応ルール: 工数データに異常値や入力漏れが検出された状態で → 異常値の詳細情報と修正候補を提示し、承認または修正を求める */
export function validateWorkRecordData(workRecord: Partial<WorkRecord>): WorkTimeValidationResult {
  // 必須項目チェック
  if (!workRecord.作業開始時刻) {
    return {
      isValid: false,
      errorType: 'missing_end_time',
      message: '作業開始時刻は必須項目です'
    };
  }

  if (!workRecord.作業員ID || !workRecord.作業種別 || !workRecord.作業場所) {
    return {
      isValid: false,
      message: '必須項目（作業員ID、作業種別、作業場所）が未入力です'
    };
  }

  // 作業時間の妥当性チェック
  if (workRecord.作業終了時刻) {
    if (!isWorkTimeValid(workRecord.作業開始時刻, workRecord.作業終了時刻)) {
      return {
        isValid: false,
        errorType: 'invalid_time_order',
        message: '作業時間に異常があります（24時間超過または開始時刻が終了時刻より後）'
      };
    }

    const duration = calculateWorkDuration(workRecord.作業開始時刻, workRecord.作業終了時刻);
    // 30分未満の短時間作業をチェック
    if (duration !== null && duration < 30) {
      return {
        isValid: false,
        message: '作業時間が30分未満です。作業内容の詳細入力が必要です'
      };
    }
  }

  return { isValid: true };
}

/** 対応ルール: 中断・待機時間のデータが蓄積されている状態で → 中断理由別の発生頻度と平均時間を集計し、ボトルネック要因を特定する */
export function analyzeInterruptionPatterns(interruptions: InterruptionRecord[]): {
  reasonFrequency: Record<string, number>;
  averageDuration: Record<string, number>;
  bottleneckReasons: string[];
} {
  const reasonStats: Record<string, { count: number; totalDuration: number }> = {};

  interruptions.forEach(interruption => {
    const reason = interruption.中断理由区分;
    const duration = interruption.中断時間 || 0;

    if (!reasonStats[reason]) {
      reasonStats[reason] = { count: 0, totalDuration: 0 };
    }

    reasonStats[reason].count++;
    reasonStats[reason].totalDuration += duration;
  });

  const reasonFrequency: Record<string, number> = {};
  const averageDuration: Record<string, number> = {};
  const bottleneckReasons: string[] = [];

  Object.entries(reasonStats).forEach(([reason, stats]) => {
    reasonFrequency[reason] = stats.count;
    averageDuration[reason] = stats.count > 0 ? stats.totalDuration / stats.count : 0;

    // 平均中断時間が2時間（120分）以上をボトルネックとする
    if (averageDuration[reason] >= 120) {
      bottleneckReasons.push(reason);
    }
  });

  return {
    reasonFrequency,
    averageDuration,
    bottleneckReasons
  };
}

/** 対応ルール: 進捗率が計画値から乖離している作業が存在する状態で → 進捗率が80%未満または乖離率が20%以上の作業をボトルネックとして自動検出し、優先度順にリスト化する */
export function identifyDelayedTasks(workRecords: WorkRecord[], plannedHours: Record<string, number>): {
  delayedTasks: Array<{
    workRecordId: string;
    progressRate: number;
    deviationRate: number;
    priority: 'high' | 'medium' | 'low';
  }>;
} {
  const delayedTasks = workRecords
    .filter(record => record.作業時間 !== null && plannedHours[record.作業記録ID])
    .map(record => {
      const actualHours = (record.作業時間 || 0) / 60; // 分を時間に変換
      const planned = plannedHours[record.作業記録ID];
      const progressRate = calculateProgressRate(actualHours, planned);
      const deviationRate = calculateDeviationRate(actualHours, planned);

      let priority: 'high' | 'medium' | 'low' = 'low';
      
      // 進捗率が80%未満または乖離率が20%以上をボトルネックとする
      if (progressRate < 80 || deviationRate >= 20) {
        if (progressRate < 60 || deviationRate >= 40) {
          priority = 'high';
        } else {
          priority = 'medium';
        }

        return {
          workRecordId: record.作業記録ID,
          progressRate,
          deviationRate,
          priority
        };
      }

      return null;
    })
    .filter((task): task is NonNullable<typeof task> => task !== null)
    .sort((a, b) => {
      // 優先度順でソート（high > medium > low）
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

  return { delayedTasks };
}

/** 対応ルール: 過去の工数実績データを分析して当日の作業量予測と必要人員数を自動算出する */
export function predictDailyWorkload(
  historicalData: WorkRecord[],
  targetDate: string
): {
  predictedWorkload: number;
  requiredPersonnel: number;
  confidence: number;
} {
  const targetDateObj = new Date(targetDate);
  const dayOfWeek = targetDateObj.getDay();
  const month = targetDateObj.getMonth();

  // 同じ曜日・同じ月のデータを抽出
  const relevantData = historicalData.filter(record => {
    const recordDate = new Date(record.作業日);
    return recordDate.getDay() === dayOfWeek && recordDate.getMonth() === month;
  });

  if (relevantData.length === 0) {
    return { predictedWorkload: 0, requiredPersonnel: 1, confidence: 0 };
  }

  // 平均作業時間を計算（分単位）
  const totalWorkTime = relevantData.reduce((sum, record) => sum + (record.作業時間 || 0), 0);
  const averageWorkTime = totalWorkTime / relevantData.length;

  // 1人当たり1日8時間（480分）として必要人員を算出
  const requiredPersonnel = Math.ceil(averageWorkTime / 480);

  // 信頼度はデータ数に基づいて算出（最大100%）
  const confidence = Math.min(relevantData.length * 10, 100);

  return {
    predictedWorkload: Math.round(averageWorkTime),
    requiredPersonnel: Math.max(requiredPersonnel, 1),
    confidence
  };
}

/** 対応ルール: 緊急対応時の最適人員配置を自動算出する */
export function calculateOptimalEmergencyStaffing(
  emergencyType: string,
  historicalEmergencyData: WorkRecord[],
  availableStaff: number
): {
  recommendedStaff: number;
  estimatedDuration: number;
  priority: 'critical' | 'high' | 'medium';
} {
  // 同種の緊急対応履歴を抽出
  const similarEmergencies = historicalEmergencyData.filter(record => 
    record.作業種別.includes('緊急') && record.作業内容.includes(emergencyType)
  );

  let recommendedStaff = 1;
  let estimatedDuration = 240; // デフォルト4時間
  let priority: 'critical' | 'high' | 'medium' = 'medium';

  if (similarEmergencies.length > 0) {
    const avgDuration = similarEmergencies.reduce((sum, record) => 
      sum + (record.作業時間 || 0), 0) / similarEmergencies.length;
    
    estimatedDuration = Math.round(avgDuration);
    
    // 作業時間に基づいて必要人員を算出
    if (avgDuration > 480) { // 8時間超
      recommendedStaff = Math.min(3, availableStaff);
      priority = 'critical';
    } else if (avgDuration > 240) { // 4時間超
      recommendedStaff = Math.min(2, availableStaff);
      priority = 'high';
    }
  }

  // 緊急対応の種別による優先度調整
  if (emergencyType.includes('設備故障') || emergencyType.includes('安全')) {
    priority = 'critical';
    recommendedStaff = Math.min(recommendedStaff + 1, availableStaff);
  }

  return {
    recommendedStaff: Math.max(recommendedStaff, 1),
    estimatedDuration,
    priority
  };
}