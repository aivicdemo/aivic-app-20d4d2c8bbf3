const fetchMock = require("jest-fetch-mock");
import { 
  detectAbnormalWorkTime, 
  validateWorkTimeRange, 
  checkShortWorkTime,
  validateWorkTimeConsistency,
  notifyAbnormalValueToManager,
  showConfirmationDialog 
} from "../../src/logic/it-1-br-1778900711536-2-2-1";

describe("工数データの異常値検出機能", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  test("24時間超過作業時間で異常値として検出される", () => {
    // SCEN-362
    const startTime = "2024-01-01T09:00:00Z";
    const endTime = "2024-01-02T10:00:00Z";
    const result = detectAbnormalWorkTime(startTime, endTime);
    expect(result.isAbnormal).toBe(true);
    expect(result.reason).toBe("作業時間が24時間を超過");
    expect(result.workHours).toBe(25);
  });

  test("30分未満作業時間で短時間作業として確認される", () => {
    // SCEN-363
    const startTime = "2024-01-01T09:00:00Z";
    const endTime = "2024-01-01T09:25:00Z";
    const result = checkShortWorkTime(startTime, endTime);
    expect(result.isShortWork).toBe(true);
    expect(result.workMinutes).toBe(25);
    expect(result.requiresDetailInput).toBe(true);
  });

  test("負の作業時間入力時に異常値エラーが発生する", () => {
    // SCEN-364
    const startTime = "2024-01-01T10:00:00Z";
    const endTime = "2024-01-01T09:00:00Z";
    const result = validateWorkTimeRange(startTime, endTime);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("作業開始時刻が終了時刻より後です");
    expect(result.workHours).toBe(-1);
  });

  test("8時間超過作業時間で警告ダイアログが表示される", () => {
    // SCEN-389
    const startTime = "2024-01-01T09:00:00Z";
    const endTime = "2024-01-01T18:30:00Z";
    const result = validateWorkTimeConsistency(startTime, endTime);
    expect(result.showWarning).toBe(true);
    expect(result.workHours).toBe(9.5);
    expect(result.warningMessage).toBe("作業時間が8時間を超過しています。確認してください。");
  });

  test("短時間作業で詳細入力プロンプトが表示される", () => {
    // SCEN-390
    const startTime = "2024-01-01T09:00:00Z";
    const endTime = "2024-01-01T09:20:00Z";
    const result = checkShortWorkTime(startTime, endTime);
    expect(result.showDetailPrompt).toBe(true);
    expect(result.promptMessage).toBe("短時間作業として確認されました。作業内容の詳細を入力してください。");
    expect(result.workMinutes).toBe(20);
  });

  test("正常範囲作業時間で警告が発生しない", () => {
    // SCEN-391
    const startTime = "2024-01-01T09:00:00Z";
    const endTime = "2024-01-01T17:00:00Z";
    const result = validateWorkTimeConsistency(startTime, endTime);
    expect(result.showWarning).toBe(false);
    expect(result.workHours).toBe(8);
    expect(result.isNormal).toBe(true);
  });

  test("作業開始時刻が終了時刻より後で異常値検出される", () => {
    // SCEN-392
    fetchMock.mockResponseOnce(JSON.stringify({ notified: true }), { status: 200 });
    
    const startTime = "2024-01-01T18:00:00Z";
    const endTime = "2024-01-01T09:00:00Z";
    const result = detectAbnormalWorkTime(startTime, endTime);
    expect(result.isAbnormal).toBe(true);
    expect(result.anomalyType).toBe("時刻順序異常");
    expect(result.requiresManagerNotification).toBe(true);
  });

  test("24時間超過作業で現場管理者に通知される", async () => {
    // SCEN-393
    fetchMock.mockResponseOnce(JSON.stringify({ 
      notificationSent: true, 
      managerId: "MGR001" 
    }), { status: 200 });

    const workData = {
      workerId: "WK001",
      startTime: "2024-01-01T09:00:00Z",
      endTime: "2024-01-02T10:00:00Z",
      workHours: 25
    };
    
    const result = await notifyAbnormalValueToManager(workData);
    expect(result.notificationSent).toBe(true);
    expect(result.managerId).toBe("MGR001");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/notify-manager"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("25")
      })
    );
  });

  test("正常時刻範囲で妥当性検証をパスする", () => {
    // SCEN-394
    const startTime = "2024-01-01T09:00:00Z";
    const endTime = "2024-01-01T18:00:00Z";
    const result = validateWorkTimeRange(startTime, endTime);
    expect(result.isValid).toBe(true);
    expect(result.workHours).toBe(9);
    expect(result.error).toBeNull();
  });

  test("異常値検出時の確認ダイアログが正しく表示される", () => {
    // SCEN-434
    const abnormalData = {
      workHours: 26,
      reason: "作業時間が24時間を超過",
      recommendedAction: "データの確認を行ってください"
    };
    
    const dialogConfig = showConfirmationDialog(abnormalData);
    expect(dialogConfig.show).toBe(true);
    expect(dialogConfig.title).toBe("異常値検出");
    expect(dialogConfig.message).toContain("作業時間が24時間を超過");
    expect(dialogConfig.buttons).toEqual(["確認", "修正"]);
  });
});