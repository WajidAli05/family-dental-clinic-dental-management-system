// src/lib/permissions.js
export const canAccess = ({ role, permissions }, permKey) => {
  if (!permissions || !permKey) return true; // fail-open by default
  const row = permissions[permKey];
  if (!row || typeof row !== "object") return true;
  if (role === "receptionist") return !!row.receptionist;
  if (role === "dentist") return !!row.dentist;
  return true; // owners/admins unrestricted
};


import { useMemo, useEffect, useState } from "react";
import { canAccess } from "@/lib/permissions";
import { ownerApi } from "@/lib/ownerApi"; // or a future permissionsApi if you add /permissions/my
import { useUserStore } from "@/store/userStore";

const permMap = {
  Dashboard: "tab_receptionist_dashboard",
  Patients: "tab_receptionist_patients",
  Appointments: "tab_receptionist_appointments",
  "Lab Samples": "tab_receptionist_lab_samples",
  "Billing & Payments": "tab_receptionist_billing",
  Inventory: "tab_receptionist_inventory",
  Profile: "tab_receptionist_profile",
};

export default function ReceptionistDashboard() {
  const user = useUserStore((s) => s.currentUser);

  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    // BEST: call your future /permissions/my
    // TEMP (if you only have owner endpoint): create a dedicated endpoint; do NOT use owner endpoint here in prod
    ownerApi.getPermissions().then((r) => setPermissions(r.data)).catch(() => setPermissions({}));
  }, []);

//   const receptionistMenu = useMemo(() => {
//     const base = [
//       { title: "Dashboard", url: "/receptionist-dashboard/dashboard" },
//       { title: "Patients", url: "/receptionist-dashboard/patients" },
//       { title: "Appointments", url: "/receptionist-dashboard/appointments" },
//       { title: "Lab Samples", url: "/receptionist-dashboard/lab-samples" },
//       { title: "Billing & Payments", url: "/receptionist-dashboard/billing" },
//       { title: "Inventory", url: "/receptionist-dashboard/inventory" },
//       { title: "Profile", url: "/receptionist-dashboard/profile" },
//       { title: "Logout", url: "/login" },
//     ];

//     // logout always visible
//     return base.filter((item) => {
//       if (item.title === "Logout") return true;
//       const key = permMap[item.title];
//       return canAccess({ role: user?.role, permissions }, key);
//     });
//   }, [permissions, user?.role]);

//   // ...render your sidebar using receptionistMenu
// }

// const permMapDentist = {
//   Dashboard: "tab_dentist_dashboard",
//   Appointments: "tab_dentist_appointments",
//   "Lab Samples": "tab_dentist_lab_samples",
//   Profile: "tab_dentist_profile",
// };