import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge.jsx';
import api from '../services/api.js';

/** `staff` (TECH/ADMIN): a lista é a fila de atendimento com os chamados de todos os usuários. */
export default function IncidentList({ staff = false }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runningId, setRunningId] = useState(null);
  const [runError, setRunError] = useState('');
  const navigate = useNavigate();

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

  async function handleDiagnose(incidentId) {
    setRunError('');
    setRunningId(incidentId);
    try {
      await api.post(`/incidents/${incidentId}/diagnose`);
      navigate(`/incidents/${incidentId}/diagnosis`);
    } catch (err) {
      setRunError(err.response?.data?.error ?? 'Não foi possível executar o diagnóstico. Tente novamente.');
      setRunningId(null);
    }
  }

  return (
    <section aria-labelledby="incident-list-title">
      <h2 id="incident-list-title" className="text-lg font-semibold text-slate-900">
        {staff ? 'Todos os chamados' : 'Meus chamados'}
      </h2>

      {loading && <p className="mt-4 text-slate-500">Carregando chamados...</p>}

      {!loading && error && (
        <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && incidents.length === 0 && (
        <p className="mt-4 rounded border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-slate-600">
          {staff
            ? 'Nenhum chamado foi aberto ainda.'
            : 'Você ainda não relatou nenhum problema. Use o botão acima para registrar o primeiro.'}
        </p>
      )}

      {runError && (
        <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {runError}
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
                {staff && incident.ownerName && (
                  <p className="mt-0.5 text-sm text-slate-600">Relatado por: {incident.ownerName}</p>
                )}
                <StatusBadge status={incident.status} className="mt-2" />
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleDiagnose(incident.id)}
                  disabled={runningId !== null}
                  className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {runningId === incident.id
                    ? 'Executando...'
                    : incident.diagnosisCount > 0
                      ? 'Diagnosticar Novamente'
                      : 'Executar Diagnóstico'}
                </button>
                {incident.diagnosisCount > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate(`/incidents/${incident.id}/diagnosis`)}
                    className="rounded border border-teal-700 px-3 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50"
                  >
                    Ver Diagnóstico
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Ver Detalhes
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
