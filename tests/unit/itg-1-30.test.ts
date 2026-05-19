import {
  calculateProgress,
  calculateEfficiency,
  predictEmergencyWorkload,
  aggregateRealTimeData,
  optimizePersonnelAllocation,
  generateModificationInstruction,
  recordModificationHistory,
  validateApprovalProcess,
  recordOperationHistory,
  synchronizeData,
  captureGPSLocation,
  generateIntegratedAnalysis,
  identifyBottleneck,
  calculateActualWorkHours,
  calculateDeviationRate,
  minimizeInputLoad,
  ensureDataReliability,
  showConfirmationDialog,
  manageAggregationTarget,
  predictEmergencyWorkHours,
  calculateTechnicianAllocation,
  startWorkRecord,
  endWorkRecord,
  validateRequiredFields,
  detectAnomalousValues,
  recordInterruption,
  syncOfflineData,
  completeWork,
  saveWorkRecord,
  verifyDataIntegrity,
  modifyWorkData,
  approveModification,
  analyzeWorkPerformance,
  determinePriority,
  allocatePersonnel,
  confirmPreviousDayData,
  identifyMissingData,
  analyzeWorkEfficiency,
  detectBottlenecks,
  predictDailyWorkload,
  optimizeEmergencyResponse,
  generateVisualDashboard,
  analyzeProgressByTask,
  identifyDelayedTasks,
  determineImprovementActions,
  reportEmergencyIncident,
  analyzeEmergencyData,
  checkCompanyWidePersonnel,
  allocateAdditionalPersonnel,
  startEmergencyResponse,
  executeMonthEndAggregation,
  performAutoAggregation,
  checkAnomalousData,
  correctWorkData,
  approveCorrection,
  finalizeMonthlyResults,
  generateDepartmentalReport,
  initiatePerformanceEvaluation,
  collectWorkData,
  reconcileWithSalesData,
  analyzeProfitabilityByLocation,
  createInvestmentJustification,
  collectLocationData,
  performIntegratedAnalysis,
  identifyProductivityGaps,
  approveImprovementPlan,
  measureSmallStartEffect,
  calculateWorkReduction,
  analyzeAdoptionRate,
  calculateROI,
  planNationwideExpansion,
  confirmMonthlyReporting,
  correctFinalData,
  aggregateLocationData,
  performIntegratedLocationAnalysis,
  createWorkReport,
  publishReport,
  confirmReportEvaluation,
  analyzeWorkResults,
  createImprovementProposal,
  performROIAnalysis,
  approveProposal,
  presentToFacilityOwner,
  negotiateContractRevision,
  collectHistoricalData,
  analyzeSeasonalPatterns,
  createBudgetPlan,
  validateInvestmentEffect,
  approveBudgetPlan,
  surveyExistingInfrastructure,
  planIntegrationTest,
  buildTestEnvironment,
  executeIntegrationTest,
  verifySecurityRequirements,
  confirmTechnicalFeasibility,
  defineDataIntegrationRequirements,
  designSystemIntegration,
  unifyDataFormats,
  updateLocationSystems,
  startUnifiedWorkInput,
  validateIntegratedData,
  confirmOperationalQuality,
  detectSystemFailure,
  investigateImpactScope,
  notifyLocationsOfFailure,
  executeRecoveryProcedure,
  checkRecoveryStatus,
  reportFullRecovery
} from "../../src/logic/all";

const fetchMock = require("jest-fetch-mock");

