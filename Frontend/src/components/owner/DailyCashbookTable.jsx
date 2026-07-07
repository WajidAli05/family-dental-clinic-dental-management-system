const money = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

const modePill = (mode) => {
  const m = String(mode || "").toLowerCase();
  if (m === "cash")   return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Cash</span>;
  if (m === "card")   return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Card</span>;
  if (m.includes("online")) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Online Transfer</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{mode || "—"}</span>;
};

const DailyCashbookTable = ({ data = [] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b border-gray-100">
          <th className="py-3 pr-4">Date</th>
          <th className="py-3 pr-4">Invoice</th>
          <th className="py-3 pr-4">Patient</th>
          <th className="py-3 pr-4">Dentist</th>
          <th className="py-3 pr-4">Mode</th>
          <th className="py-3 text-right">Amount</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {data.length === 0 ? (
          <tr>
            <td colSpan={6} className="py-8 text-center text-gray-500">No transactions found for this period.</td>
          </tr>
        ) : data.map((row, i) => (
          <tr key={i} className="hover:bg-gray-50/60 transition">
            <td className="py-3 pr-4 text-gray-600">{row.date}</td>
            <td className="py-3 pr-4 font-mono text-xs text-gray-700">{row.invoiceId || "—"}</td>
            <td className="py-3 pr-4 text-gray-800">{row.patientName || "—"}</td>
            <td className="py-3 pr-4 text-gray-600">{row.dentistName || "—"}</td>
            <td className="py-3 pr-4">{modePill(row.mode)}</td>
            <td className="py-3 text-right font-semibold text-gray-900">{money(row.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default DailyCashbookTable;
