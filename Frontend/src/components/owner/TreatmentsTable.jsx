import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import OwnerStatusPill from "@/components/owner/OwnerStatusPill";

const TreatmentsTable = ({ data, onEdit, onDelete, onToggle }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="py-3 pr-4">Treatment</th>
            <th className="py-3 pr-4">Code</th>
            <th className="py-3 pr-4">Fee</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Notes</th>
            <th className="py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-500">
                No treatments found.
              </td>
            </tr>
          ) : (
            data.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/60 transition">
                <td className="py-3 pr-4">
                  <div className="font-semibold text-gray-900">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.id}</div>
                </td>
                <td className="py-3 pr-4">{t.code || "-"}</td>
                <td className="py-3 pr-4">PKR {Number(t.fee || 0).toLocaleString("en-PK")}</td>
                <td className="py-3 pr-4">
                  <OwnerStatusPill enabled={!!t.active} onToggle={() => onToggle(t)} labelOn="Active" labelOff="Inactive" />
                </td>
                <td className="py-3 pr-4 text-gray-700">{t.notes || "-"}</td>
                <td className="py-3 text-right">
                  <div className="inline-flex gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => onEdit(t)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => onDelete(t)}>
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

export default TreatmentsTable;