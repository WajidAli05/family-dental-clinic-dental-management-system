import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerDashboardHome from "./pages/owner/OwnerDashboardHome";
import OwnerAppointments from "./pages/owner/OwnerAppointments";
import OwnerPatients from "./pages/owner/OwnerPatients";
import OwnerClinicalMaster from "./pages/owner/OwnerClinicalMaster";
import OwnerLabManagement from "./pages/owner/OwnerLabManagement";

import DentistDashboard from "./pages/DentistDashboard";
import DentistDashboardHome from "./pages/dentist/DentistDashboardHome";
import DentistAppointments from "./pages/dentist/DentistAppointments";
import DentistLabSamples from "./pages/dentist/DentistLabSamples";
import DentistProfile from "./pages/dentist/DentistProfile";

import ReceptionistDashboard from "./pages/ReceptionistDashboard";
import ReceptionistDashboardHome from "./pages/receptionist/ReceptionistDashboardHome";
import Patients from "./pages/receptionist/Patients";
import Appointments from "./pages/receptionist/Appointments";
import Billing from "./pages/receptionist/Billing";
import Inventory from "./pages/receptionist/Inventory";
import Profile from "./pages/receptionist/Profile";
import LabSamples from "./pages/receptionist/LabSamples";

import LabDashboard from "./pages/LabDashboard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "sonner";

function App() {
  return (
    <Router>
      <Toaster richColors position="top-right" />
      <Routes>

        {/* AUTH */}
        <Route path="/login" element={<LoginPage />} />

        {/* OWNER */}
        <Route element={<ProtectedRoute role="owner" />}>
          <Route path="/owner-dashboard" element={<OwnerDashboard />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OwnerDashboardHome />} />
            <Route path="appointments" element={<OwnerAppointments />} />
            <Route path="patients" element={<OwnerPatients />} />
            <Route path="clinical-master" element={<OwnerClinicalMaster />} />
            <Route path="lab-management" element={<OwnerLabManagement />} />
          </Route>
        </Route>

        {/* DENTIST */}
        <Route element={<ProtectedRoute role="dentist" />}>
          <Route path="/dentist-dashboard" element={<DentistDashboard />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DentistDashboardHome />} />
            <Route path="appointments" element={<DentistAppointments />} />
            <Route path="lab-samples" element={<DentistLabSamples />} />
            <Route path="profile" element={<DentistProfile />} />

            {/* placeholders for later */}
            <Route path="appointments" element={<div>Appointments</div>} />
            <Route path="patients" element={<div>Patients</div>} />
            <Route path="dental-chart" element={<div>Dental Chart</div>} />
            <Route path="prescriptions" element={<div>Prescriptions</div>} />
            <Route path="lab-samples" element={<div>Lab Samples</div>} />
            <Route path="profile" element={<div>Profile</div>} />
          </Route>
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
            <Route path="lab-samples" element={<LabSamples />} />
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