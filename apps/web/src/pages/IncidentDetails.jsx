import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StatusBadge, { STATUS_LABELS } from '../components/StatusBadge.jsx';
import { isStaff, STATUS_ACTIONS } from '../constants/roles.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../services/api.js';

const formatDate = (value) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

const FINISHED_BY_LABELS = {
  NO_MORE_ACTIONS: 'Análise concluída',
  MAX_ITERATIONS_REACHED: 'Limite de iterações atingido',
};

export default function IncidentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const staff = isStaff(user?.role);
  const [incident, setIncident] = useState(null);
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    // O histórico é complementar: se falhar, a página continua mostrando o chamado.
    api
      .get(`/incidents/${id}/diagnoses`)
      .then(({ data }) => {
        if (!cancelled) setDiagnoses(data.diagnoses ?? []);
      })
      .catch(() => {});

    api
      .get(`/incidents/${id}`)
      .then(({ data }) => {
        if (!cancelled) setIncident(data.incident);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error ?? 'Não foi possível carregar o chamado.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDiagnose() {
    setActionError('');
    setRunning(true);
    try {
      await api.post(`/incidents/${id}/diagnose`);
      navigate(`/incidents/${id}/diagnosis`);
    } catch (err) {
      setActionError(err.response?.data?.error ?? 'Não foi possível executar o diagnóstico. Tente novamente.');
      setRunning(false);
    }
  }

  async function handleStatusChange(status) {
    setActionError('');
    setMessage('');
    setBusy(true);
    try {
      const { data } = await api.patch(`/incidents/${id}/status`, { status });
      setIncident((current) => ({ ...current, ...data.incident }));
      setMessage(`Status alterado para "${STATUS_LABELS[status]}".`);
    } catch (err) {
      setActionError(err.response?.data?.error ?? 'Não foi possível alterar o status.');
    } finally {
      setBusy(false);
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

        {loading && <p className="mt-6 text-slate-500">Carregando chamado...</p>}

        {!loading && error && (
          <p role="alert" className="mt-6 rounded bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && incident && (
          <>
            <article className="mt-6 rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium uppercase tracking-wide text-teal-700">Chamado</p>
                  <h1 className="mt-1 text-2xl font-semibold text-slate-900">{incident.title}</h1>
                </div>
                <StatusBadge status={incident.status} className="shrink-0" />
              </div>

              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-500">Equipamento</dt>
                  <dd className="mt-0.5 text-slate-900">{incident.equipment}</dd>
                </div>
                {incident.ownerName && (
                  <div>
                    <dt className="font-medium text-slate-500">Relatado por</dt>
                    <dd className="mt-0.5 text-slate-900">{incident.ownerName}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-medium text-slate-500">Aberto em</dt>
                  <dd className="mt-0.5 text-slate-900">{formatDate(incident.createdAt)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Última atualização</dt>
                  <dd className="mt-0.5 text-slate-900">{formatDate(incident.updatedAt)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-slate-500">Descrição</dt>
                  <dd className="mt-0.5 whitespace-pre-line text-slate-900">{incident.description}</dd>
                </div>
              </dl>
            </article>

            <section aria-labelledby="history-title" className="mt-4 rounded-lg bg-white p-5 shadow-sm">
              <h2 id="history-title" className="font-semibold text-slate-900">
                Histórico de diagnósticos
              </h2>
              {diagnoses.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">Este chamado ainda não foi diagnosticado.</p>
              ) : (
                <ol className="mt-3 divide-y divide-slate-100">
                  {diagnoses.map((diagnosis, index) => (
                    <li key={diagnosis.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0 text-sm">
                        <p className="font-medium text-slate-900">
                          {formatDate(diagnosis.createdAt)}
                          {index === 0 && <span className="ml-2 text-xs font-normal text-teal-700">(mais recente)</span>}
                        </p>
                        <p className="text-slate-600">
                          {diagnosis.hypothesisCount} hipótese(s) · {diagnosis.iterations} iteração(ões) ·{' '}
                          {FINISHED_BY_LABELS[diagnosis.finishedBy] ?? diagnosis.finishedBy}
                          {diagnosis.confirmedCount > 0 && ` · ${diagnosis.confirmedCount} confirmada(s)`}
                        </p>
                        {diagnosis.topHypothesis && (
                          <p className="text-slate-600">
                            Principal: {diagnosis.topHypothesis.description} ({diagnosis.topHypothesis.confidence}%)
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`Abrir diagnóstico de ${formatDate(diagnosis.createdAt)}`}
                        onClick={() => navigate(`/incidents/${id}/diagnoses/${diagnosis.id}`)}
                        className="rounded border border-teal-700 px-3 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50"
                      >
                        Abrir
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {staff && (
              <section aria-labelledby="attendance-title" className="mt-4 rounded-lg bg-white p-5 shadow-sm">
                <h2 id="attendance-title" className="font-semibold text-slate-900">
                  Atendimento
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Status atual: <strong>{STATUS_LABELS[incident.status]}</strong>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(STATUS_ACTIONS[incident.status] ?? []).map((action) => (
                    <button
                      key={action.to}
                      type="button"
                      onClick={() => handleStatusChange(action.to)}
                      disabled={busy}
                      className="rounded bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {message && (
              <p role="status" className="mt-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {message}
              </p>
            )}

            {actionError && (
              <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {actionError}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDiagnose}
                disabled={running}
                className="rounded bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {running ? 'Executando...' : incident.diagnosisCount > 0 ? 'Diagnosticar Novamente' : 'Executar Diagnóstico'}
              </button>
              {incident.diagnosisCount > 0 && (
                <button
                  type="button"
                  onClick={() => navigate(`/incidents/${id}/diagnosis`)}
                  className="rounded border border-teal-700 bg-white px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50"
                >
                  Ver Diagnóstico
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
