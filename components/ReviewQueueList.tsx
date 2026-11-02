"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDB } from "@/lib/db";
import { todayStr } from "@/lib/review-scheduler";
import { SUBJECT_LABELS, ERROR_REASON_LABELS, VOCAB_LABELS } from "@/lib/constants";
import { EmptyState } from "./ui/Card";

export function ReviewQueueList({ filter }: { filter: "today" | "overdue" | "upcoming" | "all" }) {
  const today = todayStr();
  const tasks = useLiveQuery(async () => {
    const db = getDB();
    const all = await db.reviewTasks.where("completedDate").equals(undefined as never).toArray();
    return all.filter((t) => !t.completedDate);
  }, []);

  const wrongItems = useLiveQuery(async () => {
    const db = getDB();
    return await db.wrongItems.toArray();
  }, []);

  const vocabTests = useLiveQuery(async () => {
    const db = getDB();
    return await db.vocabTests.toArray();
  }, []);

  const classicalRecords = useLiveQuery(async () => {
    const db = getDB();
    return await db.classicalRecords.toArray();
  }, []);

  if (!tasks || !wrongItems || !vocabTests || !classicalRecords) {
    return <div className="text-muted text-sm py-4">加载中…</div>;
  }

  const filtered = tasks.filter((t) => {
    if (filter === "today") return t.scheduledDate === today;
    if (filter === "overdue") return t.scheduledDate < today;
    if (filter === "upcoming") return t.scheduledDate > today;
    return true;
  });
  filtered.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  if (filtered.length === 0) {
    return <EmptyState message={filter === "today" ? "今日无待复测" : "无待复测"} />;
  }

  function getSourceLabel(t: (typeof filtered)[number]): string {
    if (t.sourceType === "wrong_item") {
      const wi = wrongItems!.find((w) => w.id === t.sourceId);
      if (!wi) return "错题（已删除）";
      return `${SUBJECT_LABELS[wi.subject]} · ${wi.knowledgePoint} · ${ERROR_REASON_LABELS[wi.errorReason]}`;
    }
    if (t.sourceType === "vocab") {
      const vt = vocabTests!.find((v) => v.id === t.sourceId);
      if (!vt) return "词汇（已删除）";
      const wrong = vt.results.filter((r) => r.classification !== "C");
      return `${vt.wordList} · 错词 ${wrong.length} 个`;
    }
    if (t.sourceType === "classical") {
      const cr = classicalRecords!.find((c) => c.id === t.sourceId);
      if (!cr) return "古诗文（已删除）";
      return `古诗文 · ${cr.pieceId}`;
    }
    return "";
  }

  return (
    <div className="space-y-2">
      {filtered.map((t) => {
        const isOverdue = t.scheduledDate < today;
        const isToday = t.scheduledDate === today;
        return (
          <div
            key={t.id}
            className={`card flex items-center justify-between gap-3 py-3 ${
              isOverdue ? "border-l-4 border-l-brand-red" : isToday ? "border-l-4 border-l-brand-orange" : ""
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{getSourceLabel(t)}</div>
              <div className="text-[11px] text-muted mt-0.5">
                D{t.interval} · 计划 {t.scheduledDate}
                {isOverdue && <span className="text-brand-red ml-2">已超期</span>}
                {isToday && <span className="text-brand-orange ml-2">今日</span>}
              </div>
            </div>
            <CompleteReviewButton taskId={t.id} />
          </div>
        );
      })}
    </div>
  );
}

function CompleteReviewButton({ taskId }: { taskId: string }) {
  async function markComplete(result: "pass" | "fail" | "partial") {
    const db = getDB();
    await db.reviewTasks.update(taskId, {
      completedDate: todayStr(),
      result,
    });
  }
  return (
    <div className="flex gap-1">
      <button
        className="text-[11px] px-2 py-1 rounded bg-[#eaf2eb] text-[#50745b] font-semibold"
        onClick={() => markComplete("pass")}
      >
        通过
      </button>
      <button
        className="text-[11px] px-2 py-1 rounded bg-[#f7ebe6] text-[#a35e49] font-semibold"
        onClick={() => markComplete("fail")}
      >
        未通过
      </button>
      <button
        className="text-[11px] px-2 py-1 rounded bg-[#f4eee2] text-[#80612f] font-semibold"
        onClick={() => markComplete("partial")}
      >
        部分
      </button>
    </div>
  );
}
