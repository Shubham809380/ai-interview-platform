import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function Panel({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/30 bg-white/40 p-4 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

function EmptyState({ label }) {
  return (
    <div className="grid h-full place-items-center text-center">
      <p className="text-sm text-slate-500 dark:text-slate-300">{label}</p>
    </div>
  );
}

function toShortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function formatMetricLabel(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

export function ProgressCharts({ scoreTrend = [], categoryBreakdown = [], metricAverages = [] }) {
  const safeScoreTrend = useMemo(
    () =>
      (Array.isArray(scoreTrend) ? scoreTrend : [])
        .map((item) => ({
          date: String(item?.date || ""),
          score: Number(item?.score || 0),
          category: String(item?.category || "Uncategorized")
        }))
        .filter((item) => item.date),
    [scoreTrend]
  );

  const safeCategoryBreakdown = useMemo(
    () =>
      (Array.isArray(categoryBreakdown) ? categoryBreakdown : [])
        .map((item) => ({
          category: String(item?.category || "Uncategorized"),
          averageScore: Number(item?.averageScore || 0),
          sessions: Number(item?.sessions || 0)
        }))
        .filter((item) => item.category),
    [categoryBreakdown]
  );

  const safeMetricAverages = useMemo(
    () =>
      (Array.isArray(metricAverages) ? metricAverages : [])
        .map((item) => ({
          metric: formatMetricLabel(item?.metric),
          value: Number(item?.value || 0)
        }))
        .filter((item) => item.metric),
    [metricAverages]
  );

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Panel title="Score Trend">
        {safeScoreTrend.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={safeScoreTrend} margin={{ left: 0, right: 10, top: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={toShortDate} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(label) => toShortDate(label) || String(label || "")}
                formatter={(value) => [`${Number(value || 0)}`, "Score"]}
              />
              <Line type="monotone" dataKey="score" stroke="#2687ff" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState label="No completed interviews yet for score trend." />
        )}
      </Panel>

      <Panel title="Category Performance">
        {safeCategoryBreakdown.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeCategoryBreakdown} margin={{ left: 0, right: 10, top: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, name, item) => {
                  const sessions = Number(item?.payload?.sessions || 0);
                  return [`${Number(value || 0)} (from ${sessions} session${sessions === 1 ? "" : "s"})`, "Average Score"];
                }}
              />
              <Bar dataKey="averageScore" fill="#1cb7a7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState label="No completed interviews yet for category performance." />
        )}
      </Panel>

      <Panel title="AI Metric Radar">
        {safeMetricAverages.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={safeMetricAverages} outerRadius={90}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => [`${Number(value || 0)}`, "Value"]} />
              <Radar dataKey="value" stroke="#ff7a45" fill="#ffb088" fillOpacity={0.45} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState label="No AI metric data yet." />
        )}
      </Panel>
    </div>
  );
}
