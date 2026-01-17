import ToothBadge from "./ToothBadge";
import { usePrescriptionStore } from "@/store/prescriptionStore";

const quadrants = {
  Q1: [1, 2, 3, 4, 5, 6, 7, 8],
  Q2: [1, 2, 3, 4, 5, 6, 7, 8],
  Q3: [1, 2, 3, 4, 5, 6, 7, 8],
  Q4: [1, 2, 3, 4, 5, 6, 7, 8],
};

const quadrantUI = {
  Q1: { labelPos: "top-6 left-8", wrap: "justify-end items-end" }, // towards center (bottom-right)
  Q2: { labelPos: "top-6 right-8", wrap: "justify-start items-end" }, // bottom-left
  Q3: { labelPos: "bottom-6 left-8", wrap: "justify-end items-start" }, // top-right
  Q4: { labelPos: "bottom-6 right-8", wrap: "justify-start items-start" }, // top-left
};

const DentalChart2D = () => {
  const { selectedTeeth, toggleTooth } = usePrescriptionStore();

  const renderQuadrant = (qKey) => {
    const ui = quadrantUI[qKey];

    return (
      <div className="relative h-full w-full">
        {/* Quadrant label */}
        <div className={`absolute ${ui.labelPos} flex items-center gap-2`}>
          <span className="text-xs font-semibold tracking-wide text-gray-600">
            {qKey}
          </span>
          <span className="hidden sm:inline text-[11px] text-gray-400">
            Tap to select
          </span>
        </div>

        {/* Teeth aligned toward the center cross */}
        <div className={`h-full w-full flex ${ui.wrap} p-6 sm:p-8`}>
          {/* ✅ 4 teeth per row (2 rows for 8 teeth) */}
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
            {quadrants[qKey].map((t) => {
              const value = `${qKey}-T${t}`;
              const active = selectedTeeth.includes(value);

              return (
                <div
                  key={value}
                  className={[
                    "rounded-xl p-1.5 sm:p-2 transition",
                    active
                      ? "bg-gray-900/5 ring-1 ring-gray-900/10"
                      : "hover:bg-gray-900/5",
                  ].join(" ")}
                >
                  <ToothBadge
                    label={`${t}`}
                    active={active}
                    onClick={() => toggleTooth(value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h3 className="font-semibold text-gray-800">Select Teeth</h3>
        <p className="text-xs text-gray-500">
          Selected: <span className="font-medium">{selectedTeeth.length}</span>
        </p>
      </div>

      {/* One big chart with center cross */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* subtle background grid feel */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.035)_1px,transparent_1px)] [background-size:18px_18px] opacity-60 pointer-events-none" />

        <div className="relative grid grid-cols-2 grid-rows-2 min-h-[420px] sm:min-h-[460px]">
          {renderQuadrant("Q1")}
          {renderQuadrant("Q2")}
          {renderQuadrant("Q3")}
          {renderQuadrant("Q4")}
        </div>

        {/* ✅ thin + light grey center cross */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gray-200" />
          <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-gray-200" />
        </div>

        {/* Optional: small hint footer */}
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          <span className="hidden sm:inline">
            Tip: click again to deselect
          </span>
          <span className="ml-auto">
            {selectedTeeth.length > 0 ? "You’re good to go ✅" : "Select teeth to continue"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DentalChart2D;