import { 
  completeWorkRecord, 
  validateActiveRecord, 
  calculateWorkDuration, 
  saveWorkDataToCloud, 
  saveToLocalStorage, 
  syncLocalDataToCloud, 
  checkNetworkConnection 
} from "../../src/logic/it-1-br-1-2-1";

const fetchMock = require("jest-fetch-mock");

describe("作業完了ボタンをタップした際に工数記録を自動的に終了し、データをクラウドに保存する機能", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  // SCEN-347
  test("工数記録終了機能 - 作業完了ボタンタップ時に終了時刻が記録され作業時間が正しく計算される", () => {
    const startTime = "2024-01-15T09:00:00Z";
    const endTime = "2024-01-15T17:30:00Z";
    const workerId = "W001";
    const workType = "設備点検";
    
    fetchMock.mockResponseOnce(JSON.stringify({
      success: true,
      recordId: "R001"
    }), { status: 200 });

    const result = completeWorkRecord({
      workerId,
      startTime,
      endTime,
      workType,
      isActive: true
    });

    expect(result.endTime).toBe(endTime);
    expect(result.workDuration).toBe(8.5);
    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith("/api/work-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId,
        startTime,
        endTime,
        workType,
        duration: 8.5
      })
    });
  });

  // SCEN-348
  test("工数記録終了機能 - アクティブでない状態での完了操作時にエラーが発生する", () => {
    const workRecord = {
      workerId: "W002",
      startTime: "2024-01-15T09:00:00Z",
      endTime: "2024-01-15T17:00:00Z",
      workType: "清掃作業",
      isActive: false
    };

    const validationResult = validateActiveRecord(workRecord);
    
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errorMessage).toBe("既存の記録を継続する");
    
    expect(() => {
      completeWorkRecord(workRecord);
    }).toThrow("作業記録がアクティブ状態ではありません");
  });

  // SCEN-349
  test("工数記録終了機能 - ネットワーク不安定時にローカル保存が実行される", () => {
    fetchMock.mockResponseOnce("", { status: 500 });
    
    const workData = {
      workerId: "W003",
      startTime: "2024-01-15T08:00:00Z",
      endTime: "2024-01-15T16:00:00Z",
      workType: "メンテナンス",
      isActive: true
    };

    const result = completeWorkRecord(workData);

    expect(result.savedToLocal).toBe(true);
    expect(result.cloudSaved).toBe(false);
    expect(result.localStorageKey).toBe("work_record_W003_2024-01-15");
  });

  // SCEN-371
  test("データ保存機能 - 工数データがクラウドに統一フォーマットで正常保存される", () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      success: true,
      recordId: "R002",
      timestamp: "2024-01-15T17:00:00Z"
    }), { status: 200 });

    const workData = {
      workerId: "W004",
      workerName: "田中太郎",
      startTime: "2024-01-15T09:00:00Z",
      endTime: "2024-01-15T17:00:00Z",
      workType: "空調設備点検",
      facilityId: "F001",
      duration: 8.0,
      location: { lat: 35.6762, lng: 139.6503 }
    };

    const result = saveWorkDataToCloud(workData);

    expect(result.success).toBe(true);
    expect(result.recordId).toBe("R002");
    expect(fetch).toHaveBeenCalledWith("/api/cloud/work-records", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Data-Format": "unified-v1"
      },
      body: JSON.stringify({
        worker_id: "W004",
        worker_name: "田中太郎",
        start_time: "2024-01-15T09:00:00Z",
        end_time: "2024-01-15T17:00:00Z",
        work_type: "空調設備点検",
        facility_id: "F001",
        duration_hours: 8.0,
        gps_location: { latitude: 35.6762, longitude: 139.6503 }
      })
    });
  });

  // SCEN-372
  test("データ保存機能 - ネットワーク切断時にローカルストレージに一時保存される", () => {
    const networkStatus = checkNetworkConnection();
    expect(networkStatus.isConnected).toBe(false);

    const workData = {
      workerId: "W005",
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T18:00:00Z",
      workType: "外装点検",
      duration: 8.0
    };

    const result = saveToLocalStorage(workData);

    expect(result.success).toBe(true);
    expect(result.storageKey).toBe("pending_sync_W005_2024-01-15");
    expect(result.autoSyncOnReconnect).toBe(true);
    expect(result.data).toEqual(workData);
  });

  // SCEN-373
  test("データ保存機能 - 接続復旧時に自動同期処理が実行される", () => {
    const localData = [
      {
        workerId: "W006",
        startTime: "2024-01-15T09:00:00Z",
        endTime: "2024-01-15T17:00:00Z",
        duration: 8.0,
        storageKey: "pending_sync_W006_2024-01-15"
      },
      {
        workerId: "W007", 
        startTime: "2024-01-15T08:30:00Z",
        endTime: "2024-01-15T16:30:00Z",
        duration: 8.0,
        storageKey: "pending_sync_W007_2024-01-15"
      }
    ];

    fetchMock.mockResponseOnce(JSON.stringify({
      syncedCount: 2,
      success: true,
      recordIds: ["R003", "R004"]
    }), { status: 200 });

    const result = syncLocalDataToCloud(localData);

    expect(result.syncedCount).toBe(2);
    expect(result.success).toBe(true);
    expect(result.failedCount).toBe(0);
    expect(fetch).toHaveBeenCalledWith("/api/cloud/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: localData })
    });
  });

  // SCEN-407
  test("自動同期機能 - 接続復旧時にローカルデータが正しく同期される", () => {
    const pendingRecords = [
      {
        workerId: "W008",
        startTime: "2024-01-15T07:00:00Z", 
        endTime: "2024-01-15T15:00:00Z",
        duration: 8.0,
        timestamp: "2024-01-15T15:00:00Z"
      }
    ];

    fetchMock.mockResponseOnce(JSON.stringify({
      syncResults: [
        { recordId: "R005", status: "synced", workerId: "W008" }
      ],
      totalSynced: 1,
      errors: []
    }), { status: 200 });

    const syncResult = syncLocalDataToCloud(pendingRecords);

    expect(syncResult.totalSynced).toBe(1);
    expect(syncResult.errors.length).toBe(0);
    expect(syncResult.syncResults[0].status).toBe("synced");
    expect(syncResult.syncResults[0].recordId).toBe("R005");
  });
});