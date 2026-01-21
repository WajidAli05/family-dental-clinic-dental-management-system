const SuppliersTable = ({ data = [] }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Supplier</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Phone</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Email</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Address</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                No suppliers found
              </td>
            </tr>
          ) : (
            data.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-sm font-semibold text-gray-900">{s.name}</td>
                <td className="py-2 px-3 text-sm text-gray-800">{s.phone}</td>
                <td className="py-2 px-3 text-sm text-gray-800">{s.email}</td>
                <td className="py-2 px-3 text-sm text-gray-800">{s.address}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SuppliersTable;