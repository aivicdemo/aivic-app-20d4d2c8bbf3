// システム稼働状況とパフォーマンス監視

export interface SystemFailure {
  errorType: string;
  affectedUsers: number;
  affectedSites: number;
  incidentStart: string;
  recoveryComplete?: string;
}

export interface RecoveryStep {
  stepId: string;
  completed: boolean;
  completedAt?: string;
}

export interface SiteInfo {
  siteId: string;
  businessImportance: number;
  userCount: number;
}

export interface SystemHealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  errorRate: number;
}

export interface PerformanceThreshold {
  cpuThreshold: number;
  memoryThreshold: number;
  diskThreshold: number;
  latencyThreshold: number;
  errorRateThreshold: number;
}

/** 対応ルール: 障害検知システムがアラートを発報したとき → 障害レベル（軽微・重大・致命的）を自動判定し、対応優先度を設定する */
export function classifyFailureSeverity(
  errorType: string,
  affectedUsers: number,
  affectedSites: number
): string {
  // 致命的: 全社規模の障害または重要システムの完全停止
  if (affectedSites >= 10 || affectedUsers >= 500) {
    return '致命的';
  }
  
  // 重大: 複数拠点または多数ユーザーに影響
  if (affectedSites >= 3 || affectedUsers >= 100) {
    return '重大';
  }
  
  // データベース関連やセキュリティ関連は重大扱い
  if (errorType.includes('データベース') || errorType.includes('セキュリティ') || 
      errorType.includes('認証') || errorType.includes('暗号化')) {
    return '重大';
  }
  
  // ネットワーク障害で複数ユーザーに影響がある場合
  if (errorType.includes('ネットワーク') && affectedUsers >= 50) {
    return '重大';
  }
  
  // その他は軽微
  return '軽微';
}

/** 対応ルール: 復旧作業のステップが完了したとき → 各ステップの完了時刻を記録し、全体の復旧進捗率を自動計算する */
export function calculateRecoveryProgress(
  completedSteps: number,
  totalSteps: number
): number {
  if (totalSteps <= 0) {
    return 0;
  }
  
  if (completedSteps >= totalSteps) {
    return 100;
  }
  
  const progressRate = (completedSteps / totalSteps) * 100;
  return Math.round(progressRate * 100) / 100; // 小数点第2位まで
}

/** 対応ルール: 全拠点の復旧が完了した状態で復旧完了報告が実行されたとき → 障害発生時刻から復旧完了時刻までの総時間を算出し、SLA達成状況を判定する */
export function assessSLACompliance(
  incidentStart: string,
  recoveryComplete: string,
  slaThreshold: number
): boolean {
  const startTime = new Date(incidentStart).getTime();
  const completeTime = new Date(recoveryComplete).getTime();
  
  if (isNaN(startTime) || isNaN(completeTime)) {
    return false;
  }
  
  const recoveryTimeMinutes = (completeTime - startTime) / (1000 * 60);
  
  return recoveryTimeMinutes <= slaThreshold;
}

/** 対応ルール: 全国680名規模でのシステム障害が発生した状態で大規模障害対応が開始されたとき → 拠点別の復旧優先度を事業重要度と利用者数で自動算出し、段階的復旧計画を生成する */
export function determineSiteRecoveryPriority(
  sites: { siteId: string; businessImportance: number; userCount: number }[]
): string[] {
  // 優先度スコア = (事業重要度 * 0.6) + (利用者数 / 最大利用者数 * 100 * 0.4)
  const maxUserCount = Math.max(...sites.map(site => site.userCount));
  
  const sitesWithPriority = sites.map(site => ({
    ...site,
    priorityScore: (site.businessImportance * 0.6) + 
                   ((site.userCount / maxUserCount) * 100 * 0.4)
  }));
  
  // 優先度スコアの降順でソート
  sitesWithPriority.sort((a, b) => b.priorityScore - a.priorityScore);
  
  return sitesWithPriority.map(site => site.siteId);
}

