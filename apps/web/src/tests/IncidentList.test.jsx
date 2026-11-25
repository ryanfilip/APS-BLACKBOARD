import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncidentList from '../pages/IncidentList.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const incident = {
  id: '1',
  title: 'Computador não liga',
  description: 'Nada acontece ao apertar o botão.',
  equipment: 'Desktop Positivo',
  status: 'IN_PROGRESS',
};

function renderList() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<IncidentList />} />
        <Route path="/incidents/:id" element={<p>Página de detalhes</p>} />
        <Route path="/incidents/:id/diagnosis" element={<p>Página do diagnóstico</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('IncidentList', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
  });

  it('mostra título, equipamento, status em português e os botões do card', async () => {
    api.get.mockResolvedValue({ data: { incidents: [incident] } });

    renderList();

    expect(await screen.findByText('Computador não liga')).toBeTruthy();
    expect(screen.getByText(/Desktop Positivo/)).toBeTruthy();
    expect(screen.getByText('Em andamento')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver Detalhes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Executar Diagnóstico' })).toBeTruthy();
  });

  it('Ver Detalhes leva para a página do chamado', async () => {
    api.get.mockResolvedValue({ data: { incidents: [incident] } });

    renderList();
    fireEvent.click(await screen.findByRole('button', { name: 'Ver Detalhes' }));

    expect(await screen.findByText('Página de detalhes')).toBeTruthy();
  });

  it('sem diagnóstico, não mostra "Ver Diagnóstico"', async () => {
    api.get.mockResolvedValue({ data: { incidents: [{ ...incident, diagnosisCount: 0 }] } });

    renderList();

    expect(await screen.findByRole('button', { name: 'Executar Diagnóstico' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ver Diagnóstico' })).toBeNull();
  });

  it('com diagnóstico, mostra "Ver Diagnóstico" (que abre o último) e "Diagnosticar Novamente"', async () => {
    api.get.mockResolvedValue({ data: { incidents: [{ ...incident, diagnosisCount: 2 }] } });

    renderList();
    expect(await screen.findByRole('button', { name: 'Diagnosticar Novamente' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ver Diagnóstico' }));

    expect(await screen.findByText('Página do diagnóstico')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('mostra mensagem quando não há chamados', async () => {
    api.get.mockResolvedValue({ data: { incidents: [] } });

    renderList();

    expect(await screen.findByText(/ainda não relatou nenhum problema/i)).toBeTruthy();
  });

  it('mostra o erro em português quando a API falha', async () => {
    api.get.mockRejectedValue({ response: { data: { error: 'Token inválido ou expirado' } } });

    renderList();

    expect((await screen.findByRole('alert')).textContent).toBe('Token inválido ou expirado');
  });

  describe('Executar Diagnóstico', () => {
    it('chama POST /incidents/:id/diagnose e, com sucesso, vai para /incidents/:id/diagnosis', async () => {
      api.get.mockResolvedValue({ data: { incidents: [incident] } });
      api.post.mockResolvedValue({ data: { diagnosis: { id: 'diag-1' } } });

      renderList();
      fireEvent.click(await screen.findByRole('button', { name: 'Executar Diagnóstico' }));

      expect(await screen.findByText('Página do diagnóstico')).toBeTruthy();
      expect(api.post).toHaveBeenCalledWith('/incidents/1/diagnose');
    });

    it('enquanto executa, mostra "Executando..." e desabilita o botão', async () => {
      api.get.mockResolvedValue({ data: { incidents: [incident] } });
      api.post.mockReturnValue(new Promise(() => {}));

      renderList();
      fireEvent.click(await screen.findByRole('button', { name: 'Executar Diagnóstico' }));

      const running = await screen.findByRole('button', { name: 'Executando...' });
      expect(running.disabled).toBe(true);
    });

    it('em caso de falha, mostra o erro em português e permanece na lista', async () => {
      api.get.mockResolvedValue({ data: { incidents: [incident] } });
      api.post.mockRejectedValue({ response: { data: { error: 'Incidente não encontrado' } } });

      renderList();
      fireEvent.click(await screen.findByRole('button', { name: 'Executar Diagnóstico' }));

      expect((await screen.findByRole('alert')).textContent).toBe('Incidente não encontrado');
      expect(screen.queryByText('Página do diagnóstico')).toBeNull();
      await waitFor(() => expect(screen.getByRole('button', { name: 'Executar Diagnóstico' }).disabled).toBe(false));
    });
  });
});
