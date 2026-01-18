import { Outlet } from "react-router-dom";
import SideBar from "@/components/SideBar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Home, CalendarDays, Users, LogOut } from "lucide-react";

const OwnerDashboard = () => {
  const ownerMenu = [
    { title: "Dashboard", url: "/owner-dashboard/dashboard", icon: Home },
    { title: "Appointments", url: "/owner-dashboard/appointments", icon: CalendarDays },
    { title: "Patients", url: "/owner-dashboard/patients", icon: Users },
    { title: "Logout", url: "/login", icon: LogOut },
  ];

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-gray-50">
        <SideBar title="Owner Panel" items={ownerMenu} />

        <main className="flex-1 relative min-w-0">
          <div className="lg:hidden fixed top-4 left-5 z-50">
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
    </SidebarProvider>
  );
};

export default OwnerDashboard;