import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isStaff, ROLE_LABELS } from '../constants/roles.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import IncidentList from './IncidentList.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage] = useState(() => location.state?.successMessage ?? '');

  // Limpa o state da navegação para a mensagem não reaparecer ao recarregar a página.
  useEffect(() => {
    if (location.state?.successMessage) {
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-slate-900">
            Bem-vindo, {user.name} ({ROLE_LABELS[user.role] ?? user.role})
          </h1>
          <div className="flex items-center gap-3">
            {user.role === 'ADMIN' && (
              <Link
                to="/admin/users"
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Gerenciar Usuários
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              Sair
            </button>
          </div>
        </header>

        {successMessage && (
          <p role="status" className="mt-6 rounded bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </p>
        )}

        <Link
          to="/incidents/new"
          className="mt-6 block w-full rounded-lg bg-teal-700 px-6 py-5 text-center text-xl font-semibold text-white shadow hover:bg-teal-800"
        >
          Relatar Novo Problema
        </Link>

        <div className="mt-8">
          <IncidentList staff={isStaff(user.role)} />
        </div>
      </div>
    </main>
  );
}
