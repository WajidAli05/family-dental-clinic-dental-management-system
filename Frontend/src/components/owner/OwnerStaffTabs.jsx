const tabs = [
  { id: "directory", label: "Staff Directory" },
  { id: "permissions", label: "Permissions" },
];

const OwnerStaffTabs = ({ value, onChange }) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            value === t.id
              ? "bg-[#2ec4b6] text-white"
              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

export default OwnerStaffTabs;