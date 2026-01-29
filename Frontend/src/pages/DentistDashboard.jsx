import { Outlet, useNavigate } from "react-router-dom";

// Layout
import SideBar from "@/components/SideBar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// Icons
import { Home, Calendar, FlaskConical, User, LogOut } from "lucide-react";

// Store
import { useUserStore } from "@/store/userStore";

const DentistDashboard = () => {
  const navigate = useNavigate();
  const logout = useUserStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const dentistMenu = [
    { title: "Dashboard", url: "/dentist-dashboard/dashboard", icon: Home },
    { title: "Appointments", url: "/dentist-dashboard/appointments", icon: Calendar },
    { title: "Lab Samples", url: "/dentist-dashboard/lab-samples", icon: FlaskConical },
    { title: "Profile", url: "/dentist-dashboard/profile", icon: User },
    { title: "Logout", icon: LogOut, onClick: handleLogout }, // ✅ action item (no url)
  ];

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-gray-50">
        <SideBar title="Dentist Panel" items={dentistMenu} />

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

export default DentistDashboard;