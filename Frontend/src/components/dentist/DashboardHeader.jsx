import Wavify from "react-wavify";

const DashboardHeader = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white">
      <Wavify
        fill="#2ec4b6"
        paused={false}
        options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
        className="absolute bottom-0 left-0 w-full opacity-20"
      />
      <div className="relative z-10 p-6">
        <h1 className="text-2xl font-bold">Dentist Dashboard</h1>
        <p className="text-gray-500">
          Today’s schedule & clinical actions
        </p>
      </div>
    </div>
  );
};

export default DashboardHeader;