const axios = require("axios");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
function normalizePrivateKey(value) {
  return String(value || "").replace(/\\n/g, "\n").trim();
}
function extractSpreadsheetId(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return "";
  }
  const idMatch = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch?.[1]) {
    return idMatch[1];
  }
  if (/^[a-zA-Z0-9-_]{20,}$/.test(raw)) {
    return raw;
  }
  return "";
}
function resolveSpreadsheetId() {
  return extractSpreadsheetId(env.adminUsersGoogleSheetId) || extractSpreadsheetId(env.adminUsersGoogleSheetUrl);
}
function assertGoogleSheetConfig() {
  const spreadsheetId = resolveSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error(
      "Google Sheet target is missing. Set ADMIN_USERS_GOOGLE_SHEET_URL or ADMIN_USERS_GOOGLE_SHEET_ID in backend/.env.local."
    );
  }
  if (!String(env.googleServiceAccountEmail || "").trim()) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is missing in backend/.env.local.");
  }
  if (!normalizePrivateKey(env.googleServiceAccountPrivateKey)) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is missing in backend/.env.local.");
  }
  return spreadsheetId;
}
async function getGoogleAccessToken() {
  const serviceEmail = String(env.googleServiceAccountEmail || "").trim();
  const privateKey = normalizePrivateKey(env.googleServiceAccountPrivateKey);
  const issuedAtSec = Math.floor(Date.now() / 1e3);
  const expiresAtSec = issuedAtSec + 3600;
  const assertion = jwt.sign(
    {
      iss: serviceEmail,
      scope: GOOGLE_SHEETS_SCOPE,
      aud: String(env.googleServiceAccountTokenUri || "https://oauth2.googleapis.com/token").trim(),
      iat: issuedAtSec,
      exp: expiresAtSec
    },
    privateKey,
    { algorithm: "RS256" }
  );
  const payload = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  }).toString();
  const tokenResponse = await axios.post(
    String(env.googleServiceAccountTokenUri || "https://oauth2.googleapis.com/token").trim(),
    payload,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 12e3
    }
  );
  const accessToken = String(tokenResponse?.data?.access_token || "").trim();
  if (!accessToken) {
    throw new Error("Google access token could not be generated.");
  }
  return accessToken;
}
async function clearSheetRange({ spreadsheetId, accessToken, clearRange }) {
  const encodedRange = encodeURIComponent(clearRange);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:clear`;
  await axios.post(
    url,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      timeout: 12e3
    }
  );
}
async function writeSheetValues({ spreadsheetId, accessToken, range, values }) {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`;
  const response = await axios.put(
    url,
    {
      range,
      majorDimension: "ROWS",
      values
    },
    {
      params: {
        valueInputOption: "RAW"
      },
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      timeout: 12e3
    }
  );
  return response?.data || {};
}
async function exportUsersToGoogleSheet(rows = []) {
  const spreadsheetId = assertGoogleSheetConfig();
  const range = String(env.adminUsersGoogleSheetRange || "Users!A1").trim();
  const clearRange = String(env.adminUsersGoogleSheetClearRange || "Users!A1:ZZ").trim();
  const accessToken = await getGoogleAccessToken();
  await clearSheetRange({ spreadsheetId, accessToken, clearRange });
  const result = await writeSheetValues({ spreadsheetId, accessToken, range, values: rows });
  return {
    spreadsheetId,
    sheetUrl: String(env.adminUsersGoogleSheetUrl || "").trim(),
    updatedRange: result?.updatedRange || range,
    updatedRows: Number(result?.updatedRows || 0),
    updatedCells: Number(result?.updatedCells || 0)
  };
}
module.exports = { exportUsersToGoogleSheet, extractSpreadsheetId };