import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../lib/api";
function inferBackendBaseUrl() {
  const configured = String(API_BASE || "").trim();
  if (configured) {
    return configured.replace(/\/+api\/?$/i, "");
  }
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:5000`;
  }
  return "http://localhost:5000";
}
export function SsoCallbackPage() {
  const navigate = useNavigate();
  const { completeOauthLogin, setAuthMessage } = useAuth();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authToken = String(params.get("authToken") || "").trim();
    const authError = String(params.get("authError") || "").trim();
    const provider = String(params.get("provider") || "").trim().toLowerCase();
    const oauthCode = String(params.get("code") || "").trim();
    const providerError = String(params.get("error_description") || params.get("error") || "").trim();
    if (authError) {
      setAuthMessage(authError);
      navigate("/?auth=login&view=auth", { replace: true });
      return;
    }
    if (providerError) {
      setAuthMessage(providerError);
      navigate("/?auth=login&view=auth", { replace: true });
      return;
    }
    if (oauthCode) {
      const backendBase = inferBackendBaseUrl();
      const providerHint = provider === "google" || provider === "linkedin" ? `${backendBase}/api/auth/oauth/${provider}/callback` : `${backendBase}/api/auth/oauth/<provider>/callback`;
      setAuthMessage(
        `OAuth callback misconfigured. Set provider callback URL to ${providerHint} and try again.`
      );
      navigate("/?auth=login&view=auth", { replace: true });
      return;
    }
    if (!authToken) {
      setAuthMessage("Authentication response missing token. Please retry social login from this app.");
      navigate("/?auth=login&view=auth", { replace: true });
      return;
    }
    completeOauthLogin(authToken).then(() => {
      navigate("/", { replace: true });
    }).catch((error) => {
      setAuthMessage(error?.message || "OAuth login failed. Please try again.");
      navigate("/?auth=login&view=auth", { replace: true });
    });
  }, [completeOauthLogin, navigate, setAuthMessage]);
  return <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white"><p className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium">
        Completing sign-in...
      </p></div>;
}