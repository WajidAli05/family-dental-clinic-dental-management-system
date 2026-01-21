import { useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import OwnerStaffTabs from "@/components/owner/OwnerStaffTabs";
import OwnerStaffFilters from "@/components/owner/OwnerStaffFilters";

import StaffDirectoryTable from "@/components/owner/StaffDirectoryTable";
import PermissionsMatrix from "@/components/owner/PermissionsMatrix";

import StaffAccountModal from "@/components/owner/StaffAccountModal";
import OwnerConfirmDialog from "@/components/owner/OwnerConfirmDialog";

import { useOwnerStaffStore } from "@/store/ownerStaffStore";

const OwnerStaffManagement = () => {
  const activeTab = useOwnerStaffStore((s) => s.activeTab);
  const setActiveTab = useOwnerStaffStore((s) => s.setActiveTab);

  const filters = useOwnerStaffStore((s) => s.filters);
  const setFilter = useOwnerStaffStore((s) => s.setFilter);
  const resetFilters = useOwnerStaffStore((s) => s.resetFilters);

  const staff = useOwnerStaffStore((s) => s.staff);
  const permissions = useOwnerStaffStore((s) => s.permissions);

  const modal = useOwnerStaffStore((s) => s.modal);
  const confirm = useOwnerStaffStore((s) => s.confirm);

  const openCreate = useOwnerStaffStore((s) => s.openCreate);
  const openEdit = useOwnerStaffStore((s) => s.openEdit);
  const closeModal = useOwnerStaffStore((s) => s.closeModal);

  const openConfirm = useOwnerStaffStore((s) => s.openConfirm);
  const closeConfirm = useOwnerStaffStore((s) => s.closeConfirm);
  const runConfirm = useOwnerStaffStore((s) => s.runConfirm);

  const togglePermission = useOwnerStaffStore((s) => s.togglePermission);
  const toggleAccountEnabled = useOwnerStaffStore((s) => s.toggleAccountEnabled);

  useEffect(() => {
    useOwnerStaffStore.getState().init();
  }, []);

  const staffData = useMemo(() => {
    const { role, status, query } = filters.directory;
    const q = String(query || "").trim().toLowerCase();

    return staff.filter((s) => {
      if (role !== "all" && s.role !== role) return false;
      if (status === "enabled" && !s.enabled) return false;
      if (status === "disabled" && s.enabled) return false;

      if (q) {
        const hay = `${s.id} ${s.name} ${s.email} ${s.phone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [staff, filters.directory]);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Staff Management"
        subtitle="Manage staff accounts, roles, permissions, and commissions"
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <OwnerStaffTabs value={activeTab} onChange={setActiveTab} />

        {activeTab === "directory" ? (
          <Button
            className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
            onClick={() => openCreate()}
          >
            Add Staff
          </Button>
        ) : null}
      </div>

      {activeTab === "directory" ? (
        <>
          <OwnerStaffFilters
            filters={filters.directory}
            onChange={(k, v) => setFilter("directory", k, v)}
            onReset={() => resetFilters("directory")}
          />

          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <StaffDirectoryTable
                data={staffData}
                onEdit={openEdit}
                onToggle={(s) => toggleAccountEnabled(s.id)}
                onDelete={(s) =>
                  openConfirm({
                    title: "Delete Staff Account",
                    message: `This will permanently delete "${s.name}".`,
                    onConfirmKey: "deleteStaff",
                    onConfirmPayload: s.id,
                  })
                }
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {activeTab === "permissions" ? (
        <PermissionsMatrix
          staff={staff}
          permissions={permissions}
          onToggle={togglePermission}
        />
      ) : null}

      <StaffAccountModal
        open={modal.open}
        mode={modal.mode}
        initial={modal.payload}
        onClose={closeModal}
        onSubmit={(form) => {
          if (modal.mode === "edit") useOwnerStaffStore.getState().updateStaff(modal.payload.id, form);
          else useOwnerStaffStore.getState().addStaff(form);
          closeModal();
        }}
      />

      <OwnerConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onCancel={closeConfirm}
        onConfirm={runConfirm}
      />
    </div>
  );
};

export default OwnerStaffManagement;