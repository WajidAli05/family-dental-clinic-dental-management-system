import { Button } from "@/components/ui/button";

const money = (n) => `PKR ${Number(n || 0).toLocaleString()}`;

const CommissionsTable = ({ data, onEditRule }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="py-3 pr-4">Dentist</th>
            <th className="py-3 pr-4">Month</th>
            <th className="py-3 pr-4 text-right">Revenue</th>
            <th className="py-3 pr-4 text-right">%</th>
            <th className="py-3 pr-4 text-right">Commission</th>
            <th className="py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-500">
                No commission records found.
              </td>
            </tr>
          ) : (
            data.map((c) => (
              <tr key={c.dentistId} className="hover:bg-gray-50/60 transition">
                <td className="py-3 pr-4">
                  <div className="font-semibold text-gray-900">{c.dentistName}</div>
                  <div className="text-xs text-gray-500">ID: {c.dentistId}</div>
                </td>
                <td className="py-3 pr-4">{c.month}</td>
                <td className="py-3 pr-4 text-right">{money(c.revenue)}</td>
                <td className="py-3 pr-4 text-right">{c.percent}%</td>
                <td className="py-3 pr-4 text-right font-semibold">{money(c.commission)}</td>
                <td className="py-3 text-right">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => onEditRule?.(c)}
                  >
                    Edit Rule
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CommissionsTable;