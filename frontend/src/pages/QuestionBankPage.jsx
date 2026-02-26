import { useEffect, useMemo, useState } from "react";
import { Building2, Filter, Layers3, Loader2, Search, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { questionApi } from "../lib/api";

const DEFAULT_ROLES = ["Frontend Engineer", "Backend Engineer", "Full Stack Engineer", "Data Analyst", "Product Manager", "SDE"];

function normalizeDifficulty(value = "", source = "predefined") {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "beginner" || normalized === "easy") {
    return "Easy";
  }
  if (normalized === "intermediate" || normalized === "medium") {
    return "Medium";
  }
  if (normalized === "advanced" || normalized === "hard") {
    return "Hard";
  }
  if (source === "ai" || source === "resume") {
    return "AI";
  }

  return "Unknown";
}

function normalizeQuestionItem(item, index, context = {}) {
  const source = String(item?.source || context.source || "predefined").trim().toLowerCase();
  const role = String(item?.roleFocus || item?.role || context.targetRole || "Generalist").trim();
  const company = String(item?.companyContext || item?.company || context.companySimulation || "Startup").trim();

  return {
    id: String(item?._id || item?.id || `${source}-${index}-${Date.now()}`),
    role: role || "Generalist",
    company: company || "Startup",
    difficulty: normalizeDifficulty(item?.difficulty, source),
    category: String(item?.category || context.category || "HR").trim() || "HR",
    source: source === "resume" ? "resume" : source === "ai" ? "ai" : "predefined",
    question: String(item?.prompt || item?.question || "").trim(),
    tags: Array.isArray(item?.tags) ? item.tags : []
  };
}

