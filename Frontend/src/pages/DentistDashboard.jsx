import React from 'react';

// Components
import SideBar from '@/components/SideBar';
import { SidebarProvider } from '@/components/ui/sidebar';

// Icons
import {
  Home,
  Users,
  Calendar,
  ClipboardList,
  FlaskConical,
  FileText,
  Smile
} from "lucide-react";

const DentistDashboard = () => {
  const dentistMenu = [
    { title: "Dashboard", url: "dashboard", icon: Home },
    { title: "Patients", url: "patients", icon: Users },
    { title: "Appointments", url: "appointments", icon: Calendar },
    { title: "Treatments", url: "treatments", icon: ClipboardList },
    { title: "Dental Chart", url: "dental-chart", icon: Smile },
    { title: "Prescriptions", url: "prescriptions", icon: FileText },
    { title: "Lab Samples", url: "lab-samples", icon: FlaskConical },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <SideBar title="Dentist Panel" items={dentistMenu} />

        {/* Main content */}
        <main className="flex-1 p-6">
          HELLO
        </main>

      </div>
    </SidebarProvider>
  );
};

export default DentistDashboard;