const PermissionsMatrix = ({ staff, permissions, onToggle }) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white p-4 md:p-5">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">
              Permission
            </th>
            {staff.map((s) => (
              <th
                key={s.id}
                className="py-2 px-3 text-sm font-semibold text-gray-700 text-center"
              >
                {s.name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {Object.keys(permissions).map((permKey) => (
            <tr
              key={permKey}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-2 px-3 text-sm text-gray-800">
                {permKey.replaceAll("_", " ")}
              </td>

              {staff.map((s) => {
                const enabled = permissions[permKey]?.includes(s.id);
                return (
                  <td key={s.id} className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!enabled}
                      onChange={() => onToggle(permKey, s.id)}
                      className="h-4 w-4 accent-[#2ec4b6]"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PermissionsMatrix;