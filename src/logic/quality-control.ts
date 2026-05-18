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
export interface AnomalousValueLog {
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

// 期間の型定義
export interface Period {
  start: string;
  end: string;
}

// データ品質レポートの型定義
export interface DataQualityReport {
  totalRecords: number;
  validRecords: number;
  anomalousRecords: number;
  missingDataCount: number;
  reliabilityScore: number;
}

/** 対応ルール: 工数データが記録される際に → 必須項目の未入力を入力漏れとして一覧表示する */
export function detectMissingData(workRecords: WorkRecord[], expectedRecords: number): string[] {
  const missingDataList: string[] = [];
  
  // 必須項目の定義
  const requiredFields = [
    '作業開始時刻',
    '作業終了時刻',
    'プロジェクト名',
    '作業場所',
    '作業種別',
    '作業内容'
  ];
  
  workRecords.forEach((record, index) => {
    requiredFields.forEach(field => {
      const value = record[field as keyof WorkRecord];
      if (value === null || value === undefined || value === '') {
        missingDataList.push(`記録${index + 1}: ${field}が未入力`);
      }
    });
  });
  
  // 期待される記録数と実際の記録数の差分をチェック
  if (workRecords.length < expectedRecords) {
    const missingCount = expectedRecords - workRecords.length;
    missingDataList.push(`${missingCount}件の作業記録が不足しています`);
  }
  
  return missingDataList;
}

/** 対応ルール: 異常値が検出された状態で → 異常値は前後3日間の平均値で補正する */
export function correctAnomalousData(anomalousValue: number, recentValues: number[]): number {
  if (recentValues.length === 0) {
    return anomalousValue;
  }
  
  // 前後3日間の値から平均値を計算
  const validValues = recentValues.filter(value => 
    value > 0 && value <= 1440 // 0分より大きく1440分（24時間）以下
  );
  
  if (validValues.length === 0) {
    return anomalousValue;
  }
  
  const sum = validValues.reduce((acc, value) => acc + value, 0);
  const average = sum / validValues.length;
  
  return Math.round(average);
}

/** 対応ルール: 月末集計処理が開始されたとき → 当月の全工数データの完全性チェックを実行し、未入力・異常値がある場合は補正を要求する */
export function validateDataCompleteness(workRecords: WorkRecord[], period: Period): boolean {
  const startDate = new Date(period.start);
  const endDate = new Date(period.end);
  
  // 期間内の作業記録をフィルタリング
  const periodRecords = workRecords.filter(record => {
    const recordDate = new Date(record.作業日);
    return recordDate >= startDate && recordDate <= endDate;
  });
  
  // 必須項目の完全性チェック
  const requiredFields = [
    '作業開始時刻',
    '作業終了時刻',
    'プロジェクト名',
    '作業場所',
    '作業種別',
    '作業内容'
  ];
  
  let hasIncompleteData = false;
  
  for (const record of periodRecords) {
    // 必須項目チェック
    for (const field of requiredFields) {
      const value = record[field as keyof WorkRecord];
      if (value === null || value === undefined || value === '') {
        hasIncompleteData = true;
        break;
      }
    }
    
    // 異常値チェック
    if (record.作業時間!== null) {
      // 24時間（1440分）を超える場合は異常値
      if (record.作業時間 > 1440 || record.作業時間 < 0) {
        hasIncompleteData = true;
      }
    }
    
    // 開始時刻と終了時刻の整合性チェック
    if (record.作業開始時刻&& record.作業終了時刻) {
      const startTime = new Date(record.作業開始時刻);
      const endTime = new Date(record.作業終了時刻);
      if (startTime >= endTime) {
        hasIncompleteData = true;
      }
    }
    
    if (hasIncompleteData) {
      break;
    }
  }
  
  return !hasIncompleteData;
}

/** 対応ルール: データの信頼性を確保するため → データの信頼性レベルを算出し、分析結果と併記する */
export function calculateDataReliability(totalRecords: number, validRecords: number, anomalousRecords: number): number {
  if (totalRecords === 0) {
    return 0;
  }
  
  // 有効なレコード数の割合を基本スコアとする
  const validRatio = validRecords / totalRecords;
  
  // 異常値の割合によるペナルティ
  const anomalousRatio = anomalousRecords / totalRecords;
  const anomalousPenalty = anomalousRatio * 0.5; // 異常値1%につき0.5%のペナルティ
  
  // 信頼性スコア計算（0-100の範囲）
  let reliabilityScore = (validRatio - anomalousPenalty) * 100;
  
  // 最小値を0、最大値を100に制限
  reliabilityScore = Math.max(0, Math.min(100, reliabilityScore));
  
  return Math.round(reliabilityScore * 100) / 100; // 小数点第2位まで
}

/** 対応ルール: 工数データの異常値を自動検出し → 標準偏差の2倍を超える値を異常値として抽出する */
export function detectAnomalousValues(workTimes: number[]): number[] {
  if (workTimes.length < 2) {
    return [];
  }
  
  // 平均値計算
  const sum = workTimes.reduce((acc, time) => acc + time, 0);
  const mean = sum / workTimes.length;
  
  // 標準偏差計算
  const squaredDifferences = workTimes.map(time => Math.pow(time - mean, 2));
  const variance = squaredDifferences.reduce((acc, diff) => acc + diff, 0) / workTimes.length;
  const standardDeviation = Math.sqrt(variance);
  
  // 標準偏差の2倍を閾値とする
  const threshold = standardDeviation * 2;
  
  // 異常値を検出
  const anomalousValues = workTimes.filter(time => 
    Math.abs(time - mean) > threshold
  );
  
  return anomalousValues;
}

/** 対応ルール: データ品質管理において → 欠損データは前月同期比で補完し、異常値は分析対象から除外する */
export function supplementMissingData(currentMonthData: number[], previousMonthData: number[]): number[] {
  const supplementedData = [...currentMonthData];
  
  for (let i = 0; i < supplementedData.length; i++) {
    // 欠損データ（null、undefined、0以下）の場合
    if (supplementedData[i] === null || supplementedData[i] === undefined || supplementedData[i] <= 0) {
      // 前月同期のデータがある場合は補完
      if (previousMonthData[i] && previousMonthData[i] > 0) {
        supplementedData[i] = previousMonthData[i];
      } else {
        // 前月データもない場合は前後の有効データの平均値で補完
        const validValues = supplementedData.filter(value => value > 0);
        if (validValues.length > 0) {
          const average = validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
          supplementedData[i] = Math.round(average);
        }
      }
    }
  }
  
  return supplementedData;
}

/** 対応ルール: 工数データの整合性チェックと異常値の検出・修正を行い → 工数データの品質を保証する */
export function validateWorkRecordConsistency(record: WorkRecord): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 作業時間の妥当性チェック
  if (record.作業時間!== null) {
    if (record.作業時間 > 1440) { // 24時間超過
      errors.push('作業時間が24時間を超えています');
    }
    if (record.作業時間 < 0) { // 負の値
      errors.push('作業時間が負の値です');
    }
  }
  
