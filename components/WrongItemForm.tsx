"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDB, genId } from "@/lib/db";
import { scheduleReview } from "@/lib/review-scheduler";
import { todayStr } from "@/lib/review-scheduler";
import { SUBJECTS, SUBJECT_LABELS, ERROR_REASONS, ERROR_REASON_LABELS } from "@/lib/constants";
import type { WrongItem, Subject, ErrorReason } from "@/types/schema";
import { Field } from "./ui/Field";

export function WrongItemForm({
  examId,
  onDone,
}: {
  examId?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [date, setDate] = useState(todayStr());
  const [subject, setSubject] = useState<Subject>("math");
  const [knowledgePoint, setKnowledgePoint] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [errorReason, setErrorReason] = useState<ErrorReason>("unknown");
  const [hintCount, setHintCount] = useState(0);
  const [solvedIndependently, setSolvedIndependently] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!date) {
      setError("请填首次错误日期");
      return;
    }
    if (!knowledgePoint.trim()) {
      setError("请填知识点");
      return;
    }
    setSubmitting(true);
    try {
      const db = getDB();
      const id = genId();
      const item: WrongItem = {
        id,
        examId,
        date,
        subject,
        knowledgePoint: knowledgePoint.trim(),
        questionType: questionType.trim(),
        errorReason,
        hintCount,
        solvedIndependently,
        reviewResults: [],
        transferredToNewQuestion: null,
        status: "open",
      };
      await db.wrongItems.add(item);

      // 立即生成 D1/D3/D7 复测任务
      const sched = scheduleReview(date);
      const reviewTasks = [
        { id: genId(), sourceType: "wrong_item" as const, sourceId: id, scheduledDate: sched.d1, interval: 1 as const },
        { id: genId(), sourceType: "wrong_item" as const, sourceId: id, scheduledDate: sched.d3, interval: 3 as const },
        { id: genId(), sourceType: "wrong_item" as const, sourceId: id, scheduledDate: sched.d7, interval: 7 as const },
      ];
      await db.reviewTasks.bulkAdd(reviewTasks);

      onDone?.();
      router.push("/wrong-items");
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="callout text-brand-red">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="首次错误日期">
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
        <Field label="学科">
          <select
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value as Subject)}
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {SUBJECT_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="知识点" hint="如：函数奇偶性 / 牛顿第二定律 / 选项填空">
        <input
          type="text"
          className="input"
          value={knowledgePoint}
          onChange={(e) => setKnowledgePoint(e.target.value)}
          required
        />
      </Field>

      <Field label="题型">
        <input
          type="text"
          className="input"
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value)}
          placeholder="选择题 / 填空题 / 解答题 / 实验题"
        />
      </Field>

      <Field label="错误原因">
        <select
          className="input"
          value={errorReason}
          onChange={(e) => setErrorReason(e.target.value as ErrorReason)}
        >
          {ERROR_REASONS.map((r) => (
            <option key={r} value={r}>
              {ERROR_REASON_LABELS[r]}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="提示次数">
          <input
            type="number"
            min={0}
            className="input"
            value={hintCount}
            onChange={(e) => setHintCount(parseInt(e.target.value) || 0)}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm pt-6">
          <input
            type="checkbox"
            checked={solvedIndependently}
            onChange={(e) => setSolvedIndependently(e.target.checked)}
          />
          <span>最终独立完成</span>
        </label>
      </div>

      <Field label="备注">
        <textarea
          className="input"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <div className="flex gap-2">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "保存中…" : "保存错题"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.push("/wrong-items")}
        >
          取消
        </button>
      </div>
    </form>
  );
}