/** システムヘルスメトリクスの異常値検出 */
export function detectSystemAnomalies(
  metrics: SystemHealthMetrics,
  thresholds: PerformanceThreshold
): string[] {
  const anomalies: string[] = [];
  
  if (metrics.cpuUsage > thresholds.cpuThreshold) {
    anomalies.push(`CPU使用率異常: ${metrics.cpuUsage}% (閾値: ${thresholds.cpuThreshold}%)`);
  }
  
  if (metrics.memoryUsage > thresholds.memoryThreshold) {
    anomalies.push(`メモリ使用率異常: ${metrics.memoryUsage}% (閾値: ${thresholds.memoryThreshold}%)`);
  }
  
  if (metrics.diskUsage > thresholds.diskThreshold) {
    anomalies.push(`ディスク使用率異常: ${metrics.diskUsage}% (閾値: ${thresholds.diskThreshold}%)`);
  }
  
  if (metrics.networkLatency > thresholds.latencyThreshold) {
    anomalies.push(`ネットワーク遅延異常: ${metrics.networkLatency}ms (閾値: ${thresholds.latencyThreshold}ms)`);
  }
  
  if (metrics.errorRate > thresholds.errorRateThreshold) {
    anomalies.push(`エラー率異常: ${metrics.errorRate}% (閾値: ${thresholds.errorRateThreshold}%)`);
  }
  
  return anomalies;
}

/** システム稼働率の計算 */
export function calculateSystemUptime(
  totalTime: number,
  downTime: number
): number {
  if (totalTime <= 0) {
    return 0;
  }
  
  const uptime = ((totalTime - downTime) / totalTime) * 100;
  return Math.max(0, Math.min(100, uptime));
}

/** 障害影響度の算出 */
export function calculateImpactScore(
  affectedUsers: number,
  affectedSites: number,
  downTimeMinutes: number,
  businessCritical: boolean
): number {
  let baseScore = (affectedUsers * 0.3) + (affectedSites * 10) + (downTimeMinutes * 0.1);
  
  if (businessCritical) {
    baseScore *= 2;
  }
  
  return Math.round(baseScore);
}

/** 復旧時間予測 */
export function estimateRecoveryTime(
  errorType: string,
  severity: string,
  affectedComponents: number
): number {
  let baseTime = 30; // 基本30分
  
  // 障害レベルによる調整
  switch (severity) {
    case '致命的':
      baseTime *= 4;
      break;
    case '重大':
      baseTime *= 2;
      break;
    case '軽微':
      baseTime *= 0.5;
      break;
  }
  
  // エラータイプによる調整
  if (errorType.includes('データベース')) {
    baseTime *= 1.5;
  } else if (errorType.includes('ネットワーク')) {
    baseTime *= 1.2;
  } else if (errorType.includes('アプリケーション')) {
    baseTime *= 0.8;
  }
  
  // 影響コンポーネント数による調整
  baseTime += affectedComponents * 10;
  
  return Math.round(baseTime);
}

/** システムパフォーマンス指標の算出 */
export function calculatePerformanceIndex(
  responseTime: number,
  throughput: number,
  errorRate: number,
  availability: number
): number {
  // レスポンス時間スコア (3秒以内が100点)
  const responseScore = Math.max(0, 100 - (responseTime / 3000) * 100);
  
  // スループットスコア (基準値を100として正規化)
  const throughputScore = Math.min(100, (throughput / 1000) * 100);
  
  // エラー率スコア (0%が100点)
  const errorScore = Math.max(0, 100 - errorRate * 10);
  
  // 可用性スコア
  const availabilityScore = availability;
  
  // 重み付き平均
  const performanceIndex = (
    responseScore * 0.3 +
    throughputScore * 0.2 +
    errorScore * 0.2 +
    availabilityScore * 0.3
  );
  
  return Math.round(performanceIndex * 100) / 100;
}