function dedupeQuestionItems(items = []) {
  const seen = new Set();
  const unique = [];

  for (const item of items) {
    const key = String(item?.question || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(item);
  }

  return unique;
}

export function QuestionBankPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [company, setCompany] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("HR");
  const [source, setSource] = useState("predefined");
  const [count, setCount] = useState(6);
  const [meta, setMeta] = useState({ categories: ["HR", "Technical", "Behavioral", "Coding"], companies: ["Startup"] });
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!token) {
        return;
      }

      setLoading(true);
      setError("");
      setMessage("");

      try {
        const metaPayload = await questionApi.meta();
        if (cancelled) {
          return;
        }

        setMeta({
          categories: metaPayload.categories || ["HR", "Technical", "Behavioral", "Coding"],
          companies: metaPayload.companies || ["Startup"]
        });

        const payload = await questionApi.predefined(token, {
          category: "HR",
          targetRole: "Generalist",
          companySimulation: "Startup",
          count: 6
        });

        if (cancelled) {
          return;
        }

        const normalized = (payload.questions || []).map((item, index) =>
          normalizeQuestionItem(item, index, {
            category: "HR",
            targetRole: "Generalist",
            companySimulation: "Startup",
            source: "predefined"
          })
        );
        const uniqueQuestions = dedupeQuestionItems(normalized);

        setQuestions(uniqueQuestions);
        setMessage(`Loaded ${uniqueQuestions.length} predefined questions.`);
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Unable to load question bank.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function loadQuestions() {
    if (!token) {
      setError("Please log in to load AI question bank.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const targetRole = role !== "all" ? role : "Generalist";
    const companySimulation = company !== "all" ? company : "Startup";

    try {
      if (source === "predefined") {
        const payload = await questionApi.predefined(token, {
          category,
          targetRole,
          companySimulation,
          count
        });

        const normalized = (payload.questions || []).map((item, index) =>
          normalizeQuestionItem(item, index, {
            category,
            targetRole,
            companySimulation,
            source: "predefined"
          })
        );
        const uniqueQuestions = dedupeQuestionItems(normalized);

        setQuestions(uniqueQuestions);
        setMessage(`Loaded ${uniqueQuestions.length} predefined questions.`);
        return;
      }

      const payload = await questionApi.generate(token, {
        category,
        targetRole,
        companySimulation,
        count
      });

      const generatedSource = String(payload.source || source || "ai").toLowerCase();
      const normalized = (payload.questions || []).map((item, index) =>
        normalizeQuestionItem(item, index, {
          category,
          targetRole,
          companySimulation,
          source: generatedSource
        })
      );
      const uniqueQuestions = dedupeQuestionItems(normalized);

      setQuestions(uniqueQuestions);
      setMessage(`Generated ${uniqueQuestions.length} AI questions.`);
    } catch (requestError) {
      setError(requestError.message || "Unable to load questions.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return questions.filter((item) => {
      if (normalized) {
        const text = `${item.role} ${item.company} ${item.category} ${item.question} ${item.tags.join(" ")}`.toLowerCase();
        if (!text.includes(normalized)) {
          return false;
        }
      }
      if (role !== "all" && item.role !== role) {
        return false;
      }
      if (company !== "all" && item.company !== company) {
        return false;
      }
      if (difficulty !== "all" && item.difficulty !== difficulty) {
        return false;
      }
      return true;
    });
  }, [company, difficulty, query, questions, role]);

  const roles = useMemo(() => [...new Set([...DEFAULT_ROLES, ...questions.map((item) => item.role)])], [questions]);
  const companies = useMemo(
    () => [...new Set([...(meta.companies || []), ...questions.map((item) => item.company)])],
    [meta.companies, questions]
  );
  const levels = useMemo(() => [...new Set(questions.map((item) => item.difficulty))], [questions]);

  return (
    <div className="grid gap-4">
      <section className="glass-panel rounded-2xl p-5">
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-slate-100">Question Bank</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Practice role-specific questions with predefined bank or AI-generated questions.
        </p>

        <div className="mt-4 grid gap-2 lg:grid-cols-[220px_220px_220px_140px_220px_220px]">
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
            <Filter size={15} className="text-slate-500" />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full bg-transparent py-2 text-sm outline-none">
              {(meta.categories || []).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
            <Sparkles size={15} className="text-slate-500" />
            <select value={source} onChange={(event) => setSource(event.target.value)} className="w-full bg-transparent py-2 text-sm outline-none">
              <option value="predefined">Predefined</option>
              <option value="ai">AI Generated</option>
            </select>
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
            <Layers3 size={15} className="text-slate-500" />
            <select value={role} onChange={(event) => setRole(event.target.value)} className="w-full bg-transparent py-2 text-sm outline-none">
              <option value="all">All Roles</option>
              {roles.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-xs font-semibold text-slate-500">Count</span>
            <select value={count} onChange={(event) => setCount(Number(event.target.value))} className="w-full bg-transparent py-2 text-sm outline-none">
              {[3, 4, 5, 6, 8, 10, 12].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
            <Building2 size={15} className="text-slate-500" />
            <select value={company} onChange={(event) => setCompany(event.target.value)} className="w-full bg-transparent py-2 text-sm outline-none">
              <option value="all">All Companies</option>
              {companies.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={loadQuestions}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? "Loading..." : source === "ai" ? "Generate with AI" : "Load Questions"}
          </button>
        </div>

        <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px]">
          <label className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search loaded questions..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
            <Filter size={15} className="text-slate-500" />
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="w-full bg-transparent py-2 text-sm outline-none"
            >
              <option value="all">All Levels</option>
              {levels.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        {message ? <p className="mt-3 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
      </section>

      <section className="grid gap-3">
        {filtered.map((item) => (
          <article key={item.id} className="glass-panel rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-brand-100 px-2 py-1 font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                {item.role}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {item.company}
              </span>
              <span className="rounded-full bg-violet-100 px-2 py-1 font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                {item.category}
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                {item.difficulty}
              </span>
              <span
                className={[
                  "rounded-full px-2 py-1 font-semibold",
                  item.source === "ai"
                    ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200"
                    : item.source === "resume"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                ].join(" ")}
              >
                {item.source.toUpperCase()}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{item.question}</p>
          </article>
        ))}
        {!loading && !filtered.length ? <p className="text-sm text-slate-500 dark:text-slate-300">No questions match your filters.</p> : null}
      </section>
    </div>
  );
}
