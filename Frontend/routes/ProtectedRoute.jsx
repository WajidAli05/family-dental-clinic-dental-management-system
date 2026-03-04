// routes/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUserStore } from "@/store/userStore";

export default function ProtectedRoute({ role }) {
  const location = useLocation();
  const { token, currentUser } = useUserStore();

  // ✅ ALWAYS validate from persisted storage too (covers refresh/back edge cases)
  const storedToken = token || localStorage.getItem("token");

  let storedUser = currentUser;
  if (!storedUser) {
    try {
      storedUser = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      storedUser = null;
    }
  }

  // ✅ Not authenticated
  if (!storedToken || !storedUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ✅ Role protected
  if (role && storedUser.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}