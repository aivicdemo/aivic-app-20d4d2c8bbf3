// 作業記録の型定義
export interface WorkRecord {
  作業記録ID: string;
  作業員ID: string;
  作業日: string;
  作業開始時刻: string;
  作業終了時刻: string | null;
  作業時間: number | null;
  プロジェクト名: string;
  作業場所: string;
  作業種別: string;
  作業内容: string;
  進捗状況: string;
  備考: string | null;
  承認状態: string;
  承認者ID: string | null;
  承認日時: string | null;
  作成日時: string;
  更新日時: string;
  作成者ID: string;
}

// スタッフメンバーの型定義
export interface StaffMember {
  ユーザーID: string;
  ユーザー名: string;
  氏名: string;
  所属部署: string | null;
  職種: string | null;
  権限レベル: string;
  有効フラグ: boolean;
  最終ログイン日時: string | null;
  作成日時: string;
  更新日時: string;
  作成者: string;
}

// スタッフ配置の型定義
export interface StaffAssignment {
  作業員ID: string;
  作業記録ID: string;
  配置優先度: number;
  移動時間: number;
  予想作業時間: number;
  効率指数: number;
}

/** 対応ルール: 過去の工数実績データを分析して当日の作業量予測を自動算出する */
export function predictDailyWorkload(historicalData: WorkRecord[], targetDate: string): number {
  if (!historicalData || historicalData.length === 0) {
    return 0;
  }

  const targetDateObj = new Date(targetDate);
  const targetDayOfWeek = targetDateObj.getDay();
  const targetMonth = targetDateObj.getMonth();

  // 同じ曜日・同じ月のデータを抽出
  const relevantRecords = historicalData.filter(record => {
    if (!record.作業時間 || record.作業時間 <= 0) return false;
    
    const recordDate = new Date(record.作業日);
    return recordDate.getDay() === targetDayOfWeek && recordDate.getMonth() === targetMonth;
  });

  if (relevantRecords.length === 0) {
    // フォールバック: 全データの平均
    const allValidRecords = historicalData.filter(record => 
      record.作業時間 && record.作業時間 > 0
    );
    if (allValidRecords.length === 0) return 0;
    
    const totalWorkload = allValidRecords.reduce((sum, record) => sum + (record.作業時間 || 0), 0);
    return Math.round(totalWorkload / allValidRecords.length);
  }

  // 季節変動係数を計算（前年同期比±20%を考慮）
  const baseWorkload = relevantRecords.reduce((sum, record) => sum + (record.作業時間 || 0), 0) / relevantRecords.length;
  
  // 最近3ヶ月のトレンドを考慮
  const recentDate = new Date(targetDate);
  recentDate.setMonth(recentDate.getMonth() - 3);
  
  const recentRecords = relevantRecords.filter(record => 
    new Date(record.作業日) >= recentDate
  );

  if (recentRecords.length > 0) {
    const recentAverage = recentRecords.reduce((sum, record) => sum + (record.作業時間 || 0), 0) / recentRecords.length;
    const trendFactor = recentAverage / baseWorkload;
    return Math.round(baseWorkload * Math.min(Math.max(trendFactor, 0.8), 1.2));
  }

  return Math.round(baseWorkload);
}

/** 対応ルール: 予測作業量から必要人員数を自動算出する */
export function calculateOptimalStaffing(predictedWorkload: number, standardHours: number, efficiency: number): number {
  if (predictedWorkload <= 0 || standardHours <= 0 || efficiency <= 0) {
    return 0;
  }

  // 効率を考慮した実質作業時間を算出
  const effectiveHours = standardHours * efficiency;
  
  // 必要人員数を算出（切り上げ）
  const requiredStaff = Math.ceil(predictedWorkload / effectiveHours);
  
  // 最低1名、最大50名の制限
  return Math.min(Math.max(requiredStaff, 1), 50);
}

/** 対応ルール: 移動時間と作業効率を考慮して最適な人員配置パターンを算出する */
export function optimizeEmergencyStaffing(
  availableStaff: StaffMember[], 
  urgentTasks: WorkRecord[], 
  travelTimes: Record<string, number>
): StaffAssignment[] {
  if (!availableStaff || !urgentTasks || availableStaff.length === 0 || urgentTasks.length === 0) {
    return [];
  }

  const assignments: StaffAssignment[] = [];
  
  // 緊急度による作業の優先順位付け（作業時間が長いほど緊急度が高い）
  const sortedTasks = [...urgentTasks]
    .filter(task => task.作業時間 && task.作業時間 > 0)
    .sort((a, b) => (b.作業時間 || 0) - (a.作業時間 || 0));

  // 有効なスタッフのみを対象
  const validStaff = availableStaff.filter(staff => staff.有効フラグ);

  for (const task of sortedTasks) {
    let bestStaff: StaffMember | null = null;
    let bestScore = -1;

    for (const staff of validStaff) {
      // 既に配置済みのスタッフは除外
      if (assignments.some(a => a.作業員ID === staff.ユーザーID)) {
        continue;
      }

      const travelTimeKey = `${staff.ユーザーID}_${task.作業場所}`;
      const travelTime = travelTimes[travelTimeKey] || 60; // デフォルト60分

      // 職種による効率指数を算出
      let efficiencyIndex = 1.0;
      if (staff.職種 === '主任' || staff.職種 === 'リーダー') {
        efficiencyIndex = 1.2;
      } else if (staff.職種 === '新人' || staff.職種 === '研修生') {
        efficiencyIndex = 0.8;
      }

      // スコア算出（効率指数が高く、移動時間が短いほど高スコア）
      const score = efficiencyIndex * 100 - travelTime;

      if (score > bestScore) {
        bestScore = score;
        bestStaff = staff;
      }
    }

    if (bestStaff) {
      const travelTimeKey = `${bestStaff.ユーザーID}_${task.作業場所}`;
      const travelTime = travelTimes[travelTimeKey] || 60;
      
      let efficiencyIndex = 1.0;
      if (bestStaff.職種 === '主任' || bestStaff.職種 === 'リーダー') {
        efficiencyIndex = 1.2;
      } else if (bestStaff.職種 === '新人' || bestStaff.職種 === '研修生') {
        efficiencyIndex = 0.8;
      }

      assignments.push({
        作業員ID: bestStaff.ユーザーID,
        作業記録ID: task.作業記録ID,
        配置優先度: assignments.length + 1,
        移動時間: travelTime,
        予想作業時間: Math.round((task.作業時間 || 0) / efficiencyIndex),
        効率指数: efficiencyIndex
      });
    }
  }

  return assignments;
}

/** 対応ルール: 人員稼働率を算出する */
export function calculateStaffUtilization(records: WorkRecord[], totalAvailableHours: number): number {
  if (!records || records.length === 0 || totalAvailableHours <= 0) {
    return 0;
  }

  // 有効な作業時間のみを集計
  const totalWorkedHours = records
    .filter(record => record.作業時間 && record.作業時間 > 0 && record.承認状態 === '承認済み')
    .reduce((sum, record) => sum + (record.作業時間 || 0), 0);

  // 稼働率を百分率で算出（小数点第1位まで）
  const utilizationRate = (totalWorkedHours / totalAvailableHours) * 100;
  
  // 100%を上限とする
  return Math.min(Math.round(utilizationRate * 10) / 10, 100.0);
}