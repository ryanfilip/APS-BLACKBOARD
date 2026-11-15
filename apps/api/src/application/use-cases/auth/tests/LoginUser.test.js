import { describe, it, expect, vi } from 'vitest';
import { LoginUser } from '../LoginUser.js';
import { InvalidCredentialsError } from '../../../../domain/errors/DomainErrors.js';

function build({ user = null, matches = true } = {}) {
  const userRepository = { findByEmail: vi.fn().mockResolvedValue(user) };
  const hashService = { compare: vi.fn().mockResolvedValue(matches) };
  const tokenService = { sign: vi.fn().mockReturnValue('jwt-token') };
  return { useCase: new LoginUser({ userRepository, hashService, tokenService }), tokenService };
}

const storedUser = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@exemplo.com',
  passwordHash: 'hash',
  role: 'TECH',
};

describe('LoginUser', () => {
  it('lança InvalidCredentialsError quando o usuário não existe', async () => {
    const { useCase } = build({ user: null });
    await expect(useCase.execute({ email: 'a@a.com', password: '123456' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('lança InvalidCredentialsError quando a senha não confere', async () => {
    const { useCase } = build({ user: storedUser, matches: false });
    await expect(
      useCase.execute({ email: 'ana@exemplo.com', password: 'errada' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('retorna { user, token } com credenciais corretas', async () => {
    const { useCase, tokenService } = build({ user: storedUser });
    const result = await useCase.execute({ email: 'ana@exemplo.com', password: '123456' });

    expect(result.token).toBe('jwt-token');
    expect(result.user).toEqual({ id: 'u1', name: 'Ana', email: 'ana@exemplo.com', role: 'TECH' });
    expect(tokenService.sign).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'ana@exemplo.com',
      role: 'TECH',
    });
  });
});
