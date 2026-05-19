// SIG-PLAN:
// - 関数名: calculateProgress
//   呼び出し例 (テスト中): calculateProgress(80, 100), calculateProgress(80, 0), calculateProgress(120, 100)
//   await されてる?: いいえ
//   アクセスされるプロパティ: result.progressRate, result.deviationRate
//   → 結論: function calculateProgress(actual: number, planned: number): { progressRate: number; deviationRate: number }
// - 関数名: calculateEfficiency
//   呼び出し例 (テスト中): calculateEfficiency(75, 90), calculateEfficiency(70, 85, 80), calculateEfficiency(80, null)
//   await されてる?: いいえ
//   アクセスされるプロパティ: result.efficiencyDecline, result.declineRate, result.alertRequired, result.message
//   → 結論: function calculateEfficiency(current: number, pastAverage: number | null, threshold?: number): EfficiencyResult
// - 関数名: predictEmergencyWorkload
//   呼び出し例 (テスト中): predictEmergencyWorkload("設備故障", historicalData), predictEmergencyWorkload("設備故障", [])
//   await されてる?: いいえ
//   アクセスされるプロパティ: result.predictedHours, result.requiredTechnicians, result.message
//   → 結論: function predictEmergencyWorkload(reason: string, historicalData: Array<{reason: string; duration: number}>): EmergencyWorkloadResult

interface ProgressResult {
  progressRate: number;
  deviationRate: number;
}

interface EfficiencyResult {
  efficiencyDecline: boolean;
  declineRate: number;
  alertRequired: boolean;
  message: string;
}

interface EmergencyWorkloadResult {
  predictedHours: number;
  requiredTechnicians: number;
  message?: string;
}

interface WorkRecord {
  employeeId: string;
  workHours: number;
  date: string;
  projectName?: string;
  workLocation?: string;
  workType?: string;
  workContent?: string;
  status?: string;
}

interface InterruptionRecord {
  interruptionId: string;
  workRecordId: string;
  startTime: string;
  endTime?: string;
  reason: string;
  reasonDetail?: string;
  duration?: number;
  impact?: string;
  status: string;
}

interface AnomalousDataResult {
  hasAnomalies: boolean;
  anomalies: Array<{
    recordId: string;
    field: string;
    value: any;
    threshold: any;
    severity: string;
  }>;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  missingFields: string[];
}

interface PersonnelAllocation {
  employeeId: string;
  workLocation: string;
  estimatedHours: number;
  priority: number;
}

interface ModificationInstruction {
  recordId: string;
  field: string;
  currentValue: any;
  recommendedValue: any;
  reason: string;
  priority: string;
}

interface OperationHistory {
  operationId: string;
  userId: string;
  operation: string;
  timestamp: string;
  details: any;
}

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

interface IntegratedAnalysis {
  totalWorkHours: number;
  averageEfficiency: number;
  productivityIndex: number;
  recommendations: string[];
}

interface Bottleneck {
  workType: string;
  location: string;
  severity: string;
  impact: number;
  recommendations: string[];
}

interface DashboardData {
  progressByTask: Array<{
    taskName: string;
    progressRate: number;
    deviationRate: number;
    status: string;
  }>;
  delayedTasks: Array<{
    taskName: string;
    delayDays: number;
    impact: string;
  }>;
  overallProgress: number;
}

interface EmergencyIncident {
  incidentId: string;
  reporterId: string;
  severity: string;
  type: string;
  location: string;
  timestamp: string;
  description: string;
}

interface MonthlyReport {
  totalWorkHours: number;
  averageEfficiency: number;
  anomalousDataCount: number;
  completionRate: number;
  departmentalBreakdown: Array<{
    department: string;
    workHours: number;
    efficiency: number;
  }>;
}

interface ProfitabilityAnalysis {
  locationId: string;
  revenue: number;
  laborCostRate: number;
  profitMargin: number;
  efficiency: number;
  ranking: number;
}

