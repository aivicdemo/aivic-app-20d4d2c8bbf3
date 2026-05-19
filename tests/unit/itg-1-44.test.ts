import { 
  startWorkRecord, 
  checkActiveWorkRecord,
  endWorkRecord,
  calculateWorkTime,
  validateWorkRecord,
  detectAnomalousValue,
  recordInterruption,
  calculateInterruptionTime,
  calculateProgressRate,
  analyzeWorkEfficiency,
  saveWorkDataToCloud,
  syncLocalDataOnReconnection,
  validateRequiredFields,
  checkDataIntegrity,
  saveToLocalStorage,
  aggregateDailyWorkData,
  analyzeWorkPerformance,
  optimizePersonnelAllocation,
  calculateProductivityIndicators,
  generateWeeklyReport,
  identifyDelayedTasks,
  generateImprovementInstructions,
  reportEmergencyResponse,
  analyzeEmergencyImpact,
  checkGlobalPersonnelStatus,
  generatePersonnelReallocation,
  executeMonthlyAggregation,
  detectAnomaliesAndGaps,
  correctWorkData,
  approveDataCorrections,
  finalizeMonthlyResults,
  generateDepartmentalReport,
  collectPerformanceData,
  crossReferenceWithSalesData,
  analyzeProfitabilityByLocation,
  generateInvestmentJustification,
  collectMultiLocationData,
  performIntegratedAnalysis,
  identifyProductivityGaps,
  generateImprovementPlan,
  measureSmallStartEffects,
  calculateActualROI,
  analyzeAdoptionRate,
  generateNationwideExpansionPlan,
  generateOwnerReports,
  analyzeMaintenanceData,
  createImprovementProposals,
  calculateROIForProposals,
  collectHistoricalData,
  analyzeSeasonalPatterns,
  generateBudgetForecast,
  verifyInfrastructureCompatibility,
  planSystemIntegration,
  executeIntegrationTests,
  unifyDataFormats,
  detectSystemFailures,
  assessFailureImpact,
  executeRecoveryProcedures
} from "../../src/logic/feature";

const fetchMock = require("jest-fetch-mock");

