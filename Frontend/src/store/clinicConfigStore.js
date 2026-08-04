import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { formatMoney } from "@/utils/formatMoney";
import { handleUnauthorized } from "@/lib/httpClient";

const PK_DEFAULTS = {
  country:        "PK",
  locale:         "en",
  currency:       "PKR",
  currencySymbol: "₨",
  taxEnabled:     false,
  taxRate:        0,
  taxLabel:       "Tax",
  timezone:       "Asia/Karachi",
  dateFormat:     "DD/MM/YYYY",
  weekStart:      0,
  exchangeRate:   1,
};

export const useClinicConfigStore = create((set, get) => ({
  ...PK_DEFAULTS,
  ready:   false,
  loading: false,

  /**
   * Fetch clinic locale config from the server.
   * Guarded: no-ops if already fetched or if no auth token (pre-login).
   * Call this from any protected component; subsequent calls are free.
   */
  init: async () => {
    if (get().ready || get().loading) return;
    const token = localStorage.getItem("token");
    if (!token) return; // not logged in — keep PK defaults until login
    set({ loading: true });
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/clinic-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) handleUnauthorized("/clinic-config");
      if (!res.ok) throw new Error("config fetch failed");
      const json = await res.json();
      if (json?.success && json.data) {
        set({ ...PK_DEFAULTS, ...json.data, ready: true, loading: false });
      } else {
        set({ ready: true, loading: false });
      }
    } catch {
      // Graceful fallback to PK defaults — never breaks the UI
      set({ ready: true, loading: false });
    }
  },

  // Apply a config object received from the server (e.g. after a country switch)
  // without a full re-fetch so the update is instant app-wide.
  applyConfig: (data) => set((s) => ({ ...s, ...data })),

  // Called on logout so the next user starts fresh
  reset: () => set({ ...PK_DEFAULTS, ready: false, loading: false }),

  /**
   * Money formatter callable outside React (e.g. PDF/print utils).
   * Use the useFormatMoney() hook inside React components instead.
   */
  fmt: (n) => {
    const { currency, country, exchangeRate } = get();
    return formatMoney(n, { currency, country, exchangeRate });
  },
}));

/**
 * React hook — returns a money formatter bound to the current clinic currency.
 * Re-computes only when currency or country changes.
 */
export function useFormatMoney() {
  const currency     = useClinicConfigStore((s) => s.currency);
  const country      = useClinicConfigStore((s) => s.country);
  const exchangeRate = useClinicConfigStore((s) => s.exchangeRate);
  return (n) => formatMoney(n, { currency, country, exchangeRate });
}

/**
 * React hook — returns the full clinic locale config.
 * useShallow prevents infinite re-render loops caused by new object references.
 */
export function useClinicConfig() {
  return useClinicConfigStore(useShallow((s) => ({
    country:        s.country,
    locale:         s.locale,
    currency:       s.currency,
    currencySymbol: s.currencySymbol,
    taxEnabled:     s.taxEnabled,
    taxRate:        s.taxRate,
    taxLabel:       s.taxLabel,
    timezone:       s.timezone,
    dateFormat:     s.dateFormat,
    weekStart:      s.weekStart,
    ready:          s.ready,
  })));
}
