import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Login from '../pages/Login.jsx';

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: null, loading: false, login: vi.fn() }),
}));

describe('Login', () => {
  it('renderiza os campos de e-mail e senha', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/e-mail/i)).toBeTruthy();
    expect(screen.getByLabelText(/senha/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeTruthy();
  });
});
