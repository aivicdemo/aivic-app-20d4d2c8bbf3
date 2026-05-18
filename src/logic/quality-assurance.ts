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

// 修正履歴の型定義
export interface ModificationHistory {
  修正履歴ID: string;
  対象テーブル: string;
  対象レコードID: string;
  修正項目: string;
  修正前値: string;
  修正後値: string;
  修正理由: string;
  修正者ID: string;
  修正日時: Date;
  承認者ID: string | null;
  承認日時: Date | null;
}

// データ完全性チェック結果の型定義
export interface DataCompletenessResult {
  completeness: number;
  missingFields: string[];
}

/** 対応ルール: 工数データが入力される際に → データの完全性チェックを実行し、未入力・異常値がある場合は補正を要求 */
export function validateDataCompleteness(records: WorkRecord[]): DataCompletenessResult {
  if (records.length === 0) {
    return { completeness: 0, missingFields: [] };
  }

  const requiredFields = ['作業員ID', '作業開始時刻', '作業種別', '作業内容', '作業場所'];
  let totalFields = 0;
  let completedFields = 0;
  const missingFieldsSet = new Set<string>();

  for (const record of records) {
    for (const field of requiredFields) {
      totalFields++;
      const value = record[field as keyof WorkRecord];
      
      if (value !== null && value !== undefined && value !== '') {
        // 作業時間の異常値チェック（24時間超過、負の値）
        if (field === '作業時間' && typeof value === 'number') {
          if (value > 1440 || value < 0) { // 1440分 = 24時間
            missingFieldsSet.add(`${field}(異常値: ${value}分)`);
          } else {
            completedFields++;
          }
        } else {
          completedFields++;
        }
      } else {
        missingFieldsSet.add(field);
      }
    }

    // 作業終了時刻が開始時刻より前の場合の整合性チェック
    if (record.作業終了時刻&& record.作業開始時刻) {
      if (record.作業終了時刻.getTime() <= record.作業開始時刻.getTime()) {
        missingFieldsSet.add('作業終了時刻(開始時刻より前)');
      }
    }
  }

  const completeness = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
  return {
    completeness: Math.round(completeness * 100) / 100,
    missingFields: Array.from(missingFieldsSet)
  };
}

/** 対応ルール: 異常値が検出された状態で → 異常値は前後3日間の平均値で補正 */
export function interpolateMissingData(value: number | null, previousValues: number[]): number {
  if (value !== null && value >= 0 && value <= 1440) {
    return value;
  }

  if (previousValues.length === 0) {
    return 480; // デフォルト8時間
  }

  // 前後3日間の平均値を計算（最大6つの値を使用）
  const validValues = previousValues.filter(v => v >= 0 && v <= 1440).slice(-6);
  
  if (validValues.length === 0) {
    return 480; // デフォルト8時間
  }

  const sum = validValues.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / validValues.length);
}

/** 対応ルール: 修正指示を受けた現場作業員が工数データの修正を行うとき → 修正前のデータを履歴として保持し、修正理由と修正者を記録 */
export function createModificationHistory(
  originalRecord: WorkRecord,
  modifiedRecord: WorkRecord,
  modifierId: string,
  reason: string
): ModificationHistory {
  const now = new Date();
  
  // 変更された項目を特定
  const changedFields: string[] = [];
  const keys = Object.keys(originalRecord) as (keyof WorkRecord)[];
  
  for (const key of keys) {
    const originalValue = originalRecord[key];
    const modifiedValue = modifiedRecord[key];
    
    if (originalValue !== modifiedValue) {
      changedFields.push(key);
    }
  }

  const modificationHistory: ModificationHistory = {
    修正履歴ID: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    対象テーブル: '作業記録',
    対象レコードID: originalRecord.作業記録ID,
    修正項目: changedFields.join(', '),
    修正前値: JSON.stringify(originalRecord),
    修正後値: JSON.stringify(modifiedRecord),
    修正理由: reason,
    修正者ID: modifierId,
    修正日時: now,
    承認者ID: null,
    承認日時: null
  };

  return modificationHistory;
}

/** 対応ルール: 工数データに異常値や入力漏れが検出された状態で → データの信頼性レベルを併記 */
export function calculateDataReliability(records: WorkRecord[]): number {
  if (records.length === 0) {
    return 0;
  }

  let reliabilityScore = 0;
  let totalChecks = 0;

  for (const record of records) {
    // 必須項目の完全性チェック
    const requiredFields = ['作業員ID', '作業開始時刻', '作業種別', '作業内容', '作業場所'];
    let completedRequiredFields = 0;
    
    for (const field of requiredFields) {
      totalChecks++;
      const value = record[field as keyof WorkRecord];
      if (value !== null && value !== undefined && value !== '') {
        completedRequiredFields++;
        reliabilityScore++;
      }
    }

    // 時刻の整合性チェック
    totalChecks++;
    if (record.作業終了時刻&& record.作業開始時刻) {
      if (record.作業終了時刻.getTime() > record.作業開始時刻.getTime()) {
        reliabilityScore++;
      }
    } else if (!record.作業終了時刻) {
      // 作業中の場合は整合性ありとみなす
      reliabilityScore++;
    }

    // 作業時間の妥当性チェック
    totalChecks++;
    if (record.作業時間!== null) {
      if (record.作業時間>= 0 && record.作業時間<= 1440) { // 0分〜24時間
        reliabilityScore++;
      }
    } else if (!record.作業終了時刻) {
      // 作業中で時間未計算の場合は妥当とみなす
      reliabilityScore++;
    }

    // 承認状態の妥当性チェック
    totalChecks++;
    const validApprovalStates = ['未承認', '承認済み', '差し戻し'];
    if (validApprovalStates.includes(record.承認状態)) {
      reliabilityScore++;
    }
  }

  const reliability = totalChecks > 0 ? (reliabilityScore / totalChecks) * 100 : 0;
  return Math.round(reliability * 100) / 100;
}

