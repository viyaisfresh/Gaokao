"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDB, genId } from "@/lib/db";
import { scheduleReview } from "@/lib/review-scheduler";
import { shouldTriggerRecompute, recomputeForecast } from "@/lib/forecast";
import { SUBJECTS, SUBJECT_LABELS, SUBJECT_MAX, BASELINE_SCORE } from "@/lib/constants";
import type { Exam, Subject, ScoreType, Comparability } from "@/types/schema";
import { Field } from "./ui/Field";

interface SubjectRowState {
  rawScore: string;
  rankedScore: string;
  scoreType: ScoreType;
  comparability: Comparability;
}

export function ExamForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [examType, setExamType] = useState("阶段性模考");
  const [isBaseline, setIsBaseline] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [totalScoreType, setTotalScoreType] = useState<ScoreType>("raw");
  const [notes, setNotes] = useState("");
  const [subjects, setSubjects] = useState<Record<Subject, SubjectRowState>>(
    () =>
      Object.fromEntries(
        SUBJECTS.map((s) => [
          s,
          {
            rawScore: "",
            rankedScore: "",
            scoreType: ["physics", "chemistry", "biology"].includes(s)
              ? "ranked"
              : "raw",
            comparability: "comparable",
          },
        ])
      ) as Record<Subject, SubjectRowState>
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateSubject(s: Subject, patch: Partial<SubjectRowState>) {
    setSubjects((prev) => ({ ...prev, [s]: { ...prev[s], ...patch } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!date) {
      setError("请填考试日期");
      return;
    }
    const hasAnyScore = SUBJECTS.some((s) => subjects[s].rawScore || subjects[s].rankedScore);
    if (!hasAnyScore) {
      setError("至少填一科分数");
      return;
    }

    setSubmitting(true);
    try {
      const db = getDB();
      const id = genId();
      const subjectScores = SUBJECTS.map((s) => {
        const st = subjects[s];
        const raw = parseFloat(st.rawScore || "0");
        const ranked = st.rankedScore ? parseFloat(st.rankedScore) : undefined;
        const effective = st.scoreType === "ranked" ? ranked ?? raw : raw;
        return {
          subject: s,
          rawScore: raw,
          rankedScore: ranked,
          scoreType: st.scoreType,
          comparability: st.comparability,
          // 标记用于计算总分的有效分数（用 _effective 字段，但 schema 里没有，直接放进 scoreType 反映）
          // 实际计算总分时根据 scoreType 取 raw 或 ranked
        };
      });

      const total = subjectScores.reduce((sum, ss) => {
        const effective = ss.scoreType === "ranked" ? ss.rankedScore ?? ss.rawScore : ss.rawScore;
        return sum + (effective || 0);
      }, 0);

      // 校验：基线标记唯一
      if (isBaseline) {
        const existingBaselines = await db.exams.where("isBaseline").equals(1 as never).toArray();
        if (existingBaselines.length > 0) {
          setError("已存在基线考试（358.77 那次）。一个项目只能有一个基线。");
          setSubmitting(false);
          return;
        }
      }

      const exam: Exam = {
        id,
        date,
        examType,
        isBaseline,
        isArchived,
        totalScore: parseFloat(total.toFixed(2)),
        totalScoreType,
        subjectScores,
        notes,
      };
      await db.exams.add(exam);

      // 触发预测重算（仅可比且非存档）
      if (shouldTriggerRecompute(exam)) {
        const comparableExams = (
          await db.exams.where("isArchived").notEqual(1 as never).toArray()
        ).filter((e) => e.subjectScores.some((s) => s.comparability === "comparable"));
        const forecast = recomputeForecast(comparableExams);
        await db.forecasts.add(forecast);
      }

      onDone?.();
      router.push("/exams");
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="callout text-brand-red">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="考试日期">
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
        <Field label="考试类型">
          <input
            type="text"
            className="input"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            placeholder="阶段性模考 / 月考 / 期中 / 期末"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isBaseline}
            onChange={(e) => setIsBaseline(e.target.checked)}
          />
          <span>设为基线（358.77 那次）</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isArchived}
            onChange={(e) => setIsArchived(e.target.checked)}
          />
          <span>仅存档（324 那次，不参与计算）</span>
        </label>
      </div>

      <Field label="总分口径" hint="混总时必须一致；物化生通常用等级赋分，语数英用原始分">
        <select
          className="input"
          value={totalScoreType}
          onChange={(e) => setTotalScoreType(e.target.value as ScoreType)}
        >
          <option value="raw">原始分</option>
          <option value="ranked">等级赋分</option>
        </select>
      </Field>

      <div className="card">
        <h3 className="text-base font-bold mb-3">六科成绩</h3>
        <div className="space-y-2">
          {SUBJECTS.map((s) => {
            const isRanked = ["physics", "chemistry", "biology"].includes(s);
            return (
              <div key={s} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-2 text-sm font-medium">
                  {SUBJECT_LABELS[s]}
                  <span className="text-muted text-[11px] block">/ {SUBJECT_MAX[s]}</span>
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="原始分"
                    value={subjects[s].rawScore}
                    onChange={(e) => updateSubject(s, { rawScore: e.target.value })}
                  />
                </div>
                {isRanked && (
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="等级赋分"
                      value={subjects[s].rankedScore}
                      onChange={(e) => updateSubject(s, { rankedScore: e.target.value })}
                    />
                  </div>
                )}
                <div className={isRanked ? "col-span-2" : "col-span-5"}>
                  <select
                    className="input"
                    value={subjects[s].scoreType}
                    onChange={(e) => updateSubject(s, { scoreType: e.target.value as ScoreType })}
                  >
                    <option value="raw">用原始分</option>
                    {isRanked && <option value="ranked">用等级赋分</option>}
                  </select>
                </div>
                <div className="col-span-2">
                  <select
                    className="input"
                    value={subjects[s].comparability}
                    onChange={(e) =>
                      updateSubject(s, {
                        comparability: e.target.value as Comparability,
                      })
                    }
                  >
                    <option value="comparable">可比</option>
                    <option value="incomparable">不可比</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Field label="备注">
        <textarea
          className="input"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="试卷难度、特殊说明等"
        />
      </Field>

      <div className="flex gap-2">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "保存中…" : "保存考试"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.push("/exams")}
        >
          取消
        </button>
      </div>
    </form>
  );
}
