const tabs = [
  { key: "treatments", label: "Treatments" },
  { key: "diagnosis", label: "Diagnosis Templates" },
  { key: "findings", label: "Clinical Findings" },
  { key: "docs", label: "Documentation Templates" },
];

const OwnerClinicalTabs = ({ value, onChange }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition
              ${
                active
                  ? "bg-[#2ec4b6] text-white border-transparent"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-[#2ec4b61a] hover:text-[#2ec4b6]"
              }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
};

export default OwnerClinicalTabs;