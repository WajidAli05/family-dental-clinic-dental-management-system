import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SideBar from "@/components/SideBar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Home, User, LogOut } from "lucide-react";
import LabStats from "@/components/lab/LabStats";
import LabSamplesTable from "@/components/lab/LabSamplesTable";
import LabProfile from "@/pages/lab/LabProfile";
import { useUserStore } from "@/store/userStore";

export default function LabDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useUserStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const labMenu = [
    { titleKey: "nav.dashboard", url: "/lab-dashboard/dashboard", icon: Home },
    { titleKey: "nav.profile",   url: "/lab-dashboard/profile",   icon: User },
    { titleKey: "nav.logout",    icon: LogOut, onClick: handleLogout },
  ];

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <SideBar title={t("nav.labPanel")} items={labMenu} />

        <main className="flex-1 lab-gradient text-white relative">
          <div className="lg:hidden fixed top-4 start-5 z-50">
            <SidebarTrigger className="text-[#2ec4b6] bg-white p-2.5 rounded-lg shadow-lg hover:bg-gray-50 transition-colors" />
          </div>

          <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-6 md:space-y-8">
            <Routes>
              <Route path="/" element={<Navigate to="dashboard" replace />} />

              <Route
                path="dashboard"
                element={
                  <>
                    <div className="text-center">
                      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
                        Lab Dashboard
                      </h1>
                      <p className="text-sm md:text-base text-white/90 mt-1">
                        Technician Portal
                      </p>
                    </div>

                    <LabStats />
                    <LabSamplesTable />
                  </>
                }
              />

              <Route path="profile" element={<LabProfile />} />
            </Routes>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
