import { Button } from "@/components/ui/button";
import { useFormatMoney } from "@/store/clinicConfigStore";

const CommissionsTable = ({ data = [], onRecordPayment, onViewHistory }) => {
  const money = useFormatMoney();
  return (
  <div className="w-full overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b border-gray-100">
          <th className="py-3 pr-4">Dentist</th>
          <th className="py-3 pr-4 text-right">Rate</th>
          <th className="py-3 pr-4 text-right">Collections (period)</th>
          <th className="py-3 pr-4 text-right">Earned (period)</th>
          <th className="py-3 pr-4 text-right">Total Paid</th>
          <th className="py-3 pr-4 text-right">Remaining</th>
          <th className="py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {data.length === 0 ? (
          <tr>
            <td colSpan={7} className="py-8 text-center text-gray-500">No commission data found.</td>
          </tr>
        ) : data.map((row) => (
          <tr key={row.publicId ?? "unassigned"} className="hover:bg-gray-50/60 transition">
            <td className="py-3 pr-4">
              <div className="font-semibold text-gray-900">{row.name}</div>
              {row.publicId && <div className="text-xs text-gray-400">{row.publicId}</div>}
            </td>
            <td className="py-3 pr-4 text-right">
              {row.rate !== null ? `${row.rate}%` : <span className="text-gray-400">—</span>}
            </td>
            <td className="py-3 pr-4 text-right text-gray-700">{money(row.collections)}</td>
            <td className="py-3 pr-4 text-right font-semibold text-gray-900">
              {row.earned !== null ? money(row.earned) : <span className="text-gray-400">—</span>}
            </td>
            <td className="py-3 pr-4 text-right text-green-700">{money(row.paid)}</td>
            <td className="py-3 pr-4 text-right">
              <span className={`font-semibold ${Number(row.remaining) > 0 ? "text-orange-600" : "text-gray-500"}`}>
                {money(row.remaining)}
              </span>
            </td>
            <td className="py-3 text-right">
              {row.publicId ? (
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs"
                    onClick={() => onViewHistory?.(row)}
                  >
                    History
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
              ) : (
                <span className="text-xs text-gray-400">Unassigned</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  );
};

export default CommissionsTable;
