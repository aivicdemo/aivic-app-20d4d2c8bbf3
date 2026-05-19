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

/** 対応ルール: 工数データが記録される際に異常値（24時間超過）が検出されたとき → 異常値アラートを表示し、データの確認を求める */
export function detectOvertimeAnomaly(workDuration: number): boolean {
  return workDuration > 24 * 60; // 24時間を分単位で計算（1440分）
}

/** 対応ルール: 工数データが記録される際に異常値（負の値等）が検出されたとき → 異常値アラートを表示し、データの確認を求める */
export function detectNegativeValue(value: number): boolean {
  return value < 0;
}

/** 対応ルール: 工数データに入力漏れや異常値が検出された状態で待機時間が8時間を超える場合 → アラートを表示し承認者の確認を必須とする */
export function detectExcessiveInterruption(interruptionDuration: number): boolean {
  return interruptionDuration > 8 * 60; // 8時間を分単位で計算（480分）
}

/** 対応ルール: 月末集計処理が実行される際に標準偏差の2倍を超える値 → 異常値として抽出し、必須項目の未入力を入力漏れとして一覧表示する */
export function detectStatisticalAnomaly(value: number, mean: number, stdDev: number): boolean {
  const threshold = 2 * stdDev;
  return Math.abs(value - mean) > threshold;
}

/** 対応ルール: 作業効率分析が実行されたとき → 過去データとの比較により効率低下を検出し、閾値を下回る場合はアラート通知する */
export function calculateAnomalyScore(record: WorkRecord, historicalData: WorkRecord[]): number {
  if (!record.作業時間 || historicalData.length === 0) {
    return 0;
  }

  // 同じ作業種別の過去データをフィルタリング
  const sameTypeRecords = historicalData.filter(
    r => r.作業種別 === record.作業種別 && r.作業時間 !== null
  );

  if (sameTypeRecords.length === 0) {
    return 0;
  }

  // 過去データの平均作業時間を計算
  const totalTime = sameTypeRecords.reduce((sum, r) => sum + (r.作業時間 || 0), 0);
  const meanTime = totalTime / sameTypeRecords.length;

  // 標準偏差を計算
  const variance = sameTypeRecords.reduce((sum, r) => {
    const diff = (r.作業時間 || 0) - meanTime;
    return sum + diff * diff;
  }, 0) / sameTypeRecords.length;
  const stdDev = Math.sqrt(variance);

  // 異常スコアを計算（現在の作業時間が平均からどれだけ乖離しているか）
  if (stdDev === 0) {
    return record.作業時間 === meanTime ? 0 : 1;
  }

  const zScore = Math.abs(record.作業時間 - meanTime) / stdDev;
  
  // Z-scoreを0-1の範囲に正規化（3σを最大値とする）
  return Math.min(zScore / 3, 1);
}

/** 対応ルール: 工数データの異常値検出機能により作業時間が30分未満の場合 → 短時間作業として確認ダイアログを表示し、作業内容の詳細入力を促す */
export function detectShortWorkAnomaly(workDuration: number): boolean {
  return workDuration < 30; // 30分未満
}

/** 対応ルール: 工数データの整合性確認が実行される状態で作業時間が8時間を超過している場合 → 異常値として警告を表示し、確認ダイアログで作業員に再確認を求める */
export function detectLongWorkAnomaly(workDuration: number): boolean {
  return workDuration > 8 * 60; // 8時間を分単位で計算（480分）
}

/** 対応ルール: 工数データの妥当性検証プロセスで作業開始時刻が終了時刻より後の場合 → 異常値として検出し、現場管理者に通知する */
export function detectTimeSequenceAnomaly(startTime: Date, endTime: Date | null): boolean {
  if (!endTime) {
    return false; // 終了時刻がnullの場合（作業中）は異常ではない
  }
  return startTime.getTime() > endTime.getTime();
}

/** 対応ルール: 拠点間比較分析が実行されたとき → 拠点別生産性指標を算出し、標準偏差による異常値を検出する */
export function detectProductivityAnomaly(
  currentProductivity: number,
  allProductivities: number[]
): boolean {
  if (allProductivities.length < 2) {
    return false;
  }

  const mean = allProductivities.reduce((sum, p) => sum + p, 0) / allProductivities.length;
  const variance = allProductivities.reduce((sum, p) => {
    const diff = p - mean;
    return sum + diff * diff;
  }, 0) / allProductivities.length;
  const stdDev = Math.sqrt(variance);

  return detectStatisticalAnomaly(currentProductivity, mean, stdDev);
}

/** 対応ルール: 緊急対応中に工数入力が行われたとき → 通常の1.5倍を超える工数は異常値として自動フラグを立て、管理者に確認を促す */
export function detectEmergencyWorkAnomaly(
  emergencyWorkDuration: number,
  normalWorkDuration: number
): boolean {
  return emergencyWorkDuration > normalWorkDuration * 1.5;
}

/** 対応ルール: 効果測定分析が実行されたとき → 異常データを除外し、正常データのみで効果測定を実施する */
export function filterAnomalousRecords(records: WorkRecord[]): WorkRecord[] {
  return records.filter(record => {
    if (!record.作業時間) {
      return false;
    }

    // 基本的な異常値チェック
    if (detectOvertimeAnomaly(record.作業時間)) {
      return false;
    }

    if (detectNegativeValue(record.作業時間)) {
      return false;
    }

    if (detectTimeSequenceAnomaly(record.作業開始時刻, record.作業終了時刻)) {
      return false;
    }

    return true;
  });
}

/** 対応ルール: 報告書に含まれる工数データで異常な乖離率（計画比±30%超）が検出されたとき → 該当データにアラートフラグを付与する */
export function detectPlanDeviationAnomaly(actualHours: number, plannedHours: number): boolean {
  if (plannedHours === 0) {
    return actualHours > 0;
  }

  const deviationRate = Math.abs(actualHours - plannedHours) / plannedHours;
  return deviationRate > 0.3; // 30%超
}

/** 対応ルール: データ統合分析が実行されたとき → 欠損データは前月同期比で補完し、異常値（平均±3σ超）は分析対象から除外する */
export function detectExtremeAnomaly(value: number, mean: number, stdDev: number): boolean {
  const threshold = 3 * stdDev;
  return Math.abs(value - mean) > threshold;
}