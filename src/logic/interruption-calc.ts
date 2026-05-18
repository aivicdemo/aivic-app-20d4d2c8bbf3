// 中断記録の型定義
export interface InterruptionRecord {
  中断記録ID: string;
  作業記録ID: string;
  中断開始日時: string;
  中断終了日時: string | null;
  中断理由区分: string;
  中断理由詳細: string | null;
  中断時間: number | null;
  影響度: string | null;
  対応状況: string;
  記録者ID: string;
  作成日時: string;
  更新日時: string;
}

// 中断理由別分析結果の型定義
export interface InterruptionAnalysis {
  reason: string;
  frequency: number;
  averageTime: number;
}

/** 対応ルール: 中断開始時刻と終了時刻が存在する状態で → 中断開始時刻と終了時刻の差分を自動計算して待機時間として記録する */
export function calculateInterruptionDuration(startTime: string, endTime: string | null): number | null {
  if (!endTime) {
    return null;
  }
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return null;
  }
  
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    return null;
  }
  
  return Math.floor(diffMs / (1000 * 60)); // 分単位で返す
}

/** 対応ルール: 中断時間が記録された状態で → 待機時間が8時間を超える場合はアラートを表示し承認者の確認を必須とする */
export function isLongInterruption(interruptionMinutes: number): boolean {
  const eightHoursInMinutes = 8 * 60; // 8時間 = 480分
  return interruptionMinutes > eightHoursInMinutes;
}

/** 対応ルール: 中断・待機時間のデータが蓄積されている状態で → 中断理由別の発生頻度と平均時間を集計し、ボトルネック要因を特定する */
export function analyzeInterruptionFrequency(interruptions: InterruptionRecord[]): InterruptionAnalysis[] {
  const reasonMap = new Map<string, { count: number; totalTime: number }>();
  
  interruptions.forEach(interruption => {
    const reason = interruption.中断理由区分;
    const time = interruption.中断時間 || 0;
    
    if (reasonMap.has(reason)) {
      const existing = reasonMap.get(reason)!;
      existing.count += 1;
      existing.totalTime += time;
    } else {
      reasonMap.set(reason, { count: 1, totalTime: time });
    }
  });
  
  const results: InterruptionAnalysis[] = [];
  reasonMap.forEach((data, reason) => {
    results.push({
      reason,
      frequency: data.count,
      averageTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0
    });
  });
  
  // 発生頻度の降順でソート
  return results.sort((a, b) => b.frequency - a.frequency);
}

/** 対応ルール: 中断・待機時間のデータが蓄積されている状態で → 中断理由別の発生頻度と平均時間を集計し、ボトルネック要因を特定する */
export function detectBottleneckFactors(interruptions: InterruptionRecord[]): string[] {
  const analysis = analyzeInterruptionFrequency(interruptions);
  
  if (analysis.length === 0) {
    return [];
  }
  
  // 全体の平均発生頻度を計算
  const totalFrequency = analysis.reduce((sum, item) => sum + item.frequency, 0);
  const averageFrequency = totalFrequency / analysis.length;
  
  // 全体の平均中断時間を計算
  const totalAverageTime = analysis.reduce((sum, item) => sum + item.averageTime, 0);
  const overallAverageTime = totalAverageTime / analysis.length;
  
  // ボトルネック要因の判定基準：
  // 1. 発生頻度が平均の1.5倍以上
  // 2. 平均中断時間が全体平均の1.2倍以上
  const bottlenecks: string[] = [];
  
  analysis.forEach(item => {
    const isHighFrequency = item.frequency >= averageFrequency * 1.5;
    const isLongDuration = item.averageTime >= overallAverageTime * 1.2;
    
    if (isHighFrequency || isLongDuration) {
      bottlenecks.push(item.reason);
    }
  });
  
  return bottlenecks;
}