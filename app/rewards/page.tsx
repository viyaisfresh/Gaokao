"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDB, genId } from "@/lib/db";
import { todayStr } from "@/lib/review-scheduler";
import {
  calcTotalScore,
  calcRetestScore,
  calcLearningEffect,
  calcProgress,
  calcExecution,
  TOTAL_MAX,
  WEIGHTS,
} from "@/lib/scoring";
import { BASELINE_SCORE } from "@/lib/constants";
import { Card, SectionHead, EmptyState } from "@/components/ui/Card";
import { useState } from "react";
import type { RewardLedger } from "@/types/schema";

export default function RewardsPage() {
  const data = useLiveQuery(async () => {
    const db = getDB();
    const [exams, wrongItems, rewards] = await Promise.all([
      db.exams.toArray(),
      db.wrongItems.toArray(),
      db.rewards.toArray(),
    ]);
    return { exams, wrongItems, rewards };
  }, []);

  const [executionTasksTotal, setExecutionTasksTotal] = useState(10);
  const [executionTasksDone, setExecutionTasksDone] = useState(0);
  const [executionApproved, setExecutionApproved] = useState(0);
  const [feynmanScore, setFeynmanScore] = useState(0);
  const [transferScore, setTransferScore] = useState(0);
  const [rewardAction, setRewardAction] = useState("");
  const [cashReward, setCashReward] = useState("");

  if (!data) {
    return <div className="text-muted text-sm py-10 text-center">加载中…</div>;
  }

  const { exams, wrongItems, rewards } = data;
  const comparableExams = exams.filter(
    (e) => !e.isArchived && e.subjectScores.some((s) => s.comparability === "comparable")
  );
  const openItems = wrongItems.filter((w) => w.status === "open");
  const retestScore = calcRetestScore(openItems);

  const total = calcTotalScore({
    execution: {
      tasksTotal: executionTasksTotal,
      tasksCompleted: executionTasksDone,
      tasksApprovedDelayed: executionApproved,
    },
    learningEffect: {
      retestScore,
      feynmanScore,
      transferScore,
    },
    progress: {
      baselineTotal: BASELINE_SCORE,
      latestComparableExams: comparableExams,
      masteredPoints: wrongItems.filter((w) => w.status === "mastered").length,
      totalPoints: wrongItems.length,
    },
  });

  async function logReward() {
    if (!rewardAction.trim()) return;
    const db = getDB();
    const entry: RewardLedger = {
      id: genId(),
      date: todayStr(),
      action: rewardAction.trim(),
      scoreBreakdown: total.breakdown,
      cashReward: cashReward ? parseFloat(cashReward) : undefined,
    };
    await db.rewards.add(entry);
    setRewardAction("");
    setCashReward("");
  }

  return (
    <div className="space-y-4">
      <SectionHead title="评分与激励" />

      <div className="callout">
        权重锁定：执行 {WEIGHTS.execution} / 学习效果 {WEIGHTS.learningEffect} / 进步 {WEIGHTS.progress}。结构可在 config/scoring.json 调，权重不可改。
      </div>

      <Card>
        <h3 className="text-base font-bold mb-3">本周评分计算</h3>
        <div className="text-4xl font-extrabold tracking-tight mb-3">
          {total.total.toFixed(1)}
          <span className="text-base text-muted font-normal"> / {TOTAL_MAX}</span>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">执行：约定任务总数</label>
              <input
                type="number"
                className="input"
                value={executionTasksTotal}
                onChange={(e) => setExecutionTasksTotal(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="label">执行：已完成</label>
              <input
                type="number"
                className="input"
                value={executionTasksDone}
                onChange={(e) => setExecutionTasksDone(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="label">姐姐批准延期（不计缺失）</label>
              <input
                type="number"
                className="input"
                value={executionApproved}
                onChange={(e) => setExecutionApproved(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="label">费曼讲解得分 /100</label>
              <input
                type="number"
                min={0}
                max={100}
                className="input"
                value={feynmanScore}
                onChange={(e) => setFeynmanScore(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="label">新题迁移得分 /100</label>
              <input
                type="number"
                min={0}
                max={100}
                className="input"
                value={transferScore}
                onChange={(e) => setTransferScore(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-[#f8f5ee] rounded p-2">
              <div className="text-muted">执行 /{WEIGHTS.execution}</div>
              <div className="font-bold text-base">
                {total.breakdown.execution.toFixed(1)}
              </div>
            </div>
            <div className="bg-[#f8f5ee] rounded p-2">
              <div className="text-muted">学习 /{WEIGHTS.learningEffect}</div>
              <div className="font-bold text-base">
                {total.breakdown.learningEffect.toFixed(1)}
              </div>
            </div>
            <div className="bg-[#f8f5ee] rounded p-2">
              <div className="text-muted">进步 /{WEIGHTS.progress}</div>
              <div className="font-bold text-base">
                {total.breakdown.progress.toFixed(1)}
              </div>
            </div>
          </div>

          <div className="border-t border-line pt-3">
            <h4 className="text-sm font-bold mb-2">记录激励动作</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                className="input md:col-span-2"
                placeholder="动作（上榜 / 加推 / 里程碑 / 复测通过 / 费曼完成）"
                value={rewardAction}
                onChange={(e) => setRewardAction(e.target.value)}
              />
              <input
                className="input"
                placeholder="现金奖励（元）"
                type="number"
                value={cashReward}
                onChange={(e) => setCashReward(e.target.value)}
              />
            </div>
            <button className="btn mt-2 text-sm" onClick={logReward}>
              记入台账
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-bold mb-3">激励台账</h3>
        {rewards.length === 0 ? (
          <EmptyState message="尚无激励记录" />
        ) : (
          <div className="space-y-2">
            {[...rewards]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-2 text-sm border-b border-line py-2 last:border-0"
                >
                  <div className="flex-1">
                    <div className="font-medium">{r.action}</div>
                    <div className="text-[11px] text-muted">
                      {r.date} ·{" "}
                      执行 {r.scoreBreakdown.execution?.toFixed(1) ?? "—"} /{" "}
                      学习 {r.scoreBreakdown.learningEffect?.toFixed(1) ?? "—"} /{" "}
                      进步 {r.scoreBreakdown.progress?.toFixed(1) ?? "—"}
                      {r.cashReward ? ` · 现金 ¥${r.cashReward}` : ""}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
