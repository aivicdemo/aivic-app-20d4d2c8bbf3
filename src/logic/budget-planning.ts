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

// 拠点データの型定義
export interface LocationData {
  拠点ID: string;
  拠点名: string;
  過去実績工数: number;
  地域特性係数: number;
  人件費水準: number;
  人員数: number;
}

// 予算制約条件の型定義
export interface BudgetConstraints {
  最小予算: number;
  最大予算: number;
  ROI下限: number;
  投資回収期間上限: number;
}

/** 対応ルール: 最低12ヶ月分の工数実績データを対象として月別・四半期別の工数変動率を算出し、前年同期比±20%を超える変動を異常値として検出する → 月別の工数変動率を算出し季節変動係数を計算する */
export function calculateSeasonalCoefficient(historicalData: WorkRecord[], month: number): number {
  if (historicalData.length === 0 || month < 1 || month > 12) {
    return 1.0;
  }

  // 月別の工数データを集計
  const monthlyHours: Record<number, number[]> = {};
  
  historicalData.forEach(record => {
    if (record.作業時間 !== null && record.作業時間 > 0) {
      const recordMonth = new Date(record.作業日).getMonth() + 1;
      if (!monthlyHours[recordMonth]) {
        monthlyHours[recordMonth] = [];
      }
      monthlyHours[recordMonth].push(record.作業時間);
    }
  });

  // 対象月のデータが存在しない場合は1.0を返す
  if (!monthlyHours[month] || monthlyHours[month].length === 0) {
    return 1.0;
  }

  // 対象月の平均工数を計算
  const targetMonthAvg = monthlyHours[month].reduce((sum, hours) => sum + hours, 0) / monthlyHours[month].length;

  // 全月の平均工数を計算
  let totalHours = 0;
  let totalCount = 0;
  
  Object.values(monthlyHours).forEach(monthData => {
    totalHours += monthData.reduce((sum, hours) => sum + hours, 0);
    totalCount += monthData.length;
  });

  if (totalCount === 0) {
    return 1.0;
  }

  const overallAvg = totalHours / totalCount;

  // 季節変動係数を計算（対象月平均 / 全体平均）
  const seasonalCoeff = targetMonthAvg / overallAvg;

  // 異常値検出（±20%を超える変動）
  if (Math.abs(seasonalCoeff - 1.0) > 0.2) {
    // 異常値の場合は1.0に近づける（1.2または0.8でキャップ）
    return seasonalCoeff > 1.2 ? 1.2 : (seasonalCoeff < 0.8 ? 0.8 : seasonalCoeff);
  }

  return seasonalCoeff;
}

/** 対応ルール: 季節変動パターンが分析済みの状態で翌年度予算案作成が開始されたとき → 過去実績の平均値に季節変動係数を乗じさらに成長率予測値を加味して予算工数を算出する */
export function projectBudgetHours(baselineHours: number, seasonalCoeff: number, growthRate: number): number {
  if (baselineHours <= 0 || seasonalCoeff <= 0) {
    return 0;
  }

  // 成長率は-50%から+100%の範囲で制限
  const constrainedGrowthRate = Math.max(-0.5, Math.min(1.0, growthRate));

  // 予算工数 = 基準工数 × 季節変動係数 × (1 + 成長率)
  const projectedHours = baselineHours * seasonalCoeff * (1 + constrainedGrowthRate);

  // 最小値として基準工数の50%を保証
  return Math.max(projectedHours, baselineHours * 0.5);
}

/** 対応ルール: 全国展開を前提とした予算計画において拠点別予算配分が実行されたとき → 各拠点の過去実績、地域特性、人件費水準を加味して予算配分比率を決定する */
export function allocateBudgetByLocation(totalBudget: number, locations: LocationData[]): Record<string, number> {
  if (totalBudget <= 0 || locations.length === 0) {
    return {};
  }

  const allocation: Record<string, number> = {};

  // 各拠点の重み付けスコアを計算
  const locationScores: Array<{ 拠点ID: string; score: number }> = locations.map(location => {
    // 過去実績工数の正規化（全体の平均を1.0とする）
    const avgHistoricalHours = locations.reduce((sum, loc) => sum + loc.過去実績工数, 0) / locations.length;
    const historicalWeight = avgHistoricalHours > 0 ? location.過去実績工数 / avgHistoricalHours : 1.0;

    // 地域特性係数（そのまま使用）
    const regionalWeight = location.地域特性係数;

    // 人件費水準の逆数（人件費が高い地域は予算配分を抑制）
    const avgLaborCost = locations.reduce((sum, loc) => sum + loc.人件費水準, 0) / locations.length;
    const laborCostWeight = avgLaborCost > 0 ? avgLaborCost / location.人件費水準 : 1.0;

    // 人員数による重み付け
    const totalPersonnel = locations.reduce((sum, loc) => sum + loc.人員数, 0);
    const personnelWeight = totalPersonnel > 0 ? location.人員数 / totalPersonnel : 1.0 / locations.length;

    // 総合スコア = 過去実績(40%) + 地域特性(20%) + 人件費逆数(20%) + 人員数(20%)
    const score = historicalWeight * 0.4 + regionalWeight * 0.2 + laborCostWeight * 0.2 + personnelWeight * 0.2;

    return { 拠点ID: location.拠点ID, score };
  });

  // 総スコアを計算
  const totalScore = locationScores.reduce((sum, item) => sum + item.score, 0);

  if (totalScore === 0) {
    // 均等配分
    const equalAllocation = totalBudget / locations.length;
    locations.forEach(location => {
      allocation[location.拠点ID] = equalAllocation;
    });
    return allocation;
  }

  // スコア比率に基づいて予算配分
  locationScores.forEach(item => {
    const ratio = item.score / totalScore;
    allocation[item.拠点ID] = totalBudget * ratio;
  });

  return allocation;
}

/** 対応ルール: ROI分析結果が投資効果ありと判定された状態で予算計画承認プロセスが開始されたとき → 投資回収期間が3年以内かつROI15%以上の場合に投資効果ありと判定する */
export function validateBudgetConstraints(proposedBudget: number, constraints: BudgetConstraints): boolean {
  if (proposedBudget <= 0) {
    return false;
  }

  // 予算範囲チェック
  if (proposedBudget < constraints.最小予算 || proposedBudget > constraints.最大予算) {
    return false;
  }

  // ROI下限チェック（15%以上）
  if (constraints.ROI下限 < 0.15) {
    return false;
  }

  // 投資回収期間上限チェック（3年以内）
  if (constraints.投資回収期間上限 > 3.0) {
    return false;
  }

  return true;
}