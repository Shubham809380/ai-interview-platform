const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { Strategy: LinkedInStrategy } = require("passport-linkedin-oauth2");
const { env } = require("./env");

let configured = false;

function normalizeOrigin(origin) {
  return String(origin || "").trim().replace(/\/+$/, "");
}

function getProviderCallbackUrl(provider) {
  const backendBaseUrl = normalizeOrigin(env.backendBaseUrl);
  return `${backendBaseUrl}/api/auth/oauth/${provider}/callback`;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDisplayName(input, email) {
  const fallbackFromEmail = String(email || "").split("@")[0] || "User";
  const sanitized = String(input || fallbackFromEmail).trim().slice(0, 80);
  if (sanitized.length >= 2) {
    return sanitized;
  }
  return `${sanitized || "User"} User`.slice(0, 80);
}

function extractEmail(profile) {
  const emails = Array.isArray(profile?.emails) ? profile.emails : [];
  const fromArray = emails.find((item) => item?.value)?.value;
  const fromJson = profile?._json?.email || profile?._json?.emailAddress || profile?._json?.email_address;
  return normalizeEmail(fromArray || profile?.email || fromJson);
}

function extractName(profile, email) {
  const fromDisplay = String(profile?.displayName || "").trim();
  const fromParts = [profile?.name?.givenName, profile?.name?.familyName].filter(Boolean).join(" ").trim();
  const fromJson =
    [profile?._json?.localizedFirstName, profile?._json?.localizedLastName].filter(Boolean).join(" ").trim() ||
    String(profile?._json?.name || "").trim();
  return normalizeDisplayName(fromDisplay || fromParts || fromJson, email);
}

function extractProviderId(profile) {
  return String(profile?.id || profile?._json?.sub || "").trim();
}

function configurePassport() {
  if (configured) {
    return;
  }

  if (env.googleOAuthClientId && env.googleOAuthClientSecret) {
    passport.use(
      "google",
      new GoogleStrategy(
        {
          clientID: env.googleOAuthClientId,
          clientSecret: env.googleOAuthClientSecret,
          callbackURL: getProviderCallbackUrl("google")
        },
        (accessToken, refreshToken, profile, done) => {
          const email = extractEmail(profile);
          const name = extractName(profile, email);
          const providerId = extractProviderId(profile);
          return done(null, { email, name, provider: "google", providerId });
        }
      )
    );
  }

  if (env.linkedinOAuthClientId && env.linkedinOAuthClientSecret) {
    passport.use(
      "linkedin",
      new LinkedInStrategy(
        {
          clientID: env.linkedinOAuthClientId,
          clientSecret: env.linkedinOAuthClientSecret,
          callbackURL: getProviderCallbackUrl("linkedin"),
          scope: env.linkedinOAuthScopes,
          state: true
        },
        (accessToken, refreshToken, profile, done) => {
          const email = extractEmail(profile);
          const name = extractName(profile, email);
          const providerId = extractProviderId(profile);
          return done(null, { email, name, provider: "linkedin", providerId });
        }
      )
    );
  }

  configured = true;
}

module.exports = { passport, configurePassport };
