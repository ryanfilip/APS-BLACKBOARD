import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isStaff } from '../constants/roles.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../services/api.js';

const FINISHED_BY_LABELS = {
  NO_MORE_ACTIONS: 'Análise concluída',
  MAX_ITERATIONS_REACHED: 'Limite de iterações atingido',
};

const POLARITY_LABELS = {
  SUPPORTS: { text: 'Apoia', style: 'bg-emerald-100 text-emerald-800' },
  REFUTES: { text: 'Refuta', style: 'bg-rose-100 text-rose-800' },
};

const HYPOTHESIS_STATUS = {
  OPEN: { text: 'Em análise', style: 'bg-slate-100 text-slate-700' },
  CONFIRMED: { text: 'Confirmada', style: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { text: 'Descartada', style: 'bg-rose-100 text-rose-800' },
};

/** Ações do técnico sobre uma hipótese, conforme o status atual. */
const REVIEW_ACTIONS = {
  OPEN: [
    { to: 'CONFIRMED', label: 'Confirmar', style: 'bg-emerald-700 text-white hover:bg-emerald-800' },
    { to: 'REJECTED', label: 'Descartar', style: 'bg-rose-700 text-white hover:bg-rose-800' },
  ],
  CONFIRMED: [{ to: 'OPEN', label: 'Reabrir', style: 'border border-slate-300 text-slate-700 hover:bg-slate-50' }],
  REJECTED: [{ to: 'OPEN', label: 'Reabrir', style: 'border border-slate-300 text-slate-700 hover:bg-slate-50' }],
};

function StatTile({ label, value }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ConfidenceBar({ value, label }) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={`Confiança: ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${value}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-semibold text-teal-800">{value}%</span>
    </div>
  );
}

export default function DiagnosisResult() {
  // Sem diagnosisId, mostra o diagnóstico mais recente do incidente.
  const { id, diagnosisId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const staff = isStaff(user?.role);
  const [diagnosis, setDiagnosis] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const url = diagnosisId ? `/incidents/${id}/diagnoses/${diagnosisId}` : `/incidents/${id}/diagnosis`;
    api
      .get(url)
      .then(({ data }) => {
        if (!cancelled) setDiagnosis(data.diagnosis);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error ?? 'Não foi possível carregar o diagnóstico.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, diagnosisId]);

  // Hipóteses da maior para a menor confiança.
  const hypotheses = useMemo(
    () => [...(diagnosis?.state?.hypotheses ?? [])].sort((a, b) => b.confidence - a.confidence),
    [diagnosis],
  );
  const evidences = diagnosis?.state?.evidences ?? [];

  async function handleReview(hypothesisId, status) {
    setReviewError('');
    setReviewingId(hypothesisId);
    try {
      const { data } = await api.patch(
        `/incidents/${id}/diagnoses/${diagnosis.id}/hypotheses/${hypothesisId}`,
        { status },
      );
      setDiagnosis(data.diagnosis);
    } catch (err) {
      setReviewError(err.response?.data?.error ?? 'Não foi possível revisar a hipótese.');
    } finally {
      setReviewingId(null);
    }
  }

  const backButton = (
    <button
      type="button"
      onClick={() => navigate('/dashboard')}
      className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Voltar para a Dashboard
    </button>
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex flex-wrap gap-3">
          {backButton}
          <button
            type="button"
            onClick={() => navigate(`/incidents/${id}`)}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ver chamado e histórico
          </button>
        </div>

        {loading && <p className="text-slate-500">Carregando diagnóstico...</p>}

        {!loading && error && (
          <p role="alert" className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && diagnosis && (
          <>
            <header>
              <p className="text-sm font-medium uppercase tracking-wide text-teal-700">Diagnóstico</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">{diagnosis.state.incident.title}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Equipamento: {diagnosis.state.incident.equipment} · Executado em{' '}
                {new Date(diagnosis.createdAt).toLocaleString('pt-BR')}
              </p>
            </header>

            <section aria-label="Resumo do diagnóstico" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Hipóteses" value={hypotheses.length} />
              <StatTile label="Evidências" value={evidences.length} />
              <StatTile label="Iterações" value={diagnosis.iterations} />
              <StatTile label="Situação" value={FINISHED_BY_LABELS[diagnosis.finishedBy] ?? diagnosis.finishedBy} />
            </section>

            <section aria-labelledby="hypotheses-title" className="mt-8">
              <h2 id="hypotheses-title" className="text-lg font-semibold text-slate-900">
                Hipóteses
              </h2>
              {staff && (
                <p className="mt-1 text-sm text-slate-600">
                  Como técnico, confirme ou descarte cada hipótese. A revisão é registrada no quadro como evidência.
                </p>
              )}

              {reviewError && (
                <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  {reviewError}
                </p>
              )}

              {hypotheses.length === 0 && (
                <p className="mt-4 rounded border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-slate-600">
                  Nenhuma hipótese foi gerada para este incidente.
                </p>
              )}

              <div className="mt-4 space-y-4">
                {hypotheses.map((hypothesis, index) => {
                  const related = evidences.filter((evidence) => evidence.supports === hypothesis.id);
                  const status = HYPOTHESIS_STATUS[hypothesis.status] ?? HYPOTHESIS_STATUS.OPEN;
                  return (
                    <article
                      key={hypothesis.id}
                      className={`rounded-lg bg-white p-5 shadow-sm ${hypothesis.status === 'REJECTED' ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-500">#{index + 1}</p>
                          <h3 className="font-semibold text-slate-900">{hypothesis.description}</h3>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {hypothesis.source}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.style}`}>
                            {status.text}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <ConfidenceBar value={hypothesis.confidence} label={hypothesis.description} />
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-slate-700">Evidências ({related.length})</h4>
                        {related.length === 0 ? (
                          <p className="mt-1 text-sm text-slate-500">Nenhuma evidência registrada.</p>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {related.map((evidence) => {
                              const polarity = POLARITY_LABELS[evidence.polarity];
                              return (
                                <li key={evidence.id} className="flex items-center gap-2 text-sm text-slate-700">
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                                      polarity?.style ?? 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {polarity?.text ?? evidence.polarity}
                                  </span>
                                  <span>{evidence.description}</span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      {hypothesis.reviewedBy && (
                        <p className="mt-3 text-xs text-slate-500">
                          Revisada por {hypothesis.reviewedBy}
                          {hypothesis.reviewedAt && ` em ${new Date(hypothesis.reviewedAt).toLocaleString('pt-BR')}`}
                        </p>
                      )}

                      {staff && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(REVIEW_ACTIONS[hypothesis.status] ?? REVIEW_ACTIONS.OPEN).map((action) => (
                            <button
                              key={action.to}
                              type="button"
                              aria-label={`${action.label}: ${hypothesis.description}`}
                              onClick={() => handleReview(hypothesis.id, action.to)}
                              disabled={reviewingId !== null}
                              className={`rounded px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${action.style}`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