interface InvestmentJustification {
  expectedROI: number;
  paybackPeriod: number;
  riskLevel: string;
  recommendation: string;
  assumptions: string[];
}

interface ProductivityGap {
  locationId: string;
  currentProductivity: number;
  targetProductivity: number;
  gap: number;
  improvementPotential: number;
}

interface ImprovementPlan {
  planId: string;
  targetArea: string;
  expectedImprovement: number;
  investmentRequired: number;
  timeline: string;
  approved: boolean;
}

interface SmallStartEffect {
  workReductionRate: number;
  adoptionRate: number;
  roi: number;
  costSavings: number;
  recommendation: string;
}

interface WorkReport {
  reportId: string;
  period: string;
  totalWorkHours: number;
  qualityMetrics: any;
  costAnalysis: any;
  recommendations: string[];
}

interface ImprovementProposal {
  proposalId: string;
  targetArea: string;
  currentState: any;
  proposedChanges: any;
  expectedBenefits: any;
  roi: number;
  approved: boolean;
}

interface SeasonalPattern {
  month: number;
  seasonalFactor: number;
  workloadVariation: number;
  pattern: string;
}

interface BudgetPlan {
  totalBudget: number;
  departmentalAllocation: Array<{
    department: string;
    allocation: number;
    percentage: number;
  }>;
  seasonalAdjustments: SeasonalPattern[];
  approved: boolean;
}

interface TechnicalFeasibility {
  feasible: boolean;
  risks: string[];
  requirements: string[];
  timeline: string;
}

interface SystemIntegration {
  integrationId: string;
  systems: string[];
  dataFormat: string;
  status: string;
  completionRate: number;
}

interface SystemFailure {
  failureId: string;
  severity: string;
  affectedLocations: string[];
  estimatedRecoveryTime: number;
  status: string;
}

export function calculateProgress(actual: number, planned: number): ProgressResult {
  if (planned === 0) {
    throw new Error("計画工数がゼロのため進捗率を計算できません");
  }
  
  const progressRate = (actual / planned) * 100;
  const deviationRate = progressRate - 100;
  
  return {
    progressRate: Math.round(progressRate * 100) / 100,
    deviationRate: Math.round(deviationRate * 100) / 100
  };
}

export function calculateEfficiency(current: number, pastAverage: number | null, threshold?: number): EfficiencyResult {
  if (pastAverage === null) {
    throw new Error("分析対象データが不足しています");
  }
  
  const declineRate = ((current - pastAverage) / pastAverage) * 100;
  const efficiencyDecline = declineRate < 0;
  const alertRequired = threshold ? current < threshold : false;
  
  let message = "";
  if (alertRequired) {
    message = `効率が閾値を下回りました。現在値: ${current}, 閾値: ${threshold}`;
  }
  
  return {
    efficiencyDecline,
    declineRate: Math.round(declineRate * 100) / 100,
    alertRequired,
    message
  };
}

export function predictEmergencyWorkload(reason: string, historicalData: Array<{reason: string; duration: number}>): EmergencyWorkloadResult {
  const relevantData = historicalData.filter(record => record.reason === reason);
  
  if (relevantData.length === 0) {
    return {
      predictedHours: 0,
      requiredTechnicians: 0,
      message: "分析期間にデータが存在しません"
    };
  }
  
  const averageDuration = relevantData.reduce((sum, record) => sum + record.duration, 0) / relevantData.length;
  const requiredTechnicians = Math.ceil(averageDuration / 2.5); // 2.5時間あたり1人の技術者が必要
  
  return {
    predictedHours: Math.round(averageDuration * 10) / 10,
    requiredTechnicians
  };
}

export function aggregateRealTimeData(workRecords: WorkRecord[]): any {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = workRecords.filter(record => record.date === today);
  
  const totalHours = todayRecords.reduce((sum, record) => sum + record.workHours, 0);
  const employeeCount = new Set(todayRecords.map(record => record.employeeId)).size;
  const averageHours = employeeCount > 0 ? totalHours / employeeCount : 0;
  
  return {
    totalWorkHours: Math.round(totalHours * 10) / 10,
    employeeCount,
    averageWorkHours: Math.round(averageHours * 10) / 10,
    aggregationTime: new Date().toISOString()
  };
}

