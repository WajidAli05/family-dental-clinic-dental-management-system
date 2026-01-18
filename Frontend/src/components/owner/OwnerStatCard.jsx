import { Card, CardContent } from "@/components/ui/card";

const OwnerStatCard = ({ title, value, icon: Icon, subtitle }) => {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-500">{title}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 truncate">
              {value}
            </p>
            {subtitle ? (
              <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
            ) : null}
          </div>

          <div className="shrink-0 rounded-2xl bg-[#2ec4b61a] p-3">
            <Icon className="h-5 w-5 text-[#2ec4b6]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OwnerStatCard;