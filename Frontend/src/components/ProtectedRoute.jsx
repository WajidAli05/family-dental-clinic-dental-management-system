import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({ role }) => {
  const user = JSON.parse(localStorage.getItem("user"));

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