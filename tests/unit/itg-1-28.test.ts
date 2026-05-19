import { 
  startWorkRecording, 
  validateRequiredFields, 
  checkFieldInputStatus, 
  updateFieldValidationUI 
} from "../../src/logic/it-1-br-1778900711536-2-1-1";

const fetchMock = require("jest-fetch-mock");

describe("工数入力時の必須項目バリデーション機能", () => {
  // SCEN-346
  test("工数記録開始機能 - 必須項目未入力状態での開始操作時に適切なバリデーションエラーが発生する", () => {
    fetchMock.resetMocks();
    
    const inputData = {
      workerId: "",
      workType: "",
      facilityId: "",
      startTime: "2024-01-15T09:00:00Z"
    };
    
    const result = startWorkRecording(inputData);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe("必須項目が未入力です");
    expect(result.missingFields).toEqual(["workerId", "workType", "facilityId"]);
  });

  // SCEN-359
  test("必須項目バリデーション機能 - 作業員ID、作業種別、施設IDの必須項目が正常に検証される", () => {
    fetchMock.resetMocks();
    
    const inputData = {
      workerId: "W001",
      workType: "maintenance",
      facilityId: "F001"
    };
    
    const result = validateRequiredFields(inputData);
    
    expect(result.isValid).toBe(true);
    expect(result.validFields).toEqual(["workerId", "workType", "facilityId"]);
    expect(result.missingFields).toEqual([]);
  });

  // SCEN-360
  test("必須項目バリデーション機能 - 必須項目未入力時に該当項目がハイライト表示される", () => {
    fetchMock.resetMocks();
    
    const inputData = {
      workerId: "W001",
      workType: "",
      facilityId: ""
    };
    
    const result = validateRequiredFields(inputData);
    
    expect(result.isValid).toBe(false);
    expect(result.highlightFields).toEqual(["workType", "facilityId"]);
    expect(result.highlightColor).toBe("red");
    expect(result.errorMessage).toBe("未入力項目を入力してください");
  });

  // SCEN-361
  test("必須項目バリデーション機能 - リアルタイムバリデーションで正常入力時にチェックマークが表示される", () => {
    fetchMock.resetMocks();
    
    const fieldData = {
      fieldName: "workerId",
      value: "W001",
      isRealTime: true
    };
    
    const result = updateFieldValidationUI(fieldData);
    
    expect(result.showCheckmark).toBe(true);
    expect(result.checkmarkColor).toBe("green");
    expect(result.isFieldValid).toBe(true);
    expect(result.validationMessage).toBe("");
  });

  // SCEN-386
  test("入力状態チェック機能 - 作業開始時の必須項目入力状態が正しくチェックされる", () => {
    fetchMock.resetMocks();
    
    const inputData = {
      workerId: "W001",
      workType: "cleaning",
      facilityId: "F002",
      startTime: "2024-01-15T09:00:00Z"
    };
    
    const result = checkFieldInputStatus(inputData);
    
    expect(result.allFieldsComplete).toBe(true);
    expect(result.completedFields).toBe(4);
    expect(result.totalRequiredFields).toBe(3);
    expect(result.canStartWork).toBe(true);
  });

  // SCEN-387
  test("入力状態チェック機能 - 未入力項目の赤色ハイライト表示が正常に動作する", () => {
    fetchMock.resetMocks();
    
    const inputData = {
      workerId: "",
      workType: "inspection",
      facilityId: ""
    };
    
    const result = checkFieldInputStatus(inputData);
    
    expect(result.allFieldsComplete).toBe(false);
    expect(result.highlightedFields).toEqual([
      { field: "workerId", color: "red" },
      { field: "facilityId", color: "red" }
    ]);
    expect(result.canStartWork).toBe(false);
  });

  // SCEN-388
  test("入力状態チェック機能 - 全項目入力完了時の状態変更が適切に処理される", () => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ 
      success: true, 
      recordId: "R001",
      status: "active"
    }), { status: 200 });
    
    const inputData = {
      workerId: "W001",
      workType: "maintenance",
      facilityId: "F001",
      startTime: "2024-01-15T09:00:00Z"
    };
    
    const result = startWorkRecording(inputData);
    
    expect(result.success).toBe(true);
    expect(result.recordId).toBe("R001");
    expect(result.status).toBe("active");
    expect(result.startTime).toBe("2024-01-15T09:00:00Z");
  });
});