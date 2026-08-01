import { applyLocale } from "@/i18n/syncLocale";

const OPTIONS = [
  { value: "en", label: "EN" },
  { value: "ur", label: "UR" },
  { value: "ar", label: "AR" },
];

export default function LoginLanguageSwitcher() {
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => applyLocale(value)}
          className="px-3 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-500 hover:border-[#2ec4b6] hover:text-[#2ec4b6] transition-colors"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
