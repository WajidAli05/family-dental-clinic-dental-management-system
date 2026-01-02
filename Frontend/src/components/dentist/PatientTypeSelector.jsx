import { Button } from "@/components/ui/button";

const PatientTypeSelector = ({ onSelect }) => {
  return (
    <div className="space-y-3">
      <Button
        className="w-full bg-[#2ec4b6]"
        onClick={() => onSelect("normal")}
      >
        Normal Patient
      </Button>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => onSelect("ortho")}
      >
        Ortho Patient
      </Button>
    </div>
  );
};

export default PatientTypeSelector;