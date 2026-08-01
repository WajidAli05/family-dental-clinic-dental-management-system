import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useClinicConfigStore } from "@/store/clinicConfigStore";

const ProtectedRoute = ({ role }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  // Initialize clinic config once for any authenticated session.
  // Subsequent calls are no-ops (guarded by ready/loading flags in the store).
  const initConfig = useClinicConfigStore((s) => s.init);
  useEffect(() => {
    if (user) initConfig();
  }, [initConfig, user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    switch (user.role) {
      case "owner":
        return <Navigate to="/owner-dashboard" replace />;
      case "dentist":
        return <Navigate to="/dentist-dashboard" replace />;
      case "receptionist":
        return <Navigate to="/receptionist-dashboard" replace />;
      case "lab":
        return <Navigate to="/lab-dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
