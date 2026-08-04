// src/pages/owner/OwnerDashboard.jsx
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SideBar from "@/components/SideBar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import NotificationBell from "@/components/owner/NotificationBell";
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
  LockKeyhole,
  LogOut,
} from "lucide-react";

import { useLogoutConfirm } from "@/hooks/useLogoutConfirm";

const OwnerDashboard = () => {
  const { t } = useTranslation();
  const { requestLogout, LogoutConfirmDialog } = useLogoutConfirm();

  const ownerMenu = [
    { titleKey: "nav.dashboard",         url: "/owner-dashboard/dashboard",       icon: Home },
    { titleKey: "nav.appointments",       url: "/owner-dashboard/appointments",    icon: CalendarDays },
    { titleKey: "nav.patients",           url: "/owner-dashboard/patients",        icon: Users },
    { titleKey: "nav.clinicalLibrary",    url: "/owner-dashboard/clinical-master", icon: ClipboardList },
    { titleKey: "nav.labManagement",      url: "/owner-dashboard/lab-management",  icon: FlaskConical },
    { titleKey: "nav.billingFinancials",  url: "/owner-dashboard/billing",         icon: CreditCard },
    { titleKey: "nav.staffPermissions",   url: "/owner-dashboard/staff",           icon: Shield },
    { titleKey: "nav.inventory",          url: "/owner-dashboard/inventory",       icon: Boxes },
    { titleKey: "nav.settings",           url: "/owner-dashboard/settings",        icon: Settings },
    { titleKey: "nav.logs",               url: "/owner-dashboard/logs",            icon: ScrollText },
    { titleKey: "nav.security",           url: "/owner-dashboard/security",        icon: LockKeyhole },
    { titleKey: "nav.logout", icon: LogOut, onClick: requestLogout },
  ];

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-gray-50">
        <SideBar title={t("nav.ownerPanel")} items={ownerMenu} />

        <main className="flex-1 min-w-0 flex flex-col">
          {/* Sticky top nav bar — standard medical system pattern */}
          <header className="sticky top-0 z-30 shrink-0 h-14 bg-white border-b border-gray-100 shadow-sm flex items-center justify-between px-4 md:px-6 lg:px-8">
            {/* Mobile: sidebar trigger */}
            <div className="lg:hidden">
              <SidebarTrigger className="text-[#2ec4b6] bg-white p-2.5 rounded-lg hover:bg-gray-50 transition-colors" />
            </div>
            {/* Desktop spacer so bell stays on the end side */}
            <div className="hidden lg:block" aria-hidden="true" />
            <NotificationBell />
          </header>

          <div className="flex-1 px-4 md:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
      {LogoutConfirmDialog}
    </SidebarProvider>
  );
};

export default OwnerDashboard;
