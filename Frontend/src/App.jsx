import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import OwnerDashboard from "./pages/OwnerDashboard";
import DentistDashboard from './pages/DentistDashboard';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import LabDashboard from './pages/LabDashboard';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

function App() {

  return (
    <>
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/owner-dashboard/*" element={<ProtectedRoute role="owner"><OwnerDashboard /></ProtectedRoute>} />
        <Route path="/dentist-dashboard/*" element={<ProtectedRoute role="dentist"><DentistDashboard /></ProtectedRoute>} />
        <Route path="/receptionist-dashboard/*" element={<ProtectedRoute role="receptionist"><ReceptionistDashboard /></ProtectedRoute>} />
        <Route path="/lab-dashboard/*" element={<ProtectedRoute role="lab"><LabDashboard /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
    </>
  )
}

export default App
