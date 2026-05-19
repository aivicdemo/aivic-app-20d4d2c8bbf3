import { recordWorkCompletionTime, validateWorkCompletionTime, calculateActualWorkHours, updateWorkStatus, transitionToNextWorkPreparation, checkConcurrentWork } from "../../src/logic/it-1-br-2-2-1";

describe("作業完了時刻を自動記録し次作業への移行を支援する機能", () => {
  const fetchMock = require("jest-fetch-mock");

  test("作業完了時刻が自動記録され次作業準備状態に遷移する", () => {
    // SCEN-353
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, workId: "W001", status: "completed" }), { status: 200 });
    
    const result = recordWorkCompletionTime("W001", "2024-01-15T17:30:00", "USR001");
    const statusResult = updateWorkStatus("W001", "completed");
    const transitionResult = transitionToNextWorkPreparation("W001", "USR001");
    
    expect(result.completionTime).toBe("2024-01-15T17:30:00");
    expect(result.workId).toBe("W001");
    expect(statusResult.status).toBe("completed");
    expect(transitionResult.nextWorkPreparationStatus).toBe("ready");
  });

  test("同一作業員の並行作業時に前作業終了確認が求められる", () => {
    // SCEN-354
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ concurrentWork: true, activeWorkId: "W001" }), { status: 200 });
    
    const result = checkConcurrentWork("USR001", "W002");
    
    expect(result.hasConcurrentWork).toBe(true);
    expect(result.activeWorkId).toBe("W001");
    expect(result.requiresConfirmation).toBe(true);
    expect(result.message).toContain("前の作業の終了確認");
  });

  test("完了時刻が開始時刻より前の場合に異常値として検出される", () => {
    // SCEN-355
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ error: "異常値検出", code: "INVALID_TIME" }), { status: 400 });
    
    const result = validateWorkCompletionTime("2024-01-15T08:00:00", "2024-01-15T07:30:00");
    
    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe("異常値");
    expect(result.errorMessage).toContain("完了時刻が開始時刻より前");
    expect(result.requiresManagerNotification).toBe(true);
  });

  test("作業完了時にステータスが完了状態に更新される", () => {
    // SCEN-419
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ workId: "W001", status: "completed", updatedAt: "2024-01-15T17:30:00" }), { status: 200 });
    
    const result = updateWorkStatus("W001", "completed");
    
    expect(result.workId).toBe("W001");
    expect(result.status).toBe("completed");
    expect(result.isFinalized).toBe(true);
    expect(result.updatedAt).toBe("2024-01-15T17:30:00");
  });

  test("次作業準備状態への遷移が正常に実行される", () => {
    // SCEN-420
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ userId: "USR001", currentWorkStatus: "completed", nextWorkStatus: "ready" }), { status: 200 });
    
    const result = transitionToNextWorkPreparation("W001", "USR001");
    
    expect(result.userId).toBe("USR001");
    expect(result.currentWorkStatus).toBe("completed");
    expect(result.nextWorkStatus).toBe("ready");
    expect(result.transitionCompleted).toBe(true);
  });

  test("開始時刻と終了時刻から実工数が正しく計算される", () => {
    // SCEN-422
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ workId: "W001", actualHours: 8.5 }), { status: 200 });
    
    const result = calculateActualWorkHours("2024-01-15T09:00:00", "2024-01-15T17:30:00");
    
    expect(result.actualHours).toBe(8.5);
    expect(result.startTime).toBe("2024-01-15T09:00:00");
    expect(result.endTime).toBe("2024-01-15T17:30:00");
    expect(result.calculationMethod).toBe("endTime - startTime");
  });
});