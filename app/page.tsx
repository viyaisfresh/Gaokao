"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { getDB } from "@/lib/db";
import { todayStr, parseDate } from "@/lib/review-scheduler";
import { SUBJECT_LABELS, BASELINE_SCORE, GAOKAO_DATE, ARCHIVED_SCORE } from "@/lib/constants";
import { Card, SectionHead, EmptyState } from "@/components/ui/Card";
import { DailyActionCard } from "@/components/DailyActionCard";
import { calcRetestScore, calcTotalScore, TOTAL_MAX } from "@/lib/scoring";
import type { Exam, WrongItem, VocabTest } from "@/types/schema";

export default function DashboardPage() {
  const today = todayStr();
  const todayTime = parseDate(today).getTime();
  const gaokaoTime = parseDate(GAOKAO_DATE).getTime();
  const daysToGaokao = Math.ceil((gaokaoTime - todayTime) / 86400000);

  const data = useLiveQuery(async () => {
    const db = getDB();
    const [exams, wrongItems, vocabTests, reviewTasks] = await Promise.all([
      db.exams.toArray(),
      db.wrongItems.toArray(),
      db.vocabTests.toArray(),
      db.reviewTasks.toArray(),
    ]);
    return { exams, wrongItems, vocabTests, reviewTasks };
  }, []);

  if (!data) {
    return <div className="text-muted text-sm py-10 text-center">加载中…</div>;
  }

  const { exams, wrongItems, vocabTests, reviewTasks } = data;

  const baselineExam = exams.find((e) => e.isBaseline);
  const archivedExam = exams.find((e) => e.isArchived);
  const comparableExams = exams.filter(
    (e) => !e.isArchived && e.subjectScores.some((s) => s.comparability === "comparable")
  );
  const latestComparable = comparableExams.sort((a, b) =>
    b.date.localeCompare(a.date)
  )[0];

  const todayReview = reviewTasks.filter(
    (t) => !t.completedDate && t.scheduledDate === today
  ).length;
  const overdueReview = reviewTasks.filter(
    (t) => !t.completedDate && t.scheduledDate < today
  ).length;

  const openWrongItems = wrongItems.filter((w) => w.status === "open");
  const retestScore = calcRetestScore(openWrongItems);

  // 词汇 D7 保持率：粗略统计——有 D7 复测记录的词中通过的比例
  // 简化：取最近一次 vocabTest 的正确率作为展示
  const latestVocab = vocabTests.sort((a, b) => b.date.localeCompare(a.date))[0];
  const vocabCorrectRate = latestVocab
    ? latestVocab.results.filter((r) => r.classification === "C").length /
      latestVocab.results.length
    : null;

  // 本周评分（简化版：基于现有数据估算）
  const totalScore = calcTotalScore({
    execution: { tasksTotal: 0, tasksCompleted: 0, tasksApprovedDelayed: 0 },
    learningEffect: {
      retestScore,
      feynmanScore: 0,
      transferScore: 0,
    },
    progress: {
      baselineTotal: BASELINE_SCORE,
      latestComparableExams: comparableExams,
      masteredPoints: wrongItems.filter((w) => w.status === "mastered").length,
      totalPoints: wrongItems.length,
    },
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <div className="text-xs text-muted">距高考</div>
          <div className="text-2xl font-extrabold tracking-tight mt-1">{daysToGaokao}</div>
          <div className="text-[11px] text-muted">天（{GAOKAO_DATE}）</div>
        </Card>
        <Card>
          <div className="text-xs text-muted">今日待复测</div>
          <div className="text-2xl font-extrabold tracking-tight mt-1 text-brand-orange">
            {todayReview}
          </div>
          <div className="text-[11px] text-muted">
            {overdueReview > 0 && <span className="text-brand-red">超期 {overdueReview} </span>}
            <Link href="/review" className="text-brand-orange underline">查看队列</Link>
          </div>
        </Card>
        <Card>
          <div className="text-xs text-muted">当前基线</div>
          <div className="text-2xl font-extrabold tracking-tight mt-1">
            {baselineExam ? baselineExam.totalScore.toFixed(2) : "—"}
          </div>
          <div className="text-[11px] text-muted">
            {archivedExam ? `存档 ${archivedExam.totalScore}（不参与计算）` : "未设基线"}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-muted">最近可比考试</div>
          <div className="text-2xl font-extrabold tracking-tight mt-1">
            {latestComparable ? latestComparable.totalScore.toFixed(2) : "—"}
          </div>
          <div className="text-[11px] text-muted">
            {latestComparable
              ? `${latestComparable.date} · ${latestComparable.examType}`
              : "尚无比对"}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h3 className="text-base font-bold mb-2">本周评分（实时估算）</h3>
          <div className="text-3xl font-extrabold tracking-tight">
            {totalScore.total.toFixed(1)}
            <span className="text-sm text-muted font-normal"> / {TOTAL_MAX}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
            <div>
              <div className="text-muted">执行 /20</div>
              <div className="font-bold">{totalScore.breakdown.execution.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-muted">学习 /30</div>
              <div className="font-bold">{totalScore.breakdown.learningEffect.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-muted">进步 /50</div>
              <div className="font-bold">{totalScore.breakdown.progress.toFixed(1)}</div>
            </div>
          </div>
          <p className="text-[11px] text-muted mt-3">
            执行分需姐姐在「评分」页录入任务完成情况后才会更新。当前为基于已有数据的估算。
          </p>
        </Card>

        <Card>
          <h3 className="text-base font-bold mb-2">学习效果概览</h3>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm">
                <span>错题复测得分</span>
                <span className="font-bold">{retestScore.toFixed(0)} / 100</span>
              </div>
              <div className="h-2 bg-[#eeeae2] rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-brand-orange"
                  style={{ width: `${retestScore}%` }}
                />
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                开放错题 {openWrongItems.length} 条
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>词汇正确率（最近）</span>
                <span className="font-bold">
                  {vocabCorrectRate !== null
                    ? `${(vocabCorrectRate * 100).toFixed(0)}%`
                    : "—"}
                </span>
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                {latestVocab
                  ? `${latestVocab.date} · ${latestVocab.results.length} 词`
                  : "尚无检测"}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <DailyActionCard />

      <Card>
        <h3 className="text-base font-bold mb-3">快速录入</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Link href="/exams/new" className="btn-secondary justify-center">+ 考试</Link>
          <Link href="/wrong-items/new" className="btn-secondary justify-center">+ 错题</Link>
          <Link href="/vocab/new" className="btn-secondary justify-center">+ 词汇检测</Link>
          <Link href="/classical/new" className="btn-secondary justify-center">+ 古诗文</Link>
        </div>
      </Card>

      {comparableExams.length === 0 && (
        <div className="callout">
          尚无比对考试数据。请先录入 358.77 那次模考并标为「基线」。
        </div>
      )}
    </div>
  );
}
