import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useLabStore } from "@/store/labStore";

export default function LabSearch() {
  const { fetchSamples } = useLabStore();
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      fetchSamples({ q });
    }, 350);

    return () => clearTimeout(t);
  }, [q, fetchSamples]);

  return (
    <div className="relative w-full md:w-80">
      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-1000" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by ID, Type, or Tooth No..."
        className="pl-9 bg-white border border-gray-300"
      />
    </div>
  );
}