const RevenueReportsTable = ({ data = [] }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">
              Period
            </th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">
              Dentist
            </th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">
              Revenue
            </th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="py-6 px-3 text-center text-sm text-gray-500"
              >
                No revenue records found
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-2 px-3 text-sm text-gray-800">
                  {row.period}
                </td>
                <td className="py-2 px-3 text-sm text-gray-800">
                  {row.dentistName || "All"}
                </td>
                <td className="py-2 px-3 text-sm font-semibold text-gray-900">
                  Rs. {row.revenue.toLocaleString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RevenueReportsTable;