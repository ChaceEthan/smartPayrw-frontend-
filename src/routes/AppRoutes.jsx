import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout.jsx";
import Loader from "../components/ui/Loader.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";

const AIChat = lazy(() => import("../pages/AIChat.jsx"));
const Admin = lazy(() => import("../pages/Admin.jsx"));
const AdminCompanies = lazy(() => import("../pages/AdminCompanies.jsx"));
const Business = lazy(() => import("../pages/Business.jsx"));
const Company = lazy(() => import("../pages/Company.jsx"));
const Dashboard = lazy(() => import("../pages/Dashboard.jsx"));
const Employees = lazy(() => import("../pages/Employees.jsx"));
const Login = lazy(() => import("../pages/auth/Login.jsx"));
const MyCompany = lazy(() => import("../pages/MyCompany.jsx"));
const Payments = lazy(() => import("../pages/Payments.jsx"));
const Pension = lazy(() => import("../pages/Pension.jsx"));
const Payroll = lazy(() => import("../pages/Payroll.jsx"));
const Reports = lazy(() => import("../pages/Reports.jsx"));
const Register = lazy(() => import("../pages/auth/Register.jsx"));
const TaxDashboard = lazy(() => import("../pages/TaxDashboard.jsx"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="page-loader"><Loader /></div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/company" element={<Company />} />
            <Route path="/my-company" element={<MyCompany />} />
            <Route path="/tax-dashboard" element={<TaxDashboard />} />
            <Route path="/business" element={<Business />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/pension" element={<Pension />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/companies" element={<AdminCompanies />} />
            <Route path="/ai-chat" element={<AIChat />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
