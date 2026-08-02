// src/pages/owner/OwnerDashboard.jsx
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SideBar from "@/components/SideBar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Home,
  CalendarDays,
  Users,
  ClipboardList,
  FlaskConical,
  CreditCard,
  Shield,
  Settings,
  Boxes,
  ScrollText,
  LogOut,
} from "lucide-react";

import { useUserStore } from "@/store/userStore";

const OwnerDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useUserStore((s) => s.logout);

  const ownerMenu = [
    { titleKey: "nav.dashboard",         url: "/owner-dashboard/dashboard",      icon: Home },
    { titleKey: "nav.appointments",       url: "/owner-dashboard/appointments",   icon: CalendarDays },
    { titleKey: "nav.patients",           url: "/owner-dashboard/patients",       icon: Users },
    { titleKey: "nav.clinicalLibrary",    url: "/owner-dashboard/clinical-master", icon: ClipboardList },
    { titleKey: "nav.labManagement",      url: "/owner-dashboard/lab-management", icon: FlaskConical },
    { titleKey: "nav.billingFinancials",  url: "/owner-dashboard/billing",        icon: CreditCard },
    { titleKey: "nav.staffPermissions",   url: "/owner-dashboard/staff",          icon: Shield },
    { titleKey: "nav.inventory",          url: "/owner-dashboard/inventory",      icon: Boxes },
    { titleKey: "nav.settings",           url: "/owner-dashboard/settings",       icon: Settings },
    { titleKey: "nav.logs",               url: "/owner-dashboard/logs",           icon: ScrollText },
    {
      titleKey: "nav.logout",
      icon: LogOut,
      onClick: () => {
        logout();
        navigate("/login", { replace: true });
      },
    },
  ];

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-gray-50">
        <SideBar title={t("nav.ownerPanel")} items={ownerMenu} />

        <main className="flex-1 relative min-w-0">
          <div className="lg:hidden fixed top-4 start-5 z-50">
            <SidebarTrigger
              className="text-[#2ec4b6] bg-white p-2.5 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
            />
          </div>

          <div className="px-4 md:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default OwnerDashboard;
