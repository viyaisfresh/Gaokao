"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { getDB } from "@/lib/db";
import { SUBJECT_LABELS } from "@/lib/constants";
import { Card, SectionHead, EmptyState } from "@/components/ui/Card";
import type { Exam } from "@/types/schema";

export default function ExamsPage() {
  const exams = useLiveQuery(async () => {
    const db = getDB();
    const all = await db.exams.toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  return (
    <div className="space-y-4">
      <SectionHead
        title="考试记录"
        right={<Link href="/exams/new" className="btn text-sm">+ 新增考试</Link>}
      />

      {!exams || exams.length === 0 ? (
        <EmptyState message="尚无考试记录。先录入 358.77 那次模考并标为基线。" />
      ) : (
        <div className="space-y-3">
          {exams.map((e) => (
            <ExamCard key={e.id} exam={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExamCard({ exam }: { exam: Exam }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base">{exam.date}</span>
            <span className="text-muted text-sm">{exam.examType}</span>
            {exam.isBaseline && <span className="pill pill-green">基线</span>}
            {exam.isArchived && <span className="pill pill-red">仅存档</span>}
            {exam.subjectScores.some((s) => s.comparability === "comparable") ? (
              <span className="tag tag-green">可比</span>
            ) : (
              <span className="tag">不可比</span>
            )}
          </div>
          <div className="text-2xl font-extrabold mt-2">
            {exam.totalScore.toFixed(2)}
            <span className="text-sm text-muted font-normal"> 总分（{exam.totalScoreType === "raw" ? "原始" : "赋分"}）</span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3 text-xs">
            {exam.subjectScores.map((ss) => {
              const effective =
                ss.scoreType === "ranked" ? ss.rankedScore ?? ss.rawScore : ss.rawScore;
              return (
                <div key={ss.subject}>
                  <div className="text-muted">{SUBJECT_LABELS[ss.subject]}</div>
                  <div className="font-bold">{effective || "—"}</div>
                  {ss.scoreType === "ranked" && ss.rankedScore && (
                    <div className="text-[10px] text-muted">原 {ss.rawScore}</div>
                  )}
                </div>
              );
            })}
          </div>
          {exam.notes && <p className="text-xs text-muted mt-2">{exam.notes}</p>}
        </div>
      </div>
    </Card>
  );
}
