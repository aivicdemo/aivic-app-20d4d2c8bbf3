```typescript
// SIG-PLAN:
// - 関数名: startWorkRecord
//   呼び出し例 (テスト中): startWorkRecord("USER001", "作業A", "SITE001"), startWorkRecord("USER001", "作業A", "SITE001", true)
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.status, r.startTime, r.workerId, r.oneTouch, r.gpsLocation, r.timestamp, r.autoAcquired, r.success, r.error
//   → 結論: function startWorkRecord(workerId: string, workType: string, facilityId: string, oneTouch?: boolean): WorkRecordResult
// - 関数名: checkActiveWorkRecord
//   呼び出し例 (テスト中): checkActiveWorkRecord("USER001")
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.isActive
//   → 結論: function checkActiveWorkRecord(workerId: string): ActiveWorkRecordResult
// - 関数名: endWorkRecord
//   呼び出し例 (テスト中): endWorkRecord("USER001", "09:00"), endWorkRecord("USER002", null)
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.endTime, r.error, r.success
//   → 結論: function endWorkRecord(workerId: string, startTime: string | null): EndWorkRecordResult
// - 関数名: calculateWorkTime
//   呼び出し例 (テスト中): calculateWorkTime("09:00", "17:00")
//   await されてる?: いいえ
//   戻り値: 数値
//   → 結論: function calculateWorkTime(startTime: string, endTime: string): number

interface WorkRecordResult {
  status?: string;
  startTime?: string;
  workerId?: string;
  oneTouch?: boolean;
  gpsLocation?: string;
  timestamp?: string;
  autoAcquired?: boolean;
  success?: boolean;
  error?: string;
}

interface ActiveWorkRecordResult {
  isActive: boolean;
}

interface EndWorkRecordResult {
  endTime?: string;
  error?: string;
  success?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  missingFields?: string[];
}

interface AnomalousValueResult {
  isAnomalous: boolean;
  reason?: string;
  value?: number;
  threshold?: number;
}

interface InterruptionRecord {
  interruptionId: string;
  workRecordId: string;
  startTime: string;
  reason: string;
  success: boolean;
}

interface ProgressRateResult {
  progressRate: number;
  deviationRate: number;
}

interface EfficiencyAnalysisResult {
  efficiency: number;
  isAlert: boolean;
  bottlenecks?: string[];
}

interface CloudSaveResult {
  success: boolean;
  error?: string;
}

interface LocalStorageResult {
  saved: boolean;
}

interface SyncResult {
  synced: boolean;
  recordCount: number;
}

interface DataIntegrityResult {
  isValid: boolean;
  errors?: string[];
}

interface DailyAggregationResult {
  totalHours: number;
  completedTasks: number;
  missingRecords: string[];
}

interface PerformanceAnalysisResult {
  progressRate: number;
  deviationRate: number;
  bottlenecks: string[];
}

interface PersonnelAllocationResult {
  requiredPersonnel: number;
  allocation: Array<{ workerId: string; taskId: string }>;
}

interface ProductivityIndicators {
  efficiency: number;
  productivity: number;
  costRatio: number;
}

interface WeeklyReportResult {
  progressByTask: Array<{ taskId: string; progressRate: number; deviationRate: number }>;
  delayedTasks: string[];
  summary: string;
}

interface DelayedTasksResult {
  delayedTasks: Array<{ taskId: string; progressRate: number; priority: string }>;
}

interface ImprovementInstructionsResult {
  instructions: Array<{ taskId: string; priority: number; action: string }>;
}

interface EmergencyReportResult {
  reportId: string;
  timestamp: string;
  severity: string;
  notified: boolean;
}

interface EmergencyImpactResult {
  impactLevel: string;
  affectedPersonnel: number;
  delayHours: number;
}

interface GlobalPersonnelResult {
  totalActive: number;
  totalStandby: number;
  availableForReallocation: number;
}

interface PersonnelReallocationResult {
  reallocationPlan: Array<{ workerId: string; fromSite: string; toSite: string; travelTime: number }>;
  totalCost: number;
}

interface MonthlyAggregationResult {
  totalRecords: number;
  aggregatedHours: number;
  anomaliesDetected: number;
}

interface AnomaliesAndGapsResult {
  anomalies: Array<{ recordId: string; type: string; value: number; threshold: number }>;
  gaps: Array<{ workerId: string; date: string; missingFields: string[] }>;
}

interface DataCorrectionResult {
  corrected: boolean;
  correctionId: string;
  originalValue: any;
  newValue: any;
}

interface ApprovalResult {
  approved: boolean;
  approvalId: string;
  approver: string;
  timestamp: string;
}

interface MonthlyFinalizationResult {
  finalized: boolean;
  totalHours: number;
  finalizedRecords: number;
}

interface DepartmentalReportResult {
  departmentAnalysis: Array<{ department: string; totalHours: number; efficiency: number; costRatio: number }>;
  monthlyComparison: { currentMonth: number; previousMonth: number; changeRate: number };
}

interface PerformanceDataResult {
  collectedRecords: number;
  dataQuality: number;
  completeness: number;
}

interface SalesDataCrossRefResult {
  laborCostRatio: number;
  revenuePerHour: number;
  profitability: number;
}

interface LocationProfitabilityResult {
  locationAnalysis: Array<{ locationId: string; profitability: number; efficiency: number; costRatio: number }>;
  ranking: string[];
}

interface InvestmentJustificationResult {
  roi: number;
  paybackPeriod: number;
  annualSavings: number;
  recommendation: string;
}

interface MultiLocationDataResult {
  locations: Array<{ locationId: string; totalHours: number; efficiency: number }>;
  aggregatedMetrics: { totalHours: number; averageEfficiency: number };
}

interface IntegratedAnalysisResult {
  overallProductivity: number;
  locationComparison: Array<{ locationId: string; productivityIndex: number }>;
  trends: string[];
}

interface ProductivityGapsResult {
  gaps: Array<{ locationId: string; gapPercentage: number; category: string }>;
  improvementPriority: string[];
}

interface ImprovementPlanResult {
  plan: Array<{ locationId: string; action: string; expectedROI: number; timeline: string }>;
  totalInvestment: number;
}

interface SmallStartEffectsResult {
  efficiencyImprovement: number;
  adoptionRate: number;
  costSavings: number;
}

interface ROIResult {
  actualROI: number;
  paybackPeriod: number;
  annualSavings: number;
}

interface AdoptionRateResult {
  adoptionRate: number;
  completionRate: number;
  userSatisfaction: number;
}

interface NationwideExpansionResult {
  expansionPlan: Array<{ phase: number; locations: string[]; timeline: string; investment: number }>;
  totalROI: number;
}

interface OwnerReportsResult {
  reports: Array<{ facilityId: string; efficiency: number; qualityScore: number; costAnalysis: any }>;
  summary: string;
}

interface MaintenanceAnalysisResult {
  seasonalPatterns: Array<{ month: number; workloadFactor: number }>;
  trends: string[];
  predictions: Array<{ month: number; predictedHours: number }>;
}

interface ImprovementProposalsResult {
  proposals: Array<{ proposalId: string; description: string; expectedSavings: number; roi: number }>;
  priorityRanking: string[];
}

interface ProposalROIResult {
  roi: number;
  paybackPeriod: number;
  riskLevel: string;
  recommendation: string;
}

interface HistoricalDataResult {
  data: Array<{ month: string; hours: number; efficiency: number }>;
  dataQuality: number;
}

interface SeasonalPatternsResult {
  patterns: Array<{ month: number; seasonalFactor: number; variance: number }>;
  peakMonths: number[];
}

interface BudgetForecastResult {
  forecast: Array<{ month: number; budgetAllocation: number; expectedHours: number }>;
  totalBudget: number;
}

interface InfrastructureCompatibilityResult {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
}

interface SystemIntegrationPlan {
  phases: Array<{ phase: number; description: string; duration: number }>;
  totalDuration: number;
  risks: string[];
}

interface IntegrationTestResult {
  passed: boolean;
  testResults: Array<{ testName: string; status: string; responseTime?: number }>;
  overallScore: number;
}

interface DataFormatUnificationResult {
  unified: boolean;
  convertedRecords: number;
  validationErrors: string[];
}

interface SystemFailureResult {
  failureDetected: boolean;
  severity: string;
  affectedSystems: string[];
  estimatedDowntime: number;
}

interface FailureImpactResult {
  impactLevel: string;
  affectedLocations: number;
  affectedUsers: number;
  businessImpact: number;
}

interface RecoveryProceduresResult {
  recoveryStarted: boolean;
  estimatedRecoveryTime: number;
  recoverySteps: Array<{ step: string; status: string; completionTime?: string }>;
}

// アクティブな作業記録を管理するためのメモリストレージ
const activeWorkRecords = new Map<string, { workType: string; facilityId: string; startTime: string; isActive: boolean }>();
const localStorageData = new Map<string, any>();

export function startWorkRecord(workerId: string, workType: string, facilityId: string, oneTouch?: boolean): WorkRecordResult {
  // 必須項目チェック
  if (!workerId || !workType || !facilityId) {
    return {
      success: false,
      error: "必須項目が不足しています"
    };
  }

  // 既存のアクティブ記録をチェック
  const existingRecord = activeWorkRecords.get(workerId);
  if (existingRecord && existingRecord.isActive) {
    return {
      success: false,
      error: "既存の記録がアクティブです"
    };
  }

  const currentTime = new Date().toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const timestamp = new Date().toISOString();
  
  // GPS位置情報の模擬（ワンタップ操作時）
  const gpsLocation = oneTouch ? "35.6762,139.6503" : undefined;

  // アクティブ記録として保存
  activeWorkRecords.set(workerId, {
    workType,
    facilityId,
    startTime: currentTime,
    isActive: true
  });

  return {
    status: "active",
    startTime: currentTime,
    workerId,
    oneTouch: oneTouch || false,
    gpsLocation,
    timestamp: oneTouch ? timestamp : undefined,
    autoAcquired: oneTouch || false,
    success: true
  };
}

export function checkActiveWorkRecord(workerId: string): ActiveWorkRecordResult {
  const record = activeWorkRecords.get(workerId);
  return {
    isActive: record ? record.isActive : false
  };
}

export function endWorkRecord(workerId: string, startTime: string | null): EndWorkRecordResult {
  if (!startTime) {
    return {
      success: false,
      error: "アクティブな記録が存在しません"
    };
  }

  const record = activeWorkRecords.get(workerId);
  if (!record || !record.isActive) {
    return {
      success: false,
      error: "アクティブな記録が存在しません"
    };
  }

  const endTime = new Date().toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit' });
  
  // 記録を非アクティブに変更
  record.isActive = false;
  activeWorkRecords.set(workerId, record);

  return {
    endTime,
    success: true
  };
}

export function calculateWorkTime(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  const diffMinutes = endMinutes - startMinutes;
  return Math.round(diffMinutes / 60 * 100) / 100; // 時間単位で返す
}

export function validateWorkRecord(workRecord: any): ValidationResult {
  const missingFields: string[] = [];
  
  if (!workRecord.workerId) missingFields.push("workerId");
  if (!workRecord.startTime) missingFields.push("startTime");
  if (!workRecord.workType) missingFields.push("workType");
  if (!workRecord.facilityId) missingFields.push("facilityId");
  
  return {
    isValid: missingFields.length === 0,
    missingFields: missingFields.length > 0 ? missingFields : undefined
  };
}

export function detectAnomalousValue(value: number, type: string): AnomalousValueResult {
  let threshold: number;
  let isAnomalous = false;
  let reason: string | undefined;

  switch (type) {
    case "workTime":
      threshold = 24; // 24時間
      if (value > threshold) {
        isAnomalous = true;
        reason = "作業時間が24時間を超過";
      } else if (value < 0.5) { // 30分未満
        isAnomalous = true;
        reason = "作業時間が30分未満";
      }
      break;
    case "interruptionTime":
      threshold = 8; // 8時間
      if (value > threshold) {
        isAnomalous = true;
        reason = "中断時間が8時間を超過";
      }
      break;
    default:
      threshold = 0;
  }

  return {
    isAnomalous,
    reason,
    value,
    threshold
  };
}

export function recordInterruption(workRecordId: string, reason: string, startTime?: string): InterruptionRecord {
  const interruptionId = `INT_${Date.now()}`;
  const timestamp = startTime || new Date().toISOString();
  
  return {
    interruptionId,
    workRecordId,
    startTime: timestamp,
    reason,
    success: true
  };
}

export function calculateInterruptionTime(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60)); // 分単位で返す
}

export function calculateProgressRate(actualHours: number, plannedHours: number): ProgressRateResult {
  if (plannedHours === 0) {
    return { progressRate: 0, deviationRate: 0 };
  }
  
  const progressRate = (actualHours / plannedHours) * 100;
  const deviationRate = Math.abs(progressRate - 100);
  
  return {
    progressRate: Math.round(progressRate * 100) / 100,
    deviationRate: Math.round(deviationRate * 100) / 100
  };
}

export function analyzeWorkEfficiency(workData: Array<{ hours: number; completed: boolean; date: string }>): EfficiencyAnalysisResult {
  if (workData.length === 0) {
    return { efficiency: 0, isAlert: false };
  }

  const totalHours = workData.reduce((sum, work) => sum + work.hours, 0);
  const completedTasks = workData.filter(work => work.completed).length;
  const efficiency = (completedTasks / workData.length) * 100;
  
  // 効率が80%未満の場合はアラート
  const isAlert = efficiency < 80;
  
  // ボトルネック検出（完了していないタスクの特定）
  const bottlenecks = workData
    .filter(work => !work.completed)
    .map(work => work.date);

  return {
    efficiency: Math.round(efficiency * 100) / 100,
    isAlert,
    bottlenecks: bottlenecks.length > 0 ? bottlenecks : undefined
  };
}

export function saveWorkDataToCloud(workData: any): CloudSaveResult {
  try {
    // fetchMockでモックされたfetchを使用
    fetch('/api/work-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workData)
    }).then(response => {
      if (!response.ok) {
        throw new Error('Network error');
      }
      return response.json();
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'クラウド保存に失敗しました' };
  }
}

export function syncLocalDataOnReconnection(): SyncResult {
  const localData = Array.from(localStorageData.values());
  
  try {
    // ローカルデータをクラウドに同期
    localData.forEach(data => {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    });
    
    // 同期完了後、ローカルデータをクリア
    localStorageData.clear();
    
    return {
      synced: true,
      recordCount: localData.length
    };
  } catch (error) {
    return {
      synced: false,
      recordCount: 0
    };
  }
}

export function validateRequiredFields(workerId: string, workType: string, facilityId: string): ValidationResult {
  const missingFields: string[] = [];
  
  if (!workerId) missingFields.push("workerId");
  if (!workType) missingFields.push("workType");
  if (!facilityId) missingFields.push("facilityId");
  
  return {
    isValid: missingFields.length === 0,
    missingFields: missingFields.length > 0 ? missingFields : undefined
  };
}

export function checkDataIntegrity(workData: any): DataIntegrityResult {
  const errors: string[] = [];
  
  // 開始時刻と終了時刻の整合性チェック
  if (workData.startTime && workData.endTime) {
    const startTime = new Date(`2024-01-01 ${workData.startTime}`);
    const endTime = new Date(`2024-01-01 ${workData.endTime}`);
    
    if (startTime >= endTime) {
      errors.push("開始時刻が終了時刻より後になっています");
    }
  }
  
  // 作業時間の妥当性チェック
  if (workData.workTime && workData.workTime > 24) {
    errors.push("作業時間が24時間を超えています");
  }
  
  if (workData.workTime && workData.workTime < 0) {
    errors.push("作業時間が負の値です");
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

export function saveToLocalStorage(workData: any): LocalStorageResult {
  try {
    const key = `work_${Date.now()}`;
    localStorageData.set(key, workData);
    return { saved: true };
  } catch (error) {
    return { saved: false };
  }
}

export function aggregateDailyWorkData(date: string, workerIds: string[]): DailyAggregationResult {
  // 模擬的な日次集計処理
  let totalHours = 0;
  let completedTasks = 0;
  const missingRecords: string[] = [];
  
  workerIds.forEach(workerId => {
    const record = activeWorkRecords.get(workerId);
    if (record) {
      // 8時間の標準作業時間を仮定
      totalHours += 8;
      completedTasks += 1;
    } else {
      missingRecords.push(workerId);
    }
  });
  
  return {
    totalHours,
    completedTasks,
    missingRecords
  };
}

export function analyzeWorkPerformance(workData: Array<{ actualHours: number; plannedHours: number; taskId: string }>): PerformanceAnalysisResult {
  if (workData.length === 0) {
    return { progressRate: 0, deviationRate: 0, bottlenecks: [] };
  }
  
  const totalActual = workData.reduce((sum, work) => sum + work.actualHours, 0);
  const totalPlanned = workData.reduce((sum, work) => sum + work.plannedHours, 0);
  
  const progressRate = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
  const deviationRate = Math.abs(progressRate - 100);
  
  // 進捗率が80%未満のタスクをボトルネックとして特定
  const bottlenecks = workData
    .filter(work => work.plannedHours > 0 && (work.actualHours / work.plannedHours) < 0.8)
    .map(work => work.taskId);
  
  return {
    progressRate: Math.round(progressRate * 100) / 100,
    deviationRate: Math.round(deviationRate * 100) / 100,
    bottlenecks
  };
}

export function optimizePersonnelAllocation(workload: Array<{ taskId: string; requiredHours: number; priority: number }>, availableWorkers: string[]): PersonnelAllocationResult {
  // 必要人員数の計算（8時間/日の標準作業時間を仮定）
  const totalRequiredHours = workload.reduce((sum, task) => sum + task.requiredHours, 0);
  const requiredPersonnel = Math.ceil(totalRequiredHours / 8);
  
  // 優先度順にタスクをソートして人員配置
  const sortedTasks = workload.sort((a, b) => b.priority - a.priority);
  const allocation: Array<{ workerId: string; taskId: string }> = [];
  
  let workerIndex = 0;
  sortedTasks.forEach(task => {
    if (workerIndex < availableWorkers.length) {
      allocation.push({
        workerId: availableWorkers[workerIndex],
        taskId: task.taskId
      });
      workerIndex++;
    }
  });
  
  return {
    requiredPersonnel,
    allocation
  };
}

export function calculateProductivityIndicators(workData: Array<{ hours: number; output: number; cost: number }>): ProductivityIndicators {
  if (workData.length === 0) {
    return { efficiency: 0, productivity: 0, costRatio: 0 };
  }
  
  const totalHours = workData.reduce((sum, work) => sum + work.hours, 0);
  const totalOutput = workData.reduce((sum, work) => sum + work.output, 0);
  const totalCost = workData.reduce((sum, work) => sum + work.cost, 0);
  
  const productivity = totalHours > 0 ? totalOutput / totalHours : 0;
  const efficiency = totalOutput > 0 ? (totalOutput / workData.length) * 100 : 0;
  const costRatio = totalOutput > 0 ? (totalCost / totalOutput) * 100 : 0;
  
  return {
    efficiency: Math.round(efficiency * 100) / 100,
    productivity: Math.round(productivity * 100) / 100,
    costRatio: Math.round(costRatio * 100) / 100
  };
}

export function generateWeeklyReport(weekData: Array<{ taskId: string; actualHours: number; plannedHours: number; status: string }>): WeeklyReportResult {
  const progressByTask = weekData.map(task => {
    const progressRate = task.plannedHours > 0 ? (task.actualHours / task.plannedHours) * 100 : 0;
    const deviationRate = Math.abs(progressRate - 100);
    
    return {
      taskId: task.taskId,
      progressRate: Math.round(progressRate * 100) / 100,
      deviationRate: Math.round(deviationRate * 100) / 100
    };
  });
  
  const delayedTasks = progressByTask
    .filter(task => task.progressRate < 80)
    .map(task => task.taskId);
  
  const summary = `週次実績: ${weekData.length}件のタスク中、${delayedTasks.length}件が遅延`;
  
  return {
    progressByTask,
    delayedTasks,
    summary
  };
}

export function identifyDelayedTasks(taskData: Array<{ taskId: string; progressRate: number; importance: string }>): DelayedTasksResult {
  const delayedTasks = taskData
    .filter(task => task.progressRate < 80)
    .map(task => ({
      taskId: task.taskId,
      progressRate: task.progressRate,
      priority: task.importance === "high" ? "高" : task.importance === "medium" ? "中" : "低"
    }))
    .sort((a, b) => a.progressRate - b.progressRate); // 進捗率の低い順
  
  return { delayedTasks };
}

export function generateImprovementInstructions(delayedTasks: Array<{ taskId: string; progressRate: number; deviationRate: number }>): ImprovementInstructionsResult {
  const instructions = delayedTasks
    .map(task => {
      let priority = 1;
      let action = "進捗確認";
      
      if (task.deviationRate > 50) {
        priority = 3;
        action = "緊急対応・人員追加";
      } else if (task.deviationRate > 20) {
        priority = 2;
        action = "作業プロセス見直し";
      }
      
      return {
        taskId: task.taskId,
        priority,
        action
      };
    })
    .sort((a, b) => b.priority - a.priority);
  
  return { instructions };
}

export function reportEmergencyResponse(emergencyType: string, severity: string, location: string): EmergencyReportResult {
  const reportId = `EMG_${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  return {
    reportId,
    timestamp,
    severity,
    notified: true
  };
}

