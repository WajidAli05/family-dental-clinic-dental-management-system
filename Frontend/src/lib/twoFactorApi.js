import { useUserStore } from "@/store/userStore";
import { handleUnauthorized } from "./httpClient";

const baseURL = import.meta.env.VITE_API_BASE_URL;

async function request(path, { method = "GET", body, token: overrideToken } = {}) {
  const token = overrideToken
    ?? useUserStore.getState().token
    ?? localStorage.getItem("token");

  const res = await fetch(`${baseURL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (res.status === 401) handleUnauthorized(path);
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed: ${res.status}`);
  }
  return json;
}

export const twoFactorApi = {
  getStatus:    ()              => request("/auth/2fa/status"),
  setup:        (method)        => request("/auth/2fa/setup",        { method: "POST", body: { method } }),
  verifySetup:  (code)          => request("/auth/2fa/verify-setup", { method: "POST", body: { code } }),
  sendOtp:      ()              => request("/auth/2fa/send-otp",     { method: "POST" }),
  disable:      (password, code, codeType = "totp") =>
                                   request("/auth/2fa/disable",      { method: "POST", body: { password, code, codeType } }),

  // Challenge-token call: no Bearer token needed — challengeToken is in the body
  verify2faLogin: (challengeToken, code, codeType = "totp") =>
    request("/auth/2fa/login", {
      method: "POST",
      body:   { challengeToken, code, codeType },
      token:  null, // explicitly no auth header
    }),
};
