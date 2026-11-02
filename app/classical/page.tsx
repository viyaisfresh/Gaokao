"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { getDB } from "@/lib/db";
import { CLASSICAL_TEST_LABELS } from "@/lib/constants";
import classicalList from "@/data/classical-list.json";
import { Card, SectionHead, EmptyState } from "@/components/ui/Card";
import type { ClassicalRecord } from "@/types/schema";

const pieceTitle = (id: string) =>
  classicalList.pieces.find((p) => p.id === id)?.title || id;

export default function ClassicalPage() {
  const records = useLiveQuery(async () => {
    const db = getDB();
    const all = await db.classicalRecords.toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  const unverifiedCount = records?.filter((r) => !r.schoolListVerified).length ?? 0;

  return (
    <div className="space-y-4">
      <SectionHead
        title="古诗文追踪"
        right={<Link href="/classical/new" className="btn text-sm">+ 新增检测</Link>}
      />
      {unverifiedCount > 0 && (
        <div className="callout">
          {unverifiedCount} 条记录尚未核对学校实际下发清单。待学生回校取回清单后，姐姐可在「设置」一键标记全部已核对。
        </div>
      )}
      {!records || records.length === 0 ? (
        <EmptyState message="尚无古诗文检测记录。" />
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <ClassicalCard key={r.id} record={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassicalCard({ record }: { record: ClassicalRecord }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base">{pieceTitle(record.pieceId)}</span>
            <span className="pill">{CLASSICAL_TEST_LABELS[record.testType]}</span>
            <span className="text-muted text-sm">{record.date}</span>
            {record.correctBefore && <span className="tag tag-red">曾对再错</span>}
            {!record.schoolListVerified && <span className="tag">未核学校清单</span>}
          </div>
          {record.errors.length > 0 ? (
            <div className="text-sm mt-2">
              <span className="text-muted">错误：</span>
              {record.errors.join("、")}
            </div>
          ) : (
            <div className="text-sm text-muted mt-2">无错误</div>
          )}
        </div>
      </div>
    </Card>
  );
}
