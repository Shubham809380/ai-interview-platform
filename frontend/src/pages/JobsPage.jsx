import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  Clock3,
  Filter,
  MapPin,
  RefreshCcw,
  Search,
  Sparkles } from
"lucide-react";
import { useAuth } from "../context/AuthContext";
const JOBS = [
{
  id: "j-1",
  title: "AI & Data Science Intern",
  company: "Twite AI Technologies",
  location: "Chennai, Tamil Nadu",
  mode: "Work From Office",
  experienceYears: 0,
  salary: "Rs 8.0K - Rs 15.0K",
  postedDays: 60,
  type: "Full Time",
  tags: ["AI", "TensorFlow", "REST"],
  recommended: true,
  portal: "Internshala",
  applyUrl: "https://internshala.com/internships/data-science-internship"
},
{
  id: "j-2",
  title: "Business Analyst",
  company: "Global University Systems",
  location: "Shaikpet, Hyderabad",
  mode: "Work From Office",
  experienceYears: 2,
  salary: "Rs 6L - Rs 9L",
  postedDays: 52,
  type: "Full Time",
  tags: ["Excel", "SQL", "Tableau"],
  recommended: false,
  portal: "Naukri",
  applyUrl: "https://www.naukri.com/business-analyst-jobs"
},
{
  id: "j-3",
  title: "Data Science - Consumer Analytics",
  company: "Recruise",
  location: "Bengaluru, Karnataka",
  mode: "Hybrid",
  experienceYears: 4,
  salary: "Rs 12L - Rs 18L",
  postedDays: 45,
  type: "Full Time",
  tags: ["Python", "Statistics", "Machine Learning"],
  recommended: true,
  portal: "LinkedIn",
  applyUrl: "https://www.linkedin.com/jobs/search/?keywords=consumer%20analytics%20data%20science"
},
{
  id: "j-4",
  title: "Data Scientist",
  company: "Hitachi",
  location: "Pune, Maharashtra",
  mode: "Work From Office",
  experienceYears: 2,
  salary: "Rs 9L - Rs 14L",
  postedDays: 40,
  type: "Full Time",
  tags: ["NLP", "MLOps", "SQL"],
  recommended: true,
  portal: "LinkedIn",
  applyUrl: "https://www.linkedin.com/jobs/search/?keywords=data%20scientist%20mlops"
},
{
  id: "j-5",
  title: "Data Scientist",
  company: "Forbes Advisor",
  location: "Remote",
  mode: "Work from Home",
  experienceYears: 5,
  salary: "Rs 15L - Rs 25L",
  postedDays: 34,
  type: "Full Time",
  tags: ["Python", "A/B Testing", "Pandas"],
  recommended: false,
  portal: "Indeed",
  applyUrl: "https://in.indeed.com/jobs?q=data+scientist+python"
},
{
  id: "j-6",
  title: "Frontend Developer (React/Angular/Vue)",
  company: "Acme Digital",
  location: "Noida, Uttar Pradesh",
  mode: "Hybrid",
  experienceYears: 3,
  salary: "Rs 8L - Rs 16L",
  postedDays: 10,
  type: "Full Time",
  tags: ["React", "TypeScript", "UI"],
  recommended: true,
  portal: "LinkedIn",
  applyUrl: "https://www.linkedin.com/jobs/search/?keywords=frontend%20developer%20react"
},
{
  id: "j-7",
  title: "DevOps Engineer",
  company: "Blue Ridge Cloud",
  location: "Remote",
  mode: "Work from Home",
  experienceYears: 4,
  salary: "Rs 14L - Rs 20L",
  postedDays: 5,
  type: "Full Time",
  tags: ["AWS", "Docker", "Kubernetes"],
  recommended: true,
  portal: "Naukri",
  applyUrl: "https://www.naukri.com/devops-engineer-jobs"
},
{
  id: "j-8",
  title: "Junior Software Engineer",
  company: "CodeSpline Labs",
  location: "Indore, Madhya Pradesh",
  mode: "Work From Office",
  experienceYears: 1,
  salary: "Rs 4L - Rs 7L",
  postedDays: 2,
  type: "Full Time",
  tags: ["JavaScript", "Node", "APIs"],
  recommended: false,
  portal: "Indeed",
  applyUrl: "https://in.indeed.com/jobs?q=junior+software+engineer+node"
},
{
  id: "j-9",
  title: "Backend Engineer (Node.js)",
  company: "RapidStack Systems",
  location: "Bengaluru, Karnataka",
  mode: "Hybrid",
  experienceYears: 3,
  salary: "Rs 10L - Rs 17L",
  postedDays: 4,
  type: "Full Time",
  tags: ["Node.js", "MongoDB", "Microservices"],
  recommended: true,
  portal: "LinkedIn",
  applyUrl: "https://www.linkedin.com/jobs/search/?keywords=backend%20engineer%20nodejs"
},
{
  id: "j-10",
  title: "QA Automation Engineer",
  company: "Veritas Quality Labs",
  location: "Pune, Maharashtra",
  mode: "Work From Office",
  experienceYears: 2,
  salary: "Rs 7L - Rs 12L",
  postedDays: 6,
  type: "Full Time",
  tags: ["Selenium", "Cypress", "API Testing"],
  recommended: false,
  portal: "Naukri",
  applyUrl: "https://www.naukri.com/qa-automation-engineer-jobs"
},
{
  id: "j-11",
  title: "Full Stack Developer",
  company: "NeonPixel Labs",
  location: "Remote",
  mode: "Work from Home",
  experienceYears: 2,
  salary: "Rs 8L - Rs 14L",
  postedDays: 3,
  type: "Full Time",
  tags: ["React", "Node", "PostgreSQL"],
  recommended: true,
  portal: "Indeed",
  applyUrl: "https://in.indeed.com/jobs?q=full+stack+developer+react+node"
},
{
  id: "j-12",
  title: "Product Manager - AI",
  company: "InsightPilot",
  location: "Hyderabad, Telangana",
  mode: "Hybrid",
  experienceYears: 4,
  salary: "Rs 18L - Rs 28L",
  postedDays: 9,
  type: "Full Time",
  tags: ["Product Strategy", "AI", "Roadmapping"],
  recommended: true,
  portal: "LinkedIn",
  applyUrl: "https://www.linkedin.com/jobs/search/?keywords=ai%20product%20manager"
},
{
  id: "j-13",
  title: "Cloud Support Engineer",
  company: "SkyCore Infra",
  location: "Chennai, Tamil Nadu",
  mode: "Work From Office",
  experienceYears: 1,
  salary: "Rs 5L - Rs 9L",
  postedDays: 8,
  type: "Full Time",
  tags: ["Linux", "AWS", "Networking"],
  recommended: false,
  portal: "Naukri",
  applyUrl: "https://www.naukri.com/cloud-support-engineer-jobs"
},
{
  id: "j-14",
  title: "Data Analyst",
  company: "Crest Analytics",
  location: "Noida, Uttar Pradesh",
  mode: "Hybrid",
  experienceYears: 1,
  salary: "Rs 6L - Rs 10L",
  postedDays: 7,
  type: "Full Time",
  tags: ["SQL", "Power BI", "Python"],
  recommended: true,
  portal: "Indeed",
  applyUrl: "https://in.indeed.com/jobs?q=data+analyst+sql+power+bi"
}];

