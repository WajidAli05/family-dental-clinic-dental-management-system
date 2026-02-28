// src/pages/owner/OwnerSettings.jsx
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";

import ClinicInfoForm from "@/components/owner/settings/ClinicInfoForm";
import ChangePasswordForm from "@/components/owner/settings/ChangePasswordForm";

import { useOwnerSettingsStore } from "@/store/ownerSettingsStore";

const OwnerSettings = () => {
  const clinic = useOwnerSettingsStore((s) => s.clinic);
  const loading = useOwnerSettingsStore((s) => s.loading);

  const init = useOwnerSettingsStore((s) => s.init);
  const updateClinic = useOwnerSettingsStore((s) => s.updateClinic);
  const changePassword = useOwnerSettingsStore((s) => s.changePassword);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Settings"
        subtitle="Update clinic info and manage account password"
      />

      {/* Clinic Info */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <ClinicInfoForm value={clinic} onSave={updateClinic} loading={loading} />
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <ChangePasswordForm onSave={changePassword} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerSettings;