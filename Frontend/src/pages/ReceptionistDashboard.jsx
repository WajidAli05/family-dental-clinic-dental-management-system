// src/pages/ReceptionistDashboard.jsx
import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

// Layout
import SideBar from "@/components/SideBar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// Store
import { useUserStore } from "@/store/userStore";
import { usePermissionsStore } from "@/store/permissionsStore";

// Icons
import {
  Home,
  Users,
  Calendar,
  FlaskConical,
  CreditCard,
  Package,
  User,
  LogOut,
} from "lucide-react";

const ReceptionistDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useUserStore((s) => s.logout);

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
      {
        titleKey: "nav.logout",
        icon: LogOut,
        onClick: () => {
          logout();
          navigate("/login", { replace: true });
        },
      },
    ];

    return base.filter((item) => {
      if (!item.permKey) return true;
      return canAccessTab?.(item.permKey);
    });
  }, [canAccessTab, logout, navigate]);

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
    </SidebarProvider>
  );
};

export default ReceptionistDashboard;
