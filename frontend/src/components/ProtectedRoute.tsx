import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, roleHome } from "../auth/AuthContext";
import { PageLoading } from "./Skeleton";
import type { Role } from "../types";

export function ProtectedRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoading label="Checking your session" />;
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return <>{children}</>;
}
