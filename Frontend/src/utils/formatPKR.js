import { formatMoney } from "./formatMoney";
import { useClinicConfigStore } from "@/store/clinicConfigStore";

// Config-aware wrapper — reads live currency/country from the Zustand store.
// Safe to call in any context (React render, PDF utils, non-React code).
export const formatPKR = (n) => {
  const { currency, country } = useClinicConfigStore.getState();
  return formatMoney(n, { currency, country });
};
