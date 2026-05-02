import { Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import Login            from "./pages/Login";
import Layout           from "./components/Layout";
import Dashboard        from "./pages/Dashboard";
import Users            from "./pages/Users";
import UserSegments     from "./pages/UserSegments";
import Payments         from "./pages/Payments";
import RevenueAnalytics from "./pages/RevenueAnalytics";
import BotStats         from "./pages/BotStats";
import BotPerformance   from "./pages/BotPerformance";
import AuditLog         from "./pages/AuditLog";
import BannedIPs        from "./pages/BannedIPs";
import Broadcast        from "./pages/Broadcast";
import SystemConfig     from "./pages/SystemConfig";

const isAuth = () => !!localStorage.getItem("token");

const Private = ({ children }) =>
  isAuth() ? children : <Navigate to="/login" replace />;

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Private><Layout /></Private>}>
          <Route index                  element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"       element={<Dashboard />} />
          <Route path="users"           element={<Users />} />
          <Route path="user-segments"   element={<UserSegments />} />
          <Route path="payments"        element={<Payments />} />
          <Route path="revenue-analytics" element={<RevenueAnalytics />} />
          <Route path="bot-stats"       element={<BotStats />} />
          <Route path="bot-performance" element={<BotPerformance />} />
          <Route path="audit-logs"      element={<AuditLog />} />
          <Route path="banned-ips"      element={<BannedIPs />} />
          <Route path="broadcast"       element={<Broadcast />} />
          <Route path="system-config"   element={<SystemConfig />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
