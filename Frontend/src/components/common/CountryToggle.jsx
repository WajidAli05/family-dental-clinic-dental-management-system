import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useClinicConfigStore } from "@/store/clinicConfigStore";
import { useUserStore } from "@/store/userStore";
import { handleUnauthorized } from "@/lib/httpClient";

const BASE = import.meta.env.VITE_API_BASE_URL;
async function switchCountryApi(country) {
  const token = useUserStore.getState().token || localStorage.getItem("token");
  const res = await fetch(`${BASE}/clinic-config/country`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ country }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) handleUnauthorized("/clinic-config/country");
  if (!res.ok || json?.success === false) throw new Error(json?.message || `Request failed: ${res.status}`);
  return json;
}

const OPTIONS = [
  { value: "PK", flag: "🇵🇰", label: "PKR" },
  { value: "SA", flag: "🇸🇦", label: "SAR" },
];

/**
 * Compact country/currency toggle for the sidebar footer.
 * All roles: interactive — switches config server-side via /clinic-config/country
 * and updates clinicConfigStore in-place so every subscribed component re-renders
 * without a page reload.
 */
const CountryToggle = () => {
  const { t } = useTranslation();
  const country     = useClinicConfigStore((s) => s.country);
  const applyConfig = useClinicConfigStore((s) => s.applyConfig);
  const [busy, setBusy] = useState(false);

  const handleSwitch = async (next) => {
    if (busy || next === country) return;
    setBusy(true);
    try {
      const res = await switchCountryApi(next);
      if (res?.success && res.data) {
        applyConfig(res.data);
        const label = next === "PK" ? "Pakistan (PKR)" : "Saudi Arabia (SAR)";
        toast.success(`Switched to ${label}`);
      }
    } catch (e) {
      toast.error(e.message || "Failed to switch country");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 py-3 border-t border-gray-100" title="Switch clinic market">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
        {t("market.label")}
      </p>
      <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
        {OPTIONS.map(({ value, flag, label }) => {
          const active    = country === value;
          const canChange = !busy && value !== country;

          return (
            <button
              key={value}
              type="button"
              disabled={busy && !active}
              onClick={() => handleSwitch(value)}
              className={[
                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 select-none",
                active
                  ? "bg-[#2ec4b6] text-white shadow-sm"
                  : "text-gray-500",
                canChange
                  ? "hover:bg-white hover:text-gray-800 hover:shadow-sm cursor-pointer"
                  : "cursor-default",
                busy ? "opacity-60" : "",
              ].join(" ")}
            >
              <span aria-hidden="true">{flag}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CountryToggle;
