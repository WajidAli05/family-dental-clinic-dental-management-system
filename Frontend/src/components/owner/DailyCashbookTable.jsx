import { Card, CardContent } from "@/components/ui/card";

const DailyCashbookTable = ({ data = [] }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Date</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Cash Total</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Card Total</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Grand Total</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="py-6 px-3 text-center text-sm text-gray-500"
              >
                No cashbook records found
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.date}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-2 px-3 text-sm text-gray-800">
                  {row.date}
                </td>
                <td className="py-2 px-3 text-sm text-gray-800">
                  Rs. {row.cash.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-sm text-gray-800">
                  Rs. {row.card.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-sm font-semibold text-gray-900">
                  Rs. {(row.cash + row.card).toLocaleString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DailyCashbookTable;