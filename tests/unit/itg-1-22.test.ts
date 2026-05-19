import { 
  startWorkRecord, 
  endWorkRecord, 
  recordInterruption, 
  validateRequiredFields, 
  detectAnomalousValues, 
  calculateWorkTime, 
  saveWorkData, 
  syncLocalData, 
  getGPSLocation, 
  updateWorkStatus, 
  calculateActualWorkHours, 
  minimizeTapOperations, 
  showConfirmationDialog 
} from "../../src/logic/feature";

const fetchMock = require("jest-fetch-mock");

describe("現場作業員向け工数記録アプリの開発", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  test("SCEN-344: 工数記録開始機能 - 工数記録開始ボタンタップ時に現在時刻が作業開始時刻として正常に記録される", () => {
    const currentTime = new Date("2024-01-15T09:00:00");
    const result = startWorkRecord("USER001", "WORK001", currentTime);
    expect(result.startTime).toBe("2024-01-15T09:00:00");
    expect(result.status).toBe("active");
    expect(result.workerId).toBe("USER001");
    expect(result.workTypeId).toBe("WORK001");
  });

  test("SCEN-345: 工数記録開始機能 - 作業開始記録がアクティブ状態での重複開始操作時にエラーメッセージが返される", () => {
    const currentTime = new Date("2024-01-15T09:00:00");
    startWorkRecord("USER001", "WORK001", currentTime);
    const result = startWorkRecord("USER001", "WORK002", currentTime);
    expect(result.error).toBe("作業記録が既にアクティブです");
    expect(result.success).toBe(false);
  });

  test("SCEN-346: 工数記録開始機能 - 必須項目未入力状態での開始操作時に適切なバリデーションエラーが発生する", () => {
    const currentTime = new Date("2024-01-15T09:00:00");
    const result = startWorkRecord("", "WORK001", currentTime);
    expect(result.error).toBe("作業員IDは必須です");
    expect(result.success).toBe(false);
  });

  test("SCEN-347: 工数記録終了機能 - 作業完了ボタンタップ時に終了時刻が記録され作業時間が正しく計算される", () => {
    const startTime = new Date("2024-01-15T09:00:00");
    const endTime = new Date("2024-01-15T17:00:00");
    startWorkRecord("USER001", "WORK001", startTime);
    const result = endWorkRecord("USER001", endTime);
    expect(result.endTime).toBe("2024-01-15T17:00:00");
    expect(result.workHours).toBe(8);
    expect(result.status).toBe("completed");
  });

  test("SCEN-348: 工数記録終了機能 - アクティブでない状態での完了操作時にエラーが発生する", () => {
    const endTime = new Date("2024-01-15T17:00:00");
    const result = endWorkRecord("USER001", endTime);
    expect(result.error).toBe("アクティブな作業記録が見つかりません");
    expect(result.success).toBe(false);
  });

  test("SCEN-349: 工数記録終了機能 - ネットワーク不安定時にローカル保存が実行される", async () => {
    fetchMock.mockResponseOnce("", { status: 500 });
    const workData = { workerId: "USER001", workHours: 8, endTime: "2024-01-15T17:00:00" };
    const result = await saveWorkData(workData);
    expect(result.savedLocally).toBe(true);
    expect(result.syncPending).toBe(true);
  });

  test("SCEN-350: ワンタップ操作機能 - ワンタップ操作で作業開始時刻が正常に記録される", () => {
    const currentTime = new Date("2024-01-15T09:00:00");
    const result = minimizeTapOperations("USER001", "start", currentTime);
    expect(result.startTime).toBe("2024-01-15T09:00:00");
    expect(result.tapCount).toBe(1);
    expect(result.status).toBe("active");
  });

  test("SCEN-351: ワンタップ操作機能 - 連続タップ操作時の重複処理が適切に制御される", () => {
    const currentTime = new Date("2024-01-15T09:00:00");
    minimizeTapOperations("USER001", "start", currentTime);
    const result = minimizeTapOperations("USER001", "start", currentTime);
    expect(result.duplicateDetected).toBe(true);
    expect(result.error).toBe("重複操作を検出しました");
  });

  test("SCEN-352: ワンタップ操作機能 - GPS位置情報と時刻が自動取得される", () => {
    const currentTime = new Date("2024-01-15T09:00:00");
    const result = getGPSLocation(currentTime);
    expect(result.latitude).toBeDefined();
    expect(result.longitude).toBeDefined();
    expect(result.timestamp).toBe("2024-01-15T09:00:00");
    expect(result.accuracy).toBeGreaterThan(0);
  });

  test("SCEN-353: 作業完了時刻記録機能 - 作業完了時刻が自動記録され次作業準備状態に遷移する", () => {
    const startTime = new Date("2024-01-15T09:00:00");
    const endTime = new Date("2024-01-15T17:00:00");
    startWorkRecord("USER001", "WORK001", startTime);
    const result = updateWorkStatus("USER001", "completed", endTime);
    expect(result.endTime).toBe("2024-01-15T17:00:00");
    expect(result.status).toBe("ready_for_next");
    expect(result.currentWorkCompleted).toBe(true);
  });

  test("SCEN-354: 作業完了時刻記録機能 - 同一作業員の並行作業時に前作業終了確認が求められる", () => {
    const currentTime = new Date("2024-01-15T09:00:00");
    startWorkRecord("USER001", "WORK001", currentTime);
    const result = startWorkRecord("USER001", "WORK002", currentTime);
    expect(result.requiresPreviousWorkConfirmation).toBe(true);
    expect(result.message).toBe("前の作業を終了してください");
  });

  test("SCEN-355: 作業完了時刻記録機能 - 完了時刻が開始時刻より前の場合に異常値として検出される", () => {
    const startTime = new Date("2024-01-15T09:00:00");
    const endTime = new Date("2024-01-15T08:00:00");
    const result = detectAnomalousValues(startTime, endTime);
    expect(result.isAnomalous).toBe(true);
    expect(result.reason).toBe("終了時刻が開始時刻より前です");
  });

  test("SCEN-356: 中断記録機能 - 作業中断時に中断理由と時刻が正常に記録される", () => {
    const interruptTime = new Date("2024-01-15T10:30:00");
    const result = recordInterruption("USER001", "設備故障", interruptTime);
    expect(result.reason).toBe("設備故障");
    expect(result.interruptTime).toBe("2024-01-15T10:30:00");
    expect(result.status).toBe("interrupted");
  });

  test("SCEN-357: 中断記録機能 - 中断理由未選択時にバリデーションエラーが発生する", () => {
    const interruptTime = new Date("2024-01-15T10:30:00");
    const result = recordInterruption("USER001", "", interruptTime);
    expect(result.error).toBe("中断理由は必須項目です");
    expect(result.success).toBe(false);
  });

  test("SCEN-358: 中断記録機能 - 中断時間が8時間を超過時にアラートが表示される", () => {
    const startTime = new Date("2024-01-15T09:00:00");
    const endTime = new Date("2024-01-15T18:00:00");
    const interruptDuration = calculateWorkTime(startTime, endTime);
    const result = detectAnomalousValues(startTime, endTime, interruptDuration);
    expect(result.exceedsThreshold).toBe(true);
    expect(result.alertMessage).toBe("中断時間が8時間を超過しています");
  });

  test("SCEN-359: 必須項目バリデーション機能 - 作業員ID、作業種別、施設IDの必須項目が正常に検証される", () => {
    const data = { workerId: "USER001", workType: "MAINTENANCE", facilityId: "FAC001" };
    const result = validateRequiredFields(data);
    expect(result.isValid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
  });

  test("SCEN-360: 必須項目バリデーション機能 - 必須項目未入力時に該当項目がハイライト表示される", () => {
    const data = { workerId: "", workType: "MAINTENANCE", facilityId: "" };
    const result = validateRequiredFields(data);
    expect(result.isValid).toBe(false);
    expect(result.highlightedFields).toContain("workerId");
    expect(result.highlightedFields).toContain("facilityId");
  });

  test("SCEN-361: 必須項目バリデーション機能 - リアルタイムバリデーションで正常入力時にチェックマークが表示される", () => {
    const data = { workerId: "USER001", workType: "MAINTENANCE", facilityId: "FAC001" };
    const result = validateRequiredFields(data, { realtime: true });
    expect(result.isValid).toBe(true);
    expect(result.showCheckMark).toBe(true);
    expect(result.validFields).toContain("workerId");
  });

  test("SCEN-362: 異常値検出機能 - 作業時間24時間超過時に異常値として検出される", () => {
    const startTime = new Date("2024-01-15T09:00:00");
    const endTime = new Date("2024-01-16T10:00:00");
    const workHours = calculateWorkTime(startTime, endTime);
    const result = detectAnomalousValues(startTime, endTime, workHours);
    expect(result.isAnomalous).toBe(true);
    expect(result.reason).toBe("作業時間が24時間を超過しています");
    expect(workHours).toBe(25);
  });

  test("SCEN-363: 異常値検出機能 - 作業時間30分未満時に短時間作業として確認される", () => {
    const startTime = new Date("2024-01-15T09:00:00");
    const endTime = new Date("2024-01-15T09:20:00");
    const workHours = calculateWorkTime(startTime, endTime);
    const result = detectAnomalousValues(startTime, endTime, workHours);
    expect(result.isShortWork).toBe(true);
    expect(result.requiresConfirmation).toBe(true);
    expect(workHours).toBe(0.33);
  });

  test("SCEN-364: 異常値検出機能 - 負の作業時間が入力時に異常値エラーが発生する", () => {
    const negativeHours = -2;
    const result = detectAnomalousValues(null, null, negativeHours);
    expect(result.isAnomalous).toBe(true);
    expect(result.error).toBe("作業時間は正の値である必要があります");
  });

  test("SCEN-371: データ保存機能 - 工数データがクラウドに統一フォーマットで正常保存される", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, id: "WORK123" }), { status: 200 });
    const workData = { workerId: "USER001", workHours: 8, workType: "MAINTENANCE" };
    const result = await saveWorkData(workData);
    expect(result.success).toBe(true);
    expect(result.savedToCloud).toBe(true);
    expect(result.id).toBe("WORK123");
  });

  test("SCEN-372: データ保存機能 - ネットワーク切断時にローカルストレージに一時保存される", async () => {
    fetchMock.mockResponseOnce("", { status: 0 });
    const workData = { workerId: "USER001", workHours: 8 };
    const result = await saveWorkData(workData);
    expect(result.savedLocally).toBe(true);
    expect(result.needsSync).toBe(true);
    expect(result.savedToCloud).toBe(false);
  });

  test("SCEN-373: データ保存機能 - 接続復旧時に自動同期処理が実行される", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ synced: true, count: 3 }), { status: 200 });
    const localData = [
      { workerId: "USER001", workHours: 8 },
      { workerId: "USER002", workHours: 7 },
      { workerId: "USER003", workHours: 6 }
    ];
    const result = await syncLocalData(localData);
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(3);
    expect(result.pendingCount).toBe(0);
  });

  test("SCEN-374: 中断時間計算機能 - 中断開始時刻と終了時刻の差分が正しく計算される", () => {
    const startTime = new Date("2024-01-15T10:00:00");
    const endTime = new Date("2024-01-15T12:30:00");
    const interruptDuration = calculateWorkTime(startTime, endTime);
    expect(interruptDuration).toBe(2.5);
  });

  test("SCEN-375: 中断時間計算機能 - 中断終了時刻が開始時刻より前の場合にエラーが発生する", () => {
    const startTime = new Date("2024-01-15T12:00:00");
    const endTime = new Date("2024-01-15T10:00:00");
    const result = calculateWorkTime(startTime, endTime);
    expect(result.error).toBe("終了時刻が開始時刻より前です");
    expect(result.isValid).toBe(false);
  });

  test("SCEN-376: 中断時間計算機能 - 日をまたぐ中断時間が正しく計算される", () => {
    const startTime = new Date("2024-01-15T22:00:00");
    const endTime = new Date("2024-01-16T02:00:00");
    const interruptDuration = calculateWorkTime(startTime, endTime);
    expect(interruptDuration).toBe(4);
  });

  test("SCEN-377: 中断理由分析機能 - 中断理由別の発生頻度と平均時間が正しく集計される", () => {
    const interruptions = [
      { reason: "設備故障", duration: 2 },
      { reason: "設備故障", duration: 3 },
      { reason: "材料待ち", duration: 1.5 }
    ];
    const result = recordInterruption(null, null, null, { analyze: interruptions });
    expect(result.analysis["設備故障"].frequency).toBe(2);
    expect(result.analysis["設備故障"].averageDuration).toBe(2.5);
    expect(result.analysis["材料待ち"].frequency).toBe(1);
  });

  test("SCEN-386: 入力状態チェック機能 - 作業開始時の必須項目入力状態が正しくチェックされる", () => {
    const inputData = { workerId: "USER001", workType: "MAINTENANCE", facilityId: "FAC001" };
    const result = validateRequiredFields(inputData);
    expect(result.allFieldsComplete).toBe(true);
    expect(result.canProceed).toBe(true);
  });

  test("SCEN-387: 入力状態チェック機能 - 未入力項目の赤色ハイライト表示が正常に動作する", () => {
    const inputData = { workerId: "", workType: "MAINTENANCE", facilityId: "" };
    const result = validateRequiredFields(inputData);
    expect(result.highlightedFields).toEqual(["workerId", "facilityId"]);
    expect(result.highlightColor).toBe("red");
  });

  test("SCEN-388: 入力状態チェック機能 - 全項目入力完了時の状態変更が適切に処理される", () => {
    const inputData = { workerId: "USER001", workType: "MAINTENANCE", facilityId: "FAC001" };
    const result = validateRequiredFields(inputData);
    expect(result.allFieldsComplete).toBe(true);
    expect(result.statusChanged).toBe(true);
    expect(result.canSubmit).toBe(true);
  });

  test("SCEN-389: 作業時間整合性確認機能 - 作業時間8時間超過時に警告ダイアログが表示される", () => {
    const workHours = 9;
    const result = showConfirmationDialog(workHours);
    expect(result.showWarning).toBe(true);
    expect(result.message).toBe("作業時間が8時間を超過しています。確認してください。");
    expect(result.requiresConfirmation).toBe(true);
  });

  test("SCEN-390: 作業時間整合性確認機能 - 短時間作業での詳細入力プロンプトが表示される", () => {
    const workHours = 0.4;
    const result = showConfirmationDialog(workHours);
    expect(result.showDetailPrompt).toBe(true);
    expect(result.message).toBe("短時間作業です。作業内容の詳細を入力してください。");
  });

  test("SCEN-391: 作業時間整合性確認機能 - 正常範囲の作業時間で警告が発生しない", () => {
    const workHours = 7;
    const result = showConfirmationDialog(workHours);
    expect(result.showWarning).toBe(false);
    expect(result.isNormalRange).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
  });

  test("SCEN-392: データ妥当性検証機能 - 作業開始時刻が終了時刻より後の場合に異常値検出される", () => {
    const startTime = new Date("2024-01-15T17:00:00");
    const endTime = new Date("2024-01-15T09:00:00");
    const result = detectAnomalousValues(startTime, endTime);
    expect(result.isAnomalous).toBe(true);
    expect(result.validationError).toBe("開始時刻が終了時刻より後です");
  });

  test("SCEN-393: データ妥当性検証機能 - 24時間超過作業時間で現場管理者に通知される", () => {
    const workHours = 26;
    const result = detectAnomalousValues(null, null, workHours);
    expect(result.notifyManager).toBe(true);
    expect(result.notificationLevel).toBe("critical");
    expect(result.message).toBe("24時間超過の異常な作業時間が検出されました");
  });

  test("SCEN-394: データ妥当性検証機能 - 正常な時刻範囲で妥当性検証をパスする", () => {
    const startTime = new Date("2024-01-15T09:00:00");
    const endTime = new Date("2024-01-15T17:00:00");
    const result = detectAnomalousValues(startTime, endTime);
    expect(result.isValid).toBe(true);
    expect(result.isAnomalous).toBe(false);
    expect(result.passedValidation).toBe(true);
  });

  test("SCEN-407: 自動同期機能 - 接続復旧時にローカルデータが正しく同期される", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, processed: 5 }), { status: 200 });
    const localData = Array(5).fill({ workerId: "USER001", workHours: 8 });
    const result = await syncLocalData(localData);
    expect(result.syncCompleted).toBe(true);
    expect(result.processedCount).toBe(5);
    expect(result.failedCount).toBe(0);
  });

  test("SCEN-410: GPS位置情報取得機能 - ワンタップ操作時にGPS位置情報が自動取得される", () => {
    const timestamp = new Date("2024-01-15T09:00:00");
    const result = getGPSLocation(timestamp);
    expect(result.latitude).toBeCloseTo(35.6762, 4);
    expect(result.longitude).toBeCloseTo(139.6503, 4);
    expect(result.autoAcquired).toBe(true);
  });

  test("SCEN-419: 作業ステータス管理機能 - 作業完了時にステータスが完了状態に更新される", () => {
    const completionTime = new Date("2024-01-15T17:00:00");
    const result = updateWorkStatus("USER001", "completed", completionTime);
    expect(result.status).toBe("completed");
    expect(result.completedAt).toBe("2024-01-15T17:00:00");
    expect(result.statusUpdated).toBe(true);
  });

  test("SCEN-420: 作業ステータス管理機能 - 次作業準備状態への遷移が正常に実行される", () => {
    updateWorkStatus("USER001", "completed", new Date());
    const result = updateWorkStatus("USER001", "ready_for_next", new Date());
    expect(result.status).toBe("ready_for_next");
    expect(result.transitionSuccessful).toBe(true);
  });

  test("SCEN-422: 実工数計算機能 - 開始時刻と終了時刻から実工数が正しく計算される", () => {
    const startTime = new Date("2024-01-15T09:00:00");
    const endTime = new Date("2024-01-15T17:30:00");
    const actualHours = calculateActualWorkHours(startTime, endTime);
    expect(actualHours).toBe(8.5);
  });

  test("SCEN-428: 入力負荷最小化機能 - 最小限タップ数での工数記録完了が実現される", () => {
    const currentTime = new Date("2024-01-15T09:00:00");
    const result = minimizeTapOperations("USER001", "complete_workflow", currentTime);
    expect(result.totalTaps).toBeLessThanOrEqual(3);
    expect(result.workflowCompleted).toBe(true);
    expect(result.minimizedInput).toBe(true);
  });

  test("SCEN-434: 確認ダイアログ機能 - 異常値検出時の確認ダイアログが正しく表示される", () => {
    const anomalousValue = 25;
    const result = showConfirmationDialog(anomalousValue);
    expect(result.showDialog).toBe(true);
    expect(result.dialogType).toBe("anomaly_detected");
    expect(result.message).toContain("異常値が検出されました");
    expect(result.requiresUserAction).toBe(true);
  });
});