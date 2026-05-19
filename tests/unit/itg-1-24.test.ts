import { startWorkRecord, isRecordActive, validateWorkStartOperation } from "../../src/logic/it-1-br-2-1-1";

const fetchMock = require("jest-fetch-mock");

describe("スマートフォンでワンタップ操作による作業開始時刻の記録機能", () => {
  // SCEN-350
  test("ワンタップ操作で作業開始時刻が正常に記録される", async () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ 
      workRecordId: "WR-001",
      startTime: "2024-01-15T09:00:00Z",
      status: "ACTIVE"
    }), { status: 200 });

    const userId = "USER-001";
    const workItemId = "WORK-ITEM-001";
    const currentTime = new Date("2024-01-15T09:00:00Z");

    const result = await startWorkRecord(userId, workItemId, currentTime);

    expect(result.workRecordId).toBe("WR-001");
    expect(result.startTime).toBe("2024-01-15T09:00:00Z");
    expect(result.status).toBe("ACTIVE");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/work-records"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          workItemId,
          startTime: currentTime.toISOString(),
          status: "ACTIVE"
        })
      })
    );
  });

  // SCEN-351
  test("連続タップ操作時の重複処理が適切に制御される", () => {
    const userId = "USER-002";
    const activeRecord = {
      workRecordId: "WR-002", 
      userId: "USER-002",
      startTime: "2024-01-15T08:30:00Z",
      status: "ACTIVE"
    };

    expect(isRecordActive(userId, activeRecord)).toBe(true);

    const result = validateWorkStartOperation(userId, activeRecord);
    
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe("作業記録が既にアクティブ状態です。既存の記録を継続してください。");
    expect(result.existingRecord).toEqual(activeRecord);
  });
});