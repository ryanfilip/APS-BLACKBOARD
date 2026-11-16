import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncidentList from '../pages/IncidentList.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', () => ({ default: { get: vi.fn() } }));

describe('IncidentList', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('mostra título, equipamento, status em português e o botão "Ver Detalhes"', async () => {
    api.get.mockResolvedValue({
      data: {
        incidents: [
          {
            id: '1',
            title: 'Computador não liga',
            description: 'Nada acontece ao apertar o botão.',
            equipment: 'Desktop Positivo',
            status: 'IN_PROGRESS',
          },
        ],
      },
    });

    render(<IncidentList />);

    expect(await screen.findByText('Computador não liga')).toBeTruthy();
    expect(screen.getByText(/Desktop Positivo/)).toBeTruthy();
    expect(screen.getByText('Em andamento')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver Detalhes' })).toBeTruthy();
  });

  it('mostra mensagem quando não há chamados', async () => {
    api.get.mockResolvedValue({ data: { incidents: [] } });

    render(<IncidentList />);

    expect(await screen.findByText(/ainda não relatou nenhum problema/i)).toBeTruthy();
  });

  it('mostra o erro em português quando a API falha', async () => {
    api.get.mockRejectedValue({ response: { data: { error: 'Token inválido ou expirado' } } });

    render(<IncidentList />);

    expect((await screen.findByRole('alert')).textContent).toBe('Token inválido ou expirado');
  });
});
