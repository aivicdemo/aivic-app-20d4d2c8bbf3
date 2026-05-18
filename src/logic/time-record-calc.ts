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
export interface BreakRecord {
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

// 進捗率計算結果の型定義
export interface ProgressResult {
  progressRate: number;
  deviationRate: number;
}

/** 対応ルール: 作業開始時刻と終了時刻が入力された → 開始時刻との差分で作業時間を自動計算する */
export function calculateWorkDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }
  
  if (end <= start) {
    return 0;
  }
  
  // 分単位で計算
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  
  return durationMinutes;
}

/** 対応ルール: 中断開始時刻と終了時刻が入力された → 中断開始時刻と終了時刻の差分を自動計算して待機時間として記録する */
export function calculateBreakDuration(breakStart: string, breakEnd: string): number {
  const start = new Date(breakStart);
  const end = new Date(breakEnd);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }
  
  if (end <= start) {
    return 0;
  }
  
  // 分単位で計算
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  
  return durationMinutes;
}

/** 対応ルール: 作業時間が入力された → 作業時間が24時間を超える場合は異常値として検出する */
export function isWorkTimeExceeded(workDuration: number): boolean {
  // 24時間 = 1440分
  const maxWorkTimeMinutes = 24 * 60;
  return workDuration > maxWorkTimeMinutes;
}

/** 対応ルール: 作業時間が入力された → 作業時間が30分未満の場合は短時間作業として確認を求める */
export function isShortWorkTime(workDuration: number): boolean {
  const minWorkTimeMinutes = 30;
  return workDuration < minWorkTimeMinutes && workDuration > 0;
}

/** 対応ルール: 実績工数と計画工数が存在する → 実績工数÷計画工数×100で進捗率を計算する */
export function calculateProgressRate(actualHours: number, plannedHours: number): number {
  if (plannedHours <= 0) {
    return 0;
  }
  
  if (actualHours < 0) {
    return 0;
  }
  
  const progressRate = (actualHours / plannedHours) * 100;
  return Math.round(progressRate * 100) / 100; // 小数点第2位まで
}

/** 対応ルール: 実績工数と計画工数が存在する → 実績工数と計画工数の乖離率を算出する */
export function calculateDeviationRate(actualHours: number, plannedHours: number): number {
  if (plannedHours <= 0) {
    return 0;
  }
  
  if (actualHours < 0) {
    return 0;
  }
  
  const deviation = actualHours - plannedHours;
  const deviationRate = (Math.abs(deviation) / plannedHours) * 100;
  return Math.round(deviationRate * 100) / 100; // 小数点第2位まで
}

/** 対応ルール: 工数データが記録される → 異常値（24時間超過、負の値等）が検出されたときアラートを表示する */
export function detectWorkTimeAnomalies(workDuration: number): AnomalyDetectionLog | null {
  const currentTime = new Date().toISOString();
  
  // 24時間超過チェック
  if (isWorkTimeExceeded(workDuration)) {
    return {
      異常値検出ログID: '',
      検出対象テーブル: '作業記録',
      検出対象レコードID: '',
      ユーザーID: '',
      異常値種別: '長時間作業',
      検出項目: '作業時間',
      検出値: workDuration.toString(),
      閾値: '1440',
      重要度: '高',
      確認状況: '未確認',
      通知送信フラグ: false,
      確認者ID: null,
      確認日時: null,
      対応メモ: null,
      検出日時: currentTime,
      作成日時: currentTime,
      更新日時: currentTime
    };
  }
  
  // 負の値チェック
  if (workDuration < 0) {
    return {
      異常値検出ログID: '',
      検出対象テーブル: '作業記録',
      検出対象レコードID: '',
      ユーザーID: '',
      異常値種別: '負の値',
      検出項目: '作業時間',
      検出値: workDuration.toString(),
      閾値: '0',
      重要度: '高',
      確認状況: '未確認',
      通知送信フラグ: false,
      確認者ID: null,
      確認日時: null,
      対応メモ: null,
      検出日時: currentTime,
      作成日時: currentTime,
      更新日時: currentTime
    };
  }
  
  return null;
}

