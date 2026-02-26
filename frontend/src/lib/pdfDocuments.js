import { jsPDF } from "jspdf";

function safeName(name) {
  const normalized = String(name || "").trim();
  return normalized || "Candidate";
}

function safeFileToken(value) {
  const token = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return token || "file";
}

function normalizeDate(value) {
  const candidate = value ? new Date(value) : new Date();
  if (Number.isNaN(candidate.getTime())) {
    return new Date();
  }
  return candidate;
}

function writeWrappedText(doc, text, x, y, maxWidth, lineHeight = 7) {
  const lines = doc.splitTextToSize(String(text || ""), maxWidth);

  for (const line of lines) {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }

  return y;
}

function uniqueStrings(items) {
  const seen = new Set();
  const next = [];

  for (const item of items) {
    const normalized = String(item || "").trim();
    if (!normalized) {
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    next.push(normalized);
  }

  return next;
}

export function buildMetricImprovementFocus(metrics = {}) {
  const data = metrics || {};
  const checks = [
    {
      key: "confidence",
      threshold: 76,
      suggestion: "Improve confidence: answer with decisive language and clear ownership of outcomes."
    },
    {
      key: "communication",
      threshold: 76,
      suggestion: "Improve communication: keep your story concise, structured, and outcome-focused."
    },
    {
      key: "clarity",
      threshold: 76,
      suggestion: "Improve clarity: use STAR structure (Situation, Task, Action, Result)."
    },
    {
      key: "grammar",
      threshold: 76,
      suggestion: "Improve grammar: use complete sentences and cleaner transitions between points."
    },
    {
      key: "technicalAccuracy",
      threshold: 76,
      suggestion: "Improve technical accuracy: include correct concepts, tradeoffs, and role-specific details."
    },
    {
      key: "speakingSpeed",
      threshold: 76,
      suggestion: "Improve speaking speed: target a steady pace around 110 to 160 words per minute."
    },
    {
      key: "facialExpression",
      threshold: 76,
      suggestion: "Improve facial expression: maintain eye contact and natural positive expression."
    },
    {
      key: "relevance",
      threshold: 76,
      suggestion: "Improve relevance: tie every example directly to the asked role and question."
    }
  ];

  const improvements = [];

  for (const check of checks) {
    const value = Number(data[check.key] || 0);
    if (value > 0 && value < check.threshold) {
      improvements.push(`${check.suggestion} Current ${check.key} score: ${value}/100.`);
    }
  }

  return improvements;
}

export function saveInterviewReportPdf(details, userName = "Candidate") {
  if (!details?.session) {
    return;
  }

  const candidateName = safeName(userName);
  const session = details.session;
  const issuedDate = normalizeDate(session.endedAt || session.createdAt);
  const metrics = session.metrics || {};
  const metricFocus = buildMetricImprovementFocus(metrics);
  const summaryImprovements = session.summary?.improvements || [];
  const improvements = uniqueStrings([...summaryImprovements, ...metricFocus]);
  const strengths = uniqueStrings(session.summary?.strengths || []);

  const doc = new jsPDF();
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("AI Interview Performance Report", 14, y);
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Candidate: ${candidateName}`, 14, y);
  y += 7;
  doc.text(`Issued: ${issuedDate.toLocaleDateString()}`, 14, y);
  y += 7;
  doc.text(`Session ID: ${session.id}`, 14, y);
  y += 7;
  doc.text(`Category: ${session.category}`, 14, y);
  y += 7;
  doc.text(`Role: ${session.targetRole || "General"}`, 14, y);
  y += 7;
  doc.text(`Company Simulation: ${session.companySimulation || "General"}`, 14, y);
  y += 7;
  doc.text(`Overall Score: ${session.overallScore || 0}/100`, 14, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Metric Summary", 14, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const [key, value] of Object.entries(metrics)) {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${key}: ${value}`, 16, y);
    y += 6;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Strengths", 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const item of (strengths.length ? strengths : ["Consistent practice effort across this session."])) {
    y = writeWrappedText(doc, `- ${item}`, 16, y, 178, 6);
  }

  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Improvement Suggestions", 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const item of (improvements.length ? improvements : ["Keep practicing consistently across categories."])) {
    y = writeWrappedText(doc, `- ${item}`, 16, y, 178, 6);
  }

  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Final Recommendation", 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  writeWrappedText(doc, session.summary?.recommendation || "No recommendation available yet.", 16, y, 178, 6);

  const fileName = `interview-report-${safeFileToken(candidateName)}-${safeFileToken(session.id)}.pdf`;
  doc.save(fileName);
}

export function saveInterviewCertificatePdf({ name, session }) {
  if (!session) {
    return;
  }

  const candidateName = safeName(name);
  const issuedDate = normalizeDate(session.endedAt || session.createdAt).toLocaleDateString();
  const certificateId = String(session.certificate?.id || "").trim();
  const verificationUrl = String(session.certificate?.verificationUrl || "").trim();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const centerText = (text, y, options = {}) => {
    doc.text(String(text || ""), pageWidth / 2, y, { align: "center", ...options });
  };

  doc.setFillColor(246, 250, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setDrawColor(20, 83, 173);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setDrawColor(128, 195, 255);
  doc.setLineWidth(0.6);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 83, 173);
  doc.setFontSize(34);
  centerText("Certificate", 42);

  doc.setFontSize(18);
  centerText("of Interview Completion", 54);

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  centerText("This certifies that", 72);

  doc.setFont("times", "bold");
  doc.setTextColor(9, 61, 122);
  doc.setFontSize(30);
  centerText(candidateName, 91);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(13);
  centerText("has successfully completed an AI interview practice session.", 105);

  doc.setFontSize(12);
  centerText(`Category: ${session.category || "General"}    Role: ${session.targetRole || "General"}`, 118);
  centerText(`Score: ${Number(session.overallScore) || 0}/100    Issued: ${issuedDate}`, 128);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 83, 173);
  doc.setFontSize(14);
  centerText("AI Interview Practice Platform", 150);

  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (certificateId) {
    centerText(`Certificate ID: ${certificateId}`, 162);
  }
  if (verificationUrl) {
    centerText(`Verify: ${verificationUrl}`, 170);
  }

  const fileName = `certificate-${safeFileToken(candidateName)}-${safeFileToken(session.id)}.pdf`;
  doc.save(fileName);
}