const JOB_FEED_SIZE = 8;
const SAVED_JOBS_KEY = "code_with_warrior_saved_jobs_v1";
function getUserKey(user) {
  if (user?.id) {
    return `uid:${user.id}`;
  }
  if (user?.email) {
    return `mail:${String(user.email).toLowerCase()}`;
  }
  return "guest";
}
function readSavedJobs(user) {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(SAVED_JOBS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const key = getUserKey(user);
    return Array.isArray(parsed?.[key]) ? parsed[key] : [];
  } catch {
    return [];
  }
}
function writeSavedJobs(user, values) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    const raw = window.localStorage.getItem(SAVED_JOBS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const key = getUserKey(user);
    parsed[key] = values;
    window.localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(parsed));
  } catch {
  }
}
function experienceMatches(experienceValue, years) {
  if (experienceValue === "any") return true;
  if (experienceValue === "0-1") return years <= 1;
  if (experienceValue === "1-3") return years >= 1 && years <= 3;
  if (experienceValue === "3-5") return years >= 3 && years <= 5;
  if (experienceValue === "5+") return years >= 5;
  return true;
}
function postedMatches(postedValue, postedDays) {
  if (postedValue === "all") return true;
  if (postedValue === "1") return postedDays <= 1;
  if (postedValue === "7") return postedDays <= 7;
  if (postedValue === "30") return postedDays <= 30;
  return true;
}
function shuffleList(input) {
  const copy = [...input];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}
