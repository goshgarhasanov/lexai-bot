import { Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import Login     from "./pages/Login";
import Layout    from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Users     from "./pages/Users";
import Payments  from "./pages/Payments";
import BotStats  from "./pages/BotStats";
import AuditLog  from "./pages/AuditLog";
import BannedIPs from "./pages/BannedIPs";

const isAuth = () => !!localStorage.getItem("token");

const Private = ({ children }) =>
  isAuth() ? children : <Navigate to="/login" replace />;

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Private><Layout /></Private>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="users"      element={<Users />} />
          <Route path="payments"   element={<Payments />} />
          <Route path="bot-stats"  element={<BotStats />} />
          <Route path="audit-logs" element={<AuditLog />} />
          <Route path="banned-ips" element={<BannedIPs />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
