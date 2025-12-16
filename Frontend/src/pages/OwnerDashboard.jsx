import React from 'react';

// Components
import SideBar from '@/components/SideBar';
import { SidebarProvider } from "@/components/ui/sidebar";

// Icons
import { 
  Home, 
  Users, 
  Calendar, 
  FlaskConical,
  CreditCard,
  UserCog,
  Package,
  BarChart3,
  Settings 
} from "lucide-react";

const OwnerDashboard = () => {
  const ownerMenu = [
    { title: "Dashboard", url: "dashboard", icon: Home },
    { title: "Patients", url: "patients", icon: Users },
    { title: "Appointments", url: "appointments", icon: Calendar },
    { title: "Lab Samples", url: "lab-samples", icon: FlaskConical },
    { title: "Billing & Payments", url: "billing", icon: CreditCard },
    { title: "Staff Management", url: "staff", icon: UserCog },
    { title: "Inventory", url: "inventory", icon: Package },
    { title: "Reports & Analytics", url: "reports", icon: BarChart3 },
    { title: "Settings", url: "settings", icon: Settings },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <SideBar title="Owner Panel" items={ownerMenu} />

        {/* Main content */}
        <main className="flex-1 p-6">
          HELLO
        </main>

      </div>
    </SidebarProvider>
  );
};

export default OwnerDashboard;