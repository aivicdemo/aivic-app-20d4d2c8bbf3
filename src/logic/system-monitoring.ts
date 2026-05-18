/**
 * システム稼働監視と障害検知の業務ロジック
 */

// 基本型定義
export type FailureLevel = 'minor' | 'major' | 'critical' | 'normal';

export interface SystemMetrics {
  responseTime: number;
  errorRate: number;
  affectedSites: number;
  totalUsers: number;
  downFunctions: string[];
}

export interface RecoveryMetrics {
  completedSteps: number;
  totalSteps: number;
}

export interface SLAMetrics {
  incidentStart: string;
  recoveryComplete: string;
  slaThreshold: number;
}

export interface ImpactAssessment {
  priority: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedRecoveryTime: number;
}

/** 対応ルール: システム障害が検知された状態で → 障害レベル（軽微・重大・致命的）を自動判定し、対応優先度を設定する */
export function detectSystemFailure(responseTime: number, errorRate: number): FailureLevel {
  // 致命的: レスポンス時間が10秒超過または エラー率が50%以上
  if (responseTime > 10000 || errorRate >= 0.5) {
    return 'critical';
  }
  
  // 重大: レスポンス時間が5秒超過または エラー率が20%以上
  if (responseTime > 5000 || errorRate >= 0.2) {
    return 'major';
  }
  
  // 軽微: レスポンス時間が3秒超過または エラー率が5%以上
  if (responseTime > 3000 || errorRate >= 0.05) {
    return 'minor';
  }
  
  // 正常
  return 'normal';
}

/** 対応ルール: 障害の影響範囲が確定した状態で → 影響を受ける拠点数、利用者数、機能範囲を自動算出し、復旧優先度を決定する */
export function calculateImpactScope(affectedSites: number, totalUsers: number, downFunctions: string[]): number {
  // 基本スコア計算
  let impactScore = 0;
  
  // 拠点影響度 (最大40点)
  const siteImpactRatio = affectedSites / Math.max(1, totalUsers);
  impactScore += Math.min(40, siteImpactRatio * 100 * 40);
  
  // ユーザー影響度 (最大30点)
  if (totalUsers > 500) {
    impactScore += 30;
  } else if (totalUsers > 100) {
    impactScore += 20;
  } else if (totalUsers > 50) {
    impactScore += 10;
  }
  
  // 機能影響度 (最大30点)
  const criticalFunctions = ['工数記録', '作業開始', '作業終了', 'データ保存'];
  const criticalDownCount = downFunctions.filter(func => 
    criticalFunctions.some(critical => func.includes(critical))
  ).length;
  
  if (criticalDownCount > 0) {
    impactScore += Math.min(30, criticalDownCount * 10);
  }
  
  // 非重要機能の影響
  const nonCriticalDownCount = downFunctions.length - criticalDownCount;
  impactScore += Math.min(10, nonCriticalDownCount * 2);
  
  return Math.round(Math.min(100, impactScore));
}

/** 対応ルール: 復旧手順が実行中の状態で → 各ステップの完了時刻を記録し、全体の復旧進捗率を自動計算する */
export function calculateRecoveryProgress(completedSteps: number, totalSteps: number): number {
  if (totalSteps <= 0) {
    return 0;
  }
  
  if (completedSteps >= totalSteps) {
    return 100;
  }
  
  const progressRate = (completedSteps / totalSteps) * 100;
  return Math.round(Math.max(0, Math.min(100, progressRate)));
}

/** 対応ルール: 全拠点の復旧が完了した状態で → 障害発生時刻から復旧完了時刻までの総時間を算出し、SLA達成状況を判定する */
export function validateSLACompliance(incidentStart: string, recoveryComplete: string, slaThreshold: number): boolean {
  const startTime = new Date(incidentStart).getTime();
  const completeTime = new Date(recoveryComplete).getTime();
  
  if (isNaN(startTime) || isNaN(completeTime)) {
    return false;
  }
  
  const recoveryTimeMinutes = (completeTime - startTime) / (1000 * 60);
  
  return recoveryTimeMinutes <= slaThreshold;
}

