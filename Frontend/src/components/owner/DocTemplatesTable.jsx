import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import OwnerStatusPill from "@/components/owner/OwnerStatusPill";

const DocTemplatesTable = ({ data, onEdit, onDelete, onToggle }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="py-3 pr-4">Template</th>
            <th className="py-3 pr-4">Enabled</th>
            <th className="py-3 pr-4">Sections</th>
            <th className="py-3 pr-4">Fields</th>
            <th className="py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-500">
                No templates found.
              </td>
            </tr>
          ) : (
            data.map((t) => {
              const sections = t.sections?.length || 0;
              const fields = (t.sections || []).reduce((sum, s) => sum + (s.fields?.length || 0), 0);
              return (
                <tr key={t.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.id}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <OwnerStatusPill enabled={!!t.enabled} onToggle={() => onToggle(t)} />
                  </td>
                  <td className="py-3 pr-4">{sections}</td>
                  <td className="py-3 pr-4">{fields}</td>
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
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DocTemplatesTable;