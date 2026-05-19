// SIG-PLAN:
// - 関数名: detectAbnormalWorkTime
//   呼び出し例 (テスト中): detectAbnormalWorkTime(startTime, endTime)
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.isAbnormal, r.reason, r.workHours, r.anomalyType, r.requiresManagerNotification
//   → 結論: function detectAbnormalWorkTime(startTime: string, endTime: string): AbnormalWorkTimeResult
// - 関数名: validateWorkTimeRange
//   呼び出し例 (テスト中): validateWorkTimeRange(startTime, endTime)
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.isValid, r.error, r.workHours
//   → 結論: function validateWorkTimeRange(startTime: string, endTime: string): WorkTimeValidationResult
// - 関数名: checkShortWorkTime
//   呼び出し例 (テスト中): checkShortWorkTime(startTime, endTime)
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.isShortWork, r.workMinutes, r.requiresDetailInput, r.showDetailPrompt, r.promptMessage
//   → 結論: function checkShortWorkTime(startTime: string, endTime: string): ShortWorkTimeResult
// - 関数名: validateWorkTimeConsistency
//   呼び出し例 (テスト中): validateWorkTimeConsistency(startTime, endTime)
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.showWarning, r.workHours, r.warningMessage, r.isNormal
//   → 結論: function validateWorkTimeConsistency(startTime: string, endTime: string): WorkTimeConsistencyResult
// - 関数名: notifyAbnormalValueToManager
//   呼び出し例 (テスト中): await notifyAbnormalValueToManager(workData)
//   await されてる?: はい
//   アクセスされるプロパティ: r.notificationSent, r.managerId
//   → 結論: async function notifyAbnormalValueToManager(workData: WorkData): Promise<NotificationResult>
// - 関数名: showConfirmationDialog
//   呼び出し例 (テスト中): showConfirmationDialog(abnormalData)
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.show, r.title, r.message, r.buttons
//   → 結論: function showConfirmationDialog(abnormalData: AbnormalData): ConfirmationDialogConfig

interface AbnormalWorkTimeResult {
  isAbnormal: boolean;
  reason?: string;
  workHours: number;
  anomalyType?: string;
  requiresManagerNotification?: boolean;
}

interface WorkTimeValidationResult {
  isValid: boolean;
  error: string | null;
  workHours: number;
}

interface ShortWorkTimeResult {
  isShortWork: boolean;
  workMinutes: number;
  requiresDetailInput?: boolean;
  showDetailPrompt?: boolean;
  promptMessage?: string;
}

interface WorkTimeConsistencyResult {
  showWarning: boolean;
  workHours: number;
  warningMessage?: string;
  isNormal?: boolean;
}

interface WorkData {
  workerId: string;
  startTime: string;
  endTime: string;
  workHours: number;
}

interface NotificationResult {
  notificationSent: boolean;
  managerId: string;
}

interface AbnormalData {
  workHours: number;
  reason: string;
  recommendedAction: string;
}

interface ConfirmationDialogConfig {
  show: boolean;
  title: string;
  message: string;
  buttons: string[];
}

function calculateWorkHours(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60); // ミリ秒を時間に変換
}

function calculateWorkMinutes(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60); // ミリ秒を分に変換
}

export function detectAbnormalWorkTime(startTime: string, endTime: string): AbnormalWorkTimeResult {
  const workHours = calculateWorkHours(startTime, endTime);
  
  // 時刻順序チェック
  if (workHours < 0) {
    return {
      isAbnormal: true,
      reason: "作業開始時刻が終了時刻より後です",
      workHours: workHours,
      anomalyType: "時刻順序異常",
      requiresManagerNotification: true
    };
  }
  
  // 24時間超過チェック
  if (workHours > 24) {
    return {
      isAbnormal: true,
      reason: "作業時間が24時間を超過",
      workHours: workHours,
      anomalyType: "長時間作業",
      requiresManagerNotification: true
    };
  }
  
  return {
    isAbnormal: false,
    workHours: workHours
  };
}

export function validateWorkTimeRange(startTime: string, endTime: string): WorkTimeValidationResult {
  const workHours = calculateWorkHours(startTime, endTime);
  
  if (workHours < 0) {
    return {
      isValid: false,
      error: "作業開始時刻が終了時刻より後です",
      workHours: workHours
    };
  }
  
  return {
    isValid: true,
    error: null,
    workHours: workHours
  };
}

export function checkShortWorkTime(startTime: string, endTime: string): ShortWorkTimeResult {
  const workMinutes = calculateWorkMinutes(startTime, endTime);
  
  if (workMinutes < 30) {
    return {
      isShortWork: true,
      workMinutes: workMinutes,
      requiresDetailInput: true,
      showDetailPrompt: true,
      promptMessage: "短時間作業として確認されました。作業内容の詳細を入力してください。"
    };
  }
  
  return {
    isShortWork: false,
    workMinutes: workMinutes
  };
}

export function validateWorkTimeConsistency(startTime: string, endTime: string): WorkTimeConsistencyResult {
  const workHours = calculateWorkHours(startTime, endTime);
  
  if (workHours > 8) {
    return {
      showWarning: true,
      workHours: workHours,
      warningMessage: "作業時間が8時間を超過しています。確認してください。"
    };
  }
  
  return {
    showWarning: false,
    workHours: workHours,
    isNormal: true
  };
}

export async function notifyAbnormalValueToManager(workData: WorkData): Promise<NotificationResult> {
  const response = await fetch('/notify-manager', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workerId: workData.workerId,
      startTime: workData.startTime,
      endTime: workData.endTime,
      workHours: workData.workHours,
      anomalyType: workData.workHours > 24 ? "長時間作業" : "異常値検出"
    })
  });
  
  const result = await response.json();
  return {
    notificationSent: result.notificationSent || true,
    managerId: result.managerId || "MGR001"
  };
}

export function showConfirmationDialog(abnormalData: AbnormalData): ConfirmationDialogConfig {
  return {
    show: true,
    title: "異常値検出",
    message: `${abnormalData.reason}。${abnormalData.recommendedAction}`,
    buttons: ["確認", "修正"]
  };
}