// src/pages/owner/OwnerSettings.jsx
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";

import ClinicInfoForm from "@/components/owner/settings/ClinicInfoForm";
import ChangePasswordForm from "@/components/owner/settings/ChangePasswordForm";
import DataExportCard from "@/components/owner/settings/DataExportCard";
import TwoFactorSettings from "@/components/profile/TwoFactorSettings";

import { useOwnerSettingsStore } from "@/store/ownerSettingsStore";
import { toast } from "sonner";
import { useClinicConfig } from "@/store/clinicConfigStore";

const BillingSettingsForm = ({ value, onSave, loading }) => {
  const { currency } = useClinicConfig();
  const [fee, setFee] = useState(String(value?.defaultConsultationFee ?? 0));

  useEffect(() => {
    setFee(String(value?.defaultConsultationFee ?? 0));
  }, [value?.defaultConsultationFee]);

  const handleSave = async () => {
    const numFee = Math.max(0, Number(fee) || 0);
    try {
      await onSave({ defaultConsultationFee: numFee });
      toast.success("Billing settings saved.");
    } catch (e) {
      toast.error(e?.message || "Failed to save billing settings.");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Billing Defaults</h3>
      <div className="max-w-xs space-y-1">
        <Label htmlFor="consult-fee">Default Consultation Fee ({currency})</Label>
        <Input
          id="consult-fee"
          type="number"
          min="0"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          disabled={loading}
          placeholder="0"
        />
        <p className="text-xs text-gray-500">
          Auto-filled in the consultation line when creating an invoice.
        </p>
      </div>
      <Button
        onClick={handleSave}
        disabled={loading}
        className="bg-[#2ec4b6] hover:bg-[#26a699]"
      >
        {loading ? "Saving..." : "Save Billing Settings"}
      </Button>
    </div>
  );
};

const OwnerSettings = () => {
  const clinic = useOwnerSettingsStore((s) => s.clinic);
  const billing = useOwnerSettingsStore((s) => s.billing);
  const loading = useOwnerSettingsStore((s) => s.loading);

  const init = useOwnerSettingsStore((s) => s.init);
  const updateClinic = useOwnerSettingsStore((s) => s.updateClinic);
  const updateBilling = useOwnerSettingsStore((s) => s.updateBilling);
  const changePassword = useOwnerSettingsStore((s) => s.changePassword);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Settings"
        subtitle="Update clinic info, billing defaults, and manage account password"
      />

      {/* Clinic Info */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <ClinicInfoForm value={clinic} onSave={updateClinic} loading={loading} />
        </CardContent>
      </Card>

      {/* Billing Defaults */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <BillingSettingsForm value={billing} onSave={updateBilling} loading={loading} />
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <ChangePasswordForm onSave={changePassword} loading={loading} />
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <TwoFactorSettings />

      {/* Data Export */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <DataExportCard />
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerSettings;