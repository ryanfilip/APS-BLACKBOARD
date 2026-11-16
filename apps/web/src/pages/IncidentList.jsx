import { useEffect, useState } from 'react';
import api from '../services/api.js';

const STATUS_LABELS = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  RESOLVED: 'Resolvido',
};

const STATUS_STYLES = {
  OPEN: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-sky-100 text-sky-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
};

export default function IncidentList() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    api
      .get('/incidents')
      .then(({ data }) => {
        if (!cancelled) setIncidents(data.incidents);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error ?? 'Não foi possível carregar seus chamados.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-labelledby="incident-list-title">
      <h2 id="incident-list-title" className="text-lg font-semibold text-slate-900">
        Meus chamados
      </h2>

      {loading && <p className="mt-4 text-slate-500">Carregando chamados...</p>}

      {!loading && error && (
        <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && incidents.length === 0 && (
        <p className="mt-4 rounded border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-slate-600">
          Você ainda não relatou nenhum problema. Use o botão acima para registrar o primeiro.
        </p>
      )}

      {!loading && !error && incidents.length > 0 && (
        <ul className="mt-4 space-y-3">
          {incidents.map((incident) => (
            <li
              key={incident.id}
              className="flex items-center justify-between gap-4 rounded-lg bg-white p-4 shadow-sm"
            >
              <div className="min-w-0">
                <h3 className="truncate font-medium text-slate-900">{incident.title}</h3>
                <p className="mt-0.5 text-sm text-slate-600">Equipamento: {incident.equipment}</p>
                <span
                  className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[incident.status] ?? 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {STATUS_LABELS[incident.status] ?? incident.status}
                </span>
              </div>

              {/* Placeholder: a tela de detalhes será implementada em um bloco futuro. */}
              <button
                type="button"
                className="shrink-0 rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Ver Detalhes
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
