// src/pages/DentistDashboard.jsx
import { Outlet } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

// Layout
import SideBar from "@/components/SideBar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// Icons
import { Home, Calendar, FlaskConical, User, Users, LogOut, Wallet } from "lucide-react";

// Store
import { usePermissionsStore } from "@/store/permissionsStore";
import { useLogoutConfirm } from "@/hooks/useLogoutConfirm";

const DentistDashboard = () => {
  const { t } = useTranslation();
  const { requestLogout, LogoutConfirmDialog } = useLogoutConfirm();

  const fetchMyPermissions = usePermissionsStore((s) => s.fetchMyPermissions);
  const canAccessTab = usePermissionsStore((s) => s.canAccessTab);

  useEffect(() => {
    fetchMyPermissions?.();
  }, []);

  const dentistMenu = useMemo(() => {
    const base = [
      { titleKey: "nav.dashboard",    permKey: "tab_dentist_dashboard",    url: "/dentist-dashboard/dashboard",    icon: Home },
      { titleKey: "nav.appointments", permKey: "tab_dentist_appointments", url: "/dentist-dashboard/appointments", icon: Calendar },
      { titleKey: "nav.labSamples",   permKey: "tab_dentist_lab_samples",  url: "/dentist-dashboard/lab-samples",  icon: FlaskConical },
      { titleKey: "nav.patients",     permKey: "tab_dentist_patients",     url: "/dentist-dashboard/patients",     icon: Users },
      { titleKey: "nav.myFinance",    permKey: "tab_dentist_finance",      url: "/dentist-dashboard/finance",      icon: Wallet },
      { titleKey: "nav.profile",      permKey: "tab_dentist_profile",      url: "/dentist-dashboard/profile",      icon: User },
      { titleKey: "nav.logout",       icon: LogOut, onClick: requestLogout },
    ];

    return base.filter((item) => {
      if (!item.permKey) return true;
      return canAccessTab?.(item.permKey);
    });
  }, [canAccessTab, requestLogout]);

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-gray-50">
        <SideBar title={t("nav.dentistPanel")} items={dentistMenu} />

        <main className="flex-1 relative min-w-0">
          <div className="lg:hidden fixed top-4 start-5 z-50">
            <SidebarTrigger
              className="text-[#2ec4b6] bg-white p-2.5 rounded-lg shadow-lg
                         hover:bg-gray-50 transition-colors"
            />
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

export default DentistDashboard;
