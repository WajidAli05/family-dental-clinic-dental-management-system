// import React from "react";

// // Layout
// import SideBar from "@/components/SideBar";
// import { SidebarProvider } from "@/components/ui/sidebar";

// // UI
// import { Card, CardContent } from "@/components/ui/card";

// // Icons
// import {
//   Home,
//   Users,
//   Calendar,
//   FlaskConical,
//   CreditCard,
//   Package,
//   User,
// } from "lucide-react";

// // Data
// import { useReceptionistStore } from "@/store/receptionistStore";

// // Components
// import StatCard from "@/components/receptionist/StatCard";
// import AppointmentsTable from "@/components/receptionist/AppointmentsTable";
// import LabSamplesTable from "@/components/receptionist/LabSamplesTable";

// // Effects
// import Wave from "react-wavify";

// const ReceptionistDashboard = () => {
//   const { stats, appointments, labSamples } = useReceptionistStore();

//   const receptionistMenu = [
//     { title: "Dashboard", url: "/reception/dashboard", icon: Home },
//     { title: "Patients", url: "/reception/patients", icon: Users },
//     { title: "Appointments", url: "/reception/appointments", icon: Calendar },
//     { title: "Lab Samples", url: "/reception/lab-samples", icon: FlaskConical },
//     { title: "Billing & Payments", url: "/reception/billing", icon: CreditCard },
//     { title: "Inventory", url: "/reception/inventory", icon: Package },
//     { title: "Profile", url: "/reception/profile", icon: User },
//   ];

//   return (
//     <SidebarProvider>
//       <div className="flex w-screen min-h-screen overflow-x-hidden bg-gray-50">

//         {/* Sidebar */}
//         <SideBar title="Receptionist Panel" items={receptionistMenu} />

//         {/* Main */}
//         <main className="flex-1 min-w-0 px-8 py-6 space-y-8">

//           {/* Header */}
//           <div className="relative overflow-hidden rounded-2xl bg-white p-6">
//             <h1 className="text-2xl font-bold text-gray-900">
//               Receptionist Dashboard
//             </h1>
//             <p className="text-gray-500">
//               Daily clinic operations overview
//             </p>

//             {/* Decorative Wave */}
//             <Wave
//               fill="#2ec4b6"
//               paused={false}
//               options={{
//                 height: 20,
//                 amplitude: 30,
//                 speed: 0.15,
//                 points: 3,
//               }}
//               className="absolute bottom-0 left-0 w-full opacity-20"
//             />
//           </div>

//           {/* Stats */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//             <StatCard
//               title="Appointments Today"
//               value={stats.appointmentsToday}
//               icon={Calendar}
//             />
//             <StatCard
//               title="Active Patients"
//               value={stats.activePatients}
//               icon={Users}
//             />
//             <StatCard
//               title="Pending Lab Samples"
//               value={stats.pendingLabSamples}
//               icon={FlaskConical}
//             />
//             <StatCard
//               title="Revenue Today (PKR)"
//               value={stats.todayRevenue}
//               icon={CreditCard}
//             />
//           </div>

//           {/* Tables */}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

//             {/* Appointments */}
//             <Card className="rounded-2xl">
//               <CardContent className="p-6">
//                 <h2 className="text-lg font-semibold mb-4">
//                   Today’s Appointments
//                 </h2>
//                 <AppointmentsTable data={appointments} />
//               </CardContent>
//             </Card>

//             {/* Lab Samples */}
//             <Card className="rounded-2xl">
//               <CardContent className="p-6">
//                 <h2 className="text-lg font-semibold mb-4">
//                   Lab Samples Status
//                 </h2>
//                 <LabSamplesTable data={labSamples} />
//               </CardContent>
//             </Card>

//           </div>
//         </main>
//       </div>
//     </SidebarProvider>
//   );
// };

// export default ReceptionistDashboard;

import React from "react";
import { Outlet } from "react-router-dom";

// Layout
import SideBar from "@/components/SideBar";
import { SidebarProvider } from "@/components/ui/sidebar";

// Icons
import {
  Home,
  Users,
  Calendar,
  FlaskConical,
  CreditCard,
  Package,
  User,
} from "lucide-react";

const ReceptionistDashboard = () => {
const receptionistMenu = [
  { title: "Dashboard", url: "/receptionist-dashboard/dashboard", icon: Home },
  { title: "Patients", url: "/receptionist-dashboard/patients", icon: Users },
  { title: "Appointments", url: "/receptionist-dashboard/appointments", icon: Calendar },
  { title: "Lab Samples", url: "/receptionist-dashboard/lab-samples", icon: FlaskConical },
  { title: "Billing & Payments", url: "/receptionist-dashboard/billing", icon: CreditCard },
  { title: "Inventory", url: "/receptionist-dashboard/inventory", icon: Package },
  { title: "Profile", url: "/receptionist-dashboard/profile", icon: User },
];

  return (
    <SidebarProvider>
      <div className="flex w-screen min-h-screen overflow-x-hidden bg-gray-50">

        {/* Sidebar */}
        <SideBar title="Receptionist Panel" items={receptionistMenu} />

        {/* Dynamic Content */}
        <main className="flex-1 min-w-0 px-8 py-6">
          <Outlet />
        </main>

      </div>
    </SidebarProvider>
  );
};

export default ReceptionistDashboard;