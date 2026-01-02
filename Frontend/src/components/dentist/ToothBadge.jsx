const ToothBadge = ({ label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm border
        ${active
          ? "bg-[#2ec4b6] text-white"
          : "bg-white text-gray-700"
        }`}
    >
      {label}
    </button>
  );
};

export default ToothBadge;