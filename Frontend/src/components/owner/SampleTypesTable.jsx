import { Button } from "@/components/ui/button";

const Badge = ({ active }) => (
  <span
    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
      active
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : "bg-gray-50 text-gray-700 border-gray-100"
    }`}
  >
    {active ? "Active" : "Inactive"}
  </span>
);

const SampleTypesTable = ({ data = [], onEdit, onDelete, onToggle }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="py-3 pr-4">Sample Type</th>
            <th className="py-3 pr-4">Price</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Description</th>
            <th className="py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-500">
                No sample types found.
              </td>
            </tr>
          ) : (
            data.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/60 transition">
                <td className="py-3 pr-4">
                  <div className="font-semibold text-gray-900">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.id}</div>
                </td>

                <td className="py-3 pr-4">
                  PKR {Number(s.price || 0).toLocaleString("en-PK")}
                </td>

                <td className="py-3 pr-4">
                  <Badge active={!!s.active} />
                </td>

                <td className="py-3 pr-4">{s.description || "-"}</td>

                <td className="py-3 text-right">
                  <div className="inline-flex gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => onEdit(s)}>
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => onToggle?.(s)}
                    >
                      {s.active ? "Disable" : "Enable"}
                    </Button>

                    <Button variant="outline" className="rounded-xl" onClick={() => onDelete(s)}>
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

export default SampleTypesTable;