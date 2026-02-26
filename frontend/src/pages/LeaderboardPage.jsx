import { useEffect, useState } from "react";
import { Crown, Flame, Medal } from "lucide-react";
import { leaderboardApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { LoadingScreen } from "../components/LoadingScreen";

export function LeaderboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState({ leaderboard: [], myRank: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const payload = await leaderboardApi.list(token);
        if (mounted) {
          setData(payload);
        }
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [token]);

  if (loading) {
    return <LoadingScreen label="Loading leaderboard..." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-white/30 bg-white/45 p-4 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45">
        <h2 className="mb-3 font-display text-lg font-bold">Your Rank Snapshot</h2>
        {data.myRank ? (
          <div className="grid gap-3">
            <div className="rounded-2xl bg-brand-500 p-4 text-white">
              <p className="text-xs uppercase tracking-wide">Current Rank</p>
              <p className="mt-1 font-display text-4xl font-extrabold">#{data.myRank.rank}</p>
              <p className="mt-1 text-sm">{data.myRank.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-800/50">
                <p className="text-xs uppercase text-slate-500">Points</p>
                <p className="font-bold">{data.myRank.points}</p>
              </div>
              <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-800/50">
                <p className="text-xs uppercase text-slate-500">Streak</p>
                <p className="font-bold">{data.myRank.streak} days</p>
              </div>
            </div>
            <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-800/50">
              <p className="text-xs uppercase text-slate-500">Badges</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(data.myRank.badges || []).map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/35 dark:text-amber-200"
                  >
                    {badge}
                  </span>
                ))}
                {!data.myRank.badges?.length ? <span className="text-xs">No badges yet</span> : null}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">No ranking data yet.</p>
        )}
      </section>

      <section className="rounded-2xl border border-white/30 bg-white/45 p-4 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45">
        <div className="mb-3 flex items-center gap-2">
          <Crown size={18} className="text-amber-500" />
          <h3 className="font-display text-lg font-bold">Global Leaderboard</h3>
        </div>

        {error ? <p className="mb-3 rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/30 text-slate-600 dark:border-white/10 dark:text-slate-300">
                <th className="py-2">Rank</th>
                <th className="py-2">Candidate</th>
                <th className="py-2">Points</th>
                <th className="py-2">Avg Score</th>
                <th className="py-2">Sessions</th>
                <th className="py-2">Streak</th>
                <th className="py-2">Badges</th>
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.map((entry) => (
                <tr key={entry.userId} className="border-b border-white/20 last:border-0 dark:border-white/5">
                  <td className="py-2 font-bold">#{entry.rank}</td>
                  <td className="py-2 font-semibold">{entry.name}</td>
                  <td className="py-2">{entry.points}</td>
                  <td className="py-2">{entry.averageScore}</td>
                  <td className="py-2">{entry.sessions}</td>
                  <td className="py-2 inline-flex items-center gap-1">
                    <Flame size={14} className="text-orange-500" />
                    {entry.streak}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {(entry.badges || []).slice(0, 3).map((badge) => (
                        <span
                          key={badge}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/35 dark:text-amber-200"
                        >
                          <Medal size={11} />
                          {badge}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
