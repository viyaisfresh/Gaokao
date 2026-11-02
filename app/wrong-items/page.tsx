"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { getDB } from "@/lib/db";
import { SUBJECT_LABELS, ERROR_REASON_LABELS } from "@/lib/constants";
import { Card, SectionHead, EmptyState } from "@/components/ui/Card";
import type { WrongItem } from "@/types/schema";

export default function WrongItemsPage() {
  const items = useLiveQuery(async () => {
    const db = getDB();
    const all = await db.wrongItems.toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  return (
    <div className="space-y-4">
      <SectionHead
        title="错题库"
        right={<Link href="/wrong-items/new" className="btn text-sm">+ 新增错题</Link>}
      />
      {!items || items.length === 0 ? (
        <EmptyState message="尚无错题。录入后自动排 D1/D3/D7 复测。" />
      ) : (
        <div className="space-y-2">
          {items.map((w) => (
            <WrongItemCard key={w.id} item={w} />
          ))}
        </div>
      )}
    </div>
  );
}

function WrongItemCard({ item }: { item: WrongItem }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="pill">{SUBJECT_LABELS[item.subject]}</span>
            <span className="font-bold text-sm">{item.knowledgePoint}</span>
            {item.questionType && (
              <span className="text-muted text-xs">{item.questionType}</span>
            )}
            <span className="tag">{ERROR_REASON_LABELS[item.errorReason]}</span>
            {item.status === "mastered" && <span className="tag tag-green">已掌握</span>}
            {item.status === "open" && <span className="tag">待复测</span>}
          </div>
          <div className="text-[11px] text-muted mt-1.5">
            首次 {item.date} · 提示 {item.hintCount} 次 ·{" "}
            {item.solvedIndependently ? "最终独立完成" : "未独立完成"} ·{" "}
            复测 {item.reviewResults.length} 次
          </div>
        </div>
      </div>
    </Card>
  );
}
