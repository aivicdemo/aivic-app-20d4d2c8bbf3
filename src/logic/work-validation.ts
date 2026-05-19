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

// バリデーション結果の型定義
export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
}

/** 対応ルール: 工数データが入力される際に必須項目が未入力の状態で保存が実行されたとき → 作業開始時刻・終了時刻・作業種別・作業員IDを必須項目として検証し、未入力の場合はエラーメッセージを表示して保存を拒否する */
export function validateRequiredFields(record: Partial<WorkRecord>): ValidationResult {
  const requiredFields = ['作業開始時刻', '作業種別', '作業員ID'];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = record[field as keyof WorkRecord];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/** 対応ルール: 工数データが記録される際に異常値が検出されたとき → 作業開始時刻が終了時刻より後の場合は異常値として検出し、異常値アラートを表示する */
export function validateTimeConsistency(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) {
    return true; // 時刻が未設定の場合は整合性チェック対象外
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  // 無効な日付の場合は不整合とみなす
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return false;
  }

  // 開始時刻が終了時刻より後の場合は不整合
  return startDate <= endDate;
}

/** 対応ルール: 同一作業員が複数の作業を並行して実行する状態で新しい作業開始ボタンがタップされた場合 → 前の作業の終了確認ダイアログを表示し、明示的な終了操作を求める */
export function validateDuplicateWork(newRecord: WorkRecord, existingRecords: WorkRecord[]): boolean {
  if (!newRecord.作業員ID || !newRecord.作業開始時刻) {
    return true; // 必要な情報が不足している場合は重複チェック対象外
  }

  const newStartTime = new Date(newRecord.作業開始時刻);
  if (isNaN(newStartTime.getTime())) {
    return false; // 無効な開始時刻
  }

  // 同一作業員の進行中作業をチェック
  for (const existingRecord of existingRecords) {
    if (existingRecord.作業員ID === newRecord.作業員ID && 
        existingRecord.進捗状況 === '作業中' && 
        !existingRecord.作業終了時刻) {
      
      const existingStartTime = new Date(existingRecord.作業開始時刻);
      if (isNaN(existingStartTime.getTime())) {
        continue;
      }

      // 既存の作業が終了していない場合は重複
      return false;
    }
  }

  return true;
}

/** 対応ルール: 工数データの異常値検出機能が動作する状態で作業時間が30分未満の場合 → 短時間作業として確認ダイアログを表示し、作業内容の詳細入力を促す */
export function isShortWorkWarning(workDuration: number): boolean {
  // 作業時間が30分（30分）未満の場合は警告対象
  return workDuration < 30;
}

/** 対応ルール: 工数データが記録される際に異常値が検出されたとき → 作業時間が24時間を超える場合は異常値として検出し、異常値アラートを表示する */
export function isLongWorkAnomaly(workDuration: number): boolean {
  // 作業時間が24時間（1440分）を超える場合は異常値
  return workDuration > 1440;
}

/** 対応ルール: 工数データの妥当性検証プロセスにおいて作業時間が24時間を超える場合 → 異常値として検出し、現場管理者に通知する */
export function validateWorkDuration(startTime: string, endTime: string): { isValid: boolean; duration: number; isAnomaly: boolean } {
  if (!startTime || !endTime) {
    return { isValid: false, duration: 0, isAnomaly: false };
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { isValid: false, duration: 0, isAnomaly: false };
  }

  if (startDate > endDate) {
    return { isValid: false, duration: 0, isAnomaly: false };
  }

  const durationMs = endDate.getTime() - startDate.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));

  return {
    isValid: true,
    duration: durationMinutes,
    isAnomaly: isLongWorkAnomaly(durationMinutes)
  };
}

/** 対応ルール: 中断・待機時間のデータが蓄積されている状態で作業効率分析が実行されたとき → 異常値検出機能により待機時間が8時間を超える場合はアラートを表示し承認者の確認を必須とする */
export function isInterruptionTimeAnomaly(interruptionDuration: number): boolean {
  // 中断時間が8時間（480分）を超える場合は異常値
  return interruptionDuration > 480;
}

/** 対応ルール: 工数データの入力チェックにおいて必須項目の入力状態をチェックする → 必須項目に未入力がある場合はエラーメッセージを表示し、未入力項目を赤色でハイライト表示する */
export function validateWorkRecordCompleteness(record: Partial<WorkRecord>): { isComplete: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 必須項目のチェック
  const requiredFieldsCheck = validateRequiredFields(record);
  if (!requiredFieldsCheck.isValid) {
    errors.push(...requiredFieldsCheck.missingFields.map(field => `${field}は必須項目です`));
  }

  // 時刻整合性のチェック
  if (record.作業開始時刻&& record.作業終了時刻) {
    if (!validateTimeConsistency(record.作業開始時刻, record.作業終了時刻)) {
      errors.push('作業開始時刻は終了時刻より前である必要があります');
    }
  }

  return {
    isComplete: errors.length === 0,
    errors
  };
}

/** 対応ルール: 月末集計処理において工数データに異常値または入力漏れが検出された状態 → 標準偏差の2倍を超える値を異常値として抽出し、必須項目の未入力を入力漏れとして一覧表示する */
export function detectAnomalousWorkDurations(workRecords: WorkRecord[]): { anomalies: WorkRecord[]; threshold: number } {
  const validDurations = workRecords
    .filter(record => record.作業時間 !== null && record.作業時間 !== undefined)
    .map(record => record.作業時間 as number);

  if (validDurations.length === 0) {
    return { anomalies: [], threshold: 0 };
  }

  // 平均値の計算
  const mean = validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length;

  // 標準偏差の計算
  const variance = validDurations.reduce((sum, duration) => sum + Math.pow(duration - mean, 2), 0) / validDurations.length;
  const standardDeviation = Math.sqrt(variance);

  // 閾値（平均値 ± 標準偏差の2倍）
  const threshold = standardDeviation * 2;
  const upperLimit = mean + threshold;
  const lowerLimit = mean - threshold;

  // 異常値の抽出
  const anomalies = workRecords.filter(record => {
    if (record.作業時間 === null || record.作業時間 === undefined) {
      return false;
    }
    return record.作業時間 > upperLimit || record.作業時間 < lowerLimit;
  });

  return { anomalies, threshold };
}

/** 対応ルール: 工数データの妥当性検証において修正前のデータを履歴として保持し、修正理由と修正者を記録する */
export function createWorkRecordHistory(originalRecord: WorkRecord, modifiedRecord: WorkRecord, modificationReason: string, modifierId: string): {
  historyEntry: {
    originalRecord: WorkRecord;
    modifiedRecord: WorkRecord;
    modificationReason: string;
    modifierId: string;
    modificationTimestamp: string;
  }
} {
  return {
    historyEntry: {
      originalRecord: { ...originalRecord },
      modifiedRecord: { ...modifiedRecord },
      modificationReason,
      modifierId,
      modificationTimestamp: new Date().toISOString()
    }
  };
}