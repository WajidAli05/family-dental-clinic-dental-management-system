import { Routes, Route, Navigate } from "react-router-dom";
import SideBar from "@/components/SideBar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Home, User } from "lucide-react";
import LabStats from "@/components/lab/LabStats";
import LabSamplesTable from "@/components/lab/LabSamplesTable";
import LabProfile from "@/pages/lab/LabProfile";

export default function LabDashboard() {
  const labMenu = [
    { title: "Dashboard", url: "/lab-dashboard/dashboard", icon: Home },
    { title: "Profile", url: "/lab-dashboard/profile", icon: User },
  ];

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        {/* Sidebar - Collapsible on mobile, visible on desktop */}
        <SideBar title="Lab Panel" items={labMenu} />

        {/* Main Content */}
        <main className="flex-1 lab-gradient text-white relative">
          {/* Mobile Menu Toggle - Top Left Corner */}
          <div className="lg:hidden fixed top-4 left-5 z-50">
            <SidebarTrigger className="text-[#2ec4b6] bg-white p-2.5 rounded-lg shadow-lg hover:bg-gray-50 transition-colors" />
          </div>

          {/* Content Area */}
          <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-6 md:space-y-8">
            <Routes>
              {/* Default route - redirects to dashboard */}
              <Route path="/" element={<Navigate to="dashboard" replace />} />
              
              {/* Dashboard route */}
              <Route
                path="dashboard"
                element={
                  <>
                    {/* Header */}
                    <div className="text-center">
                      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
                        Lab Dashboard
                      </h1>
                      <p className="text-sm md:text-base text-white/90 mt-1">
                        Technician Portal
                      </p>
                    </div>

                    {/* Content */}
                    <LabStats />
                    <LabSamplesTable />
                  </>
                }
              />

              {/* Profile route */}
              <Route path="profile" element={<LabProfile />} />
            </Routes>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}