describe("業務ロジックテスト", () => {
  // SCEN-365
  test("進捗率算出機能 - 実績工数と計画工数から進捗率が正しく計算される", () => {
    const result = calculateProgress(80, 100);
    expect(result.progressRate).toBe(80);
    expect(result.deviationRate).toBe(-20);
  });

  // SCEN-366
  test("進捗率算出機能 - 計画工数がゼロの場合にエラーハンドリングされる", () => {
    expect(() => calculateProgress(80, 0)).toThrow("計画工数がゼロのため進捗率を計算できません");
  });

  // SCEN-367
  test("進捗率算出機能 - 進捗率100%超過時の乖離率が正しく算出される", () => {
    const result = calculateProgress(120, 100);
    expect(result.progressRate).toBe(120);
    expect(result.deviationRate).toBe(20);
  });

  // SCEN-368
  test("作業効率分析機能 - 過去データとの比較により効率低下が正常に検出される", () => {
    const currentEfficiency = 75;
    const pastAverage = 90;
    const result = calculateEfficiency(currentEfficiency, pastAverage);
    expect(result.efficiencyDecline).toBe(true);
    expect(result.declineRate).toBe(-16.67);
  });

  // SCEN-369
  test("作業効率分析機能 - 効率閾値下回り時にアラート通知が発生する", () => {
    const efficiency = 70;
    const threshold = 80;
    const result = calculateEfficiency(efficiency, 85, threshold);
    expect(result.alertRequired).toBe(true);
    expect(result.message).toContain("効率が閾値を下回りました");
  });

  // SCEN-370
  test("作業効率分析機能 - 分析対象データが不足時に適切なメッセージが返される", () => {
    expect(() => calculateEfficiency(80, null)).toThrow("分析対象データが不足しています");
  });

  // SCEN-378
  test("中断理由分析機能 - 設備故障による中断時に緊急対応工数が予測される", () => {
    const interruptionReason = "設備故障";
    const historicalData = [
      { reason: "設備故障", duration: 4.5 },
      { reason: "設備故障", duration: 3.8 },
      { reason: "設備故障", duration: 5.2 }
    ];
    const result = predictEmergencyWorkload(interruptionReason, historicalData);
    expect(result.predictedHours).toBeCloseTo(4.5);
    expect(result.requiredTechnicians).toBe(2);
  });

  // SCEN-379
  test("中断理由分析機能 - 分析期間にデータが存在しない場合の処理が適切に行われる", () => {
    const result = predictEmergencyWorkload("設備故障", []);
    expect(result.predictedHours).toBe(0);
    expect(result.message).toBe("分析期間にデータが存在しません");
  });

  // SCEN-380
  test("リアルタイム集計機能 - 当日の工数実績がリアルタイムで集計される", () => {
    const workRecords = [
      { employeeId: "EMP001", workHours: 8.5, date: "2024-01-15" },
      { employeeId: "EMP002", workHours: 7.5, date: "2024-01-15" }
    ];
    const result = aggregateRealTimeData(workRecords, "2024-01-15");
    expect(result.totalHours).toBe(16);
    expect(result.employeeCount).toBe(2);
  });

  // SCEN-381
  test("リアルタイム集計機能 - 中断時間を含む工数データが正しく集計される", () => {
    const workRecords = [
      { employeeId: "EMP001", workHours: 8, interruptionHours: 1 }
    ];
    const result = aggregateRealTimeData(workRecords);
    expect(result.totalWorkHours).toBe(8);
    expect(result.totalInterruptionHours).toBe(1);
  });

  // SCEN-382
  test("リアルタイム集計機能 - 集計対象データが大量の場合でもパフォーマンスが維持される", () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      employeeId: `EMP${i.toString().padStart(3, '0')}`,
      workHours: 8
    }));
    const startTime = Date.now();
    const result = aggregateRealTimeData(largeDataset);
    const processingTime = Date.now() - startTime;
    expect(processingTime).toBeLessThan(1000);
    expect(result.totalHours).toBe(8000);
  });

  // SCEN-383
  test("人員配置最適化機能 - 過去実績から必要工数が正しく予測される", () => {
    const historicalData = [
      { taskType: "点検", averageHours: 6.5 },
      { taskType: "修理", averageHours: 8.2 }
    ];
    const tasks = [
      { type: "点検", count: 2 },
      { type: "修理", count: 1 }
    ];
    const result = optimizePersonnelAllocation(tasks, historicalData);
    expect(result.predictedTotalHours).toBe(21.2);
  });

  // SCEN-384
  test("人員配置最適化機能 - 最適な技術者配置が自動算出される", () => {
    const workload = 24;
    const availableTechnicians = [
      { id: "TECH001", skill: "A", workingHours: 8 },
      { id: "TECH002", skill: "B", workingHours: 8 },
      { id: "TECH003", skill: "A", workingHours: 8 }
    ];
    const result = optimizePersonnelAllocation(workload, availableTechnicians);
    expect(result.selectedTechnicians.length).toBe(3);
    expect(result.totalCapacity).toBe(24);
  });

  // SCEN-385
  test("人員配置最適化機能 - 利用可能技術者が不足時に適切な警告が発生する", () => {
    const workload = 40;
    const availableTechnicians = [
      { id: "TECH001", workingHours: 8 }
    ];
    const result = optimizePersonnelAllocation(workload, availableTechnicians);
    expect(result.warning).toBe("技術者が不足しています");
    expect(result.shortfall).toBe(32);
  });

  // SCEN-395
  test("修正指示通知機能 - 異常値詳細を含む修正指示が正しく生成される", () => {
    const anomalousData = {
      employeeId: "EMP001",
      workHours: 25,
      reason: "24時間超過",
      detectedAt: "2024-01-15T10:30:00Z"
    };
    const result = generateModificationInstruction(anomalousData);
    expect(result.details).toContain("24時間超過");
    expect(result.targetEmployee).toBe("EMP001");
    expect(result.recommendedValue).toBe(8);
  });

  // SCEN-396
  test("修正指示通知機能 - 推奨修正値が適切に算出される", () => {
    const data = { workHours: 25, taskType: "通常作業" };
    const result = generateModificationInstruction(data);
    expect(result.recommendedValue).toBe(8);
    expect(result.calculationBasis).toBe("標準作業時間");
  });

  // SCEN-397
  test("修正指示通知機能 - 通知対象作業員が存在しない場合のエラーハンドリング", () => {
    const data = { employeeId: null, workHours: 25 };
    expect(() => generateModificationInstruction(data)).toThrow("通知対象作業員が存在しません");
  });

  // SCEN-398
  test("データ修正履歴管理機能 - 修正前データが履歴として正しく保持される", () => {
    const originalData = { workHours: 25, taskId: "TASK001" };
    const modifiedData = { workHours: 8, taskId: "TASK001" };
    const result = recordModificationHistory(originalData, modifiedData, "異常値修正", "ADMIN001");
    expect(result.history.originalData).toEqual(originalData);
    expect(result.history.modifiedData).toEqual(modifiedData);
    expect(result.historyId).toBeDefined();
  });

  // SCEN-399
  test("データ修正履歴管理機能 - 修正理由と修正者が適切に記録される", () => {
    const result = recordModificationHistory({}, {}, "データ入力ミス", "USER001");
    expect(result.history.reason).toBe("データ入力ミス");
    expect(result.history.modifiedBy).toBe("USER001");
    expect(result.history.timestamp).toBeDefined();
  });

  // SCEN-400
  test("データ修正履歴管理機能 - 複数回修正時の履歴チェーンが正しく維持される", () => {
    const firstHistory = recordModificationHistory({ hours: 25 }, { hours: 10 }, "初回修正", "USER001");
    const secondHistory = recordModificationHistory({ hours: 10 }, { hours: 8 }, "再修正", "USER002", firstHistory.historyId);
    expect(secondHistory.history.previousHistoryId).toBe(firstHistory.historyId);
    expect(secondHistory.history.revisionNumber).toBe(2);
  });

  // SCEN-401
  test("承認プロセス機能 - 修正データの妥当性検証が正常に実行される", () => {
    const modifiedData = { workHours: 8, startTime: "09:00", endTime: "17:00" };
    const result = validateApprovalProcess(modifiedData);
    expect(result.isValid).toBe(true);
    expect(result.validationResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "workHours", valid: true })
    ]));
  });

  // SCEN-402
  test("承認プロセス機能 - 承認後データが確定状態に更新される", () => {
    const data = { taskId: "TASK001", status: "pending" };
    const result = validateApprovalProcess(data, "MANAGER001");
    expect(result.updatedData.status).toBe("confirmed");
    expect(result.approvedBy).toBe("MANAGER001");
    expect(result.approvedAt).toBeDefined();
  });

  // SCEN-403
  test("承認プロセス機能 - 妥当性検証失敗時に承認が拒否される", () => {
    const invalidData = { workHours: -5 };
    const result = validateApprovalProcess(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.rejectionReason).toContain("負の値");
  });

  // SCEN-404
  test("操作履歴記録機能 - 全操作にタイムスタンプ付き履歴が記録される", () => {
    const operation = { type: "UPDATE", target: "work_record", data: { id: "WR001" } };
    const result = recordOperationHistory(operation, "USER001");
    expect(result.timestamp).toBeDefined();
    expect(result.operationType).toBe("UPDATE");
    expect(result.userId).toBe("USER001");
  });

  // SCEN-405
  test("操作履歴記録機能 - データ変更追跡情報が正しく生成される", () => {
    const operation = {
      type: "MODIFY",
      before: { status: "draft" },
      after: { status: "submitted" }
    };
    const result = recordOperationHistory(operation);
    expect(result.changeTracking.fieldChanges).toEqual([
      { field: "status", from: "draft", to: "submitted" }
    ]);
  });

  // SCEN-406
  test("操作履歴記録機能 - 監査証跡として必要な情報が完全に保存される", () => {
    const operation = { type: "DELETE", target: "work_record" };
    const result = recordOperationHistory(operation, "ADMIN001", "192.168.1.100");
    expect(result.auditTrail.userId).toBe("ADMIN001");
    expect(result.auditTrail.ipAddress).toBe("192.168.1.100");
    expect(result.auditTrail.sessionId).toBeDefined();
  });

  // SCEN-408
  test("自動同期機能 - 同期中のデータ競合が適切に解決される", () => {
    const localData = { id: "WR001", lastModified: "2024-01-15T10:00:00Z", hours: 8 };
    const remoteData = { id: "WR001", lastModified: "2024-01-15T10:30:00Z", hours: 9 };
    const result = synchronizeData(localData, remoteData);
    expect(result.resolvedData.hours).toBe(9);
    expect(result.conflictResolution).toBe("remote_newer");
  });

  // SCEN-409
  test("自動同期機能 - 同期失敗時のリトライ処理が正常に動作する", async () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce("", { status: 500 });
    fetchMock.mockResponseOnce(JSON.stringify({ success: true }), { status: 200 });
    
    const result = await synchronizeData({ id: "WR001" });
    expect(result.retryCount).toBe(1);
    expect(result.success).toBe(true);
  });

  // SCEN-411
  test("GPS位置情報取得機能 - GPS無効時のフォールバック処理が実行される", () => {
    const gpsEnabled = false;
    const result = captureGPSLocation(gpsEnabled);
    expect(result.location).toBe("GPS利用不可");
    expect(result.fallbackMethod).toBe("manual_input");
  });

  // SCEN-412
  test("GPS位置情報取得機能 - 位置情報取得権限なし時のエラーハンドリング", () => {
    expect(() => captureGPSLocation(true, false)).toThrow("位置情報取得権限がありません");
  });

  // SCEN-413
  test("統合分析データ生成機能 - 全拠点データが統一フォーマットで生成される", () => {
    const locationData = [
      { locationId: "LOC001", format: "A", data: { hours: 100 } },
      { locationId: "LOC002", format: "B", data: { workTime: 120 } }
    ];
    const result = generateIntegratedAnalysis(locationData);
    expect(result.unifiedData).toHaveLength(2);
    expect(result.unifiedData[0].standardHours).toBe(100);
    expect(result.unifiedData[1].standardHours).toBe(120);
  });

  // SCEN-414
  test("統合分析データ生成機能 - 本社管理部門向け分析データが正しく作成される", () => {
    const data = [
      { locationId: "LOC001", productivity: 85, costs: 50000 },
      { locationId: "LOC002", productivity: 92, costs: 48000 }
    ];
    const result = generateIntegratedAnalysis(data);
    expect(result.managementReport.averageProductivity).toBe(88.5);
    expect(result.managementReport.totalCosts).toBe(98000);
  });

  // SCEN-415
  test("統合分析データ生成機能 - データフォーマット不整合時のエラー処理が適切に行われる", () => {
    const invalidData = [{ locationId: "LOC001" }];
    expect(() => generateIntegratedAnalysis(invalidData)).toThrow("データフォーマットが不整合です");
  });

  // SCEN-416
  test("ボトルネック分析機能 - 中断理由別発生頻度からボトルネック要因が特定される", () => {
    const interruptionData = [
      { reason: "設備故障", frequency: 15, avgDuration: 4.5 },
      { reason: "部品不足", frequency: 8, avgDuration: 2.0 },
      { reason: "技術者不足", frequency: 20, avgDuration: 3.0 }
    ];
    const result = identifyBottleneck(interruptionData);
    expect(result.primaryBottleneck).toBe("技術者不足");
    expect(result.impactScore).toBe(60);
  });

  // SCEN-417
  test("ボトルネック分析機能 - 平均時間の異常値からボトルネックが検出される", () => {
    const data = [
      { reason: "設備故障", avgDuration: 8.5 },
      { reason: "部品不足", avgDuration: 2.0 }
    ];
    const result = identifyBottleneck(data);
    expect(result.anomalousItems).toContain("設備故障");
    expect(result.threshold).toBe(6.0);
  });

  // SCEN-418
  test("ボトルネック分析機能 - 分析対象期間の中断データなし時の処理が適切に行われる", () => {
    const result = identifyBottleneck([]);
    expect(result.message).toBe("分析対象期間に中断データがありません");
    expect(result.bottlenecks).toEqual([]);
  });

  // SCEN-421
  test("作業ステータス管理機能 - 無効なステータス遷移時にエラーが発生する", () => {
    const currentStatus = "completed";
    const newStatus = "in_progress";
    expect(() => completeWork(currentStatus, newStatus)).toThrow("無効なステータス遷移です");
  });

  // SCEN-423
  test("実工数計算機能 - 中断時間を除いた実工数が正確に算出される", () => {
    const startTime = "09:00";
    const endTime = "17:00";
    const interruptionTime = 1.5;
    const result = calculateActualWorkHours(startTime, endTime, interruptionTime);
    expect(result.actualHours).toBe(6.5);
    expect(result.totalTime).toBe(8);
  });

  // SCEN-424
  test("実工数計算機能 - 時刻データ不正時の実工数計算エラーが適切に処理される", () => {
    expect(() => calculateActualWorkHours("25:00", "17:00")).toThrow("不正な時刻データです");
  });

  // SCEN-425
  test("乖離率算出機能 - 実績と計画の乖離率が正しく自動算出される", () => {
    const actual = 120;
    const planned = 100;
    const result = calculateDeviationRate(actual, planned);
    expect(result.deviationRate).toBe(20);
    expect(result.status).toBe("over_plan");
  });

  // SCEN-426
  test("乖離率算出機能 - 計画値ゼロ時の乖離率計算エラーハンドリング", () => {
    expect(() => calculateDeviationRate(100, 0)).toThrow("計画値がゼロのため乖離率を計算できません");
  });

  // SCEN-427
  test("乖離率算出機能 - 大幅な乖離時の警告レベル判定が正常に動作する", () => {
    const result = calculateDeviationRate(150, 100);
    expect(result.warningLevel).toBe("high");
    expect(result.requiresAttention).toBe(true);
  });

  // SCEN-429
  test("入力負荷最小化機能 - 必須項目以外の自動補完が正常に動作する", () => {
    const requiredFields = { employeeId: "EMP001", taskType: "点検" };
    const result = minimizeInputLoad(requiredFields);
    expect(result.autoCompleted.location).toBeDefined();
    expect(result.autoCompleted.timestamp).toBeDefined();
    expect(result.inputCount).toBeLessThanOrEqual(3);
  });

  // SCEN-430
  test("入力負荷最小化機能 - 操作手順最適化によるユーザビリティ向上が確認される", () => {
    const operations = ["tap_start", "select_task", "tap_end"];
    const result = minimizeInputLoad(null, operations);
    expect(result.optimizedSteps).toBeLessThanOrEqual(operations.length);
    expect(result.usabilityScore).toBeGreaterThan(80);
  });

  // SCEN-431
  test("データ信頼性確保機能 - 記録時刻とGPS情報による信頼性担保が実現される", () => {
    const recordTime = "2024-01-15T10:30:00Z";
    const gpsData = { lat: 35.6762, lng: 139.6503, accuracy: 10 };
    const result = ensureDataReliability(recordTime, gpsData);
    expect(result.reliabilityScore).toBeGreaterThan(85);
    expect(result.verified).toBe(true);
  });

  // SCEN-432
  test("データ信頼性確保機能 - 位置情報と時刻の整合性検証が正常に実行される", () => {
    const timeData = { recorded: "10:30", expected: "10:25" };
    const locationData = { current: "Tokyo", expected: "Tokyo" };
    const result = ensureDataReliability(timeData, locationData);
    expect(result.consistencyCheck.time).toBe(true);
    expect(result.consistencyCheck.location).toBe(true);
  });

  // SCEN-433
  test("データ信頼性確保機能 - 信頼性指標の算出と評価が適切に行われる", () => {
    const factors = { gpsAccuracy: 90, timeConsistency: 85, userBehavior: 92 };
    const result = ensureDataReliability(factors);
    expect(result.overallScore).toBe(89);
    expect(result.rating).toBe("high");
  });

  // SCEN-435
  test("確認ダイアログ機能 - 作業終了確認ダイアログでの適切な選択肢提示", () => {
    const workData = { status: "in_progress", duration: 480 };
    const result = showConfirmationDialog("end_work", workData);
    expect(result.options).toContain("作業完了");
    expect(result.options).toContain("一時中断");
    expect(result.options).toContain("キャンセル");
  });

  // SCEN-436
  test("確認ダイアログ機能 - ダイアログキャンセル時の状態復元が正常に動作する", () => {
    const originalState = { status: "in_progress" };
    const result = showConfirmationDialog("cancel", originalState);
    expect(result.restoredState).toEqual(originalState);
    expect(result.actionTaken).toBe("none");
  });

  // SCEN-437
  test("集計対象データ管理機能 - 承認済みデータのみが集計対象に含まれる", () => {
    const workData = [
      { id: "WR001", status: "approved", hours: 8 },
      { id: "WR002", status: "pending", hours: 7 },
      { id: "WR003", status: "approved", hours: 9 }
    ];
    const result = manageAggregationTarget(workData);
    expect(result.includedRecords).toHaveLength(2);
    expect(result.totalHours).toBe(17);
  });

  // SCEN-438
  test("集計対象データ管理機能 - 確定状態データの集計処理が正しく実行される", () => {
    const data = [
      { status: "confirmed", value: 100 },
      { status: "confirmed", value: 150 }
    ];
    const result = manageAggregationTarget(data);
    expect(result.aggregatedValue).toBe(250);
    expect(result.processedCount).toBe(2);
  });

  // SCEN-439
  test("集計対象データ管理機能 - 未承認データが集計から除外される", () => {
    const data = [
      { status: "approved", value: 100 },
      { status: "draft", value: 200 }
    ];
    const result = manageAggregationTarget(data);
    expect(result.excludedCount).toBe(1);
    expect(result.excludedReason).toContain("未承認");
  });

  // SCEN-440
  test("緊急対応工数予測機能 - 設備故障時の必要工数が過去実績から正しく予測される", () => {
    const failureType = "冷却システム故障";
    const historicalData = [
      { type: "冷却システム故障", hours: 6.5 },
      { type: "冷却システム故障", hours: 7.2 },
      { type: "冷却システム故障", hours: 5.8 }
    ];
    const result = predictEmergencyWorkHours(failureType, historicalData);
    expect(result.predictedHours).toBeCloseTo(6.5);
    expect(result.confidenceLevel).toBeGreaterThan(80);
  });

  // SCEN-441
  test("緊急対応工数予測機能 - 類似故障パターンからの工数算出が適切に行われる", () => {
    const currentFailure = { type: "電気系統", severity: "中" };
    const similarPatterns = [
      { type: "電気系統", severity: "中", hours: 4.5 },
      { type: "電気系統", severity: "高", hours: 8.0 }
    ];
    const result = predictEmergencyWorkHours(currentFailure, similarPatterns);
    expect(result.estimatedHours).toBe(4.5);
    expect(result.similarityScore).toBeGreaterThan(90);
  });

  // SCEN-442
  test("緊急対応工数予測機能 - 過去実績不足時のフォールバック予測が実行される", () => {
    const result = predictEmergencyWorkHours("新規故障タイプ", []);
    expect(result.predictedHours).toBe(8);
    expect(result.method).toBe("fallback_standard");
    expect(result.warning).toContain("過去実績不足");
  });

  // SCEN-443
  test("技術者配置算出機能 - 最適な技術者配置が制約条件を考慮して算出される", () => {
    const requirements = { skillLevel: "A", workHours: 16 };
    const technicians = [
      { id: "T001", skill: "A", available: 8, location: "Tokyo" },
      { id: "T002", skill: "A", available: 8, location: "Tokyo" },
      { id: "T003", skill: "B", available: 8, location: "Osaka" }
    ];
    const constraints = { maxDistance: 50, preferredLocation: "Tokyo" };
    const result = calculateTechnicianAllocation(requirements, technicians, constraints);
    expect(result.selectedTechnicians).toHaveLength(2);
    expect(result.totalCapacity).toBe(16);
  });

  // SCEN-444
  test("技術者配置算出機能 - スキルレベルマッチングが正しく考慮される", () => {
    const task = { requiredSkill: "専門A", complexity: "高" };
    const technicians = [
      { id: "T001", skills: ["専門A", "専門B"], level: "上級" },
      { id: "T002", skills: ["基本"], level: "初級" }
    ];
    const result = calculateTechnicianAllocation(task, technicians);
    expect(result.bestMatch.id).toBe("T001");
    expect(result.matchScore).toBeGreaterThan(90);
  });

  // SCEN-445
  test("技術者配置算出機能 - 配置不可能時の代替案提示が適切に行われる", () => {
    const requirements = { skillLevel: "S", urgency: "高" };
    const technicians = [
      { id: "T001", skillLevel: "A", available: false }
    ];
    const result = calculateTechnicianAllocation(requirements, technicians);
    expect(result.feasible).toBe(false);
    expect(result.alternatives).toBeDefined();
    expect(result.alternatives[0].suggestion).toContain("外部委託");
  });

  // SCEN-371
  test("工数記録開始機能 - 現在時刻を作業開始時刻として自動記録される", async () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, recordId: "WR001" }), { status: 200 });
    
    const employeeId = "EMP001";
    const result = await startWorkRecord(employeeId);
    expect(result.success).toBe(true);
    expect(result.startTime).toBeDefined();
    expect(result.status).toBe("active");
  });

  // SCEN-372
  test("工数記録開始機能 - 作業開始記録が既にアクティブ状態での重複開始エラー", () => {
    const activeRecord = { status: "active", employeeId: "EMP001" };
    expect(() => startWorkRecord("EMP001", activeRecord)).toThrow("既存の記録がアクティブです");
  });

  // SCEN-373
  test("工数記録終了機能 - 作業時間が自動計算されてクラウドに保存される", async () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true }), { status: 200 });
    
    const workRecord = { startTime: "09:00", status: "active" };
    const result = await endWorkRecord(workRecord, "17:00");
    expect(result.workHours).toBe(8);
    expect(result.saved).toBe(true);
  });

  // SCEN-374
  test("必須項目バリデーション機能 - 未入力項目でのバリデーションエラー", () => {
    const data = { employeeId: "", taskType: "点検", startTime: "09:00" };
    const result = validateRequiredFields(data);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain("employeeId");
  });

  // SCEN-375
  test("異常値検出機能 - 24時間超過工数での異常値アラート", () => {
    const workData = { workHours: 25, employeeId: "EMP001" };
    const result = detectAnomalousValues(workData);
    expect(result.isAnomalous).toBe(true);
    expect(result.reason).toBe("24時間超過");
    expect(result.alertRequired).toBe(true);
  });

  // SCEN-376
  test("作業中断記録機能 - 中断理由と中断時刻が記録される", () => {
    const interruptionData = { reason: "設備点検", employeeId: "EMP001" };
    const result = recordInterruption(interruptionData);
    expect(result.interruptionTime).toBeDefined();
    expect(result.reason).toBe("設備点検");
    expect(result.recorded).toBe(true);
  });

  // SCEN-377
  test("オフライン同期機能 - ネットワーク切断時のローカル保存と自動同期", async () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce("", { status: 0 }); // Network error
    fetchMock.mockResponseOnce(JSON.stringify({ success: true }), { status: 200 });
    
    const workData = { employeeId: "EMP001", workHours: 8 };
    const result = await syncOfflineData(workData);
    expect(result.localSaved).toBe(true);
    expect(result.syncOnReconnect).toBe(true);
  });

  // SCEN-410
  test("GPS位置情報記録機能 - GPS位置情報とタイムスタンプが自動取得される", () => {
    const gpsEnabled = true;
    const mockLocation = { latitude: 35.6762, longitude: 139.6503 };
    const result = captureGPSLocation(gpsEnabled, true, mockLocation);
    expect(result.location.latitude).toBe(35.6762);
    expect(result.location.longitude).toBe(139.6503);
    expect(result.timestamp).toBeDefined();
  });

  // SCEN-407
  test("リアルタイムデータ同期機能 - 複数作業員の同時工数入力での整合性保持", async () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true }), { status: 200 });
    
    const multipleRecords = [
      { employeeId: "EMP001", workHours: 8 },
      { employeeId: "EMP002", workHours: 7.5 }
    ];
    const result = await synchronizeData(multipleRecords);
    expect(result.success).toBe(true);
    expect(result.conflicts).toEqual([]);
  });
});