// 異常値検出ログテーブルの型定義
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
  確認者ID?: string;
  確認日時?: string;
  対応メモ?: string;
  検出日時: string;
  作成日時: string;
  更新日時: string;
}

// 通知レベル型
export type NotificationLevel = 'low' | 'medium' | 'high';

// 通知方法型
export type NotificationMethod = 'email' | 'sms' | 'phone';

// 重要度レベル型
export type SeverityLevel = 'low' | 'medium' | 'high';

/** 対応ルール: 異常値種別と重要度から → 障害レベル（軽微・重大・致命的）を自動判定し対応優先度を設定する */
export const determineNotificationLevel = (anomalyType: string, severity: number): NotificationLevel => {
  // 異常値種別による基本レベル判定
  const criticalTypes = ['システム障害', '緊急対応', '安全問題', '重大品質異常'];
  const mediumTypes = ['長時間作業', '工数超過', '頻繁中断', '異常値検出'];
  const lowTypes = ['入力漏れ', '軽微異常', '通常範囲外'];

  // 重要度による数値判定（1-10スケール想定）
  let baseLevel: NotificationLevel;
  
  if (criticalTypes.some(type => anomalyType.includes(type)) || severity >= 8) {
    baseLevel = 'high';
  } else if (mediumTypes.some(type => anomalyType.includes(type)) || severity >= 5) {
    baseLevel = 'medium';
  } else {
    baseLevel = 'low';
  }

  // 重要度数値による最終調整
  if (severity >= 9) {
    return 'high';
  } else if (severity >= 7 && baseLevel !== 'low') {
    return 'high';
  } else if (severity >= 4 && baseLevel === 'high') {
    return 'high';
  } else if (severity >= 3 && baseLevel === 'medium') {
    return 'medium';
  }

  return baseLevel;
};

/** 対応ルール: 緊急度レベルから → 影響レベルに応じて通知方法（メール・SMS・電話）を自動選択する */
export const selectNotificationMethod = (urgencyLevel: NotificationLevel): NotificationMethod[] => {
  switch (urgencyLevel) {
    case 'high':
      // 致命的レベル：全ての通知手段を使用
      return ['phone', 'sms', 'email'];
    case 'medium':
      // 重大レベル：SMS + メール
      return ['sms', 'email'];
    case 'low':
      // 軽微レベル：メールのみ
      return ['email'];
    default:
      return ['email'];
  }
};

/** 対応ルール: 応答時間と重要度から → 重要な変動（前日比20%以上）があれば即座に関係者に通知する */
export const shouldEscalateAlert = (
  responseTime: number, 
  maxResponseTime: number, 
  severity: SeverityLevel
): boolean => {
  // 応答時間が最大許容時間を超過した場合の判定
  const responseTimeExceeded = responseTime > maxResponseTime;
  
  // 重要度による閾値設定
  const severityMultiplier = {
    'high': 1.0,    // 高重要度：即座にエスカレーション
    'medium': 1.2,  // 中重要度：20%超過でエスカレーション
    'low': 1.5      // 低重要度：50%超過でエスカレーション
  };

  const escalationThreshold = maxResponseTime * severityMultiplier[severity];
  
  // 高重要度の場合は応答時間超過で即座にエスカレーション
  if (severity === 'high' && responseTimeExceeded) {
    return true;
  }

  // 応答時間が重要度別閾値を超過した場合
  if (responseTime > escalationThreshold) {
    return true;
  }

  // 前日比20%以上の変動を検出（応答時間の急激な悪化）
  const variationThreshold = maxResponseTime * 1.2; // 20%増加
  if (responseTime > variationThreshold && severity !== 'low') {
    return true;
  }

  return false;
};

/** 対応ルール: 障害発生時刻と復旧時刻から → 障害発生時刻から復旧完了時刻までの総時間を算出しSLA達成状況を判定する */
export const calculateSLACompliance = (
  incidentStart: string, 
  resolutionTime: string, 
  slaTarget: number
): boolean => {
  // 日時文字列をDateオブジェクトに変換
  const startTime = new Date(incidentStart);
  const endTime = new Date(resolutionTime);
  
  // 無効な日時の場合はSLA未達成とする
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return false;
  }

  // 復旧時刻が開始時刻より前の場合は無効
  if (endTime < startTime) {
    return false;
  }

  // 総復旧時間を分単位で計算
  const totalResolutionTimeMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  
  // SLA目標時間（分）と比較
  return totalResolutionTimeMinutes <= slaTarget;
};

// 通知判定結果の型
export interface NotificationDecision {
  level: NotificationLevel;
  methods: NotificationMethod[];
  shouldEscalate: boolean;
  slaCompliant: boolean;
}

/** 対応ルール: 異常値検出ログから → 総合的な通知判定を実行する */
export const evaluateNotificationRequirements = (
  anomalyLog: AnomalyDetectionLog,
  responseTime: number,
  maxResponseTime: number,
  slaTarget: number
): NotificationDecision => {
  // 重要度を数値に変換（高=8, 中=5, 低=2）
  const severityMap: Record<string, number> = {
    '高': 8,
    '中': 5,
    '低': 2
  };
  
  const severityNumber = severityMap[anomalyLog.重要度] || 2;
  const severityLevel = anomalyLog.重要度 === '高' ? 'high' : 
                       anomalyLog.重要度 === '中' ? 'medium' : 'low';

  // 通知レベル決定
  const level = determineNotificationLevel(anomalyLog.異常値種別, severityNumber);
  
  // 通知方法選択
  const methods = selectNotificationMethod(level);
  
  // エスカレーション判定
  const shouldEscalate = shouldEscalateAlert(responseTime, maxResponseTime, severityLevel);
  
  // SLA準拠判定（検出日時から現在時刻までで判定）
  const currentTime = new Date().toISOString();
  const slaCompliant = calculateSLACompliance(anomalyLog.検出日時, currentTime, slaTarget);

  return {
    level,
    methods,
    shouldEscalate,
    slaCompliant
  };
};