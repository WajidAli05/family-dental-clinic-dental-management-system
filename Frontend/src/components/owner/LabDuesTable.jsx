const LabDuesTable = ({ data = [] }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">
              Lab
            </th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">
              Month
            </th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">
              Due Amount
            </th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">
              Status
            </th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="py-6 px-3 text-center text-sm text-gray-500"
              >
                No lab dues found
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-2 px-3 text-sm text-gray-800">
                  {row.labName}
                </td>
                <td className="py-2 px-3 text-sm text-gray-800">
                  {row.month}
                </td>
                <td className="py-2 px-3 text-sm font-semibold text-gray-900">
                  Rs. {row.amount.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      row.paid
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {row.paid ? "Paid" : "Pending"}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LabDuesTable;