"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDB, genId } from "@/lib/db";
import { todayStr } from "@/lib/review-scheduler";

export function DailyActionCard() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const today = todayStr();

  const todays = useLiveQuery(async () => {
    const db = getDB();
    return await db.dailyActions.where("date").equals(today).toArray();
  }, [today]);

  async function addAction(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const db = getDB();
    await db.dailyActions.add({
      id: genId(),
      date: today,
      title: title.trim(),
      description: description.trim(),
      completed: false,
    });
    setTitle("");
    setDescription("");
  }

  async function toggle(id: string, completed: boolean) {
    const db = getDB();
    await db.dailyActions.update(id, {
      completed: !completed,
      completedDate: !completed ? todayStr() : undefined,
    });
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold m-0">明天第一个动作</h3>
        <span className="text-[11px] text-muted">{today}</span>
      </div>

      <form onSubmit={addAction} className="space-y-2 mb-3">
        <input
          className="input"
          placeholder="动作标题（如：背 D7 错词 15 个）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input"
          rows={2}
          placeholder="具体说明（可选）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" className="btn text-xs px-3 py-1.5">
          + 添加今日动作
        </button>
      </form>

      <div className="space-y-2">
        {todays && todays.length === 0 && (
          <div className="text-[11px] text-muted text-center py-2">
            每次辅导结束必须留一个 15 分钟内可完成的动作
          </div>
        )}
        {todays?.map((a) => (
          <label
            key={a.id}
            className="flex items-start gap-2 text-sm py-1.5 border-b border-line last:border-0"
          >
            <input
              type="checkbox"
              checked={a.completed}
              onChange={() => toggle(a.id, a.completed)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className={a.completed ? "line-through text-muted" : "font-medium"}>
                {a.title}
              </div>
              {a.description && (
                <div className="text-[11px] text-muted mt-0.5">{a.description}</div>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
