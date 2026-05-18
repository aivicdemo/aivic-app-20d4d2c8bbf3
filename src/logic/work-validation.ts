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
  errors: string[];
}

/** 対応ルール: 工数データが入力される際に必須項目が未入力の状態で保存が実行されたとき → 作業開始時刻・終了時刻・作業種別・作業員IDを必須項目として検証し、未入力項目を返す */
export function validateRequiredFields(record: Partial<WorkRecord>): string[] {
  const requiredFields = ['作業開始時刻', '作業種別', '作業員ID'];
  const missingFields: string[] = [];

  requiredFields.forEach(field => {
    const value = record[field as keyof WorkRecord];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(field);
    }
  });

  // 作業終了時刻は進捗状況が「完了」の場合のみ必須
  if (record.進捗状況 === '完了' && (!record.作業終了時刻 || record.作業終了時刻.trim() === '')) {
    missingFields.push('作業終了時刻');
  }

  return missingFields;
}

/** 対応ルール: 工数データが記録される際に異常値が検出されたとき → 作業開始時刻が終了時刻より後の場合は異常値として検出する */
export function validateTimeSequence(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) {
    return true; // 時刻が未設定の場合は検証をスキップ
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  // 日付が無効な場合は異常値として扱う
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return false;
  }

  // 開始時刻が終了時刻より後の場合は異常値
  return startDate <= endDate;
}

/** 対応ルール: 複数の現場作業員が同時に工数入力を行う状況で新しい作業開始ボタンがタップされた場合 → 同一作業員が複数の作業を並行実行する場合は重複として検出する */
export function validateDuplicateRecord(newRecord: WorkRecord, existingRecords: WorkRecord[]): boolean {
  const newStartTime = new Date(newRecord.作業開始時刻);
  const newEndTime = newRecord.作業終了時刻? new Date(newRecord.作業終了時刻) : null;

  for (const existing of existingRecords) {
    // 同一作業員の記録のみチェック
    if (existing.作業員ID !== newRecord.作業員ID) {
      continue;
    }

    // 既存記録が進行中（終了時刻なし）または完了済みの場合をチェック
    const existingStartTime = new Date(existing.作業開始時刻);
    const existingEndTime = existing.作業終了時刻? new Date(existing.作業終了時刻) : null;

    // 既存記録が進行中の場合
    if (!existingEndTime) {
      // 新しい記録の開始時刻が既存記録の開始時刻以降の場合は重複
      if (newStartTime >= existingStartTime) {
        return true; // 重複あり
      }
    } else {
      // 既存記録が完了済みの場合、時間の重複をチェック
      const isOverlapping = (
        (newStartTime >= existingStartTime && newStartTime < existingEndTime) ||
        (newEndTime && newEndTime > existingStartTime && newEndTime <= existingEndTime) ||
        (newStartTime <= existingStartTime && newEndTime && newEndTime >= existingEndTime)
      );

      if (isOverlapping) {
        return true; // 重複あり
      }
    }
  }

  return false; // 重複なし
}

/** 対応ルール: 工数データの整合性確認が実行される状態で作業時間が異常値の場合 → 工数データの整合性をチェックし、異常値がある場合は確認を求める */
export function isDataIntegrityValid(record: WorkRecord): boolean {
  // 必須項目チェック
  const missingFields = validateRequiredFields(record);
  if (missingFields.length > 0) {
    return false;
  }

  // 時刻の順序チェック
  if (record.作業終了時刻) {
    if (!validateTimeSequence(record.作業開始時刻, record.作業終了時刻)) {
      return false;
    }
  }

  // 作業時間の妥当性チェック
  if (record.作業時間!== null) {
    // 作業時間が負の値の場合は異常
    if (record.作業時間 < 0) {
      return false;
    }

    // 作業時間が24時間（1440分）を超える場合は異常
    if (record.作業時間> 1440) {
      return false;
    }

    // 作業時間が30分未満の場合は異常（短時間作業として要確認）
    if (record.作業時間< 30) {
      return false;
    }
  }

  // 開始時刻と終了時刻から計算した作業時間との整合性チェック
  if (record.作業終了時刻 && record.作業時間!== null) {
    const startTime = new Date(record.作業開始時刻);
    const endTime = new Date(record.作業終了時刻);
    const calculatedMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    // 計算値と記録値の差が5分以上の場合は異常
    if (Math.abs(calculatedMinutes - record.作業時間) > 5) {
      return false;
    }
  }

  // 進捗状況と終了時刻の整合性チェック
  if (record.進捗状況 === '完了' && !record.作業終了時刻) {
    return false;
  }

  if (record.進捗状況 === '作業中' && record.作業終了時刻) {
    return false;
  }

  return true;
}

