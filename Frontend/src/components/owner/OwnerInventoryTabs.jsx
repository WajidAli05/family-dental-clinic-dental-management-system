// src/components/owner/OwnerInventoryTabs.jsx
const tabs = [
  { id: "items", label: "Items" },
  { id: "purchases", label: "Purchases" },
  { id: "consumption", label: "Consumption" },
];

const OwnerInventoryTabs = ({ value, onChange }) => {
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

export default OwnerInventoryTabs;