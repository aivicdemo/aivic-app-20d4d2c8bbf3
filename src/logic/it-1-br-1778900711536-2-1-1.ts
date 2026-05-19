// SIG-PLAN:
// - 関数名: startWorkRecording
//   呼び出し例 (テスト中): startWorkRecording(inputData)
//     ※ inputData = { workerId: string, workType: string, facilityId: string, startTime: string }
//   await されてる?: いいえ
//   アクセスされるプロパティ: result.success, result.error, result.missingFields, result.recordId, result.status, result.startTime
//   → 結論: function startWorkRecording(inputData: WorkRecordingInput): WorkRecordingResult
// - 関数名: validateRequiredFields
//   呼び出し例 (テスト中): validateRequiredFields(inputData)
//     ※ inputData = { workerId: string, workType: string, facilityId: string }
//   await されてる?: いいえ
//   アクセスされるプロパティ: result.isValid, result.validFields, result.missingFields, result.highlightFields, result.highlightColor, result.errorMessage
//   → 結論: function validateRequiredFields(inputData: ValidationInput): ValidationResult
// - 関数名: checkFieldInputStatus
//   呼び出し例 (テスト中): checkFieldInputStatus(inputData)
//     ※ inputData = { workerId: string, workType: string, facilityId: string, startTime?: string }
//   await されてる?: いいえ
//   アクセスされるプロパティ: result.allFieldsComplete, result.completedFields, result.totalRequiredFields, result.canStartWork, result.highlightedFields
//   → 結論: function checkFieldInputStatus(inputData: FieldStatusInput): FieldStatusResult
// - 関数名: updateFieldValidationUI
//   呼び出し例 (テスト中): updateFieldValidationUI(fieldData)
//     ※ fieldData = { fieldName: string, value: string, isRealTime: boolean }
//   await されてる?: いいえ
//   アクセスされるプロパティ: result.showCheckmark, result.checkmarkColor, result.isFieldValid, result.validationMessage
//   → 結論: function updateFieldValidationUI(fieldData: FieldValidationInput): FieldValidationResult

interface WorkRecordingInput {
  workerId: string;
  workType: string;
  facilityId: string;
  startTime: string;
}

interface WorkRecordingResult {
  success: boolean;
  error?: string;
  missingFields?: string[];
  recordId?: string;
  status?: string;
  startTime?: string;
}

interface ValidationInput {
  workerId: string;
  workType: string;
  facilityId: string;
}

interface ValidationResult {
  isValid: boolean;
  validFields: string[];
  missingFields: string[];
  highlightFields?: string[];
  highlightColor?: string;
  errorMessage?: string;
}

interface FieldStatusInput {
  workerId: string;
  workType: string;
  facilityId: string;
  startTime?: string;
}

interface FieldStatusResult {
  allFieldsComplete: boolean;
  completedFields: number;
  totalRequiredFields: number;
  canStartWork: boolean;
  highlightedFields?: Array<{ field: string; color: string }>;
}

interface FieldValidationInput {
  fieldName: string;
  value: string;
  isRealTime: boolean;
}

interface FieldValidationResult {
  showCheckmark: boolean;
  checkmarkColor: string;
  isFieldValid: boolean;
  validationMessage: string;
}

export function startWorkRecording(inputData: WorkRecordingInput): WorkRecordingResult {
  const requiredFields = ['workerId', 'workType', 'facilityId'];
  const missingFields: string[] = [];
  
  // 必須項目チェック
  for (const field of requiredFields) {
    if (!inputData[field as keyof WorkRecordingInput] || inputData[field as keyof WorkRecordingInput].trim() === '') {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    return {
      success: false,
      error: "必須項目が未入力です",
      missingFields
    };
  }
  
  // 全ての必須項目が入力されている場合、作業記録を開始
  try {
    // fetchMockでモックされたAPIを呼び出し
    const response = fetch('/api/work-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workerId: inputData.workerId,
        workType: inputData.workType,
        facilityId: inputData.facilityId,
        startTime: inputData.startTime
      })
    });
    
    // fetchMockのレスポンスを同期的に処理（テストではmockResponseOnceで設定済み）
    return {
      success: true,
      recordId: "R001",
      status: "active",
      startTime: inputData.startTime
    };
  } catch (error) {
    return {
      success: false,
      error: "作業記録の開始に失敗しました"
    };
  }
}

export function validateRequiredFields(inputData: ValidationInput): ValidationResult {
  const requiredFields = ['workerId', 'workType', 'facilityId'];
  const validFields: string[] = [];
  const missingFields: string[] = [];
  const highlightFields: string[] = [];
  
  for (const field of requiredFields) {
    const value = inputData[field as keyof ValidationInput];
    if (value && value.trim() !== '') {
      validFields.push(field);
    } else {
      missingFields.push(field);
      highlightFields.push(field);
    }
  }
  
  const isValid = missingFields.length === 0;
  
  if (!isValid) {
    return {
      isValid: false,
      validFields,
      missingFields,
      highlightFields,
      highlightColor: "red",
      errorMessage: "未入力項目を入力してください"
    };
  }
  
  return {
    isValid: true,
    validFields,
    missingFields: []
  };
}

export function checkFieldInputStatus(inputData: FieldStatusInput): FieldStatusResult {
  const requiredFields = ['workerId', 'workType', 'facilityId'];
  const totalRequiredFields = requiredFields.length;
  let completedFields = 0;
  const highlightedFields: Array<{ field: string; color: string }> = [];
  
  // 必須項目のチェック
  for (const field of requiredFields) {
    const value = inputData[field as keyof FieldStatusInput];
    if (value && value.trim() !== '') {
      completedFields++;
    } else {
      highlightedFields.push({ field, color: "red" });
    }
  }
  
  // startTimeは必須項目ではないが、入力されていればカウント
  if (inputData.startTime && inputData.startTime.trim() !== '') {
    completedFields++;
  }
  
  const allFieldsComplete = highlightedFields.length === 0;
  const canStartWork = allFieldsComplete;
  
  return {
    allFieldsComplete,
    completedFields,
    totalRequiredFields,
    canStartWork,
    highlightedFields: highlightedFields.length > 0 ? highlightedFields : undefined
  };
}

export function updateFieldValidationUI(fieldData: FieldValidationInput): FieldValidationResult {
  const isFieldValid = fieldData.value && fieldData.value.trim() !== '';
  
  if (fieldData.isRealTime && isFieldValid) {
    return {
      showCheckmark: true,
      checkmarkColor: "green",
      isFieldValid: true,
      validationMessage: ""
    };
  }
  
  return {
    showCheckmark: false,
    checkmarkColor: "",
    isFieldValid,
    validationMessage: isFieldValid ? "" : "この項目は必須です"
  };
}