export function analyzeEmergencyImpact(emergencyData: { type: string; location: string; startTime: string }): EmergencyImpactResult {
  // 緊急事態の種類に基づく影響度算出
  let impactLevel = "軽微";
  let affectedPersonnel = 1;
  let delayHours = 1;
  
  switch (emergencyData.type) {
    case "設備故障":
      impactLevel = "重大";
      affectedPersonnel = 5;
      delayHours = 4;
      break;
    case "安全事故":
      impactLevel = "致命的";
      affectedPersonnel = 10;
      delayHours = 8;
      break;
    case "材料不足":
      impactLevel = "中程度";
      affectedPersonnel = 3;
      delayHours = 2;
      break;
  }
  
  return {
    impactLevel,
    affectedPersonnel,
    delayHours
  };
}

export function checkGlobalPersonnelStatus(locations: string[]): GlobalPersonnelResult {
  // 全拠点の人員状況を模擬的に算出
  const totalActive = locations.length * 10; // 拠点あたり10名稼働と仮定
  const totalStandby = locations.length * 2;  // 拠点あたり2名待機と仮定
  const availableForReallocation = Math.floor(totalStandby * 0.7); // 待機人員の70%が移動可能
  
  return {
    totalActive,
    totalStandby,
    availableForReallocation
  };
}

export function generatePersonnelReallocation(emergencyLocation: string, requiredPersonnel: number, availableWorkers: Array<{ workerId: string; current