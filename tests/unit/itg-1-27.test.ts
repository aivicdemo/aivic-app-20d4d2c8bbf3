const fetchMock = require("jest-fetch-mock");
import { recordInterruption, validateInterruptionReason, calculateInterruptionDuration, analyzeInterruptionReasons } from "../../src/logic/it-1-br-1778900711536-1-2-1";

describe("中断理由と時間を記録する機能", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  test("作業中断時に中断理由と時刻が正常に記録される", () => {
    // SCEN-356
    const interruption = {
      userId: "USER001",
      reason: "設備故障",
      startTime: "2024-01-15T10:30:00Z",
      location: { lat: 35.6762, lng: 139.6503 }
    };

    fetchMock.mockResponseOnce(JSON.stringify({ 
      id: "INT001", 
      recorded: true,
      timestamp: "2024-01-15T10:30:00Z"
    }), { status: 201 });

    const result = recordInterruption(interruption);
    
    expect(result.success).toBe(true);
    expect(result.interruptionId).toBe("INT001");
    expect(result.recordedAt).toBe("2024-01-15T10:30:00Z");
  });

  test("中断理由未選択時にバリデーションエラーが発生する", () => {
    // SCEN-357
    const interruption = {
      userId: "USER001",
      reason: "",
      startTime: "2024-01-15T10:30:00Z",
      location: { lat: 35.6762, lng: 139.6503 }
    };

    const validation = validateInterruptionReason(interruption.reason);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toBe("中断理由は必須項目です");
    expect(validation.errorCode).toBe("REASON_REQUIRED");
  });

  test("中断時間が8時間を超過時にアラートが表示される", () => {
    // SCEN-358
    const interruption = {
      startTime: "2024-01-15T09:00:00Z",
      endTime: "2024-01-15T18:30:00Z",
      reason: "設備故障"
    };

    fetchMock.mockResponseOnce(JSON.stringify({
      alert: true,
      message: "異常値検出：待機時間が8時間を超えています。承認者の確認が必要です。",
      requiresApproval: true
    }), { status: 200 });

    const duration = calculateInterruptionDuration(interruption.startTime, interruption.endTime);
    
    expect(duration).toBe(9.5);
    expect(duration > 8).toBe(true);
  });

  test("中断開始時刻と終了時刻の差分が正しく計算される", () => {
    // SCEN-374
    const startTime = "2024-01-15T14:00:00Z";
    const endTime = "2024-01-15T16:30:00Z";

    const duration = calculateInterruptionDuration(startTime, endTime);
    
    expect(duration).toBe(2.5);
  });

  test("中断終了時刻が開始時刻より前の場合にエラーが発生する", () => {
    // SCEN-375
    const startTime = "2024-01-15T16:00:00Z";
    const endTime = "2024-01-15T14:00:00Z";

    expect(() => {
      calculateInterruptionDuration(startTime, endTime);
    }).toThrow("終了時刻は開始時刻より後である必要があります");
  });

  test("日をまたぐ中断時間が正しく計算される", () => {
    // SCEN-376
    const startTime = "2024-01-15T22:30:00Z";
    const endTime = "2024-01-16T06:15:00Z";

    const duration = calculateInterruptionDuration(startTime, endTime);
    
    expect(duration).toBe(7.75);
  });

  test("中断理由別の発生頻度と平均時間が正しく集計される", () => {
    // SCEN-377
    const interruptionData = [
      { reason: "設備故障", duration: 2.5 },
      { reason: "設備故障", duration: 4.0 },
      { reason: "材料待ち", duration: 1.5 },
      { reason: "設備故障", duration: 3.5 },
      { reason: "材料待ち", duration: 2.0 }
    ];

    const analysis = analyzeInterruptionReasons(interruptionData);
    
    expect(analysis["設備故障"].frequency).toBe(3);
    expect(analysis["設備故障"].averageTime).toBe(3.33);
    expect(analysis["材料待ち"].frequency).toBe(2);
    expect(analysis["材料待ち"].averageTime).toBe(1.75);
  });
});