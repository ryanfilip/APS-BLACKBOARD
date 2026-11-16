import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api.js';

const inputClass =
  'mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600';

export default function CreateIncident() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [equipment, setEquipment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/incidents', { title, description, equipment });
      navigate('/dashboard', {
        replace: true,
        state: { successMessage: 'Problema relatado com sucesso! Acompanhe o chamado na lista abaixo.' },
      });
    } catch (err) {
      setError(err.response?.data?.error ?? 'Não foi possível registrar o chamado. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-semibold text-slate-900">Relatar novo problema</h1>
        <p className="mt-1 text-sm text-slate-600">
          Descreva o que está acontecendo para que o chamado possa ser analisado.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700">
              Título
            </label>
            <input
              id="title"
              type="text"
              required
              minLength={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Computador não liga"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="equipment" className="block text-sm font-medium text-slate-700">
              Equipamento
            </label>
            <input
              id="equipment"
              type="text"
              required
              minLength={2}
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="Ex.: Notebook Dell Inspiron"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">
              Descrição
            </label>
            <textarea
              id="description"
              required
              minLength={10}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Conte o que acontece, quando começou e o que você já tentou."
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">Use pelo menos 10 caracteres.</p>
          </div>

          {error && (
            <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-teal-700 px-5 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {submitting ? 'Salvando...' : 'Registrar chamado'}
            </button>
            <Link to="/dashboard" className="text-sm font-medium text-slate-600 hover:underline">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
