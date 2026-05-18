// 異常値検出結果の型定義
export interface AnomalyDetectionResult {
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
  確認者ID?: string;
  確認日時?: Date;
  対応メモ?: string;
  検出日時: Date;
  作成日時: Date;
  更新日時: Date;
}

// 作業記録の型定義
export interface WorkRecord {
  作業記録ID: string;
  作業員ID: string;
  作業日: Date;
  作業開始時刻: Date;
  作業終了時刻?: Date;
  作業時間?: number;
  プロジェクト名: string;
  作業場所: string;
  作業種別: string;
  作業内容: string;
  進捗状況: string;
  備考?: string;
  承認状態: string;
  承認者ID?: string;
  承認日時?: Date;
  作成日時: Date;
  更新日時: Date;
  作成者ID: string;
}

// 中断記録の型定義
export interface InterruptionRecord {
  中断記録ID: string;
  作業記録ID: string;
  中断開始日時: Date;
  中断終了日時?: Date;
  中断理由区分: string;
  中断理由詳細?: string;
  中断時間?: number;
  影響度?: string;
  対応状況: string;
  記録者ID: string;
  作成日時: Date;
  更新日時: Date;
}

/**
 * 対応ルール: 障害レベル（軽微・重大・致命的）を自動判定し、対応優先度を設定 → 影響レベルに応じて通知方法（メール・SMS・電話）を自動選択し、緊急度別に送信する
 */
export function determineNotificationMethod(severity: string, impactLevel: string): string[] {
  const methods: string[] = [];
  
  // 重要度による基本通知方法の決定
  if (severity === '高' || severity === '致命的') {
    methods.push('電話', 'SMS', 'メール');
  } else if (severity === '中' || severity === '重大') {
    methods.push('SMS', 'メール');
  } else if (severity === '低' || severity === '軽微') {
    methods.push('メール');
  }
  
  // 影響レベルによる追加通知方法の決定
  if (impactLevel === '全社' || impactLevel === '複数拠点') {
    if (!methods.includes('電話')) {
      methods.unshift('電話');
    }
    if (!methods.includes('SMS')) {
      methods.push('SMS');
    }
  } else if (impactLevel === '単一拠点') {
    if (severity !== '高' && severity !== '致命的' && !methods.includes('SMS')) {
      methods.push('SMS');
    }
  }
  
  // 重複を除去し、優先度順にソート
  const uniqueMethods = Array.from(new Set(methods));
  const priorityOrder = ['電話', 'SMS', 'メール'];
  
  return uniqueMethods.sort((a, b) => {
    return priorityOrder.indexOf(a) - priorityOrder.indexOf(b);
  });
}

/**
 * 対応ルール: 重要な変動（前日比20%以上）があれば即座に関係者に通知 → 異常値として警告を表示し、確認ダイアログで作業員に再確認を求める
 */
export function calculateAlertPriority(anomalyType: string, deviationRate: number): number {
  let basePriority = 0;
  
  // 異常値種別による基本優先度
  switch (anomalyType) {
    case '長時間作業':
      basePriority = 70;
      break;
    case '頻繁中断':
      basePriority = 60;
      break;
    case '工数超過':
      basePriority = 80;
      break;
    case '短時間作業':
      basePriority = 40;
      break;
    case '時刻整合性エラー':
      basePriority = 90;
      break;
    case '重複データ':
      basePriority = 50;
      break;
    default:
      basePriority = 30;
  }
  
  // 乖離率による優先度調整
  const absDeviationRate = Math.abs(deviationRate);
  
  if (absDeviationRate >= 50) {
    basePriority += 30;
  } else if (absDeviationRate >= 30) {
    basePriority += 20;
  } else if (absDeviationRate >= 20) {
    basePriority += 15;
  } else if (absDeviationRate >= 10) {
    basePriority += 10;
  }
  
  // 優先度は1-100の範囲に制限
  return Math.min(100, Math.max(1, basePriority));
}

/**
 * 対応ルール: データ修正期限を3営業日以内に設定 → 該当する現場管理者に自動アラート通知を送信し、データ修正期限を3営業日以内に設定する
 */
export function shouldEscalateAlert(alertDuration: number, responseTime: number): boolean {
  const threeDaysInMinutes = 3 * 24 * 60; // 3営業日を分単位で計算
  const oneDayInMinutes = 24 * 60; // 1日を分単位で計算
  
  // アラート発生から3営業日（4320分）経過した場合はエスカレーション
  if (alertDuration >= threeDaysInMinutes) {
    return true;
  }
  
  // 高優先度アラートで1日以上応答がない場合もエスカレーション
  if (alertDuration >= oneDayInMinutes && responseTime === 0) {
    return true;
  }
  
  // 応答時間が2日を超えている場合もエスカレーション
  if (responseTime > (2 * oneDayInMinutes)) {
    return true;
  }
  
  return false;
}

/**
 * 対応ルール: 異常値が検出された状態で異常値・入力漏れ確認処理が実行されたとき → 異常値の詳細情報と修正候補を提示し、承認または修正を求める
 */
export function generateAlertMessage(anomaly: AnomalyDetectionResult, context: WorkRecord): string {
  let message = `【異常値検出アラート】\n`;
  message += `検出日時: ${anomaly.検出日時.toLocaleString()}\n`;
  message += `重要度: ${anomaly.重要度}\n`;
  message += `異常値種別: ${anomaly.異常値種別}\n\n`;
  
  message += `【対象作業情報】\n`;
  message += `作業員ID: ${context.作業員ID}\n`;
  message += `作業日: ${context.作業日.toLocaleDateString()}\n`;
  message += `作業種別: ${context.作業種別}\n`;
  message += `作業場所: ${context.作業場所}\n\n`;
  
  message += `【異常値詳細】\n`;
  message += `検出項目: ${anomaly.検出項目}\n`;
  message += `検出値: ${anomaly.検出値}\n`;
  message += `閾値: ${anomaly.閾値}\n\n`;
  
  // 異常値種別に応じた修正候補の提示
  message += `【修正候補】\n`;
  
  switch (anomaly.異常値種別) {
    case '長時間作業':
      message += `・作業時間が24時間を超えています。作業終了時刻を確認してください。\n`;
      message += `・中断時間が含まれている場合は、中断記録を確認してください。\n`;
      break;
      
    case '短時間作業':
      message += `・作業時間が30分未満です。作業内容の詳細を確認してください。\n`;
      message += `・作業開始・終了時刻に誤りがないか確認してください。\n`;
      break;
      
    case '工数超過':
      message += `・計画工数を大幅に超過しています。作業内容の見直しが必要です。\n`;
      message += `・予期しない問題が発生した場合は、詳細を備考欄に記載してください。\n`;
      break;
      
    case '頻繁中断':
      message += `・中断回数が異常に多くなっています。中断理由を確認してください。\n`;
      message += `・作業環境や手順に問題がないか確認してください。\n`;
      break;
      
    case '時刻整合性エラー':
      message += `・作業開始時刻が終了時刻より後になっています。時刻を修正してください。\n`;
      message += `・日付をまたぐ作業の場合は、適切に分割して記録してください。\n`;
      break;
      
    default:
      message += `・データの整合性を確認し、必要に応じて修正してください。\n`;
  }
  
  message += `\n【対応期限】\n`;
  message += `3営業日以内に確認・修正を完了してください。\n`;
  message += `緊急の場合は、現場管理者に直接連絡してください。\n`;
  
  return message;
}