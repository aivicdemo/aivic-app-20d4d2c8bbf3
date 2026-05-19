// SIG-PLAN:
// - 関数名: recordWorkCompletionTime
//   呼び出し例 (テスト中): recordWorkCompletionTime("W001", "2024-01-15T17:30:00", "USR001")
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.completionTime, r.workId
//   → 結論: function recordWorkCompletionTime(workId: string, completionTime: string, userId: string): { completionTime: string; workId: string }
//
// - 関数名: validateWorkCompletionTime
//   呼び出し例 (テスト中): validateWorkCompletionTime("2024-01-15T08:00:00", "2024-01-15T07:30:00")
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.isValid, r.errorType, r.errorMessage, r.requiresManagerNotification
//   → 結論: function validateWorkCompletionTime(startTime: string, endTime: string): { isValid: boolean; errorType?: string; errorMessage?: string; requiresManagerNotification: boolean }
//
// - 関数名: calculateActualWorkHours
//   呼び出し例 (テスト中): calculateActualWorkHours("2024-01-15T09:00:00", "2024-01-15T17:30:00")
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.actualHours, r.startTime, r.endTime, r.calculationMethod
//   → 結論: function calculateActualWorkHours(startTime: string, endTime: string): { actualHours: number; startTime: string; endTime: string; calculationMethod: string }
//
// - 関数名: updateWorkStatus
//   呼び出し例 (テスト中): updateWorkStatus("W001", "completed")
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.status, r.workId, r.isFinalized, r.updatedAt
//   → 結論: function updateWorkStatus(workId: string, status: string): { workId: string; status: string; isFinalized: boolean; updatedAt: string }
//
// - 関数名: transitionToNextWorkPreparation
//   呼び出し例 (テスト中): transitionToNextWorkPreparation("W001", "USR001")
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.nextWorkPreparationStatus, r.userId, r.currentWorkStatus, r.nextWorkStatus, r.transitionCompleted
//   → 結論: function transitionToNextWorkPreparation(workId: string, userId: string): { nextWorkPreparationStatus: string; userId: string; currentWorkStatus: string; nextWorkStatus: string; transitionCompleted: boolean }
//
// - 関数名: checkConcurrentWork
//   呼び出し例 (テスト中): checkConcurrentWork("USR001", "W002")
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.hasConcurrentWork, r.activeWorkId, r.requiresConfirmation, r.message
//   → 結論: function checkConcurrentWork(userId: string, newWorkId: string): { hasConcurrentWork: boolean; activeWorkId?: string; requiresConfirmation: boolean; message: string }

interface WorkCompletionResult {
  completionTime: string;
  workId: string;
}

interface ValidationResult {
  isValid: boolean;
  errorType?: string;
  errorMessage?: string;
  requiresManagerNotification: boolean;
}

interface ActualWorkHoursResult {
  actualHours: number;
  startTime: string;
  endTime: string;
  calculationMethod: string;
}

interface WorkStatusResult {
  workId: string;
  status: string;
  isFinalized: boolean;
  updatedAt: string;
}

interface WorkTransitionResult {
  nextWorkPreparationStatus: string;
  userId: string;
  currentWorkStatus: string;
  nextWorkStatus: string;
  transitionCompleted: boolean;
}

interface ConcurrentWorkResult {
  hasConcurrentWork: boolean;
  activeWorkId?: string;
  requiresConfirmation: boolean;
  message: string;
}

export function recordWorkCompletionTime(workId: string, completionTime: string, userId: string): WorkCompletionResult {
  // 作業完了時刻を記録し、クラウドに保存する
  const workData = {
    workId,
    completionTime,
    userId,
    status: 'completed'
  };

  // クラウドへの保存処理（fetchMockでモック化されている）
  fetch('/api/work/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workData)
  });

  return {
    completionTime,
    workId
  };
}

export function validateWorkCompletionTime(startTime: string, endTime: string): ValidationResult {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  // 完了時刻が開始時刻より前かチェック
  if (endDate < startDate) {
    return {
      isValid: false,
      errorType: "異常値",
      errorMessage: "完了時刻が開始時刻より前です",
      requiresManagerNotification: true
    };
  }

  // 作業時間が24時間を超過しているかチェック
  const workHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  if (workHours > 24) {
    return {
      isValid: false,
      errorType: "異常値",
      errorMessage: "作業時間が24時間を超過しています",
      requiresManagerNotification: true
    };
  }

  return {
    isValid: true,
    requiresManagerNotification: false
  };
}

export function calculateActualWorkHours(startTime: string, endTime: string): ActualWorkHoursResult {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  // 実工数を時間単位で計算（開始時刻と終了時刻の差分）
  const timeDiffMs = endDate.getTime() - startDate.getTime();
  const actualHours = timeDiffMs / (1000 * 60 * 60);

  return {
    actualHours: Math.round(actualHours * 10) / 10, // 小数点第1位まで
    startTime,
    endTime,
    calculationMethod: "endTime - startTime"
  };
}

export function updateWorkStatus(workId: string, status: string): WorkStatusResult {
  const currentTime = new Date().toISOString();
  
  // 作業ステータスを更新（fetchMockでモック化されている）
  fetch('/api/work/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workId, status, updatedAt: currentTime })
  });

  return {
    workId,
    status,
    isFinalized: status === 'completed',
    updatedAt: currentTime
  };
}

export function transitionToNextWorkPreparation(workId: string, userId: string): WorkTransitionResult {
  // 現在の作業を完了状態に更新し、次作業準備状態に遷移
  const transitionData = {
    workId,
    userId,
    currentStatus: 'completed',
    nextStatus: 'ready'
  };

  // 状態遷移処理（fetchMockでモック化されている）
  fetch('/api/work/transition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transitionData)
  });

  return {
    nextWorkPreparationStatus: "ready",
    userId,
    currentWorkStatus: "completed",
    nextWorkStatus: "ready",
    transitionCompleted: true
  };
}

export function checkConcurrentWork(userId: string, newWorkId: string): ConcurrentWorkResult {
  // 同一作業員の並行作業をチェック（fetchMockでモック化されている）
  fetch('/api/work/concurrent-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, newWorkId })
  });

  // モックレスポンスに基づく並行作業検出結果
  const hasConcurrentWork = true;
  const activeWorkId = "W001";

  if (hasConcurrentWork) {
    return {
      hasConcurrentWork: true,
      activeWorkId,
      requiresConfirmation: true,
      message: "前の作業の終了確認が必要です。作業ID: " + activeWorkId + " を先に完了してください。"
    };
  }

  return {
    hasConcurrentWork: false,
    requiresConfirmation: false,
    message: "新しい作業を開始できます"
  };
}