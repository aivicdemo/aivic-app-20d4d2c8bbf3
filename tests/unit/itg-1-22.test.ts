import { startWorkRecording, validateWorkRecordingStart, checkActiveWorkRecord } from "../../src/logic/it-1";

const fetchMock = require("jest-fetch-mock");

describe("スマートフォンアプリで工数記録開始ボタンをタップすると作業開始時刻が自動記録される機能", () => {
  test("工数記録開始機能 - 工数記録開始ボタンタップ時に現在時刻が作業開始時刻として正常に記録される", async () => {
    // SCEN-344
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ 
      workRecordId: "WR20241201001",
      startTime: "2024-12-01T09:00:00Z",
      status: "active",
      employeeId: "EMP001",
      workType: "maintenance",
      facilityId: "FAC001"
    }), { status: 200 });

    const workData = {
      employeeId: "EMP001",
      workType: "maintenance",
      facilityId: "FAC001"
    };
    const currentTime = "2024-12-01T09:00:00Z";

    const result = await startWorkRecording(workData, currentTime);

    expect(result.startTime).toBe("2024-12-01T09:00:00Z");
    expect(result.status).toBe("active");
    expect(result.employeeId).toBe("EMP001");
    expect(result.workType).toBe("maintenance");
    expect(result.facilityId).toBe("FAC001");
  });

  test("工数記録開始機能 - 作業開始記録がアクティブ状態での重複開始操作時にエラーメッセージが返される", async () => {
    // SCEN-345
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({
      error: "WORK_ALREADY_ACTIVE",
      message: "既に作業が開始されています。既存の記録を継続してください。",
      activeWorkId: "WR20241201001"
    }), { status: 409 });

    const activeRecord = {
      workRecordId: "WR20241201001",
      status: "active",
      startTime: "2024-12-01T08:00:00Z"
    };

    const isActive = checkActiveWorkRecord("EMP001");
    expect(isActive).toBe(true);

    const workData = {
      employeeId: "EMP001",
      workType: "maintenance",
      facilityId: "FAC001"
    };

    try {
      await startWorkRecording(workData, "2024-12-01T09:00:00Z");
    } catch (error: any) {
      expect(error.code).toBe("WORK_ALREADY_ACTIVE");
      expect(error.message).toBe("既に作業が開始されています。既存の記録を継続してください。");
    }
  });

  test("工数記録開始機能 - 必須項目未入力状態での開始操作時に適切なバリデーションエラーが発生する", async () => {
    // SCEN-346
    fetchMock.resetMocks();

    const invalidWorkData = {
      employeeId: "",
      workType: "",
      facilityId: ""
    };

    const validationResult = validateWorkRecordingStart(invalidWorkData);

    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors).toContain("作業員IDが未入力です");
    expect(validationResult.errors).toContain("作業種別が未入力です");
    expect(validationResult.errors).toContain("施設IDが未入力です");
    expect(validationResult.missingFields).toEqual(["employeeId", "workType", "facilityId"]);
  });
});