/** 対応ルール: 工数データが記録される際に → 異常値（24時間超過、負の値等）が検出されたとき異常値アラートを表示 */
export function detectAnomalies(records: WorkRecord[]): AnomalyDetectionLog[] {
  const anomalies: AnomalyDetectionLog[] = [];
  const now = new Date();

  for (const record of records) {
    // 作業時間の異常値検出
    if (record.作業時間!== null) {
      if (record.作業時間 > 1440) { // 24時間超過
        anomalies.push({
          異常値検出ログID: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
          検出日時: now,
          作成日時: now,
          更新日時: now
        });
      }

      if (record.作業時間 < 0) { // 負の値
        anomalies.push({
          異常値検出ログID: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          検出対象テーブル: '作業記録',
          検出対象レコードID: record.作業記録ID,
          ユーザーID: record.作業員ID,
          異常値種別: '負の工数',
          検出項目: '作業時間',
          検出値: record.作業時間.toString(),
          閾値: '0',
          重要度: '高',
          確認状況: '未確認',
          通知送信フラグ: false,
          確認者ID: null,
          確認日時: null,
          対応メモ: null,
          検出日時: now,
          作成日時: now,
          更新日時: now
        });
      }

      if (record.作業時間 < 30 && record.作業時間 > 0) { // 30分未満の短時間作業
        anomalies.push({
          異常値検出ログID: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          検出対象テーブル: '作業記録',
          検出対象レコードID: record.作業記録ID,
          ユーザーID: record.作業員ID,
          異常値種別: '短時間作業',
          検出項目: '作業時間',
          検出値: record.作業時間.toString(),
          閾値: '30',
          重要度: '中',
          確認状況: '未確認',
          通知送信フラグ: false,
          確認者ID: null,
          確認日時: null,
          対応メモ: null,
          検出日時: now,
          作成日時: now,
          更新日時: now
        });
      }
    }

    // 時刻の整合性チェック
    if (record.作業終了時刻&& record.作業開始時刻) {
      if (record.作業終了時刻.getTime() <= record.作業開始時刻.getTime()) {
        anomalies.push({
          異常値検出ログID: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          検出対象テーブル: '作業記録',
          検出対象レコードID: record.作業記録ID,
          ユーザーID: record.作業員ID,
          異常値種別: '時刻整合性エラー',
          検出項目: '作業終了時刻',
          検出値: record.作業終了時刻.toISOString(),
          閾値: record.作業開始時刻.toISOString(),
          重要度: '高',
          確認状況: '未確認',
          通知送信フラグ: false,
          確認者ID: null,
          確認日時: null,
          対応メモ: null,
          検出日時: now,
          作成日時: now,
          更新日時: now
        });
      }
    }
  }

  return anomalies;
}

/** 対応ルール: 中断・待機時間のデータが蓄積されている状態で → 異常値検出機能により待機時間が8時間を超える場合はアラートを表示 */
export function detectInterruptionAnomalies(interruptions: InterruptionRecord[]): AnomalyDetectionLog[] {
  const anomalies: AnomalyDetectionLog[] = [];
  const now = new Date();

  for (const interruption of interruptions) {
    if (interruption.中断時間 !== null && interruption.中断時間 > 480) { // 8時間 = 480分
      anomalies.push({
        異常値検出ログID: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        検出対象テーブル: '中断記録',
        検出対象レコードID: interruption.中断記録ID,
        ユーザーID: interruption.記録者ID,
        異常値種別: '長時間中断',
        検出項目: '中断時間',
        検出値: interruption.中断時間.toString(),
        閾値: '480',
        重要度: '高',
        確認状況: '未確認',
        通知送信フラグ: false,
        確認者ID: null,
        確認日時: null,
        対応メモ: null,
        検出日時: now,
        作成日時: now,
        更新日時: now
      });
    }
  }

  return anomalies;
}

/** 対応ルール: 工数データの妥当性検証プロセス全体において → すべての操作履歴をタイムスタンプ付きで記録し、データの変更追跡と監査証跡を確保 */
export function createAuditTrail(
  operation: string,
  targetTable: string,
  targetRecordId: string,
  userId: string,
  details: string
): ModificationHistory {
  const now = new Date();
  
  return {
    修正履歴ID: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    対象テーブル: targetTable,
    対象レコードID: targetRecordId,
    修正項目: operation,
    修正前値: '',
    修正後値: details,
    修正理由: `操作ログ: ${operation}`,
    修正者ID: userId,
    修正日時: now,
    承認者ID: null,
    承認日時: null
  };
}

/** 対応ルール: 月末集計処理が開始されたとき → 標準偏差の2倍を超える値を異常値として抽出 */
export function detectStatisticalAnomalies(workTimes: number[]): number[] {
  if (workTimes.length < 2) {
    return [];
  }

  // 平均値を計算
  const mean = workTimes.reduce((sum, time) => sum + time, 0) / workTimes.length;
  
  // 標準偏差を計算
  const variance = workTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / workTimes.length;
  const standardDeviation = Math.sqrt(variance);
  
  // 標準偏差の2倍を閾値とする
  const threshold = standardDeviation * 2;
  
  // 異常値を抽出
  return workTimes.filter(time => Math.abs(time - mean) > threshold);
}

/** 対応ルール: 修正データの承認が完了した状態で → 承認日時と承認者IDを記録してデータを確定状態に変更 */
export function approveModification(
  modificationHistory: ModificationHistory,
  approverId: string
): ModificationHistory {
  const now = new Date();
  
  return {
    ...modificationHistory,
    承認者ID: approverId,
    承認日時: now
  };
}