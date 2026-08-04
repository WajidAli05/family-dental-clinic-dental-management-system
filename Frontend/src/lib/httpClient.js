/**
 * Centralized 401 handling. Every API client's request() helper calls
 * handleUnauthorized(path) as soon as it sees a 401 — this is the single
 * place that decides what a 401 means and what to do about it, even though
 * each client still makes its own fetch() call.
 *
 * A 401 on an already-authenticated request means the token is invalid or
 * revoked (expired JWT, or "log out of all devices" bumping tokenVersion).
 * That session must clear itself and land on /login without the user
 * having to do anything — this fires on the very next request any
 * revoked session makes, including background polling.
 */
import { useUserStore } from "@/store/userStore";
import { toast } from "sonner";
import i18n from "@/i18n/i18n";

// Pre-auth endpoints: a 401 here means "wrong password" / "wrong 2FA code",
// not "your session was revoked" — must never trigger the redirect, or a
// mistyped password on the login screen would loop.
const PRE_AUTH_PATHS = ["/auth/login", "/auth/2fa/login"];

function isPreAuthPath(path) {
  return PRE_AUTH_PATHS.some((p) => path?.startsWith(p));
}

let handled = false; // guard against duplicate toasts/redirects from concurrent in-flight requests

export function handleUnauthorized(path = "") {
  if (isPreAuthPath(path)) return;
  if (handled) return;
  if (window.location.pathname === "/login") return;
  handled = true;

  useUserStore.getState().logout();

  try {
    toast.error(i18n.t("session.sessionExpired"));
  } catch {
    // toast/i18n unavailable — redirect still must happen
  }

  window.location.href = "/login";
}
