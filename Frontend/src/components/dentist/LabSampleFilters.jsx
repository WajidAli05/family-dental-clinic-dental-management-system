import { Button } from "@/components/ui/button";

const filters = ["all", "Sent", "In Process", "Ready", "Delivered", "Approved"];

const LabSampleFilters = ({ active, onChange }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <Button
          key={f}
          size="sm"
          variant={active === f ? "default" : "outline"}
          className={
            active === f
              ? "bg-[#2ec4b6] hover:bg-[#26a699]"
              : ""
          }
          onClick={() => onChange(f)}
        >
          {f}
        </Button>
      ))}
    </div>
  );
};

export default LabSampleFilters;