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

// データ品質チェック結果の型定義
export interface DataQualityResult {
  recordId: string;
  missingFields: string[];
}

// データ完全性チェック結果の型定義
export interface CompletenessResult {
  completeness: number;
  missingDays: string[];
}

// 期間指定の型定義
export interface TargetPeriod {
  start: string;
  end: string;
}

/** 対応ルール: 工数データが入力される際に必須項目が未入力の状態で保存が実行されたとき → 必須項目の入力チェックと未入力項目の検出を実行する */
export function detectMissingData(
  records: WorkRecord[], 
  requiredFields: string[]
): DataQualityResult[] {
  return records.map(record => {
    const missingFields: string[] = [];
    
    requiredFields.forEach(field => {
      const value = (record as any)[field];
      if (value === null || value === undefined || value === '') {
        missingFields.push(field);
      }
    });
    
    return {
      recordId: record.作業記録ID,
      missingFields
    };
  }).filter(result => result.missingFields.length > 0);
}

/** 対応ルール: 欠損データは前月同期比で補完し異常値は分析対象から除外する → 前後3日間の平均値で補正または前月同期比で補完処理を実行する */
export function interpolateMissingValues(
  value: number | null,
  previousValues: number[],
  method: 'average' | 'trend'
): number {
  if (value !== null && value !== undefined) {
    return value;
  }
  
  const validValues = previousValues.filter(v => v !== null && v !== undefined && !isNaN(v));
  
  if (validValues.length === 0) {
    return 0;
  }
  
  if (method === 'average') {
    // 前後3日間の平均値で補正
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / validValues.length);
  } else {
    // トレンド補完（前月同期比）
    if (validValues.length >= 2) {
      const recent = validValues.slice(-2);
      const trend = recent[1] - recent[0];
      return Math.round(recent[1] + trend);
    } else {
      return validValues[validValues.length - 1];
    }
  }
}

/** 対応ルール: 工数データの完全性チェックを実行する → 当月1日から月末日までの全工数データを対象として自動集計処理を実行する */
export function validateDataCompleteness(
  records: WorkRecord[],
  targetPeriod: TargetPeriod
): CompletenessResult {
  const startDate = new Date(targetPeriod.start);
  const endDate = new Date(targetPeriod.end);
  
  // 期間内の全日付を生成
  const allDates: string[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    allDates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // 実際にデータが存在する日付を抽出
  const recordDates = new Set(
    records
      .filter(record => {
        const recordDate = new Date(record.作業日);
        return recordDate >= startDate && recordDate <= endDate;
      })
      .map(record => new Date(record.作業日).toISOString().split('T')[0])
  );
  
  // 欠損している日付を特定
  const missingDays = allDates.filter(date => !recordDates.has(date));
  
  // 完全性を計算（0-1の範囲）
  const completeness = allDates.length > 0 
    ? (allDates.length - missingDays.length) / allDates.length 
    : 1;
  
  return {
    completeness: Math.round(completeness * 100) / 100,
    missingDays
  };
}

/** 対応ルール: データの信頼性レベルを算出する → 異常値や入力漏れを検出した場合は警告表示と共にデータの信頼性レベルを併記する */
export function calculateDataReliability(
  records: WorkRecord[],
  anomalyCount: number
): number {
  if (records.length === 0) {
    return 0;
  }
  
  // 基本的なデータ品質指標を計算
  let qualityScore = 100;
  
  // 異常値による信頼性低下（異常値1件につき5点減点）
  const anomalyPenalty = Math.min(anomalyCount * 5, 50);
  qualityScore -= anomalyPenalty;
  
  // 必須項目の入力率をチェック
  const requiredFields = ['作業開始時刻', '作業終了時刻', '作業種別', '作業内容'];
  let missingFieldCount = 0;
  
  records.forEach(record => {
    requiredFields.forEach(field => {
      const value = (record as any)[field];
      if (value === null || value === undefined || value === '') {
        missingFieldCount++;
      }
    });
  });
  
  // 入力漏れによる信頼性低下
  const totalRequiredFields = records.length * requiredFields.length;
  const missingFieldRatio = totalRequiredFields > 0 ? missingFieldCount / totalRequiredFields : 0;
  const missingFieldPenalty = missingFieldRatio * 30;
  qualityScore -= missingFieldPenalty;
  
  // 作業時間の妥当性チェック
  let invalidTimeCount = 0;
  records.forEach(record => {
    if (record.作業時間!== null) {
      // 24時間（1440分）を超える、または負の値は異常
      if (record.作業時間 > 1440 || record.作業時間 < 0) {
        invalidTimeCount++;
      }
    }
  });
  
  const invalidTimeRatio = records.length > 0 ? invalidTimeCount / records.length : 0;
  const invalidTimePenalty = invalidTimeRatio * 20;
  qualityScore -= invalidTimePenalty;
  
  // 最終的な信頼性スコア（0-100の範囲）
  const reliability = Math.max(0, Math.min(100, qualityScore)) / 100;
  
  return Math.round(reliability * 100) / 100;
}

// データ補正処理のヘルパー関数
export function correctAnomalousData(
  records: WorkRecord[],
  anomalies: AnomalyDetectionLog[]
): WorkRecord[] {
  const correctedRecords = [...records];
  
  anomalies.forEach(anomaly => {
    const recordIndex = correctedRecords.findIndex(
      record => record.作業記録ID === anomaly.検出対象レコードID
    );
    
    if (recordIndex !== -1) {
      const record = correctedRecords[recordIndex];
      
      // 作業時間の異常値補正
      if (anomaly.検出項目 === '作業時間' && record.作業時間!== null) {
        if (record.作業時間 > 1440) {
          // 24時間を超える場合は8時間（480分）に補正
          correctedRecords[recordIndex] = {
            ...record,
            作業時間: 480,
            備考: (record.備考 || '') + ' [自動補正: 異常な作業時間を8時間に修正]'
          };
        } else if (record.作業時間 < 0) {
          // 負の値の場合は0に補正
          correctedRecords[recordIndex] = {
            ...record,
            作業時間: 0,
            備考: (record.備考 || '') + ' [自動補正: 負の作業時間を0に修正]'
          };
        }
      }
    }
  });
  
  return correctedRecords;
}

// データ品質レポート生成
export function generateDataQualityReport(
  records: WorkRecord[],
  anomalies: AnomalyDetectionLog[],
  targetPeriod: TargetPeriod
): {
  totalRecords: number;
  anomalyCount: number;
  completeness: CompletenessResult;
  reliability: number;
  qualityLevel: 'high' | 'medium' | 'low';
} {
  const completeness = validateDataCompleteness(records, targetPeriod);
  const reliability = calculateDataReliability(records, anomalies.length);
  
  let qualityLevel: 'high' | 'medium' | 'low' = 'low';
  if (reliability >= 0.9 && completeness.completeness >= 0.95) {
    qualityLevel = 'high';
  } else if (reliability >= 0.7 && completeness.completeness >= 0.8) {
    qualityLevel = 'medium';
  }
  
  return {
    totalRecords: records.length,
    anomalyCount: anomalies.length,
    completeness,
    reliability,
    qualityLevel
  };
}