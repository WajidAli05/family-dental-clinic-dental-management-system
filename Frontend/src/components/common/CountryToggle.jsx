import { useState } from "react";
import { toast } from "sonner";
import { useClinicConfigStore } from "@/store/clinicConfigStore";
import { useUserStore } from "@/store/userStore";
import { ownerApi } from "@/lib/ownerApi";

const OPTIONS = [
  { value: "PK", flag: "🇵🇰", label: "PKR" },
  { value: "SA", flag: "🇸🇦", label: "SAR" },
];

/**
 * Compact country/currency toggle for the sidebar footer.
 * Owner: interactive — switches config server-side and updates clinicConfigStore
 *   in-place so every subscribed component re-renders without a page reload.
 * Others: read-only indicator of the current market.
 */
const CountryToggle = () => {
  const country     = useClinicConfigStore((s) => s.country);
  const applyConfig = useClinicConfigStore((s) => s.applyConfig);
  const [busy, setBusy] = useState(false);

  // Use Zustand store (reactive) instead of a one-time localStorage read.
  // The localStorage read is non-reactive and was the root cause of isOwner
  // evaluating to false when the component mounted before the store hydrated,
  // making every button appear disabled (canChange = false → !canChange && !active = true).
  const currentUser = useUserStore((s) => s.currentUser);
  const isOwner     = currentUser?.role === "owner";

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
      className="px-3 py-3 border-t border-gray-100"
      title={isOwner ? "Switch clinic market" : "Market set by owner — read-only"}
    >
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
        Market
      </p>
      <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
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
