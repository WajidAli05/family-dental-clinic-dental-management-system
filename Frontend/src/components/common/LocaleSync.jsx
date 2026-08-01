import { useEffect, useRef } from "react";
import { useClinicConfigStore } from "@/store/clinicConfigStore";
import { applyLocale } from "@/i18n/syncLocale";

export default function LocaleSync() {
  const locale = useClinicConfigStore((s) => s.locale);
  const prev = useRef(null);

  useEffect(() => {
    if (locale === prev.current) return;
    prev.current = locale;
    applyLocale(locale);
  }, [locale]);

  return null;
}
