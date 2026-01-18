// src/components/owner/OwnerPageHeader.jsx
import Wave from "react-wavify";

const OwnerPageHeader = ({ title, subtitle }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white px-6 py-7">
      <div className="relative z-10 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-gray-500">{subtitle}</p>
        ) : null}
      </div>

      {/* Waves */}
      <Wave
        fill="#2ec4b6"
        paused={false}
        options={{
          height: 18,
          amplitude: 26,
          speed: 0.15,
          points: 3,
        }}
        className="absolute bottom-0 left-0 w-full opacity-20"
      />
      <Wave
        fill="#2ec4b6"
        paused={false}
        options={{
          height: 10,
          amplitude: 18,
          speed: 0.12,
          points: 4,
        }}
        className="absolute bottom-0 left-0 w-full opacity-10"
      />
    </div>
  );
};

export default OwnerPageHeader;