import { useEffect, useMemo, useState } from "react";
import { Award, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { certificateApi, sessionApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { LoadingScreen } from "../components/LoadingScreen";
import {
  buildMetricImprovementFocus,
  saveInterviewCertificatePdf,
  saveInterviewReportPdf } from
"../lib/pdfDocuments";
export function HistoryPage() {
  const { token, user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [certificateCheck, setCertificateCheck] = useState("");
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const payload = await sessionApi.list(token);
        if (!mounted) {
          return;
        }
        setSessions(payload.sessions || []);
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
  useEffect(() => {
    if (!selectedId) {
      return;
    }
    let mounted = true;
    async function loadDetails() {
      setError("");
      setCertificateCheck("");
      try {
        const payload = await sessionApi.details(token, selectedId);
        if (mounted) {
          setDetails(payload);
        }
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message);
        }
      }
    }
    loadDetails();
    return () => {
      mounted = false;
    };
  }, [selectedId, token]);
  async function verifyCurrentCertificate() {
    const certificateId = String(details?.session?.certificate?.id || "").trim();
    if (!certificateId) {
      setCertificateCheck("Certificate ID is missing for this session.");
      return;
    }
    try {
      const payload = await certificateApi.verify(certificateId);
      if (payload?.valid) {
        setCertificateCheck(`Verified: ${payload.certificate?.candidateName || "Candidate"} (${payload.certificate?.id})`);
      } else {
        setCertificateCheck("Certificate could not be verified.");
      }
    } catch (requestError) {
      setCertificateCheck(requestError.message || "Verification failed.");
    }
  }
  const completedCount = useMemo(
    () => sessions.filter((session) => session.status === "completed").length,
    [sessions]
  );
  const improvementPlan = useMemo(() => {
    if (!details?.session) {
      return [];
    }
    const summaryImprovements = details.session.summary?.improvements || [];
    const metricImprovements = buildMetricImprovementFocus(details.session.metrics || {});
    const merged = [...summaryImprovements, ...metricImprovements].map((item) => String(item || "").trim()).filter(Boolean);
    return [...new Set(merged)];
  }, [details]);
  if (loading) {
    return <LoadingScreen label="Loading interview history..." />;
  }
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"><section className="glass-panel rounded-2xl p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-bold">Session History</h2><span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700/50 dark:text-slate-100">
            Completed: {completedCount}</span></div>{error ? <p className="mb-3 rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p> : null}<div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-white/30 text-slate-600 dark:border-white/10 dark:text-slate-300"><th className="py-2">Date</th><th className="py-2">Category</th><th className="py-2">Role</th><th className="py-2">Company</th><th className="py-2">Status</th><th className="py-2">Score</th><th className="py-2">Action</th></tr></thead><tbody>{sessions.map((session) => <tr
              key={session.id}
              className={[
              "border-b border-white/20 transition last:border-0 dark:border-white/5",
              selectedId === session.id ? "bg-brand-50/80 dark:bg-brand-900/25" : "hover:bg-white/55 dark:hover:bg-slate-800/35"].
              join(" ")}>
              <td className="py-2">{new Date(session.createdAt).toLocaleDateString()}</td><td className="py-2">{session.category}</td><td className="py-2">{session.targetRole}</td><td className="py-2">{session.companySimulation}</td><td className="py-2"><span
                  className={[
                  "rounded-full px-2 py-1 text-[11px] font-semibold",
                  session.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"].
                  join(" ")}>
                  {session.status.replace("_", " ")}</span></td><td className="py-2 font-semibold">{session.overallScore || "-"}</td><td className="py-2"><button
                  type="button"
                  onClick={() => setSelectedId(session.id)}
                  className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-600">
                  
                      View
                    </button></td></tr>)}</tbody></table></div></section><section className="glass-panel rounded-2xl p-4">{details ? <div className="grid gap-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-lg font-bold">Session Detail</h3><div className="flex flex-wrap items-center gap-2"><button
              type="button"
              onClick={() => saveInterviewReportPdf(details, user?.name)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white">
              <Download size={14} />
                  Download Report
                </button>{details.session.status === "completed" ? <button
              type="button"
              onClick={() => saveInterviewCertificatePdf({ name: user?.name, session: details.session })}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white">
              <Award size={14} />
                    Download Certificate
                  </button> : null}</div></div><p className="text-sm"><strong>Overall Score:</strong> {details.session.overallScore || 0}</p><div className="rounded-xl border border-white/30 bg-white/60 p-3 dark:border-white/10 dark:bg-slate-800/45"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Metrics</p><div className="mt-2 grid grid-cols-2 gap-2 text-sm">{Object.entries(details.session.metrics || {}).map(([key, value]) => <p key={key}>{key}: <strong>{value}</strong></p>)}</div></div><div className="rounded-xl border border-white/30 bg-white/60 p-3 dark:border-white/10 dark:bg-slate-800/45"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Recommendation</p><p className="mt-2 text-sm">{details.session.summary?.recommendation || "No recommendation available yet."}</p></div>{details.session.certificate?.id ? <div className="rounded-xl border border-white/30 bg-white/60 p-3 dark:border-white/10 dark:bg-slate-800/45"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Certificate Verification</p><p className="mt-2 text-sm"><strong>ID:</strong> {details.session.certificate.id}</p>{details.session.certificate.verificationUrl ? <><a
              href={details.session.certificate.verificationUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline dark:text-brand-300">
              <ExternalLink size={12} />
                      Open verification link
                    </a><img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                details.session.certificate.verificationUrl
              )}`}
              alt="Certificate verification QR"
              className="mt-2 h-20 w-20 rounded border border-white/30 bg-white" />
          </> : null}<div className="mt-2"><button
              type="button"
              onClick={verifyCurrentCertificate}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white dark:bg-slate-200 dark:text-slate-900">
              <ShieldCheck size={13} />
                    Verify now
                  </button></div>{certificateCheck ? <p className="mt-2 text-xs text-slate-700 dark:text-slate-200">{certificateCheck}</p> : null}</div> : null}<div className="rounded-xl border border-white/30 bg-white/60 p-3 dark:border-white/10 dark:bg-slate-800/45"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">AI Improvement Plan</p><div className="mt-2 grid gap-2 text-sm">{(improvementPlan.length ? improvementPlan : ["Keep practicing consistently across categories."]).map((item) => <p key={item}>- {item}</p>)}</div></div><div className="max-h-64 overflow-y-auto rounded-xl border border-white/30 bg-white/60 p-3 dark:border-white/10 dark:bg-slate-800/45"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Question Feedback</p><div className="mt-2 grid gap-3">{details.questions.map((question) => <div key={question.id} className="rounded-lg border border-white/25 bg-white/70 p-2 text-xs dark:border-white/10 dark:bg-slate-900/40"><p className="font-semibold">Q{question.order}: {question.prompt}</p><p className="mt-1">
                      Score: <strong>{question.answer?.aiScores?.overall || "-"}</strong></p>{question.answer?.improvements?.length ? <ul className="mt-1 list-disc pl-4">{question.answer.improvements.slice(0, 2).map((item) => <li key={item}>{item}</li>)}</ul> : null}{question.answer?.timelineMarkers?.length ? <div className="mt-1 rounded-md bg-slate-100/80 p-2 text-[11px] text-slate-700 dark:bg-slate-900/55 dark:text-slate-200"><p className="font-semibold">Timeline markers</p>{question.answer.timelineMarkers.slice(0, 3).map((marker, index) => <p key={`${question.id}-${marker.second}-${index}`}>{marker.second}s: {marker.label}</p>)}</div> : null}</div>)}</div></div></div> : <div className="grid min-h-[260px] place-items-center text-center text-sm text-slate-600 dark:text-slate-300"><p>Select a session to inspect detailed AI feedback and export a PDF report.</p></div>}</section></div>;
}