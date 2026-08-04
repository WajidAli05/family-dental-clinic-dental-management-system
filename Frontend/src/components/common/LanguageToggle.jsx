import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClinicConfigStore } from "@/store/clinicConfigStore";
import { useUserStore } from "@/store/userStore";
import { handleUnauthorized } from "@/lib/httpClient";

const BASE = import.meta.env.VITE_API_BASE_URL;

async function switchLocaleApi(locale) {
  const token = useUserStore.getState().token || localStorage.getItem("token");
  const res = await fetch(`${BASE}/clinic-config/locale`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ locale }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) handleUnauthorized("/clinic-config/locale");
  if (!res.ok || json?.success === false) throw new Error(json?.message || `Request failed: ${res.status}`);
  return json;
}

const OPTIONS = [
  { value: "en", labelKey: "language.en" },
  { value: "ur", labelKey: "language.ur" },
  { value: "ar", labelKey: "language.ar" },
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
    <div className="px-3 py-3 border-t border-gray-100">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
        {t("language.label")}
      </p>
      <Select value={locale} onValueChange={handleSwitch} disabled={busy}>
        <SelectTrigger className="h-8 w-full text-xs border-gray-200 bg-gray-50 focus:ring-[#2ec4b6]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map(({ value, labelKey }) => (
            <SelectItem key={value} value={value} className="text-xs">
              {t(labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageToggle;
