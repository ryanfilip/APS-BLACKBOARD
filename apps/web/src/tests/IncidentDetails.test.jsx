import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncidentDetails from '../pages/IncidentDetails.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

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
        <Route path="/dashboard" element={<p>Página da dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('IncidentDetails', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
  });

  it('busca GET /incidents/:id e mostra os dados do chamado', async () => {
    api.get.mockResolvedValue({ data: { incident } });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Computador não liga' })).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/incidents/inc-1');
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
});
