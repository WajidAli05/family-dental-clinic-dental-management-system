// src/components/owner/PermissionsMatrix.jsx
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

const labelize = (k) =>
  String(k || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const PermissionsMatrix = ({ permissions = {}, onToggle, dirty = false, onSave }) => {
  const permKeys = useMemo(() => Object.keys(permissions || {}), [permissions]);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Permissions</h2>
          <p className="text-xs text-gray-500 mt-1">
            Toggle permissions for Receptionist and Dentist roles. Click Save to apply changes.
          </p>
        </div>

        <Button
          className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
          disabled={!dirty}
          onClick={onSave}
        >
          Save
        </Button>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 px-3 text-sm font-semibold text-gray-700 text-left">Permission</th>
              <th className="py-2 px-3 text-sm font-semibold text-gray-700 text-center">Receptionist</th>
              <th className="py-2 px-3 text-sm font-semibold text-gray-700 text-center">Dentist</th>
            </tr>
          </thead>

          <tbody>
            {permKeys.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-sm text-gray-500">
                  No permissions configured
                </td>
              </tr>
            ) : (
              permKeys.map((permKey) => {
                const row = permissions[permKey] || {};
                return (
                  <tr key={permKey} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-sm text-gray-800">{labelize(permKey)}</td>

                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!row.receptionist}
                        onChange={() => onToggle?.(permKey, "receptionist")}
                        className="h-4 w-4 accent-[#2ec4b6]"
                      />
                    </td>

                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!row.dentist}
                        onChange={() => onToggle?.(permKey, "dentist")}
                        className="h-4 w-4 accent-[#2ec4b6]"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PermissionsMatrix;