function buildDynamicFeed(source, size = JOB_FEED_SIZE) {
  const shuffled = shuffleList(source);
  return shuffled.slice(0, Math.max(1, Math.min(size, shuffled.length))).map((job) => {
    const postedShift = Math.max(-2, Math.min(4, Math.floor(Math.random() * 7) - 2));
    return {
      ...job,
      postedDays: Math.max(1, Number(job.postedDays || 1) + postedShift)
    };
  });
}
export function JobsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("all");
  const [experience, setExperience] = useState("any");
  const [postedIn, setPostedIn] = useState("all");
  const [workModes, setWorkModes] = useState({
    remote: false,
    office: false,
    hybrid: false
  });
  const [jobsPool, setJobsPool] = useState(() => buildDynamicFeed(JOBS, JOB_FEED_SIZE));
  const [openingJobId, setOpeningJobId] = useState("");
  const [savedJobs, setSavedJobs] = useState([]);
  const applyTimerRef = useRef(null);
  const refreshJobsFeed = useCallback(() => {
    setJobsPool(buildDynamicFeed(JOBS, JOB_FEED_SIZE));
  }, []);
  useEffect(() => {
    setSavedJobs(readSavedJobs(user));
  }, [user?.id, user?.email]);
  useEffect(() => {
    refreshJobsFeed();
  }, [refreshJobsFeed]);
  useEffect(
    () => () => {
      if (applyTimerRef.current) {
        window.clearTimeout(applyTimerRef.current);
        applyTimerRef.current = null;
      }
    },
    []
  );
  const jobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return jobsPool.filter((job) => {
      if (normalizedQuery) {
        const searchable = `${job.title} ${job.company} ${job.tags.join(" ")} ${job.location}`.toLowerCase();
        if (!searchable.includes(normalizedQuery)) {
          return false;
        }
      }
      if (location !== "all") {
        const normalizedLocation = job.location.toLowerCase();
        if (!normalizedLocation.includes(location.toLowerCase())) {
          return false;
        }
      }
      if (!experienceMatches(experience, job.experienceYears)) {
        return false;
      }
      if (!postedMatches(postedIn, job.postedDays)) {
        return false;
      }
      const hasModeFilter = workModes.remote || workModes.office || workModes.hybrid;
      if (hasModeFilter) {
        const mode = job.mode.toLowerCase();
        if (workModes.remote && mode.includes("home")) {
          return true;
        }
        if (workModes.office && mode.includes("office")) {
          return true;
        }
        if (workModes.hybrid && mode.includes("hybrid")) {
          return true;
        }
        return false;
      }
      return true;
    }).sort((left, right) => Number(right.recommended) - Number(left.recommended));
  }, [experience, jobsPool, location, postedIn, query, workModes]);
  const recommendedCount = useMemo(() => jobs.filter((job) => job.recommended).length, [jobs]);
  function resetFilters() {
    setQuery("");
    setLocation("all");
    setExperience("any");
    setPostedIn("all");
    setWorkModes({
      remote: false,
      office: false,
      hybrid: false
    });
    refreshJobsFeed();
  }
  function toggleSavedJob(jobId) {
    const current = new Set(savedJobs);
    if (current.has(jobId)) {
      current.delete(jobId);
    } else {
      current.add(jobId);
    }
    const next = Array.from(current);
    setSavedJobs(next);
    writeSavedJobs(user, next);
  }
  function applyForJob(job) {
    const applyUrl = String(job?.applyUrl || "").trim();
    if (!applyUrl) {
      return;
    }
    setOpeningJobId(job.id);
    if (applyTimerRef.current) {
      window.clearTimeout(applyTimerRef.current);
      applyTimerRef.current = null;
    }
    applyTimerRef.current = window.setTimeout(() => {
      window.open(applyUrl, "_blank", "noopener,noreferrer");
      setOpeningJobId((current) => current === job.id ? "" : current);
      applyTimerRef.current = null;
    }, 420);
  }
  return <div className="grid gap-4"><section className="glass-panel rounded-2xl p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h1 className="inline-flex items-center gap-2 font-display text-4xl font-extrabold text-slate-900 dark:text-slate-100"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><BriefcaseBusiness size={20} /></span>
              Job Portal
            </h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Discover your next career opportunity from curated listings. Refresh to rotate new job cards.
            </p></div><button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
          <RefreshCcw size={15} />
            Refresh Jobs
          </button></div><div className="mt-4 grid gap-2 lg:grid-cols-[minmax(0,1fr)_220px_190px_auto]"><label className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search skills, job titles, companies..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900" />
        </label><label className="relative"><MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900">
            <option value="all">Select locations</option><option value="remote">Remote</option><option value="bengaluru">Bengaluru</option><option value="hyderabad">Hyderabad</option><option value="pune">Pune</option><option value="chennai">Chennai</option></select></label><select
          value={experience}
          onChange={(event) => setExperience(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900">
          <option value="any">Any Experience</option><option value="0-1">0-1 years</option><option value="1-3">1-3 years</option><option value="3-5">3-5 years</option><option value="5+">5+ years</option></select><button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
          <Search size={15} />
            Search
          </button></div></section><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><article className="glass-panel rounded-xl p-4"><p className="text-sm text-slate-500 dark:text-slate-400">Total Jobs</p><p className="mt-1 font-display text-4xl font-extrabold">{jobs.length}</p></article><article className="glass-panel rounded-xl p-4"><p className="text-sm text-slate-500 dark:text-slate-400">Saved Jobs</p><p className="mt-1 font-display text-4xl font-extrabold">{savedJobs.length}</p></article><article className="glass-panel rounded-xl p-4"><p className="text-sm text-slate-500 dark:text-slate-400">For You</p><p className="mt-1 font-display text-4xl font-extrabold">{recommendedCount}</p></article><article className="glass-panel rounded-xl p-4"><p className="text-sm text-slate-500 dark:text-slate-400">Saved List</p><p className="mt-1 text-sm font-semibold text-brand-600 dark:text-brand-300">{savedJobs.length ? "Ready to apply" : "Save jobs to track"}</p></article></section><section className="glass-panel rounded-2xl p-4"><div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50 px-4 py-3 dark:bg-brand-500/10"><p className="inline-flex items-center gap-2 text-sm font-semibold text-brand-800 dark:text-brand-200"><Sparkles size={15} />
            Personalized recommendations
          </p><p className="text-xs text-brand-700 dark:text-brand-200">
            We found {recommendedCount} role{recommendedCount === 1 ? "" : "s"} matching your profile.
          </p></div></section><section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]"><aside className="glass-panel rounded-2xl p-4"><h2 className="inline-flex items-center gap-2 font-display text-lg font-bold"><Filter size={16} />
            Filters
          </h2><div className="mt-4 grid gap-2 text-sm"><p className="font-semibold text-slate-700 dark:text-slate-200">Date Posted</p><label className="inline-flex items-center gap-2"><input type="radio" name="posted" checked={postedIn === "all"} onChange={() => setPostedIn("all")} />
              All Time
            </label><label className="inline-flex items-center gap-2"><input type="radio" name="posted" checked={postedIn === "1"} onChange={() => setPostedIn("1")} />
              Last 24 Hours
            </label><label className="inline-flex items-center gap-2"><input type="radio" name="posted" checked={postedIn === "7"} onChange={() => setPostedIn("7")} />
              Last 7 Days
            </label><label className="inline-flex items-center gap-2"><input type="radio" name="posted" checked={postedIn === "30"} onChange={() => setPostedIn("30")} />
              Last 30 Days
            </label></div><div className="mt-4 grid gap-2 text-sm"><p className="font-semibold text-slate-700 dark:text-slate-200">Work Mode</p><label className="inline-flex items-center gap-2"><input
              type="checkbox"
              checked={workModes.remote}
              onChange={(event) => setWorkModes((prev) => ({ ...prev, remote: event.target.checked }))} />
            
              Work from Home
            </label><label className="inline-flex items-center gap-2"><input
              type="checkbox"
              checked={workModes.office}
              onChange={(event) => setWorkModes((prev) => ({ ...prev, office: event.target.checked }))} />
            
              Work from Office
            </label><label className="inline-flex items-center gap-2"><input
              type="checkbox"
              checked={workModes.hybrid}
              onChange={(event) => setWorkModes((prev) => ({ ...prev, hybrid: event.target.checked }))} />
            
              Hybrid
            </label></div></aside><div className="grid gap-3"><p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Showing {jobs.length} job{jobs.length === 1 ? "" : "s"}</p>{jobs.map((job) => {
          const isSaved = savedJobs.includes(job.id);
          return <article key={job.id} className="glass-panel rounded-2xl p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><h3 className="truncate text-xl font-bold text-slate-900 dark:text-slate-100">{job.title}</h3><p className="text-sm text-slate-600 dark:text-slate-300">{job.company}</p><div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400"><span>{job.location}</span><span>{job.mode}</span><span>{job.experienceYears}+ yrs</span><span className="text-emerald-600 dark:text-emerald-300">{job.salary}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">{job.portal}</span></div></div><div className="flex shrink-0 items-center gap-2"><button
                  type="button"
                  onClick={() => toggleSavedJob(job.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold dark:border-slate-700">
                  {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}{isSaved ? "Saved" : "Save"}</button><button
                  type="button"
                  onClick={() => applyForJob(job)}
                  disabled={openingJobId === job.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                  <ArrowUpRight size={14} />{openingJobId === job.id ? "Fetching..." : "Apply"}</button></div></div><div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold dark:bg-slate-800">{job.type}</span>{job.tags.map((tag) => <span
                key={`${job.id}-${tag}`}
                className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                {tag}</span>)}</div><p className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><Clock3 size={13} />
                  Posted {job.postedDays} days ago
                </p></article>;
        })}{!jobs.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No jobs match current filters.</p> : null}</div></section></div>;
}