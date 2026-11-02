import scoringConfig from "@/config/scoring.json";
import type { ReviewAttempt, WrongItem, Exam } from "@/types/schema";

// 权重锁死：从 config 读，但运行时不可覆盖
export const WEIGHTS = {
  execution: scoringConfig.execution.weight,
  learningEffect: scoringConfig.learningEffect.weight,
  progress: scoringConfig.progress.weight,
} as const;

export const LE_SUB_WEIGHTS = scoringConfig.learningEffect.subWeights;
export const PROGRESS_SUB_WEIGHTS = scoringConfig.progress.subWeights;

// 学习效果分阶段计分（按 attempt 类型）
const STAGE_SCORE: Record<ReviewAttempt, number> = {
  first_pass: 1.0,
  after_hint: 0.6,
  after_key_step: 0.3,
};

const DELAYED_RETEST_RECOVERY = 0.5; // 延迟复测通过补回 50%

export interface LearningEffectInput {
  retestScore: number;       // /100, 来自错题复测
  feynmanScore: number;      // /100, AI 初评 + 姐姐抽查
  transferScore: number;     // /100, 新题迁移
}

export function calcLearningEffect(input: LearningEffectInput): number {
  const { retestScore, feynmanScore, transferScore } = input;
  const sw = LE_SUB_WEIGHTS;
  const raw =
    (retestScore * sw.retest + feynmanScore * sw.feynman + transferScore * sw.transfer) /
    (sw.retest + sw.feynman + sw.transfer);
  return (raw / 100) * WEIGHTS.learningEffect;
}

// 从单条 WrongItem 的 reviewResults 算出该题的复测得分（0-100）
export function scoreWrongItemReview(item: WrongItem): number {
  if (item.reviewResults.length === 0) return 0;
  // 找最近一次通过的 attempt
  const passed = [...item.reviewResults]
    .reverse()
    .find((r) => r.passed);
  if (!passed) {
    // 全部未通过：若提示次数 >= 2 视为 two_failures
    if (item.hintCount >= 2) return 0;
    return 0;
  }
  const stageScore = STAGE_SCORE[passed.attempt];
  // 若首次失败后延迟复测通过，按 stageScore * (1 - recovery_penalty) 补回
  // 简化：若该题存在失败的 first_pass 且后续通过，视为延迟复测
  const hasFailedFirst = item.reviewResults.some(
    (r) => r.attempt === "first_pass" && !r.passed
  );
  if (hasFailedFirst && passed.attempt !== "first_pass") {
    return stageScore * 100 * (1 - DELAYED_RETEST_RECOVERY + DELAYED_RETEST_RECOVERY * 1);
  }
  return stageScore * 100;
}

export function calcRetestScore(items: WrongItem[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, i) => sum + scoreWrongItemReview(i), 0);
  return total / items.length;
}

// 进步评分
export interface ProgressInput {
  baselineTotal: number;        // 358.77
  latestComparableExams: Exam[];// 可比考试序列（按时间）
  masteredPoints: number;
  totalPoints: number;
}

export function calcProgress(input: ProgressInput): number {
  const { baselineTotal, latestComparableExams, masteredPoints, totalPoints } = input;
  const sw = PROGRESS_SUB_WEIGHTS;

  // 考试进步：相对基线的实际百分比变化，不封顶不设底
  let examImprovementScore = 0;
  if (latestComparableExams.length > 0) {
    const latest = latestComparableExams[latestComparableExams.length - 1];
    const pctChange = (latest.totalScore - baselineTotal) / baselineTotal;
    // 映射到 0-100：0% 变化 = 50（基线维持），+10% = 100，-10% = 0
    examImprovementScore = Math.max(0, Math.min(100, 50 + pctChange * 500));
  }

  // 知识掌握度
  const masteryScore =
    totalPoints > 0 ? (masteredPoints / totalPoints) * 100 : 0;

  const raw =
    (examImprovementScore * sw.examImprovement +
      masteryScore * sw.knowledgeMastery) /
    (sw.examImprovement + sw.knowledgeMastery);

  return (raw / 100) * WEIGHTS.progress;
}

export interface ExecutionInput {
  tasksTotal: number;
  tasksCompleted: number;
  tasksApprovedDelayed: number; // 姐姐批准延期，不计缺失
}

export function calcExecution(input: ExecutionInput): number {
  const { tasksTotal, tasksCompleted, tasksApprovedDelayed } = input;
  if (tasksTotal === 0) return 0;
  const effectiveTotal = tasksTotal - tasksApprovedDelayed;
  const rate = tasksCompleted / effectiveTotal;
  return Math.min(1, rate) * WEIGHTS.execution;
}

export interface TotalScoreInput {
  execution: ExecutionInput;
  learningEffect: LearningEffectInput;
  progress: ProgressInput;
}

export function calcTotalScore(input: TotalScoreInput): {
  total: number;
  breakdown: { execution: number; learningEffect: number; progress: number };
} {
  const execution = calcExecution(input.execution);
  const learningEffect = calcLearningEffect(input.learningEffect);
  const progress = calcProgress(input.progress);
  return {
    total: execution + learningEffect + progress,
    breakdown: { execution, learningEffect, progress },
  };
}

export const TOTAL_MAX = WEIGHTS.execution + WEIGHTS.learningEffect + WEIGHTS.progress;