  // 開始時刻と終了時刻の整合性チェック
  if (record.作業開始時刻&& record.作業終了時刻) {
    const startTime = new Date(record.作業開始時刻);
    const endTime = new Date(record.作業終了時刻);
    
    if (startTime >= endTime) {
      errors.push('作業開始時刻が終了時刻より後になっています');
    }
    
    // 実際の時間差と記録された作業時間の整合性
    if (record.作業時間!== null) {
      const actualDuration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      const timeDifference = Math.abs(actualDuration - record.作業時間);
      
      if (timeDifference > 5) { // 5分以上の差異
        errors.push('記録された作業時間と実際の時間差に乖離があります');
      }
    }
  }
  
  // 必須項目の存在チェック
  const requiredFields = ['プロジェクト名', '作業場所', '作業種別', '作業内容'];
  requiredFields.forEach(field => {
    const value = record[field as keyof WorkRecord];
    if (!value || value.toString().trim() === '') {
      errors.push(`${field}が入力されていません`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/** 対応ルール: 工数データの品質管理において → リアルタイムでデータ品質チェックを実行する */
export function generateDataQualityReport(workRecords: WorkRecord[]): DataQualityReport {
  let validRecords = 0;
  let anomalousRecords = 0;
  let missingDataCount = 0;
  
  const workTimes = workRecords
    .filter(record => record.作業時間 !== null)
    .map(record => record.作業時間!);
  
  const anomalousValues = detectAnomalousValues(workTimes);
  
  workRecords.forEach(record => {
    const validation = validateWorkRecordConsistency(record);
    
    if (validation.isValid) {
      validRecords++;
    } else {
      if (validation.errors.some(error => error.includes('入力されていません'))) {
        missingDataCount++;
      }
      if (record.作業時間 !== null && anomalousValues.includes(record.作業時間)) {
        anomalousRecords++;
      }
    }
  });
  
  const reliabilityScore = calculateDataReliability(workRecords.length, validRecords, anomalousRecords);
  
  return {
    totalRecords: workRecords.length,
    validRecords,
    anomalousRecords,
    missingDataCount,
    reliabilityScore
  };
}