import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyLocale } from "@/i18n/syncLocale";

const OPTIONS = [
  { value: "en", labelKey: "language.en" },
  { value: "ur", labelKey: "language.ur" },
  { value: "ar", labelKey: "language.ar" },
];

export default function LoginLanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <div className="mt-4 flex justify-center">
      <Select value={i18n.language} onValueChange={(next) => applyLocale(next)}>
        <SelectTrigger className="w-36 h-8 text-xs border-gray-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map(({ value, labelKey }) => (
            <SelectItem key={value} value={value} className="text-xs">
              {t(labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
