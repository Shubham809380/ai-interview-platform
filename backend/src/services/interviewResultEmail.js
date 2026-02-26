const { env } = require("../config/env");
const { logger } = require("../utils/logger");
function buildFromAddress() {
  const fromAddress = String(env.emailFromAddress || "").trim();
  const fromName = String(env.emailFromName || "").trim();
  if (!fromAddress) {
    return "";
  }
  if (!fromName) {
    return fromAddress;
  }
  return `${fromName} <${fromAddress}>`;
}
function buildOutcome(overallScore = 0) {
  const normalized = Math.max(0, Math.min(100, Number(overallScore || 0)));
  const threshold = Math.max(0, Math.min(100, Number(env.interviewSelectionThreshold || 70)));
  const selected = normalized >= threshold;
  return {
    selected,
    threshold,
    statusLabel: selected ? "Selected" : "Not Selected",
    subject: selected ? "Interview Result: Congratulations, You Are Selected" : "Interview Result: Keep Improving, You Are Not Selected Yet"
  };
}
function buildEmailBody({
  userName = "Candidate",
  category = "HR",
  targetRole = "Generalist",
  overallScore = 0,
  sessionId = "",
  certificateId = "",
  verificationUrl = "",
  strengths = [],
  improvements = []
}) {
  const outcome = buildOutcome(overallScore);
  const strengthLines = Array.isArray(strengths) ? strengths.slice(0, 3).filter(Boolean) : [];
  const improvementLines = Array.isArray(improvements) ? improvements.slice(0, 3).filter(Boolean) : [];
  const textLines = [
  `Hi ${userName},`,
  "",
  `Your interview practice session is completed.`,
  `Result: ${outcome.statusLabel}`,
  `Overall Score: ${overallScore}/100`,
  `Category: ${category}`,
  `Target Role: ${targetRole}`,
  `Selection Cutoff: ${outcome.threshold}/100`,
  ""];

  if (strengthLines.length) {
    textLines.push("Top strengths:");
    for (const item of strengthLines) {
      textLines.push(`- ${item}`);
    }
    textLines.push("");
  }
  if (improvementLines.length) {
    textLines.push("Top improvements:");
    for (const item of improvementLines) {
      textLines.push(`- ${item}`);
    }
    textLines.push("");
  }
  if (certificateId) {
    textLines.push(`Certificate ID: ${certificateId}`);
  }
  if (verificationUrl) {
    textLines.push(`Certificate verification: ${verificationUrl}`);
  }
  if (sessionId) {
    textLines.push(`Session ID: ${sessionId}`);
  }
  textLines.push("");
  textLines.push("Regards,");
  textLines.push("AI Interview Platform");
  const html = `
<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
  <p>Hi <strong>${userName}</strong>,</p>
  <p>Your interview practice session is completed.</p>
  <p>
    <strong>Result:</strong> ${outcome.statusLabel}<br/>
    <strong>Overall Score:</strong> ${overallScore}/100<br/>
    <strong>Category:</strong> ${category}<br/>
    <strong>Target Role:</strong> ${targetRole}<br/>
    <strong>Selection Cutoff:</strong> ${outcome.threshold}/100
  </p>
  ${strengthLines.length ? `<p><strong>Top strengths:</strong></p><ul>${strengthLines.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
  ${improvementLines.length ? `<p><strong>Top improvements:</strong></p><ul>${improvementLines.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
  <p>
    ${certificateId ? `<strong>Certificate ID:</strong> ${certificateId}<br/>` : ""}
    ${verificationUrl ? `<strong>Certificate verification:</strong> <a href="${verificationUrl}">${verificationUrl}</a><br/>` : ""}
    ${sessionId ? `<strong>Session ID:</strong> ${sessionId}` : ""}
  </p>
  <p>Regards,<br/>AI Interview Platform</p>
</div>
  `.trim();
  return {
    outcome,
    text: textLines.join("\n"),
    html
  };
}
async function sendViaResend({ to, subject, text, html }) {
  const apiKey = String(env.resendApiKey || "").trim();
  const from = buildFromAddress();
  if (!apiKey) {
    return {
      sent: false,
      status: "skipped",
      error: "RESEND_API_KEY is missing."
    };
  }
  if (!from) {
    return {
      sent: false,
      status: "skipped",
      error: "EMAIL_FROM_ADDRESS is missing."
    };
  }
  const baseUrl = String(env.resendApiUrl || "https://api.resend.com").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      sent: false,
      status: "failed",
      error: String(payload?.message || payload?.error || `Email API failed with ${response.status}`),
      providerMessageId: ""
    };
  }
  return {
    sent: true,
    status: "sent",
    error: "",
    providerMessageId: String(payload?.id || "")
  };
}
async function sendInterviewResultEmail(input = {}) {
  const to = String(input?.to || "").trim();
  if (!to) {
    return {
      sent: false,
      status: "skipped",
      error: "Recipient email is missing."
    };
  }
  if (!env.interviewResultEmailEnabled) {
    return {
      sent: false,
      status: "skipped",
      error: "INTERVIEW_RESULT_EMAIL_ENABLED is false."
    };
  }
  const body = buildEmailBody(input);
  const subject = body.outcome.subject;
  const provider = String(env.emailProvider || "resend").toLowerCase();
  if (provider !== "resend") {
    return {
      sent: false,
      status: "skipped",
      error: `Unsupported EMAIL_PROVIDER "${provider}".`
    };
  }
  return sendViaResend({
    to,
    subject,
    text: body.text,
    html: body.html
  });
}
function queueInterviewResultEmail({ delayMs, sendTask, trace = {} }) {
  const effectiveDelayMs = Math.max(0, Number(delayMs || env.interviewResultEmailDelayMs || 5e3));
  const timer = setTimeout(async () => {
    try {
      await sendTask();
    } catch (error) {
      logger.error("Interview result email task failed", {
        ...trace,
        message: error?.message || "unknown"
      });
    }
  }, effectiveDelayMs);
  if (typeof timer?.unref === "function") {
    timer.unref();
  }
}
module.exports = {
  buildOutcome,
  buildEmailBody,
  sendInterviewResultEmail,
  queueInterviewResultEmail
};