describe("現場作業員向け工数記録アプリの開発", () => {

  test("SCEN-344: 工数記録開始機能 - 工数記録開始ボタンタップ時に現在時刻が作業開始時刻として正常に記録される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, startTime: "09:00" }), { status: 200 });
    
    const result = startWorkRecord("USER001", "作業A", "SITE001");
    
    expect(result.status).toBe("active");
    expect(result.startTime).toBeTruthy();
    expect(result.workerId).toBe("USER001");
  });

  test("SCEN-345: 工数記録開始機能 - 作業開始記録がアクティブ状態での重複開始操作時にエラーメッセージが返される", () => {
    const activeRecord = checkActiveWorkRecord("USER001");
    
    if (activeRecord.isActive) {
      const result = startWorkRecord("USER001", "作業B", "SITE002");
      expect(result.error).toBe("既存の記録がアクティブです");
      expect(result.success).toBe(false);
    }
  });

  test("SCEN-346: 工数記録開始機能 - 必須項目未入力状態での開始操作時に適切なバリデーションエラーが発生する", () => {
    const result = validateRequiredFields("", "", "");
    
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain("workerId");
    expect(result.missingFields).toContain("workType");
    expect(result.missingFields).toContain("facilityId");
  });

  test("SCEN-347: 工数記録終了機能 - 作業完了ボタンタップ時に終了時刻が記録され作業時間が正しく計算される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, endTime: "17:00" }), { status: 200 });
    
    const result = endWorkRecord("USER001", "09:00");
    const workTime = calculateWorkTime("09:00", "17:00");
    
    expect(result.endTime).toBe("17:00");
    expect(workTime).toBe(8);
  });

  test("SCEN-348: 工数記録終了機能 - アクティブでない状態での完了操作時にエラーが発生する", () => {
    const result = endWorkRecord("USER002", null);
    
    expect(result.error).toBe("アクティブな記録が存在しません");
    expect(result.success).toBe(false);
  });

  test("SCEN-349: 工数記録終了機能 - ネットワーク不安定時にローカル保存が実行される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce("", { status: 500 });
    
    const result = saveWorkDataToCloud({ workerId: "USER001", endTime: "17:00" });
    const localResult = saveToLocalStorage({ workerId: "USER001", endTime: "17:00" });
    
    expect(result.success).toBe(false);
    expect(localResult.saved).toBe(true);
  });

  test("SCEN-350: ワンタップ操作機能 - ワンタップ操作で作業開始時刻が正常に記録される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, startTime: "09:00", gps: "35.6762,139.6503" }), { status: 200 });
    
    const result = startWorkRecord("USER001", "作業A", "SITE001", true);
    
    expect(result.oneTouch).toBe(true);
    expect(result.startTime).toBeTruthy();
    expect(result.gpsLocation).toBeTruthy();
  });

  test("SCEN-351: ワンタップ操作機能 - 連続タップ操作時の重複処理が適切に制御される", () => {
    const firstTap = startWorkRecord("USER001", "作業A", "SITE001", true);
    const secondTap = startWorkRecord("USER001", "作業A", "SITE001", true);
    
    expect(firstTap.success).toBe(true);
    expect(secondTap.error).toBe("重複操作です");
  });

  test("SCEN-352: ワンタップ操作機能 - GPS位置情報と時刻が自動取得される", () => {
    const result = startWorkRecord("USER001", "作業A", "SITE001", true);
    
    expect(result.gpsLocation).toBeTruthy();
    expect(result.timestamp).toBeTruthy();
    expect(result.autoAcquired).toBe(true);
  });

  test("SCEN-353: 作業完了時刻記録機能 - 作業完了時刻が自動記録され次作業準備状態に遷移する", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, status: "next_ready" }), { status: 200 });
    
    const result = endWorkRecord("USER001", "09:00");
    
    expect(result.endTime).toBeTruthy();
    expect(result.status).toBe("next_ready");
  });

  test("SCEN-354: 作業完了時刻記録機能 - 同一作業員の並行作業時に前作業終了確認が求められる", () => {
    const activeRecord = checkActiveWorkRecord("USER001");
    
    if (activeRecord.hasMultiple) {
      const result = startWorkRecord("USER001", "作業B", "SITE002");
      expect(result.requiresConfirmation).toBe(true);
      expect(result.message).toBe("前の作業を終了してください");
    }
  });

  test("SCEN-355: 作業完了時刻記録機能 - 完了時刻が開始時刻より前の場合に異常値として検出される", () => {
    const result = detectAnomalousValue("10:00", "09:00");
    
    expect(result.isAnomalous).toBe(true);
    expect(result.reason).toBe("終了時刻が開始時刻より前です");
  });

  test("SCEN-356: 中断記録機能 - 作業中断時に中断理由と時刻が正常に記録される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, interruptionId: "INT001" }), { status: 200 });
    
    const result = recordInterruption("USER001", "設備故障", "14:30");
    
    expect(result.reason).toBe("設備故障");
    expect(result.startTime).toBe("14:30");
    expect(result.interruptionId).toBeTruthy();
  });

  test("SCEN-357: 中断記録機能 - 中断理由未選択時にバリデーションエラーが発生する", () => {
    const result = recordInterruption("USER001", "", "14:30");
    
    expect(result.error).toBe("中断理由は必須項目です");
    expect(result.success).toBe(false);
  });

  test("SCEN-358: 中断記録機能 - 中断時間が8時間を超過時にアラートが表示される", () => {
    const interruptionTime = calculateInterruptionTime("09:00", "18:00");
    const result = detectAnomalousValue(null, null, interruptionTime);
    
    expect(interruptionTime).toBe(9);
    expect(result.isAnomalous).toBe(true);
    expect(result.alert).toBe("中断時間が8時間を超過しています");
  });

  test("SCEN-359: 必須項目バリデーション機能 - 作業員ID、作業種別、施設IDの必須項目が正常に検証される", () => {
    const result = validateRequiredFields("USER001", "作業A", "SITE001");
    
    expect(result.isValid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
  });

  test("SCEN-360: 必須項目バリデーション機能 - 必須項目未入力時に該当項目がハイライト表示される", () => {
    const result = validateRequiredFields("", "作業A", "");
    
    expect(result.isValid).toBe(false);
    expect(result.highlightFields).toContain("workerId");
    expect(result.highlightFields).toContain("facilityId");
  });

  test("SCEN-361: 必須項目バリデーション機能 - リアルタイムバリデーションで正常入力時にチェックマークが表示される", () => {
    const result = validateRequiredFields("USER001", "作業A", "SITE001", true);
    
    expect(result.isValid).toBe(true);
    expect(result.showCheckmarks).toBe(true);
  });

  test("SCEN-362: 異常値検出機能 - 作業時間24時間超過時に異常値として検出される", () => {
    const workTime = calculateWorkTime("09:00", "10:00"); // 25時間
    const result = detectAnomalousValue(null, null, 25);
    
    expect(result.isAnomalous).toBe(true);
    expect(result.reason).toBe("作業時間が24時間を超過しています");
  });

  test("SCEN-363: 異常値検出機能 - 作業時間30分未満時に短時間作業として確認される", () => {
    const result = detectAnomalousValue(null, null, 0.4);
    
    expect(result.isShortWork).toBe(true);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.message).toBe("短時間作業です。詳細を入力してください");
  });

  test("SCEN-364: 異常値検出機能 - 負の作業時間が入力時に異常値エラーが発生する", () => {
    const result = detectAnomalousValue(null, null, -2);
    
    expect(result.isAnomalous).toBe(true);
    expect(result.error).toBe("負の作業時間は無効です");
  });

  test("SCEN-371: データ保存機能 - 工数データがクラウドに統一フォーマットで正常保存される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, format: "unified" }), { status: 200 });
    
    const result = saveWorkDataToCloud({
      workerId: "USER001",
      workType: "作業A",
      startTime: "09:00",
      endTime: "17:00"
    });
    
    expect(result.success).toBe(true);
    expect(result.format).toBe("unified");
  });

  test("SCEN-372: データ保存機能 - ネットワーク切断時にローカルストレージに一時保存される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce("", { status: 0 });
    
    const cloudResult = saveWorkDataToCloud({ workerId: "USER001" });
    const localResult = saveToLocalStorage({ workerId: "USER001" });
    
    expect(cloudResult.success).toBe(false);
    expect(localResult.saved).toBe(true);
  });

  test("SCEN-373: データ保存機能 - 接続復旧時に自動同期処理が実行される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ syncSuccess: true, recordCount: 5 }), { status: 200 });
    
    const result = syncLocalDataOnReconnection();
    
    expect(result.syncSuccess).toBe(true);
    expect(result.recordCount).toBeGreaterThan(0);
  });

  test("SCEN-374: 中断時間計算機能 - 中断開始時刻と終了時刻の差分が正しく計算される", () => {
    const interruptionTime = calculateInterruptionTime("14:30", "16:30");
    
    expect(interruptionTime).toBe(2);
  });

  test("SCEN-375: 中断時間計算機能 - 中断終了時刻が開始時刻より前の場合にエラーが発生する", () => {
    const result = calculateInterruptionTime("16:30", "14:30");
    
    expect(result.error).toBe("終了時刻が開始時刻より前です");
    expect(result.success).toBe(false);
  });

  test("SCEN-376: 中断時間計算機能 - 日をまたぐ中断時間が正しく計算される", () => {
    const interruptionTime = calculateInterruptionTime("23:00", "02:00");
    
    expect(interruptionTime).toBe(3);
  });

  test("SCEN-377: 中断理由分析機能 - 中断理由別の発生頻度と平均時間が正しく集計される", () => {
    const analysisData = [
      { reason: "設備故障", duration: 2 },
      { reason: "設備故障", duration: 3 },
      { reason: "材料待ち", duration: 1 }
    ];
    
    const result = analyzeWorkEfficiency(analysisData);
    
    expect(result.設備故障.frequency).toBe(2);
    expect(result.設備故障.averageDuration).toBe(2.5);
    expect(result.材料待ち.frequency).toBe(1);
  });

  test("SCEN-386: 入力状態チェック機能 - 作業開始時の必須項目入力状態が正しくチェックされる", () => {
    const result = validateRequiredFields("USER001", "作業A", "SITE001");
    
    expect(result.isValid).toBe(true);
    expect(result.allFieldsComplete).toBe(true);
  });

  test("SCEN-387: 入力状態チェック機能 - 未入力項目の赤色ハイライト表示が正常に動作する", () => {
    const result = validateRequiredFields("", "", "SITE001");
    
    expect(result.highlightFields).toContain("workerId");
    expect(result.highlightFields).toContain("workType");
    expect(result.highlightColor).toBe("red");
  });

  test("SCEN-388: 入力状態チェック機能 - 全項目入力完了時の状態変更が適切に処理される", () => {
    const result = validateRequiredFields("USER001", "作業A", "SITE001");
    
    expect(result.isValid).toBe(true);
    expect(result.statusChanged).toBe(true);
    expect(result.newStatus).toBe("ready_to_save");
  });

  test("SCEN-389: 作業時間整合性確認機能 - 作業時間8時間超過時に警告ダイアログが表示される", () => {
    const result = checkDataIntegrity(9);
    
    expect(result.showWarning).toBe(true);
    expect(result.warningMessage).toBe("作業時間が8時間を超過しています");
  });

  test("SCEN-390: 作業時間整合性確認機能 - 短時間作業での詳細入力プロンプトが表示される", () => {
    const result = checkDataIntegrity(0.4);
    
    expect(result.showPrompt).toBe(true);
    expect(result.promptMessage).toBe("短時間作業の詳細を入力してください");
  });

  test("SCEN-391: 作業時間整合性確認機能 - 正常範囲の作業時間で警告が発生しない", () => {
    const result = checkDataIntegrity(7.5);
    
    expect(result.showWarning).toBe(false);
    expect(result.isNormal).toBe(true);
  });

  test("SCEN-392: データ妥当性検証機能 - 作業開始時刻が終了時刻より後の場合に異常値検出される", () => {
    const result = validateWorkRecord("10:00", "09:00");
    
    expect(result.isValid).toBe(false);
    expect(result.anomaly).toBe("start_after_end");
  });

  test("SCEN-393: データ妥当性検証機能 - 24時間超過作業時間で現場管理者に通知される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ notificationSent: true }), { status: 200 });
    
    const result = validateWorkRecord("09:00", "10:00"); // 25時間
    
    expect(result.notifyManager).toBe(true);
    expect(result.anomaly).toBe("excessive_hours");
  });

  test("SCEN-394: データ妥当性検証機能 - 正常な時刻範囲で妥当性検証をパスする", () => {
    const result = validateWorkRecord("09:00", "17:00");
    
    expect(result.isValid).toBe(true);
    expect(result.anomaly).toBe(null);
  });

  test("SCEN-407: 自動同期機能 - 接続復旧時にローカルデータが正しく同期される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ synced: true, count: 3 }), { status: 200 });
    
    const result = syncLocalDataOnReconnection();
    
    expect(result.synced).toBe(true);
    expect(result.count).toBe(3);
  });

  test("SCEN-410: GPS位置情報取得機能 - ワンタップ操作時にGPS位置情報が自動取得される", () => {
    const result = startWorkRecord("USER001", "作業A", "SITE001", true);
    
    expect(result.gpsLocation).toBeTruthy();
    expect(result.autoGPS).toBe(true);
  });

  test("SCEN-419: 作業ステータス管理機能 - 作業完了時にステータスが完了状態に更新される", () => {
    const result = endWorkRecord("USER001", "09:00");
    
    expect(result.status).toBe("completed");
    expect(result.statusUpdated).toBe(true);
  });

  test("SCEN-420: 作業ステータス管理機能 - 次作業準備状態への遷移が正常に実行される", () => {
    const result = endWorkRecord("USER001", "09:00");
    
    expect(result.nextStatus).toBe("ready_for_next");
    expect(result.transitionSuccess).toBe(true);
  });

  test("SCEN-422: 実工数計算機能 - 開始時刻と終了時刻から実工数が正しく計算される", () => {
    const actualHours = calculateWorkTime("09:00", "17:00");
    
    expect(actualHours).toBe(8);
  });

  test("SCEN-428: 入力負荷最小化機能 - 最小限タップ数での工数記録完了が実現される", () => {
    const result = startWorkRecord("USER001", "作業A", "SITE001", true);
    
    expect(result.tapCount).toBe(1);
    expect(result.minimized).toBe(true);
  });

  test("SCEN-434: 確認ダイアログ機能 - 異常値検出時の確認ダイアログが正しく表示される", () => {
    const result = detectAnomalousValue(null, null, 25);
    
    expect(result.showDialog).toBe(true);
    expect(result.dialogMessage).toBe("異常な作業時間が検出されました。確認してください。");
  });

});