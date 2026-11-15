import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

// Placeholder protegido. O diagnóstico (Blackboard) será construído nos Blocos 4–6.
export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow">
        <h1 className="text-xl font-semibold text-slate-900">
          Bem-vindo, {user.name} ({user.role})
        </h1>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 rounded bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-900"
        >
          Sair
        </button>
      </div>
    </main>
  );
}
