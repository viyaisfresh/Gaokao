"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDB, genId } from "@/lib/db";
import { WEIGHTS, LE_SUB_WEIGHTS, PROGRESS_SUB_WEIGHTS } from "@/lib/scoring";
import { recomputeForecast, shouldTriggerRecompute } from "@/lib/forecast";
import type { Exam, Subject } from "@/types/schema";
import { Card, SectionHead } from "@/components/ui/Card";
import scoringConfig from "@/config/scoring.json";
import classicalList from "@/data/classical-list.json";
import examResultsData from "@/data/exam-results.json";

export default function SettingsPage() {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const stats = useLiveQuery(async () => {
    const db = getDB();
    return {
      exams: await db.exams.count(),
      wrongItems: await db.wrongItems.count(),
      reviewTasks: await db.reviewTasks.count(),
      vocabTests: await db.vocabTests.count(),
      classicalRecords: await db.classicalRecords.count(),
      forecasts: await db.forecasts.count(),
      rewards: await db.rewards.count(),
      dailyActions: await db.dailyActions.count(),
    };
  }, []);

  async function handleExport() {
    const db = getDB();
    const data = {
      _meta: {
        app: "gaokao-coach-2027",
        version: "0.1.0",
        exportedAt: new Date().toISOString(),
      },
      exams: await db.exams.toArray(),
      wrongItems: await db.wrongItems.toArray(),
      reviewTasks: await db.reviewTasks.toArray(),
      vocabTests: await db.vocabTests.toArray(),
      classicalRecords: await db.classicalRecords.toArray(),
      forecasts: await db.forecasts.toArray(),
      rewards: await db.rewards.toArray(),
      dailyActions: await db.dailyActions.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `gaokao-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("已导出 JSON 备份");
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMessage("");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data._meta?.app !== "gaokao-coach-2027") {
        throw new Error("文件不是 Gaokao Coach 备份");
      }
      const db = getDB();
      await db.transaction(
        "rw",
        [
          db.exams,
          db.wrongItems,
          db.reviewTasks,
          db.vocabTests,
          db.classicalRecords,
          db.forecasts,
          db.rewards,
          db.dailyActions,
        ],
        async () => {
          await Promise.all([
            db.exams.clear(),
            db.wrongItems.clear(),
            db.reviewTasks.clear(),
            db.vocabTests.clear(),
            db.classicalRecords.clear(),
            db.forecasts.clear(),
            db.rewards.clear(),
            db.dailyActions.clear(),
          ]);
          if (data.exams) await db.exams.bulkAdd(data.exams);
          if (data.wrongItems) await db.wrongItems.bulkAdd(data.wrongItems);
          if (data.reviewTasks) await db.reviewTasks.bulkAdd(data.reviewTasks);
          if (data.vocabTests) await db.vocabTests.bulkAdd(data.vocabTests);
          if (data.classicalRecords) await db.classicalRecords.bulkAdd(data.classicalRecords);
          if (data.forecasts) await db.forecasts.bulkAdd(data.forecasts);
          if (data.rewards) await db.rewards.bulkAdd(data.rewards);
          if (data.dailyActions) await db.dailyActions.bulkAdd(data.dailyActions);
        }
      );
      setMessage("导入成功");
    } catch (err) {
      setMessage(`导入失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function handleImportFromRepo() {
    setImporting(true);
    setMessage("");
    try {
      const data = examResultsData as {
        student_exam_records?: Array<{
          exam_id: string;
          exam_name?: string;
          exam_date?: string | null;
          date_note?: string;
          is_baseline?: boolean;
          total?: { score?: number; score_type?: string };
          subjects?: Record<
            string,
            { score: number; score_type?: string }
          >;
          source?: { type?: string };
        }>;
      };
      const records = data.student_exam_records ?? [];
      if (records.length === 0) {
        setMessage("仓库中未找到考试记录");
        return;
      }
      const db = getDB();
      const existing = await db.exams.toArray();
      const existingKeys = new Set(
        existing.map((e) => `${e.examType}__${e.date}`)
      );
      const toAdd: Exam[] = [];
      for (const record of records) {
        const date = record.exam_date || new Date().toISOString().slice(0, 10);
        const examType = record.exam_name || record.exam_id || "未命名考试";
        const key = `${examType}__${date}`;
        if (existingKeys.has(key)) continue;
        const subjectScores: Exam["subjectScores"] = [];
        for (const subj of ["chinese", "math", "english", "physics", "chemistry", "biology"] as Subject[]) {
          const s = record.subjects?.[subj];
          if (!s) continue;
          const isRanked = s.score_type === "赋分成绩";
          subjectScores.push({
            subject: subj,
            rawScore: isRanked ? 0 : s.score,
            rankedScore: isRanked ? s.score : undefined,
            scoreType: isRanked ? "ranked" : "raw",
            comparability: "comparable",
          });
        }
        const totalScoreType =
          record.total?.score_type === "总分赋分成绩" ? "ranked" : "raw";
        const exam: Exam = {
          id: genId(),
          date,
          examType,
          isBaseline: record.is_baseline === true,
          isArchived: false,
          totalScore: parseFloat(Number(record.total?.score ?? 0).toFixed(2)),
          totalScoreType,
          subjectScores,
          notes: `${record.date_note ?? ""} · 来源：${record.source?.type ?? "unknown"}`.trim(),
        };
        toAdd.push(exam);
        existingKeys.add(key);
      }
      if (toAdd.length === 0) {
        setMessage("仓库中所有考试记录已存在，未导入新数据");
        return;
      }
      await db.exams.bulkAdd(toAdd);
      // 触发预测重算（与 ExamForm 一致）
      const comparableExams = (
        await db.exams.where("isArchived").notEqual(1 as never).toArray()
      ).filter((e) =>
        e.subjectScores.some((s) => s.comparability === "comparable")
      );
      const triggered = toAdd.some((e) => shouldTriggerRecompute(e));
      if (triggered && comparableExams.length >= 1) {
        const forecast = recomputeForecast(comparableExams);
        await db.forecasts.add(forecast);
        setMessage(
          `已导入 ${toAdd.length} 次考试并重算预测（V${forecast.version}，样本 ${forecast.sampleSize}）`
        );
      } else {
        setMessage(`已导入 ${toAdd.length} 次考试（未触发预测重算）`);
      }
    } catch (err) {
      setMessage(`导入失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setImporting(false);
    }
  }

  async function markAllClassicalVerified() {
    const db = getDB();
    const all = await db.classicalRecords.toArray();
    await Promise.all(
      all.map((r) =>
        r.schoolListVerified ? undefined : db.classicalRecords.update(r.id, { schoolListVerified: true })
      )
    );
    setMessage(`已将 ${all.filter((r) => !r.schoolListVerified).length} 条古诗文记录标记为已核对学校清单`);
  }

  return (
    <div className="space-y-4">
      <SectionHead title="设置" />

      <Card>
        <h3 className="text-base font-bold mb-3">数据备份</h3>
        <p className="text-xs text-muted mb-3">
          所有数据存在浏览器 IndexedDB。换设备或清浏览器前请导出。导入会覆盖现有数据。
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <button className="btn text-sm" onClick={handleExport}>
            导出 JSON
          </button>
          <label className="btn-secondary text-sm cursor-pointer">
            {importing ? "导入中…" : "导入 JSON"}
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImport}
              disabled={importing}
            />
          </label>
          <button
            className="btn text-sm"
            onClick={handleImportFromRepo}
            disabled={importing}
          >
            {importing ? "拉取中…" : "从仓库导入最新大考"}
          </button>
          {message && <span className="text-xs text-muted">{message}</span>}
        </div>
        <p className="text-[11px] text-muted mt-2">
          「从仓库导入最新大考」会读取仓库内的 <code>data/exam-results.json</code>，
          自动写入历史分数库并触发分数预测重算。重复记录（考试名+日期相同）会跳过。
        </p>
        {stats && (
          <div className="grid grid-cols-4 gap-2 mt-4 text-xs">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k}>
                <div className="text-muted">
                  {{
                    exams: "考试",
                    wrongItems: "错题",
                    reviewTasks: "复测任务",
                    vocabTests: "词汇检测",
                    classicalRecords: "古诗文",
                    forecasts: "预测快照",
                    rewards: "激励",
                    dailyActions: "每日动作",
                  }[k] ?? k}
                </div>
                <div className="font-bold text-base">{v}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-base font-bold mb-3">评分权重（只读）</h3>
        <p className="text-xs text-muted mb-3">
          权重锁死在 config/scoring.json。结构可调，权重不可改。
        </p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-[#f8f5ee] rounded p-2">
            <div className="text-muted text-xs">执行</div>
            <div className="font-bold text-lg">{WEIGHTS.execution}</div>
          </div>
          <div className="bg-[#f8f5ee] rounded p-2">
            <div className="text-muted text-xs">学习效果</div>
            <div className="font-bold text-lg">{WEIGHTS.learningEffect}</div>
            <div className="text-[10px] text-muted">
              复测 {LE_SUB_WEIGHTS.retest} · 费曼 {LE_SUB_WEIGHTS.feynman} · 迁移 {LE_SUB_WEIGHTS.transfer}
            </div>
          </div>
          <div className="bg-[#f8f5ee] rounded p-2">
            <div className="text-muted text-xs">进步</div>
            <div className="font-bold text-lg">{WEIGHTS.progress}</div>
            <div className="text-[10px] text-muted">
              考试 {PROGRESS_SUB_WEIGHTS.examImprovement} · 掌握 {PROGRESS_SUB_WEIGHTS.knowledgeMastery}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-bold mb-3">古诗文清单</h3>
        <p className="text-xs text-muted mb-3">
          当前使用教育部 60 篇默认清单（来源：2019 年教育部文件）。
          {classicalList.pieces.length} 篇预置。
        </p>
        <button className="btn-secondary text-sm" onClick={markAllClassicalVerified}>
          标记所有记录已核对学校清单
        </button>
        <p className="text-[11px] text-muted mt-2">
          学生回校取回学校实际下发清单后，姐姐核对一致再点此按钮。
        </p>
      </Card>

      <Card>
        <h3 className="text-base font-bold mb-3">配置文件路径</h3>
        <ul className="text-xs text-muted space-y-1 font-mono">
          <li>config/scoring.json — 评分权重（锁死）</li>
          <li>data/classical-list.json — 60 篇古诗文清单</li>
          <li>lib/constants.ts — 基线分数、高考日期等</li>
        </ul>
      </Card>
    </div>
  );
}
