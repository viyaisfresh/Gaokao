"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDB, genId } from "@/lib/db";
import { scheduleReview } from "@/lib/review-scheduler";
import { todayStr } from "@/lib/review-scheduler";
import { VOCAB_CLASSES, VOCAB_LABELS } from "@/lib/constants";
import type { VocabTest, VocabClassification, VocabResult } from "@/types/schema";
import { Field } from "./ui/Field";

interface Row {
  word: string;
  classification: VocabClassification;
  meaningProvided: string;
}

export function VocabTestForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [date, setDate] = useState(todayStr());
  const [testType, setTestType] = useState<"en_to_zh" | "zh_to_en">("en_to_zh");
  const [wordList, setWordList] = useState("高考词汇");
  const [rows, setRows] = useState<Row[]>([
    { word: "", classification: "C", meaningProvided: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { word: "", classification: "C", meaningProvided: "" }]);
  }
  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const valid = rows.filter((r) => r.word.trim());
    if (valid.length === 0) {
      setError("至少录入一个单词");
      return;
    }
    setSubmitting(true);
    try {
      const db = getDB();
      const id = genId();
      const results: VocabResult[] = valid.map((r) => ({
        word: r.word.trim(),
        classification: r.classification,
        meaningProvided: r.meaningProvided.trim() || undefined,
      }));
      const test: VocabTest = { id, date, testType, wordList, results };
      await db.vocabTests.add(test);

      // 错词（N/F/S/M）触发 D1/D3/D7 复测
      const wrongWords = results.filter((r) => r.classification !== "C");
      if (wrongWords.length > 0) {
        const sched = scheduleReview(date);
        const tasks = [
          { id: genId(), sourceType: "vocab" as const, sourceId: id, scheduledDate: sched.d1, interval: 1 as const },
          { id: genId(), sourceType: "vocab" as const, sourceId: id, scheduledDate: sched.d3, interval: 3 as const },
          { id: genId(), sourceType: "vocab" as const, sourceId: id, scheduledDate: sched.d7, interval: 7 as const },
        ];
        await db.reviewTasks.bulkAdd(tasks);
      }

      onDone?.();
      router.push("/vocab");
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="callout text-brand-red">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="检测日期">
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
        <Field label="检测类型">
          <select
            className="input"
            value={testType}
            onChange={(e) => setTestType(e.target.value as "en_to_zh" | "zh_to_en")}
          >
            <option value="en_to_zh">英译中（识别）</option>
            <option value="zh_to_en">中译英（拼写）</option>
          </select>
        </Field>
        <Field label="词表">
          <input
            type="text"
            className="input"
            value={wordList}
            onChange={(e) => setWordList(e.target.value)}
          />
        </Field>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold m-0">词汇列表</h3>
          <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={addRow}>
            + 加一行
          </button>
        </div>
        <div className="space-y-2">
          {rows.map((r, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <input
                  type="text"
                  className="input"
                  placeholder="单词"
                  value={r.word}
                  onChange={(e) => updateRow(idx, { word: e.target.value })}
                />
              </div>
              <div className="col-span-3">
                <select
                  className="input"
                  value={r.classification}
                  onChange={(e) =>
                    updateRow(idx, {
                      classification: e.target.value as VocabClassification,
                    })
                  }
                >
                  {VOCAB_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c} · {VOCAB_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-4">
                <input
                  type="text"
                  className="input"
                  placeholder="词义（可选）"
                  value={r.meaningProvided}
                  onChange={(e) => updateRow(idx, { meaningProvided: e.target.value })}
                />
              </div>
              <div className="col-span-1">
                <button
                  type="button"
                  className="text-brand-red text-xs px-2 py-1"
                  onClick={() => removeRow(idx)}
                  disabled={rows.length === 1}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted mt-3">
          N=未接触 / F=见过遗忘 / S=拼写错误 / M=词义错误 / C=完全正确。错词（N/F/S/M）自动排 D1/D3/D7 复测。
        </p>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "保存中…" : "保存检测"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.push("/vocab")}
        >
          取消
        </button>
      </div>
    </form>
  );
}
