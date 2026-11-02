"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDB, genId } from "@/lib/db";
import { scheduleReview } from "@/lib/review-scheduler";
import { todayStr } from "@/lib/review-scheduler";
import { CLASSICAL_TEST_TYPES, CLASSICAL_TEST_LABELS } from "@/lib/constants";
import classicalList from "@/data/classical-list.json";
import type { ClassicalRecord, ClassicalTestType } from "@/types/schema";
import { Field } from "./ui/Field";

export function ClassicalTestForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [date, setDate] = useState(todayStr());
  const [pieceId, setPieceId] = useState("");
  const [testType, setTestType] = useState<ClassicalTestType>("recitation");
  const [errorsText, setErrorsText] = useState("");
  const [correctBefore, setCorrectBefore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!pieceId) {
      setError("请选篇目");
      return;
    }
    setSubmitting(true);
    try {
      const db = getDB();
      const id = genId();
      const errors = errorsText
        .split(/[,，、\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const record: ClassicalRecord = {
        id,
        date,
        pieceId,
        testType,
        errors,
        correctBefore,
        schoolListVerified: false, // 默认未核对，待学生回校取清单后姐姐统一更新
      };
      await db.classicalRecords.add(record);

      // 有错误时排 D1/D3/D7 复测
      if (errors.length > 0) {
        const sched = scheduleReview(date);
        const tasks = [
          { id: genId(), sourceType: "classical" as const, sourceId: id, scheduledDate: sched.d1, interval: 1 as const },
          { id: genId(), sourceType: "classical" as const, sourceId: id, scheduledDate: sched.d3, interval: 3 as const },
          { id: genId(), sourceType: "classical" as const, sourceId: id, scheduledDate: sched.d7, interval: 7 as const },
        ];
        await db.reviewTasks.bulkAdd(tasks);
      }

      onDone?.();
      router.push("/classical");
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  const piecesByCategory: Record<string, typeof classicalList.pieces> = {
    wenyan_required: classicalList.pieces.filter((p) => p.category === "wenyan_required"),
    wenyan_selective: classicalList.pieces.filter((p) => p.category === "wenyan_selective"),
    shici: classicalList.pieces.filter((p) => p.category === "shici"),
  };
  const categoryLabels: Record<string, string> = {
    wenyan_required: "文言文·必修（10 篇）",
    wenyan_selective: "文言文·选择性必修（10 篇）",
    shici: "诗词曲（40 首）",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="callout text-brand-red">{error}</div>}

      <div className="callout">
        当前使用教育部 60 篇默认清单。学校实际下发清单可能微调 1–2 篇，待学生回校取回后姐姐可在「设置」覆盖。每条记录默认标注「未核对学校清单」。
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="检测日期">
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
        <Field label="题型">
          <select
            className="input"
            value={testType}
            onChange={(e) => setTestType(e.target.value as ClassicalTestType)}
          >
            {CLASSICAL_TEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {CLASSICAL_TEST_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="篇目" hint="默认清单来自教育部 2019 年文件">
        <select
          className="input"
          value={pieceId}
          onChange={(e) => setPieceId(e.target.value)}
          required
        >
          <option value="">— 选篇目 —</option>
          {Object.entries(piecesByCategory).map(([cat, pieces]) => (
            <optgroup key={cat} label={categoryLabels[cat]}>
              {pieces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.author ? ` · ${p.author}` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <Field label="错误内容" hint="错字 / 漏字 / 串句，用逗号或换行分隔">
        <textarea
          className="input"
          rows={3}
          value={errorsText}
          onChange={(e) => setErrorsText(e.target.value)}
          placeholder={`例如：沧海月明珠有泪（写成"兰"）, 蓝田日暖玉生烟`}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={correctBefore}
          onChange={(e) => setCorrectBefore(e.target.checked)}
        />
        <span>{`曾经答对过（"曾对再错"标记为尚未稳定掌握）`}</span>
      </label>

      <div className="flex gap-2">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "保存中…" : "保存检测"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.push("/classical")}
        >
          取消
        </button>
      </div>
    </form>
  );
}
