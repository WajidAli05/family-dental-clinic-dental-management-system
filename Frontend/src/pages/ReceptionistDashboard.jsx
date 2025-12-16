import React from 'react';

// Components
import SideBar from '@/components/SideBar';
import { SidebarProvider } from '@/components/ui/sidebar';

// Icons
import { 
  Home, 
  Users, 
  Calendar, 
  FlaskConical,
  CreditCard,
  Package,
  BarChart3,
  FileText
} from "lucide-react";

const ReceptionistDashboard = () => {
  const receptionistMenu = [
    { title: "Dashboard", url: "dashboard", icon: Home },
    { title: "Patients", url: "patients", icon: Users },
    { title: "Appointments", url: "appointments", icon: Calendar },
    { title: "Billing & Payments", url: "billing", icon: CreditCard },
    { title: "Lab Samples", url: "lab-samples", icon: FlaskConical },
    { title: "Inventory", url: "inventory", icon: Package },
    { title: "Prescriptions", url: "prescriptions", icon: FileText },
    { title: "Daily Collections", url: "daily-collections", icon: BarChart3 },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <SideBar title="Receptionist Panel" items={receptionistMenu} />

        {/* Main content */}
        <main className="flex-1 p-6">
          HELLO
        </main>

      </div>
    </SidebarProvider>
  );
};

export default ReceptionistDashboard;