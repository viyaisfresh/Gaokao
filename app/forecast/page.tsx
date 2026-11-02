"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDB } from "@/lib/db";
import { recomputeForecast, PRIOR_INTERVALS } from "@/lib/forecast";
import { Card, SectionHead, EmptyState } from "@/components/ui/Card";
import type { ScoreForecast } from "@/types/schema";

export default function ForecastPage() {
  const forecasts = useLiveQuery(async () => {
    const db = getDB();
    const all = await db.forecasts.toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  const latest = forecasts?.[0];

  return (
    <div className="space-y-4">
      <SectionHead title="成绩预测" />
      <div className="callout">
        预测每次录入可比考试自动重算。当前置信度取决于可比考试样本量（≥5 次为 high，≥3 次为 medium，否则 low）。不可比考试不触发重算。
      </div>
      {!latest ? (
        <>
          <Card>
            <h3 className="text-base font-bold mb-2">主观先验 V0.1</h3>
            <ForecastChart intervals={PRIOR_INTERVALS} />
            <p className="text-[11px] text-muted mt-3">
              尚未录入任何可比考试，使用 handoff 中的主观先验。仅作规划讨论，不构成个人概率。
            </p>
          </Card>
        </>
      ) : (
        <>
          <ForecastCard forecast={latest} />
          {forecasts && forecasts.length > 1 && (
            <Card>
              <h3 className="text-base font-bold mb-2">历史快照</h3>
              <div className="space-y-2">
                {forecasts.slice(1).map((f) => (
                  <ForecastSnapshot key={f.id} forecast={f} />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ForecastCard({ forecast }: { forecast: ScoreForecast }) {
  const confidenceColor =
    forecast.confidenceLevel === "high"
      ? "pill-green"
      : forecast.confidenceLevel === "medium"
      ? "pill"
      : "pill-red";

  return (
    <Card>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <h3 className="text-base font-bold m-0">{forecast.version}</h3>
        <span className={confidenceColor}>
          {forecast.confidenceLevel === "high"
            ? "高置信度"
            : forecast.confidenceLevel === "medium"
            ? "中置信度"
            : "低置信度"}
        </span>
        <span className="text-[11px] text-muted">
          {forecast.date} · 样本 {forecast.sampleSize}
        </span>
      </div>
      <ForecastChart intervals={forecast.intervals} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        {Object.entries(forecast.scenarios).map(([key, range]) => {
          const labels: Record<string, string> = {
            conservative: "A 保守",
            normal: "B 正常",
            efficient: "C 高效",
            breakout: "D 超预期",
          };
          return (
            <div key={key} className="bg-[#f8f5ee] rounded-lg p-3">
              <div className="text-[11px] text-muted">{labels[key]}</div>
              <div className="text-lg font-extrabold">
                {range[0]}–{range[1]}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted mt-3 leading-relaxed">{forecast.notes}</p>
    </Card>
  );
}

function ForecastSnapshot({ forecast }: { forecast: ScoreForecast }) {
  return (
    <div className="text-[11px] flex justify-between border-b border-line py-1.5 last:border-0">
      <span>
        {forecast.date} · {forecast.version} · 样本 {forecast.sampleSize}
      </span>
      <span className="text-muted">
        {forecast.confidenceLevel === "high"
          ? "高"
          : forecast.confidenceLevel === "medium"
          ? "中"
          : "低"}
      </span>
    </div>
  );
}

function ForecastChart({
  intervals,
}: {
  intervals: ScoreForecast["intervals"];
}) {
  const max = Math.max(...intervals.map((i) => i.probability));
  return (
    <div className="space-y-2">
      {intervals.map((iv) => (
        <div key={iv.range} className="grid grid-cols-[80px_1fr_50px] gap-2 items-center text-xs">
          <span>{iv.range}</span>
          <div className="h-3 bg-[#eeeae2] rounded overflow-hidden">
            <div
              className="h-full bg-brand-orange rounded"
              style={{ width: `${(iv.probability / max) * 100}%` }}
            />
          </div>
          <b className="text-right tabular-nums">
            {(iv.probability * 100).toFixed(0)}%
          </b>
        </div>
      ))}
    </div>
  );
}
