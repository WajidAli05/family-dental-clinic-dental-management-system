import ToothBadge from "./ToothBadge";
import { usePrescriptionStore } from "@/store/prescriptionStore";

const quadrants = {
  Q1: [1, 2, 3, 4, 5, 6, 7, 8],
  Q2: [1, 2, 3, 4, 5, 6, 7, 8],
  Q3: [1, 2, 3, 4, 5, 6, 7, 8],
  Q4: [1, 2, 3, 4, 5, 6, 7, 8],
};

const DentalChart2D = () => {
  const { selectedTeeth, toggleTooth } = usePrescriptionStore();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-700">
        Select Teeth
      </h3>

      {Object.entries(quadrants).map(([q, teeth]) => (
        <div key={q}>
          <p className="text-sm font-medium mb-2">{q}</p>
          <div className="flex flex-wrap gap-2">
            {teeth.map((t) => {
              const ref = `${q}-T${t}`;
              return (
                <ToothBadge
                  key={ref}
                  label={ref}
                  active={selectedTeeth.includes(ref)}
                  onClick={() => toggleTooth(ref)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DentalChart2D;