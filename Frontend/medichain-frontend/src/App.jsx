
import "./App.css";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import PatientLogin from "./pages/PatientLogin";

import AdminDashboard from "./pages/AdminDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import TeamDashboard from "./pages/TeamDashboard";
import PatientDashboard from "./pages/PatientDashboard";

function AppRoutes() {
  return (
    <Routes>

      {/* Public Login Pages */}
      <Route path="/login" element={<Login />} />

      <Route
        path="/patient-login"
        element={<PatientLogin />}
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Doctor */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRoles={["DOCTOR"]}>
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />

      {/* Team */}
      <Route
        path="/team"
        element={
          <ProtectedRoute allowedRoles={["TEAM"]}>
            <TeamDashboard />
          </ProtectedRoute>
        }
      />

      {/* Patient */}
      <Route
        path="/patient"
        element={
          <ProtectedRoute allowedRoles={["PATIENT"]}>
            <PatientDashboard />
          </ProtectedRoute>
        }
      />

      {/* Default */}
      <Route
        path="/"
        element={<Navigate to="/patient-login" replace />}
      />

      <Route
        path="*"
        element={<Navigate to="/patient-login" replace />}
      />

    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
