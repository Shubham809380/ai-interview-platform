import { useEffect, useState } from "react";
import { profileApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function parseCompanies(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProfilePage() {
  const { token, user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    targetRole: "",
    experienceLevel: "",
    preferredCompanies: "",
    profileSummary: "",
    resumeText: ""
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm({
      name: user.name || "",
      targetRole: user.targetRole || "",
      experienceLevel: user.experienceLevel || "",
      preferredCompanies: (user.preferredCompanies || []).join(", "),
      profileSummary: user.profileSummary || "",
      resumeText: user.resumeText || ""
    });
  }, [user]);

  function updateField(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = await profileApi.update(token, {
        name: form.name,
        targetRole: form.targetRole,
        experienceLevel: form.experienceLevel,
        preferredCompanies: parseCompanies(form.preferredCompanies),
        profileSummary: form.profileSummary,
        resumeText: form.resumeText
      });

      setUser(payload.user);
      setMessage("Profile updated successfully.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
      <section className="rounded-2xl border border-white/30 bg-white/45 p-4 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45">
        <h2 className="mb-3 font-display text-lg font-bold">Profile Dashboard</h2>

        {message ? <p className="mb-3 rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mb-3 rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <form onSubmit={saveProfile} className="grid gap-3">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Full Name
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="rounded-xl border border-white/30 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
              required
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Target Role
            <input
              value={form.targetRole}
              onChange={(event) => updateField("targetRole", event.target.value)}
              className="rounded-xl border border-white/30 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Experience Level
            <select
              value={form.experienceLevel}
              onChange={(event) => updateField("experienceLevel", event.target.value)}
              className="rounded-xl border border-white/30 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
            >
              <option value="">Select level</option>
              <option value="Intern">Intern</option>
              <option value="Junior">Junior</option>
              <option value="Mid">Mid</option>
              <option value="Senior">Senior</option>
              <option value="Lead">Lead</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Preferred Companies
            <input
              value={form.preferredCompanies}
              onChange={(event) => updateField("preferredCompanies", event.target.value)}
              className="rounded-xl border border-white/30 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
              placeholder="Google, Amazon, Startup"
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Profile Summary
            <textarea
              rows={4}
              value={form.profileSummary}
              onChange={(event) => updateField("profileSummary", event.target.value)}
              className="rounded-xl border border-white/30 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
              placeholder="Short intro and strengths"
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Resume Text
            <textarea
              rows={8}
              value={form.resumeText}
              onChange={(event) => updateField("resumeText", event.target.value)}
              className="rounded-xl border border-white/30 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
              placeholder="Paste your resume here for resume-based question generation"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/30 bg-white/45 p-4 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45">
        <h3 className="mb-3 font-display text-lg font-bold">Gamification</h3>

        <div className="grid gap-2 text-sm">
          <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-800/55">
            <p className="text-xs uppercase text-slate-500">Points</p>
            <p className="font-display text-2xl font-extrabold">{user?.points || 0}</p>
          </div>
          <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-800/55">
            <p className="text-xs uppercase text-slate-500">Current Streak</p>
            <p className="font-display text-2xl font-extrabold">{user?.streak || 0} days</p>
          </div>
          <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-800/55">
            <p className="text-xs uppercase text-slate-500">Badges</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(user?.badges || []).map((badge) => (
                <span
                  key={badge}
                  className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/35 dark:text-amber-200"
                >
                  {badge}
                </span>
              ))}
              {!user?.badges?.length ? <span className="text-xs">No badges yet.</span> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
