import { Button } from "@/components/ui/button";

const badge = (enabled) =>
  enabled
    ? "bg-green-100 text-green-700"
    : "bg-gray-100 text-gray-700";

const StaffDirectoryTable = ({ data = [], onEdit, onToggle, onDelete }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Name</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Role</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Contact</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Status</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700 text-right">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                No staff found
              </td>
            </tr>
          ) : (
            data.map((s) => (
              <tr
                key={s.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-2 px-3 text-sm">
                  <div className="font-semibold text-gray-900">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.email}</div>
                </td>

                <td className="py-2 px-3 text-sm capitalize text-gray-700">
                  {s.role}
                </td>

                <td className="py-2 px-3 text-sm text-gray-700">
                  {s.phone || "-"}
                </td>

                <td className="py-2 px-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge(s.enabled)}`}>
                    {s.enabled ? "Enabled" : "Disabled"}
                  </span>
                </td>

                <td className="py-2 px-3 text-right">
                  <div className="flex justify-end gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => onEdit?.(s)}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => onToggle?.(s)}
                    >
                      {s.enabled ? "Disable" : "Enable"}
                    </Button>

                    <Button
                      variant="destructive"
                      className="rounded-xl"
                      onClick={() => onDelete?.(s)}
                    >
                      Delete
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

export default StaffDirectoryTable;