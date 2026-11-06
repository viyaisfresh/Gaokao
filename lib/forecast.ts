import type { Exam, ScoreForecast, ForecastInterval } from "@/types/schema";
import { genId } from "./db";

// 主观先验 V0.1 — 来自 handoff prompt，仅作信息有限时的初始规划
export const PRIOR_INTERVALS: ForecastInterval[] = [
  { range: "400 以下", probability: 0.12 },
  { range: "400–449", probability: 0.30 },
  { range: "450–479", probability: 0.28 },
  { range: "480–499", probability: 0.16 },
  { range: "500–519", probability: 0.08 },
  { range: "520–549", probability: 0.04 },
  { range: "550+", probability: 0.02 },
];

export const PRIOR_SCENARIOS = {
  conservative: [400, 440] as [number, number],
  normal: [440, 480] as [number, number],
  efficient: [480, 510] as [number, number],
  breakout: [510, 550] as [number, number],
};

const BASELINE_SCORE = 358.77;

interface IntervalBound {
  min: number;
  max: number;
}

const INTERVAL_BOUNDS: IntervalBound[] = [
  { min: 0, max: 400 },
  { min: 400, max: 450 },
  { min: 450, max: 480 },
  { min: 480, max: 500 },
  { min: 500, max: 520 },
  { min: 520, max: 550 },
  { min: 550, max: 800 },
];

function normalize(intervals: ForecastInterval[]): ForecastInterval[] {
  const total = intervals.reduce((s, i) => s + i.probability, 0);
  if (total === 0) return intervals;
  return intervals.map((i) => ({ ...i, probability: i.probability / total }));
}

// 标准正态累积分布函数 Φ(x) — Abramowitz & Stegun 近似
function normalCdf(x: number, mean: number, std: number): number {
  const z = (x - mean) / (std * Math.SQRT2);
  // erf 近似公式
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const erf = 1 - (((((0.254829592 * t + 0.284496736) * t) - 0.3275911) * t + 0.818523416) * t + 0.363784637) * t * Math.exp(-z * z);
  const phi = z >= 0 ? erf : 1 - erf;
  return Math.max(0, Math.min(1, phi));
}

// 计算样本标准差（无偏估计）
function sampleStd(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// 经验贝叶斯更新：先验 + 观察到的考试趋势
// 算法 v2（2026-11-06 优化）：
//   ① 锚点用「最近 2 次考试加权平均」（权重 0.6/0.4）+ 趋势外推 1 步
//   ② std 用实际样本标准差 × 1.5，下限 25（防过尖，防过宽）
//   ③ 区间概率用正态累积概率 Φ(max) - Φ(min)，不再用中点密度
//   ④ 置信度双因子：样本量 + 实际波动幅度（波动小则置信度更高）
export function recomputeForecast(
  comparableExams: Exam[],
  prior: ForecastInterval[] = PRIOR_INTERVALS
): ScoreForecast {
  const sampleSize = comparableExams.length;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (sampleSize === 0) {
    return {
      id: genId(),
      date: dateStr,
      version: "V0.1",
      sampleSize: 0,
      confidenceLevel: "low",
      intervals: prior,
      scenarios: PRIOR_SCENARIOS,
      notes: "主观先验，未使用任何可比考试数据。仅作规划讨论。",
    };
  }

  if (sampleSize === 1) {
    return {
      id: genId(),
      date: dateStr,
      version: "V0.1",
      sampleSize: 1,
      confidenceLevel: "low",
      intervals: prior,
      scenarios: PRIOR_SCENARIOS,
      notes: "仅有 1 次可比考试，维持主观先验。需 3–5 次可比考试才能开始校准。",
    };
  }

  // 按时间排序
  const sorted = [...comparableExams].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const scores = sorted.map((e) => e.totalScore);
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  // ① 锚点：最近 2 次考试加权平均（0.6 / 0.4），再叠加趋势外推 1 步
  const recentWeightedMean = latest.totalScore * 0.6 + prev.totalScore * 0.4;
  // 趋势：最近 2 次的斜率（每步变化）
  const trendStep = latest.totalScore - prev.totalScore;
  // 外推 1 步（半个步长，避免过度外推）
  const projectedMean = recentWeightedMean + trendStep * 0.3;

  // ② 标准差：实际样本标准差 × 1.5，下限 25
  const empiricalStd = sampleStd(scores);
  const projectedStd = Math.max(25, empiricalStd * 1.5);

  // ③ 区间概率：正态累积概率 Φ(max) - Φ(min)
  const evidenceIntervals: ForecastInterval[] = INTERVAL_BOUNDS.map((b, idx) => ({
    range: prior[idx].range,
    probability: normalCdf(b.max, projectedMean, projectedStd) -
                 normalCdf(b.min, projectedMean, projectedStd),
  }));
  const normalizedEvidence = normalize(evidenceIntervals);

  // 先验权重随样本量递减
  const priorWeight = Math.max(0.2, 1 - sampleSize * 0.15);
  const evidenceWeight = 1 - priorWeight;

  // 融合
  const blended = normalize(
    prior.map((iv, idx) => ({
      range: iv.range,
      probability:
        iv.probability * priorWeight +
        normalizedEvidence[idx].probability * evidenceWeight,
    }))
  );

  // 4 档情景：基于 projectedMean 动态调整
  const base = projectedMean;
  const scenarios = {
    conservative: [Math.round(base - 40), Math.round(base - 10)] as [number, number],
    normal: [Math.round(base - 10), Math.round(base + 20)] as [number, number],
    efficient: [Math.round(base + 20), Math.round(base + 50)] as [number, number],
    breakout: [Math.round(base + 50), Math.round(base + 90)] as [number, number],
  };

  // ④ 置信度双因子：样本量 + 实际波动幅度
  // 波动幅度 = empiricalStd / BASELINE_SCORE，越小越稳定
  const volatilityRatio = empiricalStd / BASELINE_SCORE;
  const stableByVolatility = volatilityRatio < 0.05; // 波动 < 5% 视为稳定
  let confidenceLevel: ScoreForecast["confidenceLevel"];
  if (sampleSize >= 5 && stableByVolatility) {
    confidenceLevel = "high";
  } else if (sampleSize >= 3 && volatilityRatio < 0.10) {
    confidenceLevel = "medium";
  } else if (sampleSize >= 3) {
    confidenceLevel = "low"; // 样本够但波动大，仍 low
  } else {
    confidenceLevel = "low";
  }

  const changePct = (latest.totalScore - BASELINE_SCORE) / BASELINE_SCORE;
  const trendDirection = trendStep > 0 ? "上行" : trendStep < 0 ? "下行" : "持平";

  return {
    id: genId(),
    date: dateStr,
    version: `V0.${1 + Math.floor(sampleSize / 2)}`,
    sampleSize,
    confidenceLevel,
    intervals: blended,
    scenarios,
    notes: `算法 v2 · 基于 ${sampleSize} 次可比考试。最近 2 次加权均值 ${recentWeightedMean.toFixed(2)}，趋势 ${trendDirection}（${trendStep > 0 ? "+" : ""}${trendStep.toFixed(2)} / 步），projectedMean ${projectedMean.toFixed(2)}。样本标准差 ${empiricalStd.toFixed(2)}（波动率 ${(volatilityRatio * 100).toFixed(1)}%）。先验权重 ${(priorWeight * 100).toFixed(0)}%。置信度 ${confidenceLevel}。`,
  };
}

export function shouldTriggerRecompute(exam: Exam): boolean {
  // 仅可比考试触发重算
  return (
    !exam.isArchived &&
    exam.subjectScores.some((s) => s.comparability === "comparable")
  );
}

