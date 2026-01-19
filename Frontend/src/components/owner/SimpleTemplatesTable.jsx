import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import OwnerStatusPill from "@/components/owner/OwnerStatusPill";

const SimpleTemplatesTable = ({
  data,
  onEdit,
  onDelete,
  onToggle,
  typeLabel = "Template",
}) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="py-3 pr-4">{typeLabel}</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Description</th>
            <th className="py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-500">
                No items found.
              </td>
            </tr>
          ) : (
            data.map((x) => (
              <tr key={x.id} className="hover:bg-gray-50/60 transition">
                <td className="py-3 pr-4">
                  <div className="font-semibold text-gray-900">{x.title}</div>
                  <div className="text-xs text-gray-500">{x.id}</div>
                </td>
                <td className="py-3 pr-4">
                  <OwnerStatusPill enabled={!!x.active} onToggle={() => onToggle(x)} labelOn="Active" labelOff="Inactive" />
                </td>
                <td className="py-3 pr-4 text-gray-700">{x.description || "-"}</td>
                <td className="py-3 text-right">
                  <div className="inline-flex gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => onEdit(x)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => onDelete(x)}>
                      <Trash2 className="h-4 w-4 mr-2" />
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

export default SimpleTemplatesTable;