"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { getDB } from "@/lib/db";
import { VOCAB_LABELS } from "@/lib/constants";
import { Card, SectionHead, EmptyState } from "@/components/ui/Card";
import type { VocabTest, VocabClassification } from "@/types/schema";

const CLASS_ORDER: VocabClassification[] = ["N", "F", "S", "M", "C"];

export default function VocabPage() {
  const tests = useLiveQuery(async () => {
    const db = getDB();
    const all = await db.vocabTests.toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  return (
    <div className="space-y-4">
      <SectionHead
        title="词汇检测"
        right={<Link href="/vocab/new" className="btn text-sm">+ 新增检测</Link>}
      />
      {!tests || tests.length === 0 ? (
        <EmptyState message="尚无词汇检测记录。" />
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <VocabCard key={t.id} test={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function VocabCard({ test }: { test: VocabTest }) {
  const counts = CLASS_ORDER.map((c) => ({
    c,
    label: VOCAB_LABELS[c],
    count: test.results.filter((r) => r.classification === c).length,
  }));
  const total = test.results.length;
  const correctRate = total > 0 ? (counts[4].count / total) * 100 : 0;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base">{test.date}</span>
            <span className="text-muted text-sm">
              {test.testType === "en_to_zh" ? "英译中" : "中译英"}
            </span>
            <span className="pill">{test.wordList}</span>
          </div>
          <div className="text-2xl font-extrabold mt-2">
            {correctRate.toFixed(0)}%
            <span className="text-sm text-muted font-normal"> 正确率（{counts[4].count}/{total}）</span>
          </div>
          <div className="grid grid-cols-5 gap-2 mt-3 text-xs">
            {counts.map((c) => (
              <div key={c.c}>
                <div className="text-muted">{c.c} · {c.label}</div>
                <div className="font-bold">{c.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
