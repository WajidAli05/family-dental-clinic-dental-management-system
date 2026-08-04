// src/components/owner/OwnerPageHeader.jsx
import Wave from "react-wavify";
import NotificationBell from "@/components/owner/NotificationBell";

const OwnerPageHeader = ({ title, subtitle }) => {
  return (
    /*
     * Outer card has NO overflow-hidden so the bell's dropdown panel
     * is never clipped. The wave animations are clipped by their own
     * inner layer (absolute inset-0 + overflow-hidden + rounded-2xl),
     * which keeps them inside the card corners without affecting the bell.
     */
    <div className="relative rounded-2xl bg-white px-6 py-7">

      {/* Centred title / subtitle — z-10 keeps it above the wave layer */}
      <div className="relative z-10 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-gray-500">{subtitle}</p>
        ) : null}
      </div>

      {/* Wave layer — self-contained clip so waves don't leak past the card corners */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
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

      {/*
       * Bell — top-END corner of the card.
       *   end-3 = right in LTR, left in RTL  (logical property, auto-mirrors)
       *   z-20  = above the wave layer (z-0 by default)
       * The dropdown uses `end-0 top-full` on its own relative wrapper,
       * so it opens downward and is right-aligned in LTR / left-aligned in RTL.
       */}
      <div className="absolute top-3 end-3 z-20">
        <NotificationBell />
      </div>
    </div>
  );
};

export default OwnerPageHeader;
