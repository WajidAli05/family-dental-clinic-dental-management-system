import { Outlet } from "react-router-dom";

// Layout
import SideBar from "@/components/SideBar";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Icons
import {
  Home,
  Calendar,
  Users,
  Smile,
  FileText,
  FlaskConical,
  User,
  LogOut,
} from "lucide-react";

const DentistDashboard = () => {
  const dentistMenu = [
    {
      title: "Dashboard",
      url: "/dentist-dashboard/dashboard",
      icon: Home,
    },
    {
      title: "Appointments",
      url: "/dentist-dashboard/appointments",
      icon: Calendar,
    },
    // {
    //   title: "Patients",
    //   url: "/dentist-dashboard/patients",
    //   icon: Users,
    // },
    // {
    //   title: "Dental Chart",
    //   url: "/dentist-dashboard/dental-chart",
    //   icon: Smile,
    // },
    // {
    //   title: "Prescriptions",
    //   url: "/dentist-dashboard/prescriptions",
    //   icon: FileText,
    // },
    {
      title: "Lab Samples",
      url: "/dentist-dashboard/lab-samples",
      icon: FlaskConical,
    },
    {
      title: "Profile",
      url: "/dentist-dashboard/profile",
      icon: User,
    },
    {
      title: "Logout",
      url: "/login",
      icon: LogOut,
    },
  ];

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-gray-50">

        {/* Sidebar */}
        <SideBar title="Dentist Panel" items={dentistMenu} />

        {/* Main Content */}
        <main className="flex-1 relative min-w-0">

          {/* Mobile Sidebar Toggle */}
          <div className="lg:hidden fixed top-4 left-5 z-50">
            <SidebarTrigger
              className="text-[#2ec4b6] bg-white p-2.5 rounded-lg shadow-lg
                         hover:bg-gray-50 transition-colors"
            />
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

export default DentistDashboard;