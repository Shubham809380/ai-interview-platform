import { useMemo, useState } from "react";
import { Lock, Shield } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../lib/api";
import { getAdminToken, setAdminToken, clearAdminToken } from "../lib/adminAuth";
import { useAuth } from "../context/AuthContext";

export function AdminLoginPage() {
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const next = params.get("next") || "/admin";
    return next.startsWith("/") ? next : "/admin";
  }, [location.search]);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const payload = await authApi.adminLogin({
        email: String(email || "").trim(),
        password: String(password || "")
      });

      setAdminToken(payload.token);
      setMessage("Admin login successful. Redirecting to Admin Panel...");
      navigate(nextPath, { replace: true });
    } catch (requestError) {
      clearAdminToken();
      setError(requestError.message || "Admin login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onBootstrapAdmin() {
    if (!token) {
      setError("Please sign in first, then use bootstrap admin.");
      setMessage("");
      return;
    }

    setBootstrapLoading(true);
    setError("");
    setMessage("");

    try {
      const payload = await authApi.adminBootstrap(token);
      setAdminToken(payload.token);
      await refreshUser();
      setMessage("Admin bootstrap successful. Redirecting to Admin Panel...");
      navigate(nextPath, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Admin bootstrap failed.");
    } finally {
      setBootstrapLoading(false);
    }
  }

  const hasExistingAdminSession = Boolean(getAdminToken());

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/85 p-6 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <div className="mb-4 flex items-center gap-2">
          <Shield size={20} className="text-brand-600" />
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100">Admin Login</h1>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          Only admin users can access the Admin Panel. Regular user credentials will be rejected.
        </p>

        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Admin Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900/70"
              placeholder="admin@company.com"
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900/70"
              placeholder="Enter admin password"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Lock size={14} />
            {loading ? "Logging in..." : "Login as Admin"}
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/60">
          <p className="font-semibold text-slate-700 dark:text-slate-200">First-time admin setup</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            If you are already signed in with Google/LinkedIn and no admin exists, use bootstrap.
          </p>
          <button
            type="button"
            onClick={onBootstrapAdmin}
            disabled={!token || bootstrapLoading}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-brand-600 px-3 py-1.5 font-semibold text-white disabled:opacity-60"
          >
            {bootstrapLoading ? "Bootstrapping..." : "Bootstrap Current User as Admin"}
          </button>
        </div>

        {message ? <p className="mt-3 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <Link to="/" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
            Back to app
          </Link>
          {hasExistingAdminSession ? (
            <button
              type="button"
              onClick={() => {
                clearAdminToken();
                setMessage("Admin session cleared.");
                setError("");
              }}
              className="font-semibold text-slate-600 hover:underline dark:text-slate-300"
            >
              Clear admin session
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
