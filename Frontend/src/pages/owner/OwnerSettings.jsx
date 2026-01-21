import { useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import OwnerSettingsTabs from "@/components/owner/OwnerSettingsTabs";

import ClinicInfoForm from "@/components/owner/settings/ClinicInfoForm";
import PaymentModesManager from "@/components/owner/settings/PaymentModesManager";
import MasterListsPanel from "@/components/owner/settings/MasterListsPanel";
import LabSettingsForm from "@/components/owner/settings/LabSettingsForm";
import CommissionSettingsForm from "@/components/owner/settings/CommissionSettingsForm";

import { useOwnerSettingsStore } from "@/store/ownerSettingsStore";

const OwnerSettings = () => {
  const activeTab = useOwnerSettingsStore((s) => s.activeTab);
  const setActiveTab = useOwnerSettingsStore((s) => s.setActiveTab);

  const clinic = useOwnerSettingsStore((s) => s.clinic);
  const paymentModes = useOwnerSettingsStore((s) => s.paymentModes);
  const labSettings = useOwnerSettingsStore((s) => s.labSettings);
  const commissionSettings = useOwnerSettingsStore((s) => s.commissionSettings);

  const updateClinic = useOwnerSettingsStore((s) => s.updateClinic);
  const upsertPaymentMode = useOwnerSettingsStore((s) => s.upsertPaymentMode);
  const deletePaymentMode = useOwnerSettingsStore((s) => s.deletePaymentMode);
  const togglePaymentMode = useOwnerSettingsStore((s) => s.togglePaymentMode);

  const updateLabSettings = useOwnerSettingsStore((s) => s.updateLabSettings);
  const updateCommissionSettings = useOwnerSettingsStore((s) => s.updateCommissionSettings);

  useEffect(() => {
    useOwnerSettingsStore.getState().init();
  }, []);

  const subtitle = useMemo(
    () =>
      "Configure clinic details, payment labels, master lists, lab defaults, and commission rules",
    []
  );

  return (
    <div className="space-y-6">
      <OwnerPageHeader title="Settings" subtitle={subtitle} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <OwnerSettingsTabs value={activeTab} onChange={setActiveTab} />
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          {activeTab === "clinic" ? (
            <ClinicInfoForm value={clinic} onSave={updateClinic} />
          ) : null}

          {activeTab === "payments" ? (
            <PaymentModesManager
              modes={paymentModes}
              onUpsert={upsertPaymentMode}
              onDelete={deletePaymentMode}
              onToggle={togglePaymentMode}
            />
          ) : null}

          {activeTab === "masterLists" ? (
            <MasterListsPanel />
          ) : null}

          {activeTab === "lab" ? (
            <LabSettingsForm value={labSettings} onSave={updateLabSettings} />
          ) : null}

          {activeTab === "commission" ? (
            <CommissionSettingsForm
              value={commissionSettings}
              onSave={updateCommissionSettings}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerSettings;