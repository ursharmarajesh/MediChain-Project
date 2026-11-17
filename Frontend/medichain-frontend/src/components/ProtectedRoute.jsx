
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  allowedRoles,
  children,
}) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(user?.role)
  ) {
    const routes = {
      ADMIN: "/admin",
      DOCTOR: "/doctor",
      TEAM: "/team",
      PATIENT: "/patient",
    };

    return (
      <Navigate
        to={routes[user?.role] || "/login"}
        replace
      />
    );
  }

  return children;
}
