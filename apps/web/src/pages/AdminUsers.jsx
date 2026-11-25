import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '../constants/roles.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../services/api.js';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    api
      .get('/users')
      .then(({ data }) => {
        if (!cancelled) setUsers(data.users);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error ?? 'Não foi possível carregar os usuários.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRoleChange(target, role) {
    setError('');
    setMessage('');
    setSavingId(target.id);
    try {
      const { data } = await api.patch(`/users/${target.id}/role`, { role });
      setUsers((current) => current.map((u) => (u.id === target.id ? data.user : u)));
      setMessage(`${target.name} agora é ${ROLE_LABELS[role]}. O novo papel vale a partir do próximo login.`);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Não foi possível alterar o papel.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Voltar para a Dashboard
        </button>

        <h1 className="mt-6 text-2xl font-semibold text-slate-900">Gerenciar usuários</h1>
        <p className="mt-1 text-sm text-slate-600">
          Defina quem é Usuário, Técnico (atende os chamados) ou Administrador.
        </p>

        {loading && <p className="mt-6 text-slate-500">Carregando usuários...</p>}

        {error && (
          <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="mt-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </p>
        )}

        {!loading && users.length > 0 && (
          <ul className="mt-6 divide-y divide-slate-200 rounded-lg bg-white shadow-sm">
            {users.map((u) => {
              const isSelf = u.id === currentUser.id;
              return (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {u.name} {isSelf && <span className="text-xs font-normal text-slate-500">(você)</span>}
                    </p>
                    <p className="text-sm text-slate-600">{u.email}</p>
                  </div>
                  <select
                      aria-label={`Papel de ${u.name}`}
                      value={u.role}
                      disabled={isSelf || savingId !== null}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1.5 disabled:bg-slate-100"
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