/** 対応ルール: システム障害対応中の状態で → 障害中でも既存の工数データは参照可能とし、新規入力は一時的にローカル保存する */
export function determineOperationMode(systemStatus: FailureLevel): 'online' | 'offline' | 'readonly' {
  switch (systemStatus) {
    case 'critical':
      return 'offline';
    case 'major':
      return 'readonly';
    case 'minor':
      return 'online';
    case 'normal':
      return 'online';
    default:
      return 'offline';
  }
}

/** 対応ルール: 全国680名規模でのシステム障害が発生した状態で → 拠点別の復旧優先度を事業重要度と利用者数で自動算出し、段階的復旧計画を生成する */
export function calculateSiteRecoveryPriority(siteUsers: number, businessImportance: number, totalNationalUsers: number = 680): number {
  // 利用者数による重み (最大50点)
  const userRatio = siteUsers / totalNationalUsers;
  const userScore = Math.min(50, userRatio * 100 * 50);
  
  // 事業重要度による重み (最大50点) - 1-5スケールを想定
  const businessScore = Math.min(50, (businessImportance / 5) * 50);
  
  const totalPriority = userScore + businessScore;
  return Math.round(Math.min(100, totalPriority));
}

/** 対応ルール: システム障害の復旧作業中で → 障害期間中の工数データに欠損や重複がないか自動検証し、異常データを特定する */
export function validateDataIntegrityDuringFailure(dataRecords: Array<{id: string, timestamp: string, userId: string}>, failureStart: string, failureEnd: string): {
  missingRecords: number;
  duplicateRecords: number;
  isValid: boolean;
} {
  const failureStartTime = new Date(failureStart).getTime();
  const failureEndTime = new Date(failureEnd).getTime();
  
  // 障害期間中のレコードを抽出
  const failurePeriodRecords = dataRecords.filter(record => {
    const recordTime = new Date(record.timestamp).getTime();
    return recordTime >= failureStartTime && recordTime <= failureEndTime;
  });
  
  // 重複チェック
  const uniqueRecords = new Set();
  let duplicateCount = 0;
  
  failurePeriodRecords.forEach(record => {
    const key = `${record.userId}-${record.timestamp}`;
    if (uniqueRecords.has(key)) {
      duplicateCount++;
    } else {
      uniqueRecords.add(key);
    }
  });
  
  // 欠損チェック（期待される最小レコード数との比較）
  const failureDurationHours = (failureEndTime - failureStartTime) / (1000 * 60 * 60);
  const expectedMinRecords = Math.floor(failureDurationHours * 0.1); // 1時間あたり最低0.1レコード
  const missingRecords = Math.max(0, expectedMinRecords - failurePeriodRecords.length);
  
  return {
    missingRecords,
    duplicateRecords: duplicateCount,
    isValid: duplicateCount === 0 && missingRecords === 0
  };
}

/** 対応ルール: クラウドシステムに障害が発生している状態で → オフラインモードに自動切替し、復旧後に蓄積データを自動同期する */
export function shouldEnableOfflineMode(consecutiveFailures: number, lastSuccessfulSync: string): boolean {
  const lastSyncTime = new Date(lastSuccessfulSync).getTime();
  const currentTime = Date.now();
  const timeSinceLastSync = (currentTime - lastSyncTime) / (1000 * 60); // 分単位
  
  // 連続失敗が3回以上、または最後の同期から30分以上経過
  return consecutiveFailures >= 3 || timeSinceLastSync >= 30;
}

/** 対応ルール: 各拠点への通知処理が実行されたとき → 影響レベルに応じて通知方法（メール・SMS・電話）を自動選択し、緊急度別に送信する */
export function selectNotificationMethod(failureLevel: FailureLevel, userRole: string): string[] {
  const methods: string[] = [];
  
  switch (failureLevel) {
    case 'critical':
      methods.push('電話', 'SMS', 'メール');
      if (userRole === '管理者' || userRole === 'システム管理者') {
        methods.push('緊急アラート');
      }
      break;
    case 'major':
      methods.push('SMS', 'メール');
      if (userRole === '管理者') {
        methods.push('電話');
      }
      break;
    case 'minor':
      methods.push('メール');
      break;
    case 'normal':
      // 通常時は通知不要
      break;
  }
  
  return methods;
}