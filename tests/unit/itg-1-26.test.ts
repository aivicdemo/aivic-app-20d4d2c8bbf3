import { recordWorkStartTime, recordWorkEndTime, validateGPSLocation, calculateWorkDuration } from "../../src/logic/it-1-br-1778900711536-1-1-1";

const fetchMock = require("jest-fetch-mock");

describe("スマートフォンアプリでワンタップによる作業時刻記録機能", () => {
  // SCEN-350
  test("ワンタップ操作で作業開始時刻が正常に記録される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, workId: "W001" }), { status: 200 });

    const currentTime = new Date("2024-01-15T09:00:00Z");
    const workerId = "EMP001";
    const result = recordWorkStartTime(workerId, currentTime);

    expect(result.success).toBe(true);
    expect(result.startTime).toBe(currentTime);
    expect(result.status).toBe("active");
    expect(result.workerId).toBe(workerId);
  });

  // SCEN-352
  test("GPS位置情報と時刻が自動取得される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, locationId: "LOC001" }), { status: 200 });

    const gpsData = { latitude: 35.6762, longitude: 139.6503 };
    const timestamp = new Date("2024-01-15T09:00:00Z");
    const result = validateGPSLocation(gpsData, timestamp);

    expect(result.isValid).toBe(true);
    expect(result.latitude).toBe(35.6762);
    expect(result.longitude).toBe(139.6503);
    expect(result.timestamp).toBe(timestamp);
  });

  // SCEN-410
  test("ワンタップ操作時にGPS位置情報が自動取得される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, recordId: "REC001" }), { status: 200 });

    const workerId = "EMP001";
    const currentTime = new Date("2024-01-15T09:00:00Z");
    const gpsLocation = { latitude: 35.6762, longitude: 139.6503 };
    const result = recordWorkStartTime(workerId, currentTime, gpsLocation);

    expect(result.success).toBe(true);
    expect(result.location.latitude).toBe(35.6762);
    expect(result.location.longitude).toBe(139.6503);
    expect(result.startTime).toBe(currentTime);
    expect(result.dataReliability).toBe(true);
  });

  // SCEN-428
  test("最小限タップ数での工数記録完了が実現される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, duration: 8.5 }), { status: 200 });

    const startTime = new Date("2024-01-15T09:00:00Z");
    const endTime = new Date("2024-01-15T17:30:00Z");
    const workerId = "EMP001";
    const result = calculateWorkDuration(startTime, endTime, workerId);

    expect(result.duration).toBe(8.5);
    expect(result.tapCount).toBe(2);
    expect(result.inputLoad).toBe("minimal");
    expect(result.autoSaved).toBe(true);
  });
});