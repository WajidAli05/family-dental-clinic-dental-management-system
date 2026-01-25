import { Navigate, Outlet } from "react-router-dom";
import { useUserStore } from "@/store/userStore";

export default function ProtectedRoute({ role }) {
  const { token, currentUser } = useUserStore();

  if (!token || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (role && currentUser.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}