export function optimizePersonnelAllocation(workload: any, availablePersonnel: any[]): PersonnelAllocation[] {
  const allocations: PersonnelAllocation[] = [];
  
  // 作業負荷に基づいて人員を最適配置
  availablePersonnel.forEach((person, index) => {
    const estimatedHours = Math.min(8, workload.totalHours / availablePersonnel.length);
    allocations.push({
      employeeId: person.employeeId || `EMP${String(index + 1).padStart(3, '0')}`,
      workLocation: workload.location || "現場A",
      estimatedHours: Math.round(estimatedHours * 10) / 10,
      priority: workload.priority || 1
    });
  });
  
  return allocations.sort((a, b) => b.priority - a.priority);
}

export function generateModificationInstruction(recordId: string, anomalies: any[]): ModificationInstruction[] {
  return anomalies.map(anomaly => ({
    recordId,
    field: anomaly.field,
    currentValue: anomaly.value,
    recommendedValue: anomaly.recommendedValue || "要確認",
    reason: `異常値検出: ${anomaly.reason || "基準値を超過"}`,
    priority: anomaly.severity === "high" ? "緊急" : "通常"
  }));
}

export function recordModificationHistory(modification: any): OperationHistory {
  return {
    operationId: `MOD_${Date.now()}`,
    userId: modification.userId || "SYSTEM",
    operation: "データ修正",
    timestamp: new Date().toISOString(),
    details: {
      recordId: modification.recordId,
      field: modification.field,
      oldValue: modification.oldValue,
      newValue: modification.newValue,
      reason: modification.reason
    }
  };
}

export function validateApprovalProcess(approvalData: any): ValidationResult {
  const errors: string[] = [];
  const missingFields: string[] = [];
  
  if (!approvalData.approverId) missingFields.push("承認者ID");
  if (!approvalData.recordId) missingFields.push("記録ID");
  if (!approvalData.approvalDate) missingFields.push("承認日時");
  
  if (approvalData.approvalDate && new Date(approvalData.approvalDate) > new Date()) {
    errors.push("承認日時が未来の日付です");
  }
  
  return {
    isValid: errors.length === 0 && missingFields.length === 0,
    errors,
    missingFields
  };
}

export function recordOperationHistory(operation: any): OperationHistory {
  return {
    operationId: `OP_${Date.now()}`,
    userId: operation.userId || "SYSTEM",
    operation: operation.type || "操作記録",
    timestamp: new Date().toISOString(),
    details: operation.details || {}
  };
}

export function synchronizeData(localData: any[], cloudData: any[]): any {
  const syncResult = {
    synchronized: 0,
    conflicts: 0,
    errors: 0,
    lastSyncTime: new Date().toISOString()
  };
  
  localData.forEach(localRecord => {
    const cloudRecord = cloudData.find(c => c.id === localRecord.id);
    if (!cloudRecord) {
      syncResult.synchronized++;
    } else if (localRecord.updatedAt !== cloudRecord.updatedAt) {
      syncResult.conflicts++;
    }
  });
  
  return syncResult;
}

export function captureGPSLocation(): GPSLocation {
  // 実際の実装ではnavigator.geolocationを使用
  return {
    latitude: 35.6762 + (Math.random() - 0.5) * 0.01,
    longitude: 139.6503 + (Math.random() - 0.5) * 0.01,
    accuracy: 10,
    timestamp: new Date().toISOString()
  };
}

