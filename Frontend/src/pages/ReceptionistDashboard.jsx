// src/pages/receptionist/ReceptionistDashboard.jsx
import React from "react";
import { Outlet, useNavigate } from "react-router-dom";

// Layout
import SideBar from "@/components/SideBar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// Store
import { useUserStore } from "@/store/userStore";

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
  const navigate = useNavigate();
  const logout = useUserStore((s) => s.logout);

  const receptionistMenu = [
    { title: "Dashboard", url: "/receptionist-dashboard/dashboard", icon: Home },
    { title: "Patients", url: "/receptionist-dashboard/patients", icon: Users },
    { title: "Appointments", url: "/receptionist-dashboard/appointments", icon: Calendar },
    { title: "Lab Samples", url: "/receptionist-dashboard/lab-samples", icon: FlaskConical },
    { title: "Billing & Payments", url: "/receptionist-dashboard/billing", icon: CreditCard },
    { title: "Inventory", url: "/receptionist-dashboard/inventory", icon: Package },
    { title: "Profile", url: "/receptionist-dashboard/profile", icon: User },

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
        {/* Sidebar */}
        <SideBar title="Receptionist Panel" items={receptionistMenu} />

        {/* Main Content */}
        <main className="flex-1 relative min-w-0">
          {/* Mobile Sidebar Toggle */}
          <div className="lg:hidden fixed top-4 left-5 z-50">
            <SidebarTrigger className="text-[#2ec4b6] bg-white p-2.5 rounded-lg shadow-lg hover:bg-gray-50 transition-colors" />
          </div>

          {/* Page Content */}
          <div className="px-4 md:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ReceptionistDashboard;