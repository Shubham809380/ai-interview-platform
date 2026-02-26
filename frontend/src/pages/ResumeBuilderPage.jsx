import { useEffect, useMemo, useRef, useState } from "react";
import { CircleGauge, Download, FilePlus2, Files, Sparkles, Target, Trash2, Upload, Wand2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { useAuth } from "../context/AuthContext";
import { listStoredResumes, removeStoredResume, saveStoredResume } from "../lib/resumeStorage";
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const SKILLS = [
"react",
"nextjs",
"node",
"express",
"mongodb",
"sql",
"postgresql",
"mysql",
"redis",
"typescript",
"javascript",
"python",
"java",
"docker",
"kubernetes",
"aws",
"azure",
"gcp",
"graphql",
"rest api",
"testing",
"system design",
"ci/cd",
"microservices",
"communication"];

const ACTION_VERBS = [
"built",
"led",
"designed",
"optimized",
"implemented",
"launched",
"improved",
"delivered",
"created",
"managed",
"scaled",
"automated",
"reduced",
"increased",
"developed"];

const STOP = new Set([
"about",
"after",
"also",
"candidate",
"company",
"experience",
"looking",
"must",
"required",
"requirements",
"role",
"skills",
"team",
"will",
"with",
"work",
"years"]
);
const SECTIONS = [
/\b(summary|profile|professional summary)\b/i,
/\b(experience|work history|employment)\b/i,
/\b(skills?|technical skills)\b/i,
/\b(projects?|key projects)\b/i,
/\b(education|academic)\b/i];

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const clamp = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
const clampFloat = (v) => Math.max(0, Math.min(100, Number(v) || 0));
const clean = (v) => String(v || "").replace(/\0/g, " ").replace(/\s+/g, " ").trim();
const normalizeResumeText = (v) => String(v || "").replace(/\r\n?/g, "\n").replace(/\0/g, " ").split("\n").map((line) => line.replace(/[ \t]+/g, " ").trimEnd()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
const statusClass = (v) => v === "Optimized" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
const bytes = (v) => v < 1024 ? `${v} B` : v < 1024 * 1024 ? `${(v / 1024).toFixed(1)} KB` : `${(v / (1024 * 1024)).toFixed(1)} MB`;
const safeFileToken = (v = "") => String(v || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "resume";
function downloadResumePdf(resume) {
  const resumeName = clean(resume?.name || "resume");
  const resumeText = normalizeResumeText(resume?.text || "");
  if (!resumeText) {
    throw new Error("Resume content is empty. Create or select a resume first.");
  }
  const rawLines = resumeText.split("\n").map((line) => line.trim());
  const filteredTopLines = rawLines.filter(Boolean);
  const sectionMatchers = [
  { key: "profile", regex: /^(professional summary|summary|profile)$/i },
  { key: "experience", regex: /^(work experience|experience|employment|work history)$/i },
  { key: "education", regex: /^(education|academics?)$/i },
  { key: "skills", regex: /^(skills?|core skills|technical skills)$/i },
  { key: "languages", regex: /^(languages?|language)$/i },
  { key: "projects", regex: /^(projects?|key projects)$/i },
  { key: "references", regex: /^(references?)$/i }];
  const sections = {
    profile: [],
    experience: [],
    education: [],
    skills: [],
    languages: [],
    projects: [],
    references: []
  };
  const contactCandidate = filteredTopLines.slice(0, 7).find((line) => line.includes("|") && /(phone|email|linkedin|location|@)/i.test(line)) || "";
  const roleCandidate = filteredTopLines.slice(1, 7).find((line) => line !== contactCandidate && !line.includes("|") && !sectionMatchers.some((entry) => entry.regex.test(line)) && line.length <= 58) || "";
  const displayName = clean(filteredTopLines[0] || resumeName) || resumeName;
  let currentSection = "profile";
  rawLines.forEach((line, index) => {
    const text = String(line || "").trim();
    if (!text) {
      if (sections[currentSection]?.length && sections[currentSection][sections[currentSection].length - 1] !== "") sections[currentSection].push("");
      return;
    }
    if (index === 0 && clean(text) === displayName) return;
    if (text === contactCandidate || text === roleCandidate || /^generated on\b/i.test(text)) return;
    const matchedSection = sectionMatchers.find((entry) => entry.regex.test(text.replace(/[:\-]+$/g, "").trim()));
    if (matchedSection) {
      currentSection = matchedSection.key;
      return;
    }
    sections[currentSection].push(text);
  });
  const contact = { phone: "", email: "", linkedin: "", location: "" };
  if (contactCandidate) {
    contactCandidate.split("|").map((part) => clean(part)).filter(Boolean).forEach((part) => {
      const lower = part.toLowerCase();
      if (lower.includes("phone")) contact.phone = clean(part.split(":").slice(1).join(":")) || clean(part.replace(/phone/i, "").replace(":", ""));
      else if (lower.includes("email") || part.includes("@")) contact.email = clean(part.split(":").slice(1).join(":")) || part;
      else if (lower.includes("linkedin")) contact.linkedin = clean(part.split(":").slice(1).join(":")) || part;
      else if (lower.includes("location")) contact.location = clean(part.split(":").slice(1).join(":")) || part;
      else if (!contact.location) contact.location = part;
    });
  }
  if (!contact.email) {
    const emailMatch = resumeText.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    if (emailMatch) contact.email = emailMatch[0];
  }
  if (!contact.phone) {
    const phoneMatch = resumeText.match(/(\+?\d[\d\s\-()]{8,}\d)/);
    if (phoneMatch) contact.phone = clean(phoneMatch[0]);
  }
  if (!contact.linkedin) {
    const linkedinMatch = resumeText.match(/linkedin\.com\/in\/[a-z0-9-_/]+/i);
    if (linkedinMatch) contact.linkedin = linkedinMatch[0];
  }
  if (!contact.location) {
    const locationMatch = resumeText.match(/location:\s*([^\n|]+)/i);
    if (locationMatch) contact.location = clean(locationMatch[1]);
  }
  let displayRole = clean(roleCandidate);
  if (!displayRole) {
    const summaryLine = sections.profile.find((line) => clean(line));
    const summaryRoleMatch = summaryLine?.match(/(?:fresher|junior|mid-level|senior)?\s*([a-z][a-z\s/&-]{2,40})\s+with/i);
    if (summaryRoleMatch) displayRole = clean(summaryRoleMatch[1]);
  }
  if (!displayRole) {
    const workHeader = sections.experience.find((line) => line.includes("|"));
    const roleFromWork = workHeader ? workHeader.split("|").map((part) => clean(part)).filter(Boolean)[1] : "";
    displayRole = clean(roleFromWork);
  }
  if (!displayRole) displayRole = "Professional";
  const compactSectionLines = (lines = []) => lines.filter((line) => line !== "");
  const leftSections = {
    education: compactSectionLines(sections.education),
    skills: compactSectionLines(sections.skills),
    languages: compactSectionLines(sections.languages)
  };
  const rightSections = {
    profile: compactSectionLines(sections.profile),
    experience: compactSectionLines(sections.experience),
    projects: compactSectionLines(sections.projects),
    references: compactSectionLines(sections.references)
  };
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 36;
  const headerHeight = 118;
  const contactBandHeight = 40;
  const contentTop = headerHeight + contactBandHeight + 28;
  const leftColWidth = 165;
  const dividerX = marginX + leftColWidth + 18;
  const rightColX = dividerX + 20;
  const rightColWidth = pageWidth - rightColX - marginX;
  doc.setFillColor(242, 242, 242);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  doc.setFillColor(225, 225, 225);
  doc.rect(0, headerHeight, pageWidth, contactBandHeight, "F");
  doc.setTextColor(39, 42, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(38);
  const nameLines = doc.splitTextToSize(displayName, pageWidth - marginX * 2);
  doc.text(nameLines, marginX, 66);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(15);
  doc.text(displayRole, marginX, 98);
  const contactFields = [
  { label: "Phone", value: contact.phone || "-" },
  { label: "Email", value: contact.email || "-" },
  { label: contact.location ? "Location" : "LinkedIn", value: contact.location || contact.linkedin || "-" }];
  const contactWidth = (pageWidth - marginX * 2) / 3;
  contactFields.forEach((field, index) => {
    const x = marginX + index * contactWidth;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${field.label}:`, x, headerHeight + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(field.value, contactWidth - 8);
    doc.text(lines, x, headerHeight + 29);
  });
  doc.setDrawColor(147, 147, 147);
  doc.setLineWidth(0.8);
  doc.line(dividerX, contentTop - 10, dividerX, pageHeight - 36);
  const drawHeading = (title, x, y) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(38, 38, 38);
    doc.text(String(title || "").toUpperCase(), x, y);
    return y + 18;
  };
  const drawParagraph = (text, x, y, width, options = {}) => {
    const fontSize = options.fontSize || 10.5;
    const lineHeight = options.lineHeight || 13.5;
    const style = options.style || "normal";
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    doc.setTextColor(54, 54, 54);
    const wrapped = doc.splitTextToSize(String(text || ""), width);
    if (!wrapped.length) return y;
    doc.text(wrapped, x, y);
    return y + wrapped.length * lineHeight;
  };
  const drawSection = (title, lines, x, y, width, options = {}) => {
    if (!lines?.length) return y;
    let cursor = drawHeading(title, x, y);
    lines.forEach((line) => {
      if (cursor > pageHeight - 40) return;
      const isBullet = options.forceBullets || /^[-*]\s+/.test(line);
      const text = isBullet ? `- ${String(line).replace(/^[-*]\s+/, "")}` : line;
      cursor = drawParagraph(text, x, cursor, width, { fontSize: options.fontSize || 10.8, lineHeight: options.lineHeight || 14, style: options.style || "normal" });
      cursor += 4;
    });
    return cursor + 8;
  };
  const drawExperience = (lines, x, y, width) => {
    if (!lines?.length) return y;
    let cursor = drawHeading("Work Experience", x, y);
    const entries = [];
    let current = [];
    lines.forEach((line) => {
      if (line.includes("|") && current.length) {
        entries.push(current);
        current = [line];
      } else current.push(line);
    });
    if (current.length) entries.push(current);
    entries.forEach((entry) => {
      if (cursor > pageHeight - 40) return;
      const header = String(entry[0] || "");
      const headerParts = header.includes("|") ? header.split("|").map((part) => clean(part)).filter(Boolean) : [];
      const company = headerParts[0] || clean(header);
      const role = headerParts[1] || "";
      const dates = headerParts[2] || "";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(36, 36, 36);
      doc.text(company, x, cursor);
      if (dates) {
        doc.setFontSize(10.5);
        doc.text(dates, x + width, cursor, { align: "right" });
      }
      cursor += 16;
      if (role) {
        cursor = drawParagraph(role, x, cursor, width, { fontSize: 10.5, lineHeight: 13.5, style: "normal" });
        cursor += 2;
      }
      entry.slice(1).forEach((line) => {
        const text = /^[-*]\s+/.test(line) ? `- ${line.replace(/^[-*]\s+/, "")}` : line;
        cursor = drawParagraph(text, x, cursor, width, { fontSize: 10.3, lineHeight: 13.3, style: "normal" });
        cursor += 3;
      });
      cursor += 8;
    });
    return cursor;
  };
  let leftY = contentTop;
  leftY = drawSection("Education", leftSections.education, marginX, leftY, leftColWidth, { fontSize: 11, lineHeight: 14 });
  leftY = drawSection("Skills", leftSections.skills, marginX, leftY, leftColWidth, { forceBullets: true, fontSize: 11, lineHeight: 14.2 });
  leftY = drawSection("Language", leftSections.languages, marginX, leftY, leftColWidth, { forceBullets: true, fontSize: 11, lineHeight: 14.2 });
  let rightY = contentTop;
  rightY = drawSection("Profile", rightSections.profile, rightColX, rightY, rightColWidth, { fontSize: 11, lineHeight: 14.5 });
  rightY = drawExperience(rightSections.experience, rightColX, rightY, rightColWidth);
  rightY = drawSection("Projects", rightSections.projects, rightColX, rightY, rightColWidth, { fontSize: 10.8, lineHeight: 14 });
  rightY = drawSection("References", rightSections.references, rightColX, rightY, rightColWidth, { fontSize: 10.8, lineHeight: 14 });
  doc.save(`${safeFileToken(resumeName)}.pdf`);
}
function wordsToKeywords(text = "", limit = 30) {
  const counts = {};
  String(text || "").toLowerCase().replace(/[^a-z0-9+#./\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).forEach((w) => {
    counts[w] = (counts[w] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w]) => w);
}
function hasHeaderContacts(text = "") {
  return {
    email: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text),
    phone: /(\+?\d[\d\s\-()]{8,}\d)/.test(text),
    linkedin: /linkedin\.com\/in\//i.test(text)
  };
}
function analyzeResume(resumeText = "", jdText = "") {
  const raw = String(resumeText || "");
  const resume = clean(raw).toLowerCase();
  const jd = clean(jdText).toLowerCase();
  const words = resume.split(/\s+/).filter(Boolean);
  const wordsCount = words.length;
  const unique = new Set(words).size;
  const diversity = wordsCount ? unique / wordsCount : 0;
  const sectionHits = SECTIONS.reduce((n, regex) => regex.test(raw) ? n + 1 : n, 0);
  const bullets = (raw.match(/(^|\n)\s*([-*]|\d+\.)\s+/gm) || []).length;
  const metricHits = (raw.match(/\b(\d+(\.\d+)?%|\d+(\.\d+)?\s*(x|years?|months?|users?|clients?|projects?|k|m|b)|\$[\d,.]+)\b/gi) || []).length;
  const actionHits = (resume.match(new RegExp(`\\b(${ACTION_VERBS.join("|")})\\b`, "g")) || []).length;
  const contacts = hasHeaderContacts(raw);
  const contactCount = [contacts.email, contacts.phone, contacts.linkedin].filter(Boolean).length;
  const jdKeywords = wordsToKeywords(jd, 36);
  const resumeKeywordSet = new Set(wordsToKeywords(resume, 90));
  const matchedKeywords = jdKeywords.filter((w) => resume.includes(w) || resumeKeywordSet.has(w));
  const missingKeywords = jdKeywords.filter((w) => !matchedKeywords.includes(w));
  const resumeSkills = SKILLS.filter((s) => resume.includes(s));
  const jdSkills = SKILLS.filter((s) => jd.includes(s));
  const resumeSkillSet = new Set(resumeSkills);
  const matchedSkills = jdSkills.filter((s) => resumeSkillSet.has(s));
  const missingSkills = jdSkills.filter((s) => !resumeSkillSet.has(s));
  const keywordScore = jdKeywords.length ? clampFloat(matchedKeywords.length / jdKeywords.length * 100) : 0;
  const skillsScore = jdSkills.length ? clampFloat(matchedSkills.length / jdSkills.length * 100) : 0;
  const bulletDensity = bullets / Math.max(1, wordsCount / 60);
  const metricDensity = metricHits / Math.max(1, wordsCount / 90);
  const actionDensity = actionHits / Math.max(1, wordsCount / 75);
  const skillsCoverage = clampFloat(Math.min(100, resumeSkills.length * 8));
  const lengthPenalty = wordsCount < 120 ? 12 : wordsCount > 1100 ? 8 : 0;
  const sectionsPenalty = sectionHits < 3 ? 10 : sectionHits < 4 ? 5 : 0;
  const repetitionPenalty = diversity < 0.34 ? clampFloat((0.34 - diversity) * 90) : 0;
  const formattingScore = clampFloat(
    10 + sectionHits * 13 + Math.min(16, bulletDensity * 4.5) + contactCount * 6 + Math.min(14, wordsCount / 70)
  );
  const experienceScore = clampFloat(
    8 + Math.min(42, metricDensity * 16) + Math.min(28, actionDensity * 15) + Math.min(16, resumeSkills.length * 1.9)
  );
  const readabilityScore = clampFloat(
    30 + Math.min(22, wordsCount / 30) + Math.min(20, diversity * 48) - repetitionPenalty
  );
  const fingerprint = words.reduce((sum, word, i) => sum + (word.charCodeAt(0) || 0) * (i + 7) % 991, 0);
  const tieBreaker = fingerprint % 17 * 0.22;
  const score = jdKeywords.length ? clamp(
    keywordScore * 0.31 + skillsScore * 0.23 + formattingScore * 0.2 + experienceScore * 0.16 + readabilityScore * 0.1 - Math.min(8, sectionsPenalty / 2) + tieBreaker
  ) : clamp(
    8 + formattingScore * 0.34 + experienceScore * 0.28 + readabilityScore * 0.2 + skillsCoverage * 0.18 - lengthPenalty - sectionsPenalty + tieBreaker
  );
  const suggestions = [];
  if (!contacts.email) suggestions.push("Add professional email in header.");
  if (!contacts.phone) suggestions.push("Add phone number for ATS completeness.");
  if (!contacts.linkedin) suggestions.push("Add LinkedIn profile URL.");
  if (sectionHits < 4) suggestions.push("Use standard sections: Summary, Experience, Skills, Projects, Education.");
  if (bullets < 6) suggestions.push("Use more bullet points for readability.");
  if (metricHits < 3) suggestions.push("Add measurable impact: %, revenue, users, delivery time.");
  if (jdKeywords.length && missingSkills.length) suggestions.push(`Add missing skills: ${missingSkills.slice(0, 5).join(", ")}.`);
  if (jdKeywords.length && !missingSkills.length && missingKeywords.length) suggestions.push(`Add missing keywords: ${missingKeywords.slice(0, 6).join(", ")}.`);
  return {
    score,
    status: score >= 78 ? "Optimized" : "Needs Work",
    keywordScore,
    skillsScore,
    formattingScore,
    experienceScore,
    readabilityScore,
    matchedKeywords: matchedKeywords.slice(0, 12),
    missingSkills: missingSkills.slice(0, 10),
    missingKeywords: missingKeywords.slice(0, 10),
    suggestions: suggestions.slice(0, 5)
  };
}
function buildAiTemplate({ name, role, level, skills, achievements, jdText }) {
  const jdSkillPool = SKILLS.filter((s) => String(jdText || "").toLowerCase().includes(s));
  const mergedSkills = Array.from(new Set([...skills, ...jdSkillPool, ...wordsToKeywords(jdText, 10)])).slice(0, 12);
  const finalSkills = mergedSkills.length ? mergedSkills : ["javascript", "react", "node", "sql", "aws", "testing"];
  const lines = String(achievements || "").split(/\n+/).map((line) => clean(line)).filter(Boolean).slice(0, 4);
  const bullets = (lines.length ? lines : [
  "Built end-to-end product features and improved release velocity by 30%",
  "Optimized APIs and queries to reduce latency by 35%",
  "Collaborated with product, design, and QA to ship reliable releases"]).
  map((line, idx) => /\d|%|\$/.test(line) ? `- ${line}` : `- ${line}, improving outcomes by ${22 + idx * 7}%`);
  return `${clean(name) || "Your Name"}
${clean(role) || "Software Engineer"}
Email: your.email@example.com | Phone: +91-XXXXXXXXXX | LinkedIn: linkedin.com/in/your-profile | Location: Your City

Professional Summary
${clean(level) || "Mid-level"} ${clean(role) || "Software Engineer"} with strong ownership in design, development, and delivery of production features.
Focused on scalable architecture, clean code, and measurable business impact.

Core Skills
- ${finalSkills.join("\n- ")}

Work Experience
Company Name | ${clean(role) || "Software Engineer"} | 20XX - Present
${bullets.join("\n")}

Projects
Project Name | Tech: ${finalSkills.slice(0, 6).join(", ")}
- Developed a high-impact workflow solution and increased completion rate by 22%.
- Improved stability through monitoring, testing, and error handling improvements.

Education
Bachelor's Degree in Computer Science | University Name | 20XX

Language
- English

References
Reference Name | Company | +1-XXX-XXX-XXXX | reference@email.com`;
}
function buildStarterTemplate({ name, role, level, skills }) {
  const roleText = clean(role) || "Software Engineer";
  const levelText = clean(level) || "Mid-level";
  const normalizedSkills = Array.from(new Set((Array.isArray(skills) ? skills : []).map((skill) => clean(skill).toLowerCase()).filter(Boolean)));
  const finalSkills = normalizedSkills.length ? normalizedSkills : ["javascript", "react", "node", "sql", "aws", "testing"];
  return `${clean(name) || "Your Name"}
${roleText}
Email: your.email@example.com | Phone: +1-XXX-XXX-XXXX | LinkedIn: linkedin.com/in/your-profile | Portfolio: yourportfolio.dev

Professional Summary
${levelText} ${roleText} with experience delivering reliable products, collaborating cross-functionally, and improving performance.
Strong in ownership, communication, and shipping measurable outcomes.

Core Skills
- ${finalSkills.join("\n- ")}

Work Experience
Company Name | ${roleText} | Jan 20XX - Present
- Built and shipped [feature/project], increasing [metric] by [X]%.
- Improved [system/process], reducing [latency/cost/time] by [X]%.
- Collaborated with product, design, and QA to deliver high-quality releases.

Projects
Project Name | Tech: ${finalSkills.slice(0, 6).join(", ")}
- Designed and implemented [project summary], serving [X] users.
- Added monitoring/testing to improve reliability and maintainability.

Education
Degree | University Name | 20XX

Language
- English
- Hindi

References
Reference Name | Company | +1-XXX-XXX-XXXX | reference@email.com`;
}
async function parseFile(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const raw = await file.text();
  const plain = file.type.startsWith("text/") || ["txt", "md", "csv", "rtf"].includes(ext);
  const text = plain ? normalizeResumeText(raw) : clean((String(raw).match(/[A-Za-z][A-Za-z0-9+#./-]{1,}/g) || []).join(" "));
  if (!plain) {
    const alphaChars = (text.match(/[a-z]/gi) || []).length;
    const alphaRatio = alphaChars / Math.max(1, text.length);
    if (alphaRatio < 0.55 || text.split(/\s+/).length < 120) throw new Error("PDF/DOC text extraction is unreliable. Upload TXT/MD or paste resume content manually.");
  }
  if (text.split(/\s+/).length < 80) throw new Error("Could not extract readable resume text. Upload TXT/MD/RTF or create manually.");
  return text;
}
function optimizeText(text = "", analysis) {
  const baseText = normalizeResumeText(text);
  const chunks = [];
  if (analysis.missingSkills?.length) chunks.push(`Skills to Include
- ${analysis.missingSkills.slice(0, 6).join("\n- ")}`);
  if (analysis.missingKeywords?.length) chunks.push(`ATS Keywords
- ${analysis.missingKeywords.slice(0, 8).join("\n- ")}`);
  if ((analysis.experienceScore || 0) < 70) chunks.push("Impact Examples\n- Improved API latency by 35% via caching and query tuning.\n- Reduced production bugs by 30% with automated QA checks.");
  return chunks.length ? `${baseText}

${chunks.join("\n\n")}` : baseText;
}
function Stat({ label, value, icon: Icon }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 font-display text-3xl font-extrabold text-slate-900 dark:text-slate-100">{value}</p></div><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Icon size={18} /></span></div></article>;
}
export function ResumeBuilderPage() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [resumes, setResumes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [jdText, setJdText] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftText, setDraftText] = useState("");
  const [templateRole, setTemplateRole] = useState(user?.targetRole || "");
  const [templateLevel, setTemplateLevel] = useState("Mid-level");
  const [templateSkills, setTemplateSkills] = useState("");
  const [templateAchievements, setTemplateAchievements] = useState("");
  useEffect(() => setResumes(listStoredResumes(user)), [user?.id, user?.email]);
  useEffect(() => {
    if (!resumes.length) return setSelectedId("");
    if (!selectedId || !resumes.some((r) => r.id === selectedId)) setSelectedId(resumes[0].id);
  }, [resumes, selectedId]);
  const selected = useMemo(() => resumes.find((r) => r.id === selectedId) || null, [resumes, selectedId]);
  const jd = useMemo(() => selected?.text && jdText.trim() ? analyzeResume(selected.text, jdText) : null, [selected?.text, jdText]);
  const displayResumes = useMemo(
    () => resumes.map((resume) => {
      const computed = analyzeResume(resume.text || "", "");
      return {
        ...resume,
        score: computed.score,
        status: computed.status,
        suggestions: computed.suggestions
      };
    }),
    [resumes]
  );
  const stats = useMemo(() => ({ active: displayResumes.length, avg: displayResumes.length ? Math.round(displayResumes.reduce((s, r) => s + (Number(r.score) || 0), 0) / displayResumes.length) : "-", ok: displayResumes.filter((r) => r.status === "Optimized").length, bad: displayResumes.filter((r) => r.status !== "Optimized").length }), [displayResumes]);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return setError("Resume file is too large. Max 4MB.");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const text = await parseFile(file);
      const a = analyzeResume(text, jdText);
      setResumes(saveStoredResume(user, { id: makeId(), name: file.name, type: file.type || "application/octet-stream", size: file.size || 0, uploadedAt: new Date().toISOString(), text, score: a.score, status: a.status, suggestions: a.suggestions }));
      setMessage(`${file.name} uploaded and analyzed.`);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };
  const generateTemplate = () => {
    setError("");
    setMessage("");
    if (!clean(templateRole) && !clean(jdText)) return setError("Add target role or paste JD before AI template generation.");
    const skills = Array.from(new Set(String(templateSkills || "").split(",").map((s) => clean(s).toLowerCase()).filter(Boolean)));
    const t = buildAiTemplate({ name: user?.name || "", role: templateRole, level: templateLevel, skills, achievements: templateAchievements, jdText });
    setDraftText(t);
    if (!clean(draftName)) setDraftName(`${clean(templateRole) || "AI"} Resume`);
    setMessage("AI template generated. Review once and create resume.");
  };
  const useStarterTemplate = () => {
    setError("");
    setMessage("");
    const skills = String(templateSkills || "").split(",").map((skill) => clean(skill).toLowerCase()).filter(Boolean);
    const template = buildStarterTemplate({ name: user?.name || "", role: templateRole, level: templateLevel, skills });
    setDraftText(template);
    if (!clean(draftName)) setDraftName(`${clean(templateRole) || "ATS"} Resume`);
    setMessage("ATS starter template loaded. Fill placeholders and create resume.");
  };
  const create = (e) => {
    e.preventDefault();
    const name = clean(draftName),text = normalizeResumeText(draftText);
    setError("");
    setMessage("");
    if (!name || !text) return setError("Resume name and content are required.");
    const id = makeId(),a = analyzeResume(text, jdText);
    setResumes(saveStoredResume(user, { id, name, type: "text/plain", size: new TextEncoder().encode(text).length, uploadedAt: new Date().toISOString(), text, score: a.score, status: a.status, suggestions: a.suggestions }));
    setSelectedId(id);
    setDraftText("");
    setTemplateAchievements("");
    setMessage(`${name} created with ATS score ${a.score}. Use Download PDF option to export.`);
  };
  const optimize = () => {
    if (!selected) return setError("Select a resume first.");
    if (!jd) return setError("Paste job description first.");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const text = optimizeText(selected.text, jd),a = analyzeResume(text, jdText);
      setResumes(saveStoredResume(user, { ...selected, uploadedAt: new Date().toISOString(), text, size: new TextEncoder().encode(text).length, score: a.score, status: a.status, suggestions: a.suggestions }));
      setMessage(`Smart ATS Optimization complete. New score: ${a.score}.`);
    } catch {
      setError("Optimization failed.");
    } finally {
      setBusy(false);
    }
  };
  const downloadPdf = (resume = selected) => {
    setError("");
    if (!resume?.text) return setError("Create or select a resume first.");
    try {
      downloadResumePdf(resume);
      setMessage(`${resume.name} PDF downloaded.`);
    } catch (err) {
      setError(err.message || "PDF download failed.");
    }
  };
  return <div className="grid gap-4"><section className="glass-panel rounded-2xl p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h1 className="font-display text-4xl font-extrabold text-slate-900 dark:text-slate-100">Smart ATS Optimization Engine</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Improved ATS scoring + AI resume template + one-click JD optimization.</p></div><button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"><Upload size={16} />{busy ? "Processing..." : "Upload New Resume"}</button><input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.rtf,.pdf,.doc,.docx" className="hidden" onChange={upload} /></div>{message ? <p className="mt-4 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}{error ? <p className="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p> : null}<div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Active Resumes" value={stats.active} icon={Files} /><Stat label="Average Score" value={stats.avg} icon={CircleGauge} /><Stat label="Optimized" value={stats.ok} icon={Target} /><Stat label="Needs Work" value={stats.bad} icon={Sparkles} /></div></section><section className="glass-panel rounded-2xl p-5"><h2 className="font-display text-xl font-bold">Create Resume (AI Template)</h2><p className="mt-1 text-sm text-slate-500">Add target role, level, skills and achievements, then generate AI text or start from the ATS template.</p><form onSubmit={create} className="mt-3 grid gap-3"><div className="grid gap-3 md:grid-cols-2"><input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Resume name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" /><input value={templateRole} onChange={(e) => setTemplateRole(e.target.value)} placeholder="Target role (e.g. Backend Engineer)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" /></div><div className="grid gap-3 md:grid-cols-2"><select value={templateLevel} onChange={(e) => setTemplateLevel(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"><option>Fresher</option><option>Junior</option><option>Mid-level</option><option>Senior</option></select><input value={templateSkills} onChange={(e) => setTemplateSkills(e.target.value)} placeholder="Skills (comma separated)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" /></div><textarea rows={3} value={templateAchievements} onChange={(e) => setTemplateAchievements(e.target.value)} placeholder="Top achievements (one per line)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" /><textarea rows={8} value={draftText} onChange={(e) => setDraftText(e.target.value)} placeholder="Resume content..." className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" /><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={useStarterTemplate} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-sky-300 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 disabled:opacity-60"><FilePlus2 size={16} />Use ATS Template</button><button type="button" onClick={generateTemplate} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-violet-300 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-60"><Sparkles size={16} />Generate AI Template</button><button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><FilePlus2 size={16} />Create Resume</button><button type="button" onClick={() => downloadPdf(selected)} disabled={busy || !selected} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"><Download size={16} />Download PDF</button></div></form></section><section className="glass-panel rounded-2xl p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-xl font-bold">ATS + JD Analyzer</h2><button type="button" onClick={optimize} disabled={busy || !selected || !jdText.trim()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Wand2 size={15} />Optimize Resume</button></div><div className="mt-3 grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]"><select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"><option value="">Select resume</option>{displayResumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><textarea rows={5} value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste job description..." className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" /></div>{jd ? <div className="mt-4 grid gap-3"><div className="grid gap-3 md:grid-cols-5"><Stat label="ATS Score" value={`${jd.score}%`} icon={CircleGauge} /><Stat label="Keyword Match" value={`${jd.keywordScore}%`} icon={Target} /><Stat label="Skills Match" value={`${jd.skillsScore}%`} icon={Sparkles} /><Stat label="Format+Impact" value={`${Math.round((jd.formattingScore + jd.experienceScore) / 2)}%`} icon={Files} /><Stat label="Readability" value={`${jd.readabilityScore}%`} icon={Wand2} /></div><div className="grid gap-3 md:grid-cols-3"><article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs"><p className="font-semibold text-emerald-800">Matched Keywords</p><div className="mt-2 flex flex-wrap gap-1">{(jd.matchedKeywords.length ? jd.matchedKeywords : ["No direct matches"]).map((w) => <span key={w} className="rounded-full bg-white px-2 py-1">{w}</span>)}</div></article><article className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs"><p className="font-semibold text-amber-800">Missing Skills</p><div className="mt-2 flex flex-wrap gap-1">{(jd.missingSkills.length ? jd.missingSkills : ["Strong alignment"]).map((w) => <span key={w} className="rounded-full bg-white px-2 py-1">{w}</span>)}</div></article><article className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs"><p className="font-semibold text-violet-800">Suggestions</p><div className="mt-2 grid gap-1">{(jd.suggestions.length ? jd.suggestions : ["Resume is already well aligned."]).map((t) => <p key={t}>- {t}</p>)}</div></article></div></div> : <p className="mt-3 text-sm text-slate-500">Select resume + paste JD to generate ATS analysis.</p>}</section>{displayResumes.length ? <section className="glass-panel rounded-2xl p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Resume Library</h2><p className="text-sm text-slate-500">{displayResumes.length} saved</p></div><div className="grid gap-3 xl:grid-cols-2">{displayResumes.map((r) => <article key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</h3><p className="text-xs text-slate-500">{new Date(r.uploadedAt).toLocaleDateString()} | {bytes(r.size || 0)}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(r.status)}`}>{r.status}</span></div><div className="mt-3 rounded-lg bg-slate-100 p-3 dark:bg-slate-800"><div className="mb-1 flex items-center justify-between text-sm font-semibold"><span>ATS Score</span><span>{r.score}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${r.score}%` }} /></div></div><div className="mt-3 grid gap-1 text-xs text-slate-600 dark:text-slate-300">{(r.suggestions?.length ? r.suggestions : ["Looks good. Keep tailoring per role."]).map((tip) => <p key={`${r.id}-${tip}`} className="inline-flex items-start gap-2"><Sparkles size={13} className="mt-0.5 shrink-0 text-violet-500" />{tip}</p>)}</div><div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={() => downloadPdf(r)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"><Download size={13} />Download PDF</button><button type="button" onClick={() => setResumes(removeStoredResume(user, r.id))} className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"><Trash2 size={13} />Remove</button></div></article>)}</div></section> : null}</div>;
}
