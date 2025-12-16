import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function LabSearch() {
  return (
    <div className="relative w-full md:w-80">
      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-1000" />
      <Input
        placeholder="Search by ID, Type, or Tooth No..."
        className="pl-9 bg-white border border-gray-300"
      />
    </div>
  );
}