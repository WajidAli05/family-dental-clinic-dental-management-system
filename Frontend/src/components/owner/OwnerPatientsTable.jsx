import { Button } from "@/components/ui/button";

const Tag = ({ children }) => (
  <span className="rounded-full bg-[#2ec4b61a] px-3 py-1 text-xs font-semibold text-[#179c91]">
    {children}
  </span>
);

const StatusBadge = ({ status }) => {
  const cls =
    status === "active"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : "bg-gray-50 text-gray-700 border-gray-100";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
};

const OwnerPatientsTable = ({ data = [], onView }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="py-3 pr-4">Patient</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Phone</th>
            <th className="py-3 pr-4">City</th>
            <th className="py-3 pr-4">Last Visit</th>
            <th className="py-3 pr-4">Dentist</th>
            <th className="py-3 pr-4">Pending Labs</th>
            <th className="py-3 pr-4">Total Spent</th>
            <th className="py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={10} className="py-8 text-center text-gray-500">
                No patients found.
              </td>
            </tr>
          ) : (
            data.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/60 transition">
                <td className="py-3 pr-4">
                  <div className="font-semibold text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.id}</div>
                </td>
                <td className="py-3 pr-4"><StatusBadge status={p.status} /></td>
                <td className="py-3 pr-4">{p.phone}</td>
                <td className="py-3 pr-4">{p.city}</td>
                <td className="py-3 pr-4">{p.lastVisit || "-"}</td>
                <td className="py-3 pr-4">{p.dentist || "-"}</td>
                <td className="py-3 pr-4">{p.pendingLab ?? 0}</td>
                <td className="py-3 pr-4">PKR {Number(p.totalSpent || 0).toLocaleString("en-PK")}</td>
                <td className="py-3 text-right">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => onView(p)}
                  >
                    View
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

export default OwnerPatientsTable;