/** 対応ルール: 工数データに異常値や入力漏れが検出された状態でデータ検証処理が実行されたとき → 異常値の詳細情報と修正候補を提示し、承認または修正を求める */
export function detectAnomalousValues(record: WorkRecord): ValidationResult {
  const errors: string[] = [];

  // 作業時間の異常値チェック
  if (record.作業時間!== null) {
    if (record.作業時間 > 480) { // 8時間超過
      errors.push('作業時間が8時間を超過しています。確認が必要です。');
    }
    
    if (record.作業時間 < 30) { // 30分未満
      errors.push('作業時間が30分未満です。作業内容の詳細入力が必要です。');
    }
  }

  // 日付の妥当性チェック
  const workDate = new Date(record.作業日);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - workDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays > 7) {
    errors.push('作業日が1週間以上前の日付です。確認が必要です。');
  }

  if (diffDays < 0) {
    errors.push('作業日が未来の日付です。確認が必要です。');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/** 対応ルール: 中断・待機時間のデータが蓄積されている状態で作業効率分析が実行されたとき → 異常値検出機能により待機時間が8時間を超える場合はアラートを表示し承認者の確認を必須とする */
export function validateInterruptionTime(interruption: InterruptionRecord): ValidationResult {
  const errors: string[] = [];

  if (interruption.中断時間 !== null) {
    // 中断時間が8時間（480分）を超える場合
    if (interruption.中断時間 > 480) {
      errors.push('中断時間が8時間を超過しています。承認者の確認が必要です。');
    }

    // 中断時間が負の値の場合
    if (interruption.中断時間 < 0) {
      errors.push('中断時間が負の値です。データを確認してください。');
    }
  }

  // 中断開始時刻と終了時刻の整合性チェック
  if (interruption.中断終了日時) {
    if (!validateTimeSequence(interruption.中断開始日時, interruption.中断終了日時)) {
      errors.push('中断開始時刻が終了時刻より後になっています。');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/** 対応ルール: 工数データの妥当性検証プロセス全体においてデータの入力、修正、承認が行われるとき → すべての操作履歴をタイムスタンプ付きで記録し、データの変更追跡と監査証跡を確保する */
export function validateWorkRecordComprehensive(record: WorkRecord, existingRecords: WorkRecord[] = []): ValidationResult {
  const errors: string[] = [];

  // 必須項目チェック
  const missingFields = validateRequiredFields(record);
  if (missingFields.length > 0) {
    errors.push(`必須項目が未入力です: ${missingFields.join(', ')}`);
  }

  // データ整合性チェック
  if (!isDataIntegrityValid(record)) {
    errors.push('データの整合性に問題があります。');
  }

  // 重複チェック
  if (validateDuplicateRecord(record, existingRecords)) {
    errors.push('同一作業員の並行作業が検出されました。前の作業の終了確認が必要です。');
  }

  // 異常値チェック
  const anomalyResult = detectAnomalousValues(record);
  if (!anomalyResult.isValid) {
    errors.push(...anomalyResult.errors);
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/** 対応ルール: 月次業績評価期間において工数実績データが存在する状態でデータ収集が開始されたとき → 異常値検出機能により工数データの妥当性をチェックし、1日24時間を超える工数や負の値を異常値として検出・報告する */
export function validateMonthlyWorkData(records: WorkRecord[]): ValidationResult {
  const errors: string[] = [];
  const dailyWorkHours: { [key: string]: { [workerId: string]: number } } = {};

  records.forEach(record => {
    const workDate = record.作業日.split('T')[0]; // 日付部分のみ取得
    const workerId = record.作業員ID;
    const workHours = record.作業時間 ? record.作業時間 / 60 : 0; // 分を時間に変換

    if (!dailyWorkHours[workDate]) {
      dailyWorkHours[workDate] = {};
    }

    if (!dailyWorkHours[workDate][workerId]) {
      dailyWorkHours[workDate][workerId] = 0;
    }

    dailyWorkHours[workDate][workerId] += workHours;

    // 個別レコードの異常値チェック
    if (record.作業時間 !== null && record.作業時間 < 0) {
      errors.push(`作業員ID: ${workerId}, 日付: ${workDate} - 負の作業時間が検出されました`);
    }
  });

  // 1日24時間超過チェック
  Object.keys(dailyWorkHours).forEach(date => {
    Object.keys(dailyWorkHours[date]).forEach(workerId => {
      const totalHours = dailyWorkHours[date][workerId];
      if (totalHours > 24) {
        errors.push(`作業員ID: ${workerId}, 日付: ${date} - 1日の作業時間が24時間を超過しています (${totalHours.toFixed(1)}時間)`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}