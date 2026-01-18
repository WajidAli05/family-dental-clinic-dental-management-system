import { Card, CardContent } from "@/components/ui/card";

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-sm font-semibold text-gray-900">{value}</p>
  </div>
);

const AppointmentsSummaryCard = ({ summary }) => {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Today’s Appointments
          </h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            Total: {summary.total}
          </span>
        </div>

        <div className="mt-4 divide-y divide-gray-100">
          <Row label="Scheduled" value={summary.scheduled} />
          <Row label="Checked-in" value={summary.checkedIn} />
          <Row label="Completed" value={summary.completed} />
          <Row label="Cancelled" value={summary.cancelled} />
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Overview only — manage details from the Appointments tab.
        </p>
      </CardContent>
    </Card>
  );
};

export default AppointmentsSummaryCard;