/** 対応ルール: 中断・待機時間のデータが蓄積されている → 異常値検出機能により待機時間が8時間を超える場合はアラートを表示する */
export function isBreakTimeExceeded(breakDuration: number): boolean {
  // 8時間 = 480分
  const maxBreakTimeMinutes = 8 * 60;
  return breakDuration > maxBreakTimeMinutes;
}

/** 対応ルール: 作業効率が基準値を下回っている → 効率低下を検出し、閾値を下回る場合はアラート通知する */
export function isEfficiencyBelowThreshold(actualHours: number, standardHours: number): boolean {
  if (standardHours <= 0) {
    return false;
  }
  
  const efficiency = actualHours / standardHours;
  const thresholdRatio = 1.2; // 標準時間の1.2倍を超えた場合は効率低下
  
  return efficiency > thresholdRatio;
}

/** 対応ルール: 進捗率が計画値から乖離している → 進捗率が80%未満または乖離率が20%以上の作業をボトルネックとして検出する */
export function isBottleneckWork(progressRate: number, deviationRate: number): boolean {
  const minProgressRate = 80;
  const maxDeviationRate = 20;
  
  return progressRate < minProgressRate || deviationRate >= maxDeviationRate;
}

/** 対応ルール: ROI分析で投資効果を判定する → 投資回収期間が3年以内かつROIが15%以上の場合に投資効果ありと判定する */
export function hasInvestmentEffect(roiPercentage: number, paybackPeriodYears: number): boolean {
  const minRoiPercentage = 15;
  const maxPaybackPeriodYears = 3;
  
  return roiPercentage >= minRoiPercentage && paybackPeriodYears <= maxPaybackPeriodYears;
}

/** 対応ルール: 工数データの妥当性検証 → 作業開始時刻が終了時刻より後の場合は異常値として検出する */
export function isInvalidTimeSequence(startTime: string, endTime: string): boolean {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return true;
  }
  
  return start >= end;
}

/** 対応ルール: 入力定着率分析 → 総作業回数に対する工数入力完了回数の比率を算出し、80%以上を定着成功とする */
export function isInputAdoptionSuccessful(completedInputs: number, totalWorks: number): boolean {
  if (totalWorks <= 0) {
    return false;
  }
  
  const adoptionRate = (completedInputs / totalWorks) * 100;
  const successThreshold = 80;
  
  return adoptionRate >= successThreshold;
}

/** 対応ルール: 季節変動パターン分析 → 前年同期比±20%を超える変動を異常値として検出する */
export function isSeasonalVariationAbnormal(currentValue: number, previousYearValue: number): boolean {
  if (previousYearValue <= 0) {
    return false;
  }
  
  const variationRate = Math.abs((currentValue - previousYearValue) / previousYearValue) * 100;
  const abnormalThreshold = 20;
  
  return variationRate > abnormalThreshold;
}

/** 対応ルール: 人件費率計算 → 工数実績と売上データを自動照合し人件費率を算出する */
export function calculateLaborCostRate(totalLaborCost: number, totalRevenue: number): number {
  if (totalRevenue <= 0) {
    return 0;
  }
  
  const laborCostRate = (totalLaborCost / totalRevenue) * 100;
  return Math.round(laborCostRate * 100) / 100; // 小数点第2位まで
}

/** 対応ルール: 生産性指標算出 → 各拠点の時間当たり作業完了件数を算出する */
export function calculateProductivityIndex(completedTasks: number, totalHours: number): number {
  if (totalHours <= 0) {
    return 0;
  }
  
  const productivityIndex = completedTasks / totalHours;
  return Math.round(productivityIndex * 100) / 100; // 小数点第2位まで
}

/** 対応ルール: ROI計算 → （年間工数削減による人件費削減額 - 年間システム運用費）÷ 初期導入費用 × 100でROI率を計算する */
export function calculateROI(annualLaborSavings: number, annualOperatingCost: number, initialInvestment: number): number {
  if (initialInvestment <= 0) {
    return 0;
  }
  
  const netBenefit = annualLaborSavings - annualOperatingCost;
  const roiPercentage = (netBenefit / initialInvestment) * 100;
  
  return Math.round(roiPercentage * 100) / 100; // 小数点第2位まで
}