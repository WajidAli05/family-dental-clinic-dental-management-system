// import "./App.css";
// import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// import LoginPage from "./pages/LoginPage";
// import OwnerDashboard from "./pages/OwnerDashboard";
// import DentistDashboard from "./pages/DentistDashboard";
// import ReceptionistDashboard from "./pages/receptionist/ReceptionistDashboard";
// import ReceptionistDashboardHome from "./pages/receptionist/ReceptionistDashboardHome";
// import Patients from "./pages/receptionist/Patients";
// import LabDashboard from "./pages/LabDashboard";
// import NotFound from "./pages/NotFound";
// import ProtectedRoute from "./components/ProtectedRoute";

// function App() {
//   return (
//     <Router>
//       <Routes>

//         {/* Auth */}
//         <Route path="/login" element={<LoginPage />} />

//         {/* OWNER */}
//         <Route element={<ProtectedRoute role="owner" />}>
//           <Route path="/owner-dashboard/*" element={<OwnerDashboard />} />
//         </Route>

//         {/* DENTIST */}
//         <Route element={<ProtectedRoute role="dentist" />}>
//           <Route path="/dentist-dashboard/*" element={<DentistDashboard />} />
//         </Route>

//         {/* RECEPTIONIST */}
//         <Route element={<ProtectedRoute role="receptionist" />}>
//           <Route path="/receptionist-dashboard" element={<ReceptionistDashboard />}>
//             <Route index element={<Navigate to="dashboard" replace />} />
//             <Route path="dashboard" element={<ReceptionistDashboardHome />} />
//             <Route path="patients" element={<Patients />} />
//             <Route path="appointments" element={<Appointments />} />
//             <Route path="billing" element={<Billing />} />
//             <Route path="inventory" element={<Inventory />} />
//             <Route path="profile" element={<Profile />} />
//           </Route>
//         </Route>

//         {/* LAB */}
//         <Route element={<ProtectedRoute role="lab" />}>
//           <Route path="/lab-dashboard/*" element={<LabDashboard />} />
//         </Route>

//         {/* 404 */}
//         <Route path="*" element={<NotFound />} />

//       </Routes>
//     </Router>
//   );
// }

// export default App;

import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import DentistDashboard from "./pages/DentistDashboard";

import ReceptionistDashboard from "./pages/ReceptionistDashboard";
import ReceptionistDashboardHome from "./pages/receptionist/ReceptionistDashboardHome";
import Patients from "./pages/receptionist/Patients";
import Appointments from "./pages/receptionist/Appointments";
import Billing from "./pages/receptionist/Billing";
import Inventory from "./pages/receptionist/Inventory";
import Profile from "./pages/receptionist/Profile";

import LabDashboard from "./pages/LabDashboard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>

        {/* AUTH */}
        <Route path="/login" element={<LoginPage />} />

        {/* OWNER */}
        <Route element={<ProtectedRoute role="owner" />}>
          <Route path="/owner-dashboard/*" element={<OwnerDashboard />} />
        </Route>

        {/* DENTIST */}
        <Route element={<ProtectedRoute role="dentist" />}>
          <Route path="/dentist-dashboard/*" element={<DentistDashboard />} />
        </Route>

        {/* RECEPTIONIST */}
        <Route element={<ProtectedRoute role="receptionist" />}>
          <Route path="/receptionist-dashboard" element={<ReceptionistDashboard />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ReceptionistDashboardHome />} />
            <Route path="patients" element={<Patients />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="billing" element={<Billing />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        {/* LAB */}
        <Route element={<ProtectedRoute role="lab" />}>
          <Route path="/lab-dashboard/*" element={<LabDashboard />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </Router>
  );
}

export default App;