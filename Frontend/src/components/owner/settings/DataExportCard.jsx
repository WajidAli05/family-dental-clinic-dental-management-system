// src/components/owner/settings/DataExportCard.jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dataExportApi } from "@/lib/dataExportApi";

const LABELS = {
  patients: "Patients",
  appointments: "Appointments",
  invoices: "Invoices",
  prescriptions: "Prescriptions",
  labcases: "Lab Cases",
  labsamples: "Lab Samples",
  labbills: "Lab Bills",
  inventoryitems: "Inventory Items",
  purchaseorders: "Purchase Orders",
  inventoryconsumption: "Inventory Consumption",
  ownerpayments: "Owner Payments",
};

function labelFor(key) {
  return LABELS[key] || key;
}

const DataExportCard = () => {
  const { t } = useTranslation();
  const [collections, setCollections] = useState([]);
  const [busy, setBusy] = useState(""); // key of the export currently downloading, or "json"

  useEffect(() => {
    dataExportApi.getExportableCollections()
      .then((json) => setCollections(json.data || []))
      .catch((e) => {
        setCollections([]);
        toast.error(e.message || t("dataExport.error"));
      });
  }, [t]);

  const handleJson = async () => {
    setBusy("json");
    try {
      await dataExportApi.downloadJson();
    } catch (e) {
      toast.error(e.message || t("dataExport.error"));
    } finally {
      setBusy("");
    }
  };

  const handleCsv = async (key) => {
    setBusy(key);
    try {
      await dataExportApi.downloadCsv(key);
    } catch (e) {
      toast.error(e.message || t("dataExport.error"));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("dataExport.title")}</h2>
        <p className="text-sm text-gray-500">{t("dataExport.subtitle")}</p>
      </div>

      <Button
        className="bg-[#2ec4b6] hover:bg-[#26a699] text-white"
        disabled={busy === "json"}
        onClick={handleJson}
      >
        <FileJson className="w-4 h-4 me-1.5" />
        {busy === "json" ? t("dataExport.downloading") : t("dataExport.downloadJson")}
      </Button>

      {collections.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">{t("dataExport.csvSectionTitle")}</p>
          <div className="flex flex-wrap gap-2">
            {collections.map((key) => (
              <Button
                key={key}
                size="sm"
                variant="outline"
                disabled={busy === key}
                onClick={() => handleCsv(key)}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 me-1.5" />
                {busy === key ? t("dataExport.downloading") : labelFor(key)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 flex items-start gap-1.5">
        <Download className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        {t("dataExport.note")}
      </p>
    </div>
  );
};

export default DataExportCard;
