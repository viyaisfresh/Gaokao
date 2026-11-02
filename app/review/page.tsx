"use client";

import { useState } from "react";
import { Card, SectionHead } from "@/components/ui/Card";
import { ReviewQueueList } from "@/components/ReviewQueueList";

const FILTERS = [
  { key: "today", label: "今日" },
  { key: "overdue", label: "超期" },
  { key: "upcoming", label: "未来" },
  { key: "all", label: "全部" },
] as const;

export default function ReviewPage() {
  const [filter, setFilter] =
    useState<(typeof FILTERS)[number]["key"]>("today");

  return (
    <div className="space-y-4">
      <SectionHead
        title="复测队列"
        right={
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`text-[11px] px-3 py-1 rounded-full border ${
                  filter === f.key
                    ? "bg-brand-orange text-white border-brand-orange"
                    : "bg-paper border-line text-[#625e56]"
                }`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="callout">
        D1/D3/D7 按真实日期计算。复测通过则该 interval 完成；未通过会重排到次日。
      </div>
      <Card>
        <ReviewQueueList filter={filter} />
      </Card>
    </div>
  );
}
