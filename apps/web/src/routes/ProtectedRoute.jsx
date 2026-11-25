import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

/** `roles` (opcional) restringe a rota a esses papéis; os demais voltam para a dashboard. */
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();

  // Evita redirecionar para /login enquanto a sessão ainda está sendo restaurada.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Carregando sessão...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
