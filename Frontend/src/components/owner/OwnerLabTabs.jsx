const tabs = [
  { key: "accounts", label: "Lab Accounts" },
  { key: "cases", label: "Lab Cases" },
  { key: "sampleTypes", label: "Sample Types" },
];

const OwnerLabTabs = ({ value, onChange }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-[#2ec4b6] text-white"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
};

export default OwnerLabTabs;