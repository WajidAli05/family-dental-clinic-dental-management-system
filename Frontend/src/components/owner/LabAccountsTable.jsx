import { Button } from "@/components/ui/button";

const StatusBadge = ({ enabled }) => (
  <span
    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
      enabled
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : "bg-gray-50 text-gray-700 border-gray-100"
    }`}
  >
    {enabled ? "Enabled" : "Disabled"}
  </span>
);

const LabAccountsTable = ({ data = [], onEdit, onToggle, onResetPassword }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="py-3 pr-4">Lab</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Email</th>
            <th className="py-3 pr-4">Phone</th>
            <th className="py-3 pr-4">Force Password Change</th>
            <th className="py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-500">
                No lab accounts found.
              </td>
            </tr>
          ) : (
            data.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50/60 transition">
                <td className="py-3 pr-4">
                  <div className="font-semibold text-gray-900">{a.name}</div>
                  <div className="text-xs text-gray-500">{a.id}</div>
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge enabled={a.enabled} />
                </td>
                <td className="py-3 pr-4">{a.email || "-"}</td>
                <td className="py-3 pr-4">{a.phone || "-"}</td>
                <td className="py-3 pr-4">{a.forcePasswordChange ? "Yes" : "No"}</td>
                <td className="py-3 text-right">
                  <div className="inline-flex gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => onEdit(a)}>
                      Edit
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => onToggle(a)}>
                      {a.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => onResetPassword(a)}
                    >
                      Reset Password
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LabAccountsTable;