import { useEffect, useMemo, useState } from "react";
import { FileClock, MessageSquareText, PlayCircle } from "lucide-react";
import { sessionApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function firstSentence(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return "No transcript captured.";
  const split = raw.split(/[.!?]/).map((item) => item.trim()).filter(Boolean);
  return split[0] ? `${split[0]}.` : raw;
}

export function ReplayHubPage() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const payload = await sessionApi.list(token);
        if (!mounted) return;
        const completed = (payload.sessions || []).filter((item) => item.status === "completed");
        setSessions(completed);
        setSelected(completed[0] || null);
      } catch (requestError) {
        if (mounted) setError(requestError.message || "Failed to load replay sessions.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const questionHighlights = useMemo(() => {
    if (!selected?.questions?.length) return [];
    return selected.questions.map((question) => {
      const answer = question.answer || {};
      const score = Number(answer?.aiScores?.overall || 0);
      const improved = (answer.improvements || [])[0] || "Add clearer STAR structure with metrics.";
      return {
        id: question.id,
        prompt: question.prompt,
        bestLine: firstSentence(answer.rawText || answer.transcript),
        improved,
        score
      };
    });
  }, [selected]);

  if (loading) {
    return <div className="glass-panel rounded-2xl p-4 text-sm text-slate-600 dark:text-slate-300">Loading replay hub...</div>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <section className="glass-panel rounded-2xl p-4">
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100">Replay Hub</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Review completed sessions and compare your answers.</p>
        {error ? <p className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-xs text-rose-700">{error}</p> : null}

        <div className="mt-4 grid gap-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => setSelected(session)}
              className={[
                "rounded-xl border px-3 py-2 text-left transition",
                selected?.id === session.id
                  ? "border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/15"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              ].join(" ")}
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{session.targetRole}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(session.createdAt).toLocaleDateString()} | Score {session.overallScore || 0}
              </p>
            </button>
          ))}
          {!sessions.length ? <p className="text-sm text-slate-500 dark:text-slate-300">No completed sessions to replay yet.</p> : null}
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-4">
        {selected ? (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {selected.targetRole} - {selected.category}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                <PlayCircle size={13} />
                Replay Ready
              </span>
            </div>

            {questionHighlights.map((item, index) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Q{index + 1}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    Score {item.score}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-800 dark:text-slate-100">{item.prompt}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg border border-brand-200 bg-brand-50 p-2 dark:border-brand-500/30 dark:bg-brand-500/10">
                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-200">
                      <MessageSquareText size={12} />
                      Best Answer Snapshot
                    </p>
                    <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">{item.bestLine}</p>
                  </div>
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-2 dark:border-violet-500/30 dark:bg-violet-500/10">
                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-200">
                      <FileClock size={12} />
                      Improved Version
                    </p>
                    <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">{item.improved}</p>
                  </div>
                </div>
              </article>
            ))}
            {!questionHighlights.length ? <p className="text-sm text-slate-500 dark:text-slate-300">No answer highlights found for this session.</p> : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-300">Select a completed session to open replay insights.</p>
        )}
      </section>
    </div>
  );
}

