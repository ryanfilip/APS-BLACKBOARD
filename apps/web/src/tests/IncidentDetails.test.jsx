import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncidentDetails from '../pages/IncidentDetails.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const authState = vi.hoisted(() => ({ user: { id: 'user-1', name: 'Ana', role: 'USER' } }));
vi.mock('../contexts/AuthContext.jsx', () => ({ useAuth: () => authState }));

const incident = {
  id: 'inc-1',
  title: 'Computador não liga',
  description: 'Nada acontece ao apertar o botão.',
  equipment: 'Desktop Positivo',
  status: 'OPEN',
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/incidents/inc-1']}>
      <Routes>
        <Route path="/incidents/:id" element={<IncidentDetails />} />
        <Route path="/incidents/:id/diagnosis" element={<p>Página do diagnóstico</p>} />
        <Route path="/incidents/:id/diagnoses/:diagnosisId" element={<p>Diagnóstico antigo</p>} />
        <Route path="/dashboard" element={<p>Página da dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('IncidentDetails', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();
    authState.user = { id: 'user-1', name: 'Ana', role: 'USER' };
  });

  it('busca GET /incidents/:id e mostra os dados do chamado', async () => {
    api.get.mockResolvedValue({ data: { incident } });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Computador não liga' })).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/incidents/inc-1');
    expect(api.get).toHaveBeenCalledWith('/incidents/inc-1/diagnoses');
    expect(screen.getByText('Desktop Positivo')).toBeTruthy();
    expect(screen.getByText('Nada acontece ao apertar o botão.')).toBeTruthy();
    expect(screen.getByText('Aberto')).toBeTruthy();
  });

  it('mostra o erro da API em português', async () => {
    api.get.mockRejectedValue({ response: { data: { error: 'Incidente não encontrado' } } });

    renderPage();

    expect((await screen.findByRole('alert')).textContent).toBe('Incidente não encontrado');
  });

  it('Executar Diagnóstico chama a API e vai para a tela do diagnóstico', async () => {
    api.get.mockResolvedValue({ data: { incident } });
    api.post.mockResolvedValue({ data: { diagnosis: { id: 'diag-1' } } });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Executar Diagnóstico' }));

    expect(await screen.findByText('Página do diagnóstico')).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/incidents/inc-1/diagnose');
  });

  it('Voltar leva para a dashboard', async () => {
    api.get.mockResolvedValue({ data: { incident } });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Voltar para a Dashboard' }));

    expect(await screen.findByText('Página da dashboard')).toBeTruthy();
  });

  describe('Atendimento (TECH/ADMIN)', () => {
    it('USER não vê as ações de status', async () => {
      api.get.mockResolvedValue({ data: { incident } });

      renderPage();
      await screen.findByRole('heading', { name: 'Computador não liga' });

      expect(screen.queryByRole('button', { name: 'Assumir chamado' })).toBeNull();
    });

    it('TECH assume o chamado: PATCH /status e o badge muda para "Em andamento"', async () => {
      authState.user = { id: 'tech-1', name: 'Téo', role: 'TECH' };
      api.get.mockResolvedValue({ data: { incident } });
      api.patch.mockResolvedValue({ data: { incident: { ...incident, status: 'IN_PROGRESS' } } });

      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Assumir chamado' }));

      expect(await screen.findByRole('button', { name: 'Marcar como resolvido' })).toBeTruthy();
      expect(api.patch).toHaveBeenCalledWith('/incidents/inc-1/status', { status: 'IN_PROGRESS' });
      expect(screen.getByRole('button', { name: 'Devolver para a fila' })).toBeTruthy();
    });

    it('mostra o erro da API quando a transição é recusada', async () => {
      authState.user = { id: 'adm-1', name: 'Adm', role: 'ADMIN' };
      api.get.mockResolvedValue({ data: { incident } });
      api.patch.mockRejectedValue({ response: { data: { error: 'Mudança de status não permitida' } } });

      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Assumir chamado' }));

      expect((await screen.findByRole('alert')).textContent).toBe('Mudança de status não permitida');
    });
  });

  describe('Histórico de diagnósticos', () => {
    const history = [
      { id: 'diag-2', createdAt: '2026-11-21T10:00:00.000Z', iterations: 2, finishedBy: 'NO_MORE_ACTIONS', hypothesisCount: 4, confirmedCount: 1, topHypothesis: { description: 'Perda de pacotes na rede', confidence: 60 } },
      { id: 'diag-1', createdAt: '2026-11-20T10:00:00.000Z', iterations: 1, finishedBy: 'NO_MORE_ACTIONS', hypothesisCount: 2, confirmedCount: 0, topHypothesis: null },
    ];
    const mockGet = (diagnoses) =>
      api.get.mockImplementation((url) =>
        Promise.resolve({ data: url.endsWith('/diagnoses') ? { diagnoses } : { incident } }),
      );

    it('lista os diagnósticos anteriores e abre um específico', async () => {
      mockGet(history);

      renderPage();

      expect(await screen.findByText('Principal: Perda de pacotes na rede (60%)')).toBeTruthy();
      expect(screen.getByText('(mais recente)')).toBeTruthy();
      expect(screen.getByText(/1 confirmada/)).toBeTruthy();
      const buttons = screen.getAllByRole('button', { name: /^Abrir diagnóstico/ });
      expect(buttons).toHaveLength(2);
      fireEvent.click(buttons[1]);

      expect(await screen.findByText('Diagnóstico antigo')).toBeTruthy();
    });

    it('sem diagnósticos, mostra o aviso', async () => {
      mockGet([]);

      renderPage();

      expect(await screen.findByText('Este chamado ainda não foi diagnosticado.')).toBeTruthy();
    });
  });
});
