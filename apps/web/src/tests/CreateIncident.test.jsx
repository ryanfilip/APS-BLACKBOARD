import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CreateIncident from '../pages/CreateIncident.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', () => ({ default: { post: vi.fn(), get: vi.fn(), put: vi.fn() } }));

describe('CreateIncident', () => {
  it('renderiza os campos Título, Equipamento e Descrição em português', () => {
    render(
      <MemoryRouter>
        <CreateIncident />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Título')).toBeTruthy();
    expect(screen.getByLabelText('Equipamento')).toBeTruthy();
    expect(screen.getByLabelText('Descrição')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Registrar chamado' })).toBeTruthy();
  });

  it('em /incidents/:id/edit, carrega o chamado, salva com PUT e volta para os detalhes', async () => {
    api.get.mockResolvedValue({
      data: { incident: { id: 'inc-1', title: 'Monitor sem imagem', description: 'A tela fica preta o tempo todo.', equipment: 'Monitor LG' } },
    });
    api.put.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter initialEntries={['/incidents/inc-1/edit']}>
        <Routes>
          <Route path="/incidents/:id/edit" element={<CreateIncident />} />
          <Route path="/incidents/:id" element={<p>Página de detalhes</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Monitor sem imagem')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Editar chamado' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Monitor LG sem imagem' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Página de detalhes')).toBeTruthy();
    expect(api.put).toHaveBeenCalledWith('/incidents/inc-1', {
      title: 'Monitor LG sem imagem',
      description: 'A tela fica preta o tempo todo.',
      equipment: 'Monitor LG',
    });
  });
});
