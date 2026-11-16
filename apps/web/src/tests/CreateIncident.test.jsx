import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CreateIncident from '../pages/CreateIncident.jsx';

vi.mock('../services/api.js', () => ({ default: { post: vi.fn() } }));

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
});
