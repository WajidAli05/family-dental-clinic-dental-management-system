import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useClinicConfigStore } from "@/store/clinicConfigStore";
import { useUserStore } from "@/store/userStore";

const BASE = import.meta.env.VITE_API_BASE_URL;

async function switchLocaleApi(locale) {
  const token = useUserStore.getState().token || localStorage.getItem("token");
  const res = await fetch(`${BASE}/clinic-config/locale`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ locale }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) throw new Error(json?.message || `Request failed: ${res.status}`);
  return json;
}

const OPTIONS = [
  { value: "en", label: "EN" },
  { value: "ur", label: "UR" },
  { value: "ar", label: "AR" },
];

const LanguageToggle = () => {
  const { t } = useTranslation();
  const locale      = useClinicConfigStore((s) => s.locale);
  const applyConfig = useClinicConfigStore((s) => s.applyConfig);
  const [busy, setBusy] = useState(false);

  const handleSwitch = async (next) => {
    if (busy || next === locale) return;
    setBusy(true);
    try {
      const res = await switchLocaleApi(next);
      if (res?.success && res.data) {
        applyConfig(res.data);
      }
    } catch (e) {
      toast.error(e.message || "Failed to switch language");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 py-3 border-t border-gray-100" title="Switch language">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
        {t("language.label")}
      </p>
      <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
        {OPTIONS.map(({ value, label }) => {
          const active    = locale === value;
          const canChange = !busy && value !== locale;
          return (
            <button
              key={value}
              type="button"
              disabled={busy && !active}
              onClick={() => handleSwitch(value)}
              className={[
                "flex-1 flex items-center justify-center px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 select-none",
                active    ? "bg-[#2ec4b6] text-white shadow-sm" : "text-gray-500",
                canChange ? "hover:bg-white hover:text-gray-800 hover:shadow-sm cursor-pointer" : "cursor-default",
                busy ? "opacity-60" : "",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageToggle;
