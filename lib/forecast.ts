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

function clamp(p: number): number {
  return Math.max(0, Math.min(1, p));
}

function normalize(intervals: ForecastInterval[]): ForecastInterval[] {
  const total = intervals.reduce((s, i) => s + i.probability, 0);
  if (total === 0) return intervals;
  return intervals.map((i) => ({ ...i, probability: i.probability / total }));
}

// 把一个总分映射到所在区间，给该区间加权重
function scoreToIntervalIdx(score: number): number {
  for (let i = 0; i < INTERVAL_BOUNDS.length; i++) {
    if (score >= INTERVAL_BOUNDS[i].min && score < INTERVAL_BOUNDS[i].max) return i;
  }
  return INTERVAL_BOUNDS.length - 1;
}

// 经验贝叶斯更新：先验 + 观察到的考试趋势
// 简化模型：根据最近可比考试相对基线的变化，调整各区间概率
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

  // 2 次以上：用趋势更新
  // 先验权重随样本量递减
  const priorWeight = Math.max(0.2, 1 - sampleSize * 0.15);
  const evidenceWeight = 1 - priorWeight;

  // 计算最近考试相对基线的平均变化和趋势方向
  const sorted = [...comparableExams].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const latest = sorted[sorted.length - 1];
  const changePct = (latest.totalScore - BASELINE_SCORE) / BASELINE_SCORE;

  // 把趋势转化为各区间权重
  // 假设成绩服从以"基线 + 趋势"为中心的正态分布
  const projectedMean = BASELINE_SCORE * (1 + changePct);
  const projectedStd = 30 + Math.max(0, 10 - sampleSize * 2); // 样本少则方差大

  const evidenceIntervals: ForecastInterval[] = PRIOR_INTERVALS.map((iv, idx) => {
    const b = INTERVAL_BOUNDS[idx];
    const mid = (b.min + b.max) / 2;
    // 正态分布概率密度（简化）
    const density = Math.exp(
      -Math.pow(mid - projectedMean, 2) / (2 * projectedStd * projectedStd)
    );
    return { range: iv.range, probability: density };
  });
  const normalizedEvidence = normalize(evidenceIntervals);

  // 融合
  const blended = normalize(
    PRIOR_INTERVALS.map((iv, idx) => ({
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

  const confidenceLevel: ScoreForecast["confidenceLevel"] =
    sampleSize >= 5 ? "high" : sampleSize >= 3 ? "medium" : "low";

  return {
    id: genId(),
    date: dateStr,
    version: `V0.${1 + Math.floor(sampleSize / 2)}`,
    sampleSize,
    confidenceLevel,
    intervals: blended,
    scenarios,
    notes: `基于 ${sampleSize} 次可比考试校准。最近考试 ${latest.totalScore}（基线 ${BASELINE_SCORE}，变化 ${changePct > 0 ? "+" : ""}${(changePct * 100).toFixed(1)}%）。先验权重 ${(priorWeight * 100).toFixed(0)}%。置信度 ${confidenceLevel}。`,
  };
}

export function shouldTriggerRecompute(exam: Exam): boolean {
  // 仅可比考试触发重算
  return (
    !exam.isArchived &&
    exam.subjectScores.some((s) => s.comparability === "comparable")
  );
}
