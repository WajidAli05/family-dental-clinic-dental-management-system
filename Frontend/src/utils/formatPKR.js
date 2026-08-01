import { formatMoney } from "./formatMoney";

// Backward-compatible wrapper — always formats as PKR.
// Existing callers can keep importing formatPKR unchanged.
export const formatPKR = (n) => formatMoney(n, { currency: "PKR", country: "PK" });
