import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
  width = "w-48",
}) {
  return (
    <div className={`relative h-9 shrink-0 ${width} ${className}`}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      <Input
        className="h-9 pl-8 text-sm w-full"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
