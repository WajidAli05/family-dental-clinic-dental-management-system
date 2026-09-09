// src/components/owner/OwnerPageHeader.jsx
import Wave from "react-wavify";

/**
 * `action` is an optional slot for the page's primary button (e.g. "Add
 * Item"). No other owner page currently passes one — every existing page
 * places its primary action in a separate row below this header instead, so
 * this is a genuinely new pattern being introduced for Inventory specifically
 * (per an explicit request), not a rename of an existing convention. When
 * `action` is omitted the header renders exactly as before (centered,
 * unaffected) so no other page changes appearance.
 */
const OwnerPageHeader = ({ title, subtitle, action }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white px-6 py-7">
      {action ? (
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-gray-500">{subtitle}</p>
            ) : null}
          </div>
          <div className="shrink-0">{action}</div>
        </div>
      ) : (
        <div className="relative z-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-gray-500">{subtitle}</p>
          ) : null}
        </div>
      )}

      <Wave
        fill="#2ec4b6"
        paused={false}
        options={{ height: 18, amplitude: 26, speed: 0.15, points: 3 }}
        className="absolute bottom-0 left-0 w-full opacity-20"
      />
      <Wave
        fill="#2ec4b6"
        paused={false}
        options={{ height: 10, amplitude: 18, speed: 0.12, points: 4 }}
        className="absolute bottom-0 left-0 w-full opacity-10"
      />
    </div>
  );
};

export default OwnerPageHeader;
