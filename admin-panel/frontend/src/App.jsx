import { Routes, Route, Navigate } from "react-router-dom";
import Login    from "./pages/Login";
import Layout   from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Users    from "./pages/Users";
import Payments from "./pages/Payments";

const isAuth = () => !!localStorage.getItem("token");

const Private = ({ children }) =>
  isAuth() ? children : <Navigate to="/login" replace />;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Private><Layout /></Private>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users"     element={<Users />} />
        <Route path="payments"  element={<Payments />} />
      </Route>
    </Routes>
  );
}
