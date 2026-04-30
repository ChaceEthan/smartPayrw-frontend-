import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout.jsx";
import Loader from "../components/ui/Loader.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";

const AIChat = lazy(() => import("../pages/AIChat.jsx"));
const Dashboard = lazy(() => import("../pages/Dashboard.jsx"));
const Employees = lazy(() => import("../pages/Employees.jsx"));
const Login = lazy(() => import("../pages/auth/Login.jsx"));
const Payments = lazy(() => import("../pages/Payments.jsx"));
const Payroll = lazy(() => import("../pages/Payroll.jsx"));
const Register = lazy(() => import("../pages/auth/Register.jsx"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="page-loader"><Loader /></div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/ai-chat" element={<AIChat />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
