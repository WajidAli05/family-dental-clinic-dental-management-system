const ConsumptionTable = ({ mode = "byPeriod", data = [] }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Date</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Item</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Qty Used</th>
            {mode === "byTreatment" ? (
              <th className="py-2 px-3 text-sm font-semibold text-gray-700">Procedure</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={mode === "byTreatment" ? 4 : 3} className="py-8 text-center text-sm text-gray-500">
                No consumption records found
              </td>
            </tr>
          ) : (
            data.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-sm text-gray-800">{c.date}</td>
                <td className="py-2 px-3 text-sm font-semibold text-gray-900">{c.itemName}</td>
                <td className="py-2 px-3 text-sm text-gray-800">
                  {c.qtyUsed} {c.unit}
                </td>
                {mode === "byTreatment" ? (
                  <td className="py-2 px-3 text-sm text-gray-800">
                    {c.treatmentName || "-"}
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ConsumptionTable;