// 作業記録の型定義
export interface WorkRecord {
  作業記録ID: string;
  作業員ID: string;
  作業日: Date;
  作業開始時刻: Date;
  作業終了時刻: Date | null;
  作業時間: number | null;
  プロジェクト名: string;
  作業場所: string;
  作業種別: string;
  作業内容: string;
  進捗状況: string;
  備考: string | null;
  承認状態: string;
  承認者ID: string | null;
  承認日時: Date | null;
  作成日時: Date;
  更新日時: Date;
  作成者ID: string;
}

// 中断記録の型定義
export interface InterruptionRecord {
  中断記録ID: string;
  作業記録ID: string;
  中断開始日時: Date;
  中断終了日時: Date | null;
  中断理由区分: string;
  中断理由詳細: string | null;
  中断時間: number | null;
  影響度: string | null;
  対応状況: string;
  記録者ID: string;
  作成日時: Date;
  更新日時: Date;
}

// 作業項目マスタの型定義
export interface WorkItemMaster {
  作業項目ID: string;
  作業項目コード: string;
  作業項目名: string;
  作業項目説明: string | null;
  カテゴリ: string | null;
  標準工数時間: number | null;
  表示順序: number;
  有効フラグ: boolean;
  作成日時: Date;
  更新日時: Date;
  作成者ID: string;
  更新者ID: string;
}

// 効率ランキング結果の型定義
export interface EfficiencyRanking {
  workerId: string;
  efficiency: number;
  rank: number;
}

// 季節変動分析結果の型定義
export interface SeasonalVariation {
  period: string;
  variationRate: number;
}

// ボトルネック検出の閾値設定
export interface BottleneckThresholds {
  progressRate: number;
  deviationRate: number;
}

/** 対応ルール: 過去データとの比較により効率低下を検出し → 閾値を下回る場合はアラート通知する */
export function detectEfficiencyDecline(
  currentEfficiency: number,
  historicalAverage: number,
  threshold: number
): boolean {
  const efficiencyDeclineRate = (historicalAverage - currentEfficiency) / historicalAverage;
  return efficiencyDeclineRate > threshold;
}

/** 対応ルール: 進捗率が80%未満または乖離率が20%以上の作業を → ボトルネックとして自動検出する */
export function identifyBottlenecks(
  records: WorkRecord[],
  thresholds: BottleneckThresholds
): WorkRecord[] {
  return records.filter(record => {
    // 作業時間が記録されていない場合はスキップ
    if (!record.作業時間) {
      return false;
    }

    // 進捗率の計算（作業時間 / 標準工数時間 * 100）
    // 標準工数時間は作業項目マスタから取得する想定だが、ここでは8時間（480分）を基準とする
    const standardWorkTime = 480; // 8時間を分単位で表現
    const progressRate = (record.作業時間 / standardWorkTime) * 100;
    
    // 乖離率の計算（|実績 - 標準| / 標準 * 100）
    const deviationRate = Math.abs(record.作業時間 - standardWorkTime) / standardWorkTime * 100;

    // 進捗率が閾値未満または乖離率が閾値以上の場合にボトルネックと判定
    return progressRate < thresholds.progressRate || deviationRate >= thresholds.deviationRate;
  });
}

/** 対応ルール: 各拠点の時間当たり作業完了件数を算出し → 平均値からの乖離率で生産性ランキングを作成する */
export function calculateEfficiencyRanking(records: WorkRecord[]): EfficiencyRanking[] {
  // 作業員別の効率を計算
  const workerEfficiencies = new Map<string, number>();
  
  records.forEach(record => {
    if (record.作業時間 && record.進捗状況 === '完了') {
      const workerId = record.作業員ID;
      const efficiency = 60 / record.作業時間; // 時間当たり作業完了件数（1時間 = 60分）
      
      if (workerEfficiencies.has(workerId)) {
        const currentEfficiency = workerEfficiencies.get(workerId)!;
        workerEfficiencies.set(workerId, (currentEfficiency + efficiency) / 2);
      } else {
        workerEfficiencies.set(workerId, efficiency);
      }
    }
  });

  // 効率の配列を作成
  const efficiencyArray = Array.from(workerEfficiencies.entries()).map(([workerId, efficiency]) => ({
    workerId,
    efficiency
  }));

  // 効率でソート（降順）
  efficiencyArray.sort((a, b) => b.efficiency - a.efficiency);

  // ランキングを付与
  return efficiencyArray.map((item, index) => ({
    workerId: item.workerId,
    efficiency: item.efficiency,
    rank: index + 1
  }));
}

/** 対応ルール: 月別・四半期別の工数変動率を算出し → 前年同期比±20%を超える変動を異常値として検出する */
export function analyzeSeasonalVariation(
  records: WorkRecord[],
  period: 'monthly' | 'quarterly'
): SeasonalVariation[] {
  const periodMap = new Map<string, number[]>();
  
  records.forEach(record => {
    if (record.作業時間) {
      const date = new Date(record.作業日);
      let periodKey: string;
      
      if (period === 'monthly') {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        periodKey = `${date.getFullYear()}-Q${quarter}`;
      }
      
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, []);
      }
      periodMap.get(periodKey)!.push(record.作業時間);
    }
  });

  // 各期間の平均工数を計算
  const periodAverages = new Map<string, number>();
  periodMap.forEach((workTimes, periodKey) => {
    const average = workTimes.reduce((sum, time) => sum + time, 0) / workTimes.length;
    periodAverages.set(periodKey, average);
  });

  // 前年同期比の変動率を計算
  const variations: SeasonalVariation[] = [];
  
  periodAverages.forEach((currentAverage, periodKey) => {
    const [year, periodPart] = periodKey.split('-');
    const previousYear = String(parseInt(year) - 1);
    const previousPeriodKey = `${previousYear}-${periodPart}`;
    
    if (periodAverages.has(previousPeriodKey)) {
      const previousAverage = periodAverages.get(previousPeriodKey)!;
      const variationRate = ((currentAverage - previousAverage) / previousAverage) * 100;
      
      // ±20%を超える変動を記録
      if (Math.abs(variationRate) > 20) {
        variations.push({
          period: periodKey,
          variationRate: variationRate
        });
      }
    }
  });

  return variations;
}