import { Skeleton } from "@/components/ui/skeleton";

export default function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="w-full space-y-2">
      {/* header row */}
      <div className="flex gap-4 px-2 pb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded" />
        ))}
      </div>
      {/* data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 rounded-lg bg-gray-50 px-2 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}
