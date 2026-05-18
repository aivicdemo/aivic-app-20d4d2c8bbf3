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

// 異常値検出結果の型定義
export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  type: string;
  threshold: number;
}

// データ検証結果の型定義
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/** 対応ルール: 工数データが記録される際に異常値（24時間超過、負の値等）が検出されたとき → 異常値アラートを表示し、データの確認を求める */
export function detectWorkTimeAnomalies(workMinutes: number): AnomalyDetectionResult {
  const maxWorkMinutes = 24 * 60; // 24時間 = 1440分
  const minWorkMinutes = 30; // 30分

  if (workMinutes > maxWorkMinutes) {
    return {
      isAnomaly: true,
      type: '長時間作業',
      threshold: maxWorkMinutes
    };
  }

  if (workMinutes < minWorkMinutes) {
    return {
      isAnomaly: true,
      type: '短時間作業',
      threshold: minWorkMinutes
    };
  }

  return {
    isAnomaly: false,
    type: '正常',
    threshold: 0
  };
}

/** 対応ルール: 工数データが記録される際に異常値（負の値等）が検出されたとき → 異常値アラートを表示し、データの確認を求める */
export function detectNegativeValues(value: number): boolean {
  return value < 0;
}

/** 対応ルール: 月末集計処理が開始されたとき → 標準偏差の2倍を超える値を異常値として抽出し、必須項目の未入力を入力漏れとして一覧表示する */
export function isStatisticalAnomaly(value: number, dataset: number[]): boolean {
  if (dataset.length < 2) {
    return false;
  }

  // 平均値を計算
  const mean = dataset.reduce((sum, val) => sum + val, 0) / dataset.length;
  
  // 標準偏差を計算
  const variance = dataset.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dataset.length;
  const standardDeviation = Math.sqrt(variance);
  
  // 標準偏差の2倍を閾値とする
  const threshold = 2 * standardDeviation;
  
  // 平均値からの乖離が閾値を超える場合は異常値
  return Math.abs(value - mean) > threshold;
}

/** 対応ルール: 工数データが入力される際に必須項目が未入力の状態で保存が実行されたとき → バリデーションエラーを表示し、必須項目の入力を促す */
export function validateDataIntegrity(record: WorkRecord): ValidationResult {
  const errors: string[] = [];

  // 必須項目チェック
  if (!record.作業員ID) {
    errors.push('作業員IDは必須です');
  }

  if (!record.作業開始時刻) {
    errors.push('作業開始時刻は必須です');
  }

  if (!record.プロジェクト名) {
    errors.push('プロジェクト名は必須です');
  }

  if (!record.作業場所) {
    errors.push('作業場所は必須です');
  }

  if (!record.作業種別) {
    errors.push('作業種別は必須です');
  }

  if (!record.作業内容) {
    errors.push('作業内容は必須です');
  }

  if (!record.進捗状況) {
    errors.push('進捗状況は必須です');
  }

  if (!record.承認状態) {
    errors.push('承認状態は必須です');
  }

  // 時刻の整合性チェック
  if (record.作業開始時刻&& record.作業終了時刻) {
    if (record.作業開始時刻.getTime() >= record.作業終了時刻.getTime()) {
      errors.push('作業開始時刻は作業終了時刻より前である必要があります');
    }
  }

  // 作業時間の妥当性チェック
  if (record.作業時間!== null) {
    if (record.作業時間 < 0) {
      errors.push('作業時間は負の値にできません');
    }

    const anomalyResult = detectWorkTimeAnomalies(record.作業時間);
    if (anomalyResult.isAnomaly) {
      errors.push(`作業時間が異常です: ${anomalyResult.type}`);
    }
  }

  // 作業時間と開始・終了時刻の整合性チェック
  if (record.作業開始時刻&& record.作業終了時刻 && record.作業時間!== null) {
    const calculatedMinutes = Math.floor(
      (record.作業終了時刻.getTime() - record.作業開始時刻.getTime()) / (1000 * 60)
    );
    
    // 5分以上の差異がある場合は警告
    if (Math.abs(calculatedMinutes - record.作業時間) > 5) {
      errors.push('記録された作業時間と開始・終了時刻から計算される時間に大きな差異があります');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// 異常値検出ログ用の型定義
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

/** 対応ルール: 工数データに異常値が検出された状態で異常値検証処理が実行されたとき → 異常値の詳細（検出理由、該当項目、推奨修正値）を含む修正指示を作業員のスマートフォンアプリに通知する */
export function createAnomalyLog(
  recordId: string,
  userId: string,
  anomalyType: string,
  detectedItem: string,
  detectedValue: string,
  threshold: string
): AnomalyDetectionLog {
  const now = new Date();
  
  // 重要度を異常値種別に基づいて決定
  let severity: string;
  if (anomalyType === '長時間作業' || anomalyType === '負の値') {
    severity = '高';
  } else if (anomalyType === '短時間作業') {
    severity = '中';
  } else {
    severity = '低';
  }

  return {
    異常値検出ログID: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    検出対象テーブル: '作業記録',
    検出対象レコードID: recordId,
    ユーザーID: userId,
    異常値種別: anomalyType,
    検出項目: detectedItem,
    検出値: detectedValue,
    閾値: threshold,
    重要度: severity,
    確認状況: '未確認',
    通知送信フラグ: false,
    確認者ID: null,
    確認日時: null,
    対応メモ: null,
    検出日時: now,
    作成日時: now,
    更新日時: now
  };
}

/** 対応ルール: 中断・待機時間のデータが蓄積されている状態で作業効率分析が実行されたとき → 異常値検出機能により待機時間が8時間を超える場合はアラートを表示し承認者の確認を必須とする */
export function detectBreakTimeAnomalies(breakMinutes: number): AnomalyDetectionResult {
  const maxBreakMinutes = 8 * 60; // 8時間 = 480分

  if (breakMinutes > maxBreakMinutes) {
    return {
      isAnomaly: true,
      type: '長時間中断',
      threshold: maxBreakMinutes
    };
  }

  if (breakMinutes < 0) {
    return {
      isAnomaly: true,
      type: '負の中断時間',
      threshold: 0
    };
  }

  return {
    isAnomaly: false,
    type: '正常',
    threshold: 0
  };
}

/** 対応ルール: 工数データの妥当性検証プロセス全体において → すべての操作履歴をタイムスタンプ付きで記録し、データの変更追跡と監査証跡を確保する */
export function validateWorkRecordComprehensive(
  record: WorkRecord,
  historicalData: number[] = []
): ValidationResult {
  const errors: string[] = [];

  // 基本的なデータ整合性チェック
  const basicValidation = validateDataIntegrity(record);
  errors.push(...basicValidation.errors);

  // 作業時間の統計的異常値チェック
  if (record.作業時間!== null && historicalData.length > 0) {
    const isStatisticallyAnomalous = isStatisticalAnomaly(record.作業時間, historicalData);
    if (isStatisticallyAnomalous) {
      errors.push('作業時間が過去の実績と比較して統計的に異常です');
    }
  }

  // 日付の妥当性チェック
  const now = new Date();
  if (record.作業日.getTime() > now.getTime()) {
    errors.push('作業日は未来の日付にできません');
  }

  // 作成日時と更新日時の整合性チェック
  if (record.作成日時.getTime() > record.更新日時.getTime()) {
    errors.push('作成日時は更新日時より前である必要があります');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}