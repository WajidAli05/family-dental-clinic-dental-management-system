// src/components/owner/PermissionsMatrix.jsx
import { useMemo, useState } from "react";

const ROLE_TABS = [
  { key: "receptionist", label: "Receptionist" },
  { key: "dentist", label: "Dentist" },
];

// Turn "tab_receptionist_lab_samples" => "Receptionist Lab Samples"
function prettyLabel(permKey) {
  const k = String(permKey || "");

  // remove leading "tab_" if present
  const noTab = k.startsWith("tab_") ? k.slice(4) : k;

  // split role prefix out: receptionist_..., dentist_...
  let label = noTab;
  if (label.startsWith("receptionist_")) label = label.replace("receptionist_", "Receptionist ");
  else if (label.startsWith("dentist_")) label = label.replace("dentist_", "Dentist ");

  // underscores -> spaces + titlecase
  label = label
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return label.trim();
}

export default function PermissionsMatrix({ permissions = {}, onToggle }) {
  const [roleTab, setRoleTab] = useState("receptionist");

  const keys = useMemo(() => {
    const all = Object.keys(permissions || {});
    const prefix = roleTab === "receptionist" ? "tab_receptionist_" : "tab_dentist_";
    return all
      .filter((k) => String(k).startsWith(prefix))
      .sort((a, b) => prettyLabel(a).localeCompare(prettyLabel(b)));
  }, [permissions, roleTab]);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Permissions</h2>
          <p className="text-xs text-gray-500 mt-1">
            Select which sidebar tabs are visible for {roleTab === "receptionist" ? "Receptionist" : "Dentist"} users.
            Use the Save button above to apply changes.
          </p>
        </div>

        {/* Role tabs */}
        <div className="flex items-center gap-2">
          {ROLE_TABS.map((t) => {
            const active = t.key === roleTab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setRoleTab(t.key)}
                className={[
                  "px-3 py-2 rounded-xl text-sm font-semibold border",
                  active
                    ? "bg-[#2ec4b6] text-white border-[#2ec4b6]"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 px-3 text-sm font-semibold text-gray-700 text-left">
                Permission
              </th>
              <th className="py-2 px-3 text-sm font-semibold text-gray-700 text-center">
                Enabled
              </th>
            </tr>
          </thead>

          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-8 text-center text-sm text-gray-500">
                  No permissions configured for this role
                </td>
              </tr>
            ) : (
              keys.map((permKey) => {
                const checked = !!permissions?.[permKey]?.[roleTab];

                return (
                  <tr key={permKey} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-sm text-gray-800">
                      {prettyLabel(permKey)}
                    </td>

                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle?.(permKey, roleTab)}
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
}