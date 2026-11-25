import { Navigate, Route, Routes } from 'react-router-dom';
import AdminUsers from '../pages/AdminUsers.jsx';
import CreateIncident from '../pages/CreateIncident.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import DiagnosisResult from '../pages/DiagnosisResult.jsx';
import IncidentDetails from '../pages/IncidentDetails.jsx';
import Login from '../pages/Login.jsx';
import Register from '../pages/Register.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/incidents/new" element={<CreateIncident />} />
        <Route path="/incidents/:id" element={<IncidentDetails />} />
        <Route path="/incidents/:id/edit" element={<CreateIncident />} />
        <Route path="/incidents/:id/diagnosis" element={<DiagnosisResult />} />
        <Route path="/incidents/:id/diagnoses/:diagnosisId" element={<DiagnosisResult />} />
      </Route>

      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route path="/admin/users" element={<AdminUsers />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
