import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/vehicles/Vehicles";
import LiveTracking from "./pages/vehicles/LiveTracking";
import Drivers from "./pages/drivers/Drivers";
import Shipments from "./pages/shipments/Shipments";
import ShipmentDetail from "./pages/shipments/ShipmentDetail";
import Trips from "./pages/trips/Trips";
import Maintenance from "./pages/maintenance/Maintenance";
import FuelRecords from "./pages/fuel/FuelRecords";
import Notifications from "./pages/notifications/Notifications";
import Attendance from "./pages/attendance/Attendance";
import UserManagement from "./pages/users/UserManagement";
import Profile from "./pages/users/Profile";
import Reports from "./pages/Reports";

import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {/* PUBLIC */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* PROTECTED */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/live-tracking" element={<LiveTracking />} />

        <Route path="/drivers" element={<Drivers />} />

        <Route path="/shipments" element={<Shipments />} />
        <Route path="/shipments/:id" element={<ShipmentDetail />} />

        <Route path="/trips" element={<Trips />} />

        <Route path="/maintenance" element={<Maintenance />} />

        <Route path="/fuel" element={<FuelRecords />} />

        <Route path="/notifications" element={<Notifications />} />

        <Route path="/attendance" element={<Attendance />} />

        <Route path="/users" element={<UserManagement />} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/reports" element={<Reports />} />
      </Route>

      {/* ROOT */}
      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />

      {/* FALLBACK */}
      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
      </Routes>
    </>
  );
}