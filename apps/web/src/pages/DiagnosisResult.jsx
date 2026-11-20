import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api.js';

const FINISHED_BY_LABELS = {
  NO_MORE_ACTIONS: 'Análise concluída',
  MAX_ITERATIONS_REACHED: 'Limite de iterações atingido',
};

const POLARITY_LABELS = {
  SUPPORTS: { text: 'Apoia', style: 'bg-emerald-100 text-emerald-800' },
  REFUTES: { text: 'Refuta', style: 'bg-rose-100 text-rose-800' },
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
  const { id } = useParams();
  const navigate = useNavigate();
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api
      .get(`/incidents/${id}/diagnosis`)
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
  }, [id]);

  // Hipóteses da maior para a menor confiança.
  const hypotheses = useMemo(
    () => [...(diagnosis?.state?.hypotheses ?? [])].sort((a, b) => b.confidence - a.confidence),
    [diagnosis],
  );
  const evidences = diagnosis?.state?.evidences ?? [];

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
        <div className="mb-6">{backButton}</div>

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

              {hypotheses.length === 0 && (
                <p className="mt-4 rounded border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-slate-600">
                  Nenhuma hipótese foi gerada para este incidente.
                </p>
              )}

              <div className="mt-4 space-y-4">
                {hypotheses.map((hypothesis, index) => {
                  const related = evidences.filter((evidence) => evidence.supports === hypothesis.id);
                  return (
                    <article key={hypothesis.id} className="rounded-lg bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-500">#{index + 1}</p>
                          <h3 className="font-semibold text-slate-900">{hypothesis.description}</h3>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {hypothesis.source}
                        </span>
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
