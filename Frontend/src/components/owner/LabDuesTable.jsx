import { Button } from "@/components/ui/button";
import { useFormatMoney } from "@/store/clinicConfigStore";

const LabDuesTable = ({ data = [], onRecordPayment, onViewBills }) => {
  const money = useFormatMoney();
  return (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b border-gray-100">
          <th className="py-3 pr-4">Lab</th>
          <th className="py-3 pr-4 text-right">Total Billed</th>
          <th className="py-3 pr-4 text-right">Total Paid</th>
          <th className="py-3 pr-4 text-right">Remaining</th>
          <th className="py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {data.length === 0 ? (
          <tr>
            <td colSpan={5} className="py-8 text-center text-gray-500">No lab dues found.</td>
          </tr>
        ) : data.map((row) => (
          <tr key={row.labId} className="hover:bg-gray-50/60 transition">
            <td className="py-3 pr-4">
              <div className="font-semibold text-gray-900">{row.name}</div>
              <div className="text-xs text-gray-400">{row.labId}</div>
            </td>
            <td className="py-3 pr-4 text-right text-gray-700">{money(row.totalBilled)}</td>
            <td className="py-3 pr-4 text-right text-green-700">{money(row.paid)}</td>
            <td className="py-3 pr-4 text-right">
              <span className={`font-semibold ${Number(row.remaining) > 0 ? "text-orange-600" : "text-gray-500"}`}>
                {money(row.remaining)}
              </span>
            </td>
            <td className="py-3 text-right">
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs"
                  onClick={() => onViewBills?.(row)}
                >
                  Bills
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl text-xs bg-[#2ec4b6] hover:bg-[#26a699] text-white"
                  onClick={() => onRecordPayment?.(row)}
                  disabled={Number(row.remaining) <= 0}
                >
                  Pay
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  );
};

export default LabDuesTable;
