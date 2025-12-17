import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function PatientSearch({ onSearch }) {
  return (
    <div className="relative max-w-sm">
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <Input
        placeholder="Search patient by name..."
        className="pl-10"
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  );
}