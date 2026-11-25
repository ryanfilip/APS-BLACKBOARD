import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminUsers from '../pages/AdminUsers.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'adm-1', name: 'Adm', role: 'ADMIN' } }),
}));

const users = [
  { id: 'adm-1', name: 'Adm', email: 'adm@x.com', role: 'ADMIN' },
  { id: 'user-1', name: 'Ana', email: 'ana@x.com', role: 'USER' },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>,
  );

describe('AdminUsers', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.patch.mockReset();
  });

  it('lista os usuários e bloqueia a troca do próprio papel', async () => {
    api.get.mockResolvedValue({ data: { users } });

    renderPage();

    expect(await screen.findByText('ana@x.com')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/users');
    expect(screen.getByLabelText('Papel de Adm').disabled).toBe(true);
    expect(screen.getByLabelText('Papel de Ana').disabled).toBe(false);
  });

  it('altera o papel com PATCH /users/:id/role e mostra a confirmação', async () => {
    api.get.mockResolvedValue({ data: { users } });
    api.patch.mockResolvedValue({ data: { user: { ...users[1], role: 'TECH' } } });

    renderPage();
    fireEvent.change(await screen.findByLabelText('Papel de Ana'), { target: { value: 'TECH' } });

    expect((await screen.findByRole('status')).textContent).toMatch('Ana agora é Técnico');
    expect(api.patch).toHaveBeenCalledWith('/users/user-1/role', { role: 'TECH' });
    expect(screen.getByLabelText('Papel de Ana').value).toBe('TECH');
  });
});
