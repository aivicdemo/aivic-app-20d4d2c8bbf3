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

// バリデーション結果の型定義
export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
}

export interface DurationValidationResult {
  isValid: boolean;
  warning: string | null;
}

/** 対応ルール: 工数データが入力される際に必須項目が未入力の状態で保存が実行されたとき → 作業開始時刻・終了時刻・作業種別・作業員IDを必須項目として検証し、未入力項目を赤色でハイライト表示して入力を促す */
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

/** 対応ルール: 工数データの整合性確認が実行される状態で作業開始時刻が終了時刻より後の場合 → 異常値として警告を表示し、確認ダイアログで作業員に再確認を求める */
export function validateTimeSequence(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) {
    return false;
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  // 無効な日付の場合はfalseを返す
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return false;
  }

  return startDate < endDate;
}

/** 対応ルール: 工数データの整合性確認が実行される状態で作業時間が8時間を超過している場合 → 異常値として警告を表示し、確認ダイアログで作業員に再確認を求める */
export function validateWorkDuration(workMinutes: number): DurationValidationResult {
  const EIGHT_HOURS_IN_MINUTES = 8 * 60; // 480分
  const THIRTY_MINUTES = 30;

  if (workMinutes < 0) {
    return {
      isValid: false,
      warning: '作業時間が負の値です。正しい時間を入力してください。'
    };
  }

  if (workMinutes < THIRTY_MINUTES) {
    return {
      isValid: true,
      warning: '作業時間が30分未満です。作業内容の詳細入力をお願いします。'
    };
  }

  if (workMinutes > EIGHT_HOURS_IN_MINUTES) {
    return {
      isValid: false,
      warning: '作業時間が8時間を超過しています。異常値の可能性があります。'
    };
  }

  return {
    isValid: true,
    warning: null
  };
}

/** 対応ルール: 同一作業員が複数の作業を並行して実行する状態で新しい作業開始ボタンがタップされた場合 → 前の作業の終了確認ダイアログを表示し、明示的な終了操作を求める */
export function checkDuplicateWork(newRecord: WorkRecord, existingRecords: WorkRecord[]): boolean {
  const newStartTime = new Date(newRecord.作業開始時刻);
  const newEndTime = newRecord.作業終了時刻? new Date(newRecord.作業終了時刻) : null;

  for (const existing of existingRecords) {
    // 同一作業員かチェック
    if (existing.作業員ID !== newRecord.作業員ID) {
      continue;
    }

    // 同一作業記録IDの場合はスキップ
    if (existing.作業記録ID === newRecord.作業記録ID) {
      continue;
    }

    const existingStartTime = new Date(existing.作業開始時刻);
    const existingEndTime = existing.作業終了時刻? new Date(existing.作業終了時刻) : null;

    // 既存作業が終了していない場合（作業中）
    if (!existingEndTime) {
      return true; // 重複あり
    }

    // 新しい作業が終了していない場合
    if (!newEndTime) {
      // 既存作業の終了時刻より後に開始していればOK
      if (newStartTime >= existingEndTime) {
        continue;
      }
      return true; // 重複あり
    }

    // 両方とも終了時刻がある場合、時間の重複をチェック
    const isOverlapping = (
      (newStartTime < existingEndTime && newEndTime > existingStartTime)
    );

    if (isOverlapping) {
      return true; // 重複あり
    }
  }

  return false; // 重複なし
}