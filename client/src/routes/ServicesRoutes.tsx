import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/authContext";

export default function ServicesRoutes() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role === "superadmin" || user.company === "cana_services") return <Outlet />;
  return <Navigate to={user.role === "customer" ? "/dashboard" : "/management"} replace />;
}
