const tabs = [
  { id: "clinic", label: "Clinic Info" },
  { id: "payments", label: "Payment Modes" },
  { id: "masterLists", label: "Master Lists" },
  { id: "lab", label: "Lab Settings" },
  { id: "commission", label: "Commission Settings" },
];

const OwnerSettingsTabs = ({ value, onChange }) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
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

export default OwnerSettingsTabs;