export function generateIntegratedAnalysis(workData: WorkRecord[]): IntegratedAnalysis {
  const totalWorkHours = workData.reduce((sum, record) => sum + record.workHours, 0);
  const averageEfficiency = totalWorkHours / workData.length || 0;
  const productivityIndex = averageEfficiency * 100 / 8; // 8時間を基準とした生産性指数
  
  const recommendations: string[] = [];
  if (productivityIndex < 80) {
    recommendations.push("作業効率の改善が必要です");
  }
  if (totalWorkHours > workData.length * 10) {
    recommendations.push("長時間労働の是正を検討してください");
  }
  
  return {
    totalWorkHours: Math.round(totalWorkHours * 10) / 10,
    averageEfficiency: Math.round(averageEfficiency * 10) / 10,
    productivityIndex: Math.round(productivityIndex * 10) / 10,
    recommendations
  };
}

export function identifyBottleneck(workData: WorkRecord[]): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];
  const workTypeGroups = new Map<string, WorkRecord[]>();
  
  workData.forEach(record => {
    const workType = record.workType || "その他";
    if (!workTypeGroups.has(workType)) {
      workTypeGroups.set(workType, []);
    }
    workTypeGroups.get(workType)!.push(record);
  });
  
  workTypeGroups.forEach((records, workType) => {
    const averageHours = records.reduce((sum, r) => sum + r.workHours, 0) / records.length;
    if (averageHours > 10) { // 10時間を超える作業をボトルネックとして検出
      bottlenecks.push({
        workType,
        location: records[0].workLocation || "不明",
        severity: averageHours > 12 ? "高" : "中",
        impact: Math.round((averageHours - 8) * records.length * 10) / 10,
        recommendations: ["作業プロセスの見直し", "人員配置の最適化"]
      });
    }
  });
  
  return bottlenecks;
}

export function calculateActualWorkHours(startTime: string, endTime: string, breaks?: number): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const breakHours = (breaks || 0) / 60; // 分を時間に変換
  
  return Math.max(0, Math.round((diffHours - breakHours) * 10) / 10);
}

export function calculateDeviationRate(actual: number, planned: number): number {
  if (planned === 0) return 0;
  return Math.round(((actual - planned) / planned) * 100 * 100) / 100;
}

export function minimizeInputLoad(inputData: any): any {
  // 必須項目のみを抽出し、入力負荷を最小化
  const minimized = {
    workerId: inputData.workerId,
    startTime: inputData.startTime || new Date().toISOString(),
    workType: inputData.workType || "一般作業",
    location: inputData.location
  };
  
  return minimized;
}

export function ensureDataReliability(data: any): any {
  const reliability = {
    dataIntegrity: true,
    gpsVerified: !!data.gpsLocation,
    timestampVerified: !!data.timestamp,
    reliabilityScore: 0
  };
  
  let score = 0;
  if (data.gpsLocation) score += 30;
  if (data.timestamp) score += 30;
  if (data.workerId) score += 20;
  if (data.workType) score += 20;
  
  reliability.reliabilityScore = score;
  
  return reliability;
}

export function showConfirmationDialog(message: string, data?: any): any {
  return {
    message,
    confirmed: false,
    timestamp: new Date().toISOString(),
    data: data || {}
  };
}

export function manageAggregationTarget(criteria: any): any {
  const target = {
    startDate: criteria.startDate || new Date().toISOString().split('T')[0],
    endDate: criteria.endDate || new Date().toISOString().split('T')[0],
    locations: criteria.locations || [],
    workTypes: criteria.workTypes || [],
    targetCount: 0
  };
  
  // 集計対象の推定件数を計算
  target.targetCount = (criteria.locations?.length || 1) * (criteria.workTypes?.length || 1) * 30;
  
  return target;
}

export function predictEmergencyWorkHours(emergencyType: string, historicalData: any[]): number {
  const relevantData = historicalData.filter(record => 
    record.emergencyType === emergencyType || record.workType === emergencyType
  );
  
  if (relevantData.length === 0) return 4; // デフォルト値
  
  const averageHours = relevantData.reduce((sum, record) => 
    sum + (record.workHours || record.duration || 0), 0
  ) / relevantData.length;
  
  return Math.round(averageHours * 10) / 10;
}

