// src/pages/owner/OwnerDashboard.jsx
import { Outlet, useNavigate } from "react-router-dom";
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
  LogOut,
} from "lucide-react";

import { useUserStore } from "@/store/userStore";

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const logout = useUserStore((s) => s.logout);

  const ownerMenu = [
    { title: "Dashboard", url: "/owner-dashboard/dashboard", icon: Home },
    { title: "Appointments", url: "/owner-dashboard/appointments", icon: CalendarDays },
    { title: "Patients", url: "/owner-dashboard/patients", icon: Users },
    { title: "Clinical Library", url: "/owner-dashboard/clinical-master", icon: ClipboardList },
    { title: "Lab Management", url: "/owner-dashboard/lab-management", icon: FlaskConical },
    { title: "Billing & Financials", url: "/owner-dashboard/billing", icon: CreditCard },
    { title: "Staff & Permissions", url: "/owner-dashboard/staff", icon: Shield },
    { title: "Inventory", url: "/owner-dashboard/inventory", icon: Boxes },
    { title: "Settings", url: "/owner-dashboard/settings", icon: Settings },

    // ✅ Logout: clear auth + replace navigation (prevents back-to-dashboard)
    {
      title: "Logout",
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
        <SideBar title="Owner Panel" items={ownerMenu} />

        <main className="flex-1 relative min-w-0">
          <div className="lg:hidden fixed top-4 left-5 z-50">
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