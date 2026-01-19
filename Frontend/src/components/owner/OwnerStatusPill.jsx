const OwnerStatusPill = ({ enabled, onToggle, labelOn = "Enabled", labelOff = "Disabled" }) => {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition
        ${enabled ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-50 text-gray-700 border-gray-100"}
      `}
      title="Toggle"
    >
      {enabled ? labelOn : labelOff}
    </button>
  );
};

export default OwnerStatusPill;