export function calculateTechnicianAllocation(workHours: number, skillLevel: string): number {
  const baseAllocation = Math.ceil(workHours / 8); // 8時間/日を基準
  
  const skillMultiplier = {
    "初級": 1.5,
    "中級": 1.0,
    "上級": 0.8,
    "エキスパート": 0.6
  };
  
  return Math.ceil(baseAllocation * (skillMultiplier[skillLevel as keyof typeof skillMultiplier] || 1.0));
}

export function startWorkRecord(workData: any): any {
  const record = {
    recordId: `WR_${Date.now()}`,
    workerId: workData.workerId,
    startTime: new Date().toISOString(),
    workType: workData.workType,
    location: workData.location,
    status: "進行中",
    gpsLocation: captureGPSLocation()
  };
  
  return record;
}

export function endWorkRecord(recordId: string, endData?: any): any {
  const endTime = new Date().toISOString();
  const record = {
    recordId,
    endTime,
    status: "完了",
    workHours: endData?.workHours || 8,
    completionRate: endData?.completionRate || 100
  };
  
  return record;
}

export function validateRequiredFields(data: any): ValidationResult {
  const requiredFields = ["workerId", "startTime", "workType", "location"];
  const missingFields = requiredFields.filter(field => !data[field]);
  const errors: string[] = [];
  
  if (data.startTime && data.endTime) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (start >= end) {
      errors.push("開始時刻が終了時刻以降になっています");
    }
  }
  
  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    errors,
    missingFields
  };
}

export function detectAnomalousValues(data: any): AnomalousDataResult {
  const anomalies: any[] = [];
  
  // 24時間超過チェック
  if (data.workHours && data.workHours > 24) {
    anomalies.push({
      recordId: data.recordId || "UNKNOWN",
      field: "workHours",
      value: data.workHours,
      threshold: 24,
      severity: "high"
    });
  }
  
  // 負の値チェック
  if (data.workHours && data.workHours < 0) {
    anomalies.push({
      recordId: data.recordId || "UNKNOWN",
      field: "workHours",
      value: data.workHours,
      threshold: 0,
      severity: "high"
    });
  }
  
  // 短時間作業チェック（30分未満）
  if (data.workHours && data.workHours < 0.5) {
    anomalies.push({
      recordId: data.recordId || "UNKNOWN",
      field: "workHours",
      value: data.workHours,
      threshold: 0.5,
      severity: "medium"
    });
  }
  
  return {
    hasAnomalies: anomalies.length > 0,
    anomalies
  };
}

export function recordInterruption(interruptionData: any): InterruptionRecord {
  return {
    interruptionId: `INT_${Date.now()}`,
    workRecordId: interruptionData.workRecordId,
    startTime: new Date().toISOString(),
    reason: interruptionData.reason,
    reasonDetail: interruptionData.reasonDetail,
    status: "進行中"
  };
}

export function syncOfflineData(offlineData: any[]): any {
  const syncResult = {
    totalRecords: offlineData.length,
    syncedRecords: 0,
    failedRecords: 0,
    errors: [] as string[]
  };
  
  offlineData.forEach(record => {
    try {
      // データの妥当性チェック
      const validation = validateRequiredFields(record);
      if (validation.isValid) {
        syncResult.syncedRecords++;
      } else {
        syncResult.failedRecords++;
        syncResult.errors.push(`Record ${record.id}: ${validation.errors.join(", ")}`);
      }
    } catch (error) {
      syncResult.failedRecords++;
      syncResult.errors.push(`Record ${record.id}: Sync failed`);
    }
  });
  
  return syncResult;
}

export function completeWork(workData: any): any {
  const completionTime = new Date().toISOString();
  const actualHours = workData.endTime && workData.startTime ? 
    calculateActualWorkHours(workData.startTime, workData.endTime) : 
    workData.workHours || 0;
  
  return {
    recordId: workData.recordId,
    completionTime,
    actualWorkHours: actualHours,
    status: "完了",
    efficiency: actualHours > 0 ? Math.min(100, (8 / actualHours) * 100) : 0
  };
}

