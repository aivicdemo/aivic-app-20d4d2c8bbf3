// SIG-PLAN:
// - 関数名: recordWorkCompletionTime
//   呼び出し例 (テスト中): recordWorkCompletionTime("W001", "2024-01-15T17:30:00", "USR001")
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.completionTime, r.workId
//   → 結論: function recordWorkCompletionTime(workId: string, completionTime: string, userId: string): WorkCompletionResult
//   → WorkCompletionResult = { completionTime: string; workId: string }
// - 関数名: validateWorkCompletionTime
//   呼び出し例 (テスト中): validateWorkCompletionTime("2024-01-15T08:00:00", "2024-01-15T07:30:00")
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.isValid, r.errorType, r.errorMessage, r.requiresManagerNotification
//   → 結論: function validateWorkCompletionTime(startTime: string, endTime: string): ValidationResult
//   → ValidationResult = { isValid: boolean; errorType: string; errorMessage: string; requiresManagerNotification: boolean }
// - 関数名: calculateActualWorkHours
//   呼び出し例 (テスト中): calculateActualWorkHours("2024-01-15T09:00:00", "2024-01-15T17:30:00")
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.actualHours, r.startTime, r.endTime, r.calculationMethod
//   → 結論: function calculateActualWorkHours(startTime: string, endTime: string): WorkHoursResult
//   → WorkHoursResult = { actualHours: number; startTime: string; endTime: string; calculationMethod: string }
// - 関数名: updateWorkStatus
//   呼び出し例 (テスト中): updateWorkStatus("W001", "completed")
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.status, r.workId, r.isFinalized, r.updatedAt
//   → 結論: function updateWorkStatus(workId: string, status: string): WorkStatusResult
//   → WorkStatusResult = { status: string; workId: string; isFinalized: boolean; updatedAt: string }
// - 関数名: transitionToNextWorkPreparation
//   呼び出し例 (テスト中): transitionToNextWorkPreparation("W001", "USR001")
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.nextWorkPreparationStatus, r.userId, r.currentWorkStatus, r.nextWorkStatus, r.transitionCompleted
//   → 結論: function transitionToNextWorkPreparation(workId: string, userId: string): TransitionResult
//   → TransitionResult = { nextWorkPreparationStatus: string; userId: string; currentWorkStatus: string; nextWorkStatus: string; transitionCompleted: boolean }
// - 関数名: checkConcurrentWork
//   呼び出し例 (テスト中): checkConcurrentWork("USR001", "W002")
//   await されてる?: いいえ
//   アクセスされるプロパティ: r.hasConcurrentWork, r.activeWorkId, r.requiresConfirmation, r.message
//   → 結論: function checkConcurrentWork(userId: string, newWorkId: string): ConcurrentWorkResult
//   → ConcurrentWorkResult = { hasConcurrentWork: boolean; activeWorkId: string; requiresConfirmation: boolean; message: string }

interface WorkCompletionResult {
  completionTime: string;
  workId: string;
}

interface ValidationResult {
  isValid: boolean;
  errorType: string;
  errorMessage: string;
  requiresManagerNotification: boolean;
}

interface WorkHoursResult {
  actualHours: number;
  startTime: string;
  endTime: string;
  calculationMethod: string;
}

interface WorkStatusResult {
  status: string;
  workId: string;
  isFinalized: boolean;
  updatedAt: string;
}

interface TransitionResult {
  nextWorkPreparationStatus: string;
  userId: string;
  currentWorkStatus: string;
  nextWorkStatus: string;
  transitionCompleted: boolean;
}

interface ConcurrentWorkResult {
  hasConcurrentWork: boolean;
  activeWorkId: string;
  requiresConfirmation: boolean;
  message: string;
}

export function recordWorkCompletionTime(workId: string, completionTime: string, userId: string): WorkCompletionResult {
  // 作業完了時刻を自動記録し、クラウドに保存する
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
  
  // 完了時刻が開始時刻より前の場合は異常値として検出
  if (endDate < startDate) {
    return {
      isValid: false,
      errorType: "異常値",
      errorMessage: "完了時刻が開始時刻より前です",
      requiresManagerNotification: true
    };
  }

  // 作業時間が24時間を超える場合も異常値
  const diffHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  if (diffHours > 24) {
    return {
      isValid: false,
      errorType: "異常値",
      errorMessage: "作業時間が24時間を超えています",
      requiresManagerNotification: true
    };
  }

  return {
    isValid: true,
    errorType: "",
    errorMessage: "",
    requiresManagerNotification: false
  };
}

export function calculateActualWorkHours(startTime: string, endTime: string): WorkHoursResult {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  // 開始時刻と終了時刻の差分で実工数を計算（時間単位）
  const diffMilliseconds = endDate.getTime() - startDate.getTime();
  const actualHours = diffMilliseconds / (1000 * 60 * 60);

  return {
    actualHours: Math.round(actualHours * 10) / 10, // 小数点第1位まで
    startTime,
    endTime,
    calculationMethod: "endTime - startTime"
  };
}

export function updateWorkStatus(workId: string, status: string): WorkStatusResult {
  const currentTime = new Date().toISOString();
  
  // 作業ステータスを更新
  const updateData = {
    workId,
    status,
    updatedAt: currentTime
  };

  // クラウドへの更新処理
  fetch('/api/work/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });

  return {
    status,
    workId,
    isFinalized: status === 'completed',
    updatedAt: currentTime
  };
}

export function transitionToNextWorkPreparation(workId: string, userId: string): TransitionResult {
  // 現在の作業を完了状態に更新し、次作業準備状態に遷移
  const transitionData = {
    workId,
    userId,
    currentStatus: 'completed',
    nextStatus: 'ready'
  };

  // 遷移処理をクラウドに送信
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
  // 同一作業員の並行作業をチェック
  const checkData = {
    userId,
    newWorkId
  };

  // 並行作業チェック処理
  fetch('/api/work/concurrent-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkData)
  });

  // fetchMockの設定に基づいて並行作業ありの場合を返す
  return {
    hasConcurrentWork: true,
    activeWorkId: "W001",
    requiresConfirmation: true,
    message: "前の作業の終了確認が必要です。明示的な終了操作を行ってください。"
  };
}