import { User } from '../../../domain/entities/User.js';
import { EmailAlreadyExistsError, ValidationError } from '../../../domain/errors/DomainErrors.js';

const MIN_PASSWORD_LENGTH = 6;

export class RegisterUser {
  constructor({ userRepository, hashService, tokenService }) {
    this.userRepository = userRepository;
    this.hashService = hashService;
    this.tokenService = tokenService;
  }

  async execute({ name, email, password }) {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`);
    }

    const normalizedEmail = String(email ?? '').trim().toLowerCase();

    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new EmailAlreadyExistsError();
    }

    const passwordHash = await this.hashService.hash(password);

    // Papel padrão: USER. O cadastro público nunca concede TECH/ADMIN.
    const newUser = User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: 'USER',
    });

    const saved = await this.userRepository.create(newUser);

    const token = this.tokenService.sign({
      sub: saved.id,
      email: saved.email,
      role: saved.role,
    });

    return {
      user: { id: saved.id, name: saved.name, email: saved.email, role: saved.role },
      token,
    };
  }
}
