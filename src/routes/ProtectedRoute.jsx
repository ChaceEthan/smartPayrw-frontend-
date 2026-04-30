import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loader from "../components/ui/Loader.jsx";
import { useAuth } from "../hooks/useAuth.js";

export default function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="page-loader">
        <Loader label="Restoring your session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
