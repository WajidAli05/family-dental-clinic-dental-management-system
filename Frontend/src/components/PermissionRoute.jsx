import { Navigate, Outlet, useLocation } from "react-router-dom";
import { usePermissionsStore } from "@/store/permissionsStore";

export default function PermissionRoute({ permKey, fallback }) {
  const location = useLocation();

  const loading = usePermissionsStore((s) => s.loading);
  const rolePermissions = usePermissionsStore((s) => s.rolePermissions);
  const fetchMyPermissions = usePermissionsStore((s) => s.fetchMyPermissions);
  const canAccessTab = usePermissionsStore((s) => s.canAccessTab);

  // If permissions not loaded yet, attempt load once (fail-open if it fails)
  if (!loading && rolePermissions === null) {
    fetchMyPermissions?.();
  }

  if (loading) return null; // or a spinner component

  const ok = canAccessTab(permKey);
  if (!ok) {
    return (
      <Navigate
        to={fallback || "/login"}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}