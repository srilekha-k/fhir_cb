import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import GetPatient from "./pages/patient/GetPatient";
import AddPatient from "./pages/patient/AddPatient";
import ModifyPatient from "./pages/patient/ModifyPatient";
import GetObservation from "./pages/observation/GetObservation";
import AddObservation from "./pages/observation/AddObservation";
import ModifyObservation from "./pages/observation/ModifyObservation";

function useAuthToken() {
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    try { setToken(localStorage.getItem("token")); } finally { setLoading(false); }
  }, []);
  return { token, loading };
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { token, loading } = useAuthToken();
  if (loading) return null; // or a spinner
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Register />} />

      {/* protected */}
      <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/patient/get" element={<RequireAuth><GetPatient /></RequireAuth>} />
      <Route path="/patient/add" element={<RequireAuth><AddPatient /></RequireAuth>} />
      <Route path="/patient/modify" element={<RequireAuth><ModifyPatient /></RequireAuth>} />
      <Route path="/observation/get" element={<RequireAuth><GetObservation /></RequireAuth>} />
      <Route path="/observation/add" element={<RequireAuth><AddObservation /></RequireAuth>} />
      <Route path="/observation/modify" element={<RequireAuth><ModifyObservation /></RequireAuth>} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
