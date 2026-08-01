import { useState } from "react";
import { toast } from "sonner";
import { useClinicConfigStore } from "@/store/clinicConfigStore";
import { ownerApi } from "@/lib/ownerApi";

const OPTIONS = [
  { value: "PK", flag: "🇵🇰", label: "PKR" },
  { value: "SA", flag: "🇸🇦", label: "SAR" },
];

/**
 * Compact segmented toggle showing the active clinic market.
 *
 * - Owner role: buttons are interactive; switching calls the server and updates
 *   clinicConfigStore in-place (no page reload).
 * - All other roles: rendered as a read-only display, disabled, with a tooltip
 *   explaining that only the owner can change it.
 *
 * Works on both light (white card) and dark (lab gradient) backgrounds because
 * the container uses bg-white/90 with a backdrop blur.
 */
const CountrySwitcher = () => {
  const country     = useClinicConfigStore((s) => s.country);
  const applyConfig = useClinicConfigStore((s) => s.applyConfig);
  const [busy, setBusy]   = useState(false);

  const user    = JSON.parse(localStorage.getItem("user") || "null");
  const isOwner = user?.role === "owner";

  const handleSwitch = async (next) => {
    if (!isOwner || busy || next === country) return;
    setBusy(true);
    try {
      const res = await ownerApi.switchCountry(next);
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
    <div
      className="inline-flex items-center rounded-lg border border-gray-200 bg-white/90 backdrop-blur-sm p-0.5 gap-0.5 shadow-sm shrink-0"
      title={isOwner ? "Switch clinic market" : "Market set by owner (read-only)"}
    >
      {OPTIONS.map(({ value, flag, label }) => {
        const active    = country === value;
        const canChange = isOwner && !busy && value !== country;

        return (
          <button
            key={value}
            type="button"
            disabled={!canChange && !active}
            onClick={() => handleSwitch(value)}
            className={[
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 select-none",
              active
                ? "bg-[#2ec4b6] text-white shadow-sm"
                : "text-gray-500",
              canChange
                ? "hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
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
  );
};

export default CountrySwitcher;
