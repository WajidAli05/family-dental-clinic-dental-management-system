// src/pages/ReceptionistDashboard.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

// Layout
import SideBar from "@/components/SideBar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// Store
import { usePermissionsStore } from "@/store/permissionsStore";
import { useLogoutConfirm } from "@/hooks/useLogoutConfirm";

// Icons
import {
  Home,
  Users,
  Calendar,
  FlaskConical,
  CreditCard,
  Package,
  User,
  ScrollText,
  LogOut,
} from "lucide-react";

const ReceptionistDashboard = () => {
  const { t } = useTranslation();
  const { requestLogout, LogoutConfirmDialog } = useLogoutConfirm();

  const fetchMyPermissions = usePermissionsStore((s) => s.fetchMyPermissions);
  const canAccessTab = usePermissionsStore((s) => s.canAccessTab);

  useEffect(() => {
    fetchMyPermissions?.();
  }, []);

  const receptionistMenu = useMemo(() => {
    const base = [
      { titleKey: "nav.dashboard",   permKey: "tab_receptionist_dashboard",    url: "/receptionist-dashboard/dashboard",   icon: Home },
      { titleKey: "nav.patients",    permKey: "tab_receptionist_patients",      url: "/receptionist-dashboard/patients",    icon: Users },
      { titleKey: "nav.appointments",permKey: "tab_receptionist_appointments",  url: "/receptionist-dashboard/appointments", icon: Calendar },
      { titleKey: "nav.labSamples",  permKey: "tab_receptionist_lab_samples",   url: "/receptionist-dashboard/lab-samples", icon: FlaskConical },
      { titleKey: "nav.billing",     permKey: "tab_receptionist_billing",       url: "/receptionist-dashboard/billing",     icon: CreditCard },
      { titleKey: "nav.inventory",   permKey: "tab_receptionist_inventory",     url: "/receptionist-dashboard/inventory",   icon: Package },
      { titleKey: "nav.profile",     permKey: "tab_receptionist_profile",       url: "/receptionist-dashboard/profile",     icon: User },
      { titleKey: "nav.logs",       permKey: "tab_receptionist_logs",          url: "/receptionist-dashboard/logs",        icon: ScrollText },
      { titleKey: "nav.logout", icon: LogOut, onClick: requestLogout },
    ];

    return base.filter((item) => {
      if (!item.permKey) return true;
      return canAccessTab?.(item.permKey);
    });
  }, [canAccessTab, requestLogout]);

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-gray-50">
        <SideBar title={t("nav.receptionistPanel")} items={receptionistMenu} />

        <main className="flex-1 relative min-w-0">
          <div className="lg:hidden fixed top-4 start-5 z-50">
            <SidebarTrigger className="text-[#2ec4b6] bg-white p-2.5 rounded-lg shadow-lg hover:bg-gray-50 transition-colors" />
          </div>

          <div className="px-4 md:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
      {LogoutConfirmDialog}
    </SidebarProvider>
  );
};

export default ReceptionistDashboard;
