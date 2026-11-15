import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterUser } from '../RegisterUser.js';
import { EmailAlreadyExistsError, ValidationError } from '../../../../domain/errors/DomainErrors.js';

describe('RegisterUser', () => {
  let userRepository;
  let hashService;
  let tokenService;
  let registerUser;

  beforeEach(() => {
    userRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn(),
      create: vi.fn(async (user) => ({ ...user, id: 'user-1', role: user.role })),
    };
    hashService = {
      hash: vi.fn().mockResolvedValue('hashed-password'),
      compare: vi.fn(),
    };
    tokenService = {
      sign: vi.fn().mockReturnValue('jwt-token'),
      verify: vi.fn(),
    };
    registerUser = new RegisterUser({ userRepository, hashService, tokenService });
  });

  it('lança EmailAlreadyExistsError quando o e-mail já está cadastrado', async () => {
    userRepository.findByEmail.mockResolvedValue({ id: 'x', email: 'ana@exemplo.com' });

    await expect(
      registerUser.execute({ name: 'Ana', email: 'ana@exemplo.com', password: '123456' }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('lança ValidationError quando a senha tem menos de 6 caracteres', async () => {
    await expect(
      registerUser.execute({ name: 'Ana', email: 'ana@exemplo.com', password: '123' }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('cadastra com papel USER, faz hash da senha e retorna { user, token }', async () => {
    const result = await registerUser.execute({
      name: 'Ana',
      email: 'Ana@Exemplo.com',
      password: '123456',
    });

    expect(hashService.hash).toHaveBeenCalledWith('123456');
    expect(userRepository.create).toHaveBeenCalledTimes(1);
    expect(result.token).toBe('jwt-token');
    expect(result.user).toEqual({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@exemplo.com',
      role: 'USER',
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });
});