export function saveWorkRecord(recordData: any): any {
  const savedRecord = {
    ...recordData,
    savedAt: new Date().toISOString(),
    version: 1,
    checksum: `CHK_${Date.now()}`
  };
  
  return savedRecord;
}

export function verifyDataIntegrity(data: any): any {
  const integrity = {
    isValid: true,
    issues: [] as string[],
    score: 100
  };
  
  // 必須フィールドチェック
  const requiredFields = ["workerId", "startTime", "workType"];
  requiredFields.forEach(field => {
    if (!data[field]) {
      integrity.isValid = false;
      integrity.issues.push(`必須フィールド ${field} が不足`);
      integrity.score -= 20;
    }
  });
  
  // 時刻整合性チェック
  if (data.startTime && data.endTime) {
    if (new Date(data.startTime) >= new Date(data.endTime)) {
      integrity.isValid = false;
      integrity.issues.push("開始時刻が終了時刻以降");
      integrity.score -= 30;
    }
  }
  
  return integrity;
}

export function modifyWorkData(recordId: string, modifications: any): any {
  const modificationRecord = {
    recordId,
    modifications,
    modifiedAt: new Date().toISOString(),
    modifiedBy: modifications.userId || "SYSTEM",
    previousValues: modifications.previousValues || {},
    reason: modifications.reason || "データ修正"
  };
  
  return modificationRecord;
}

export function approveModification(modificationId: string, approverData: any): any {
  const approval = {
    modificationId,
    approverId: approverData.approverId,
    approvalTime: new Date().toISOString(),
    status: "承認済み",
    comments: approverData.comments || ""
  };
  
  return approval;
}

export function analyzeWorkPerformance(workData: WorkRecord[]): any {
  const totalHours = workData.reduce((sum, record) => sum + record.workHours, 0);
  const averageHours = totalHours / workData.length || 0;
  const efficiency = averageHours > 0 ? (8 / averageHours) * 100 : 0;
  
  const performanceByType = new Map<string, number[]>();
  workData.forEach(record => {
    const type = record.workType || "その他";
    if (!performanceByType.has(type)) {
      performanceByType.set(type, []);
    }
    performanceByType.get(type)!.push(record.workHours);
  });
  
  const analysis = {
    totalWorkHours: Math.round(totalHours * 10) / 10,
    averageWorkHours: Math.round(averageHours * 10) / 10,
    efficiency: Math.round(efficiency * 10) / 10,
    workTypeAnalysis: Array.from(performanceByType.entries()).map(([type, hours]) => ({
      workType: type,
      averageHours: Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10,
      recordCount: hours.length
    }))
  };
  
  return analysis;
}

export function determinePriority(workData: any): number {
  let priority = 1; // デフォルト優先度
  
  if (workData.urgency === "緊急") priority = 5;
  else if (workData.urgency === "高") priority = 4;
  else if (workData.urgency === "中") priority = 3;
  else if (workData.urgency === "低") priority = 2;
  
  // 作業時間による調整
  if (workData.estimatedHours > 8) priority += 1;
  if (workData.customerImpact === "高") priority += 1;
  
  return Math.min(5, priority);
}

export function allocatePersonnel(requirements: any, availablePersonnel: any[]): PersonnelAllocation[] {
  const allocations: PersonnelAllocation[] = [];
  
  availablePersonnel.forEach((person, index) => {
    if (index < requirements.requiredCount) {
      allocations.push({
        employeeId: person.employeeId,
        workLocation: requirements.location,
        estimatedHours: requirements.estimatedHours / requirements.requiredCount,
        priority: requirements.priority || 1
      });
    }
  });
  
  return allocations;
}

export function confirmPreviousDayData(date: string): any {
  const targetDate = new Date(date);
  const previousDay = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
  
  return {
    targetDate: previousDay.toISOString().split('T')[0],
    dataExists: true, // 実際の実装では実データをチェック
    recordCount: 25, // サンプル値
    completionRate: 95.2,
    lastUpdated: new Date().toISOString()
  };
}

export function identifyMissingData(workData: WorkRecord[]): any {
  const missingData = {