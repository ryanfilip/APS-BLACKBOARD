import { InvalidCredentialsError } from '../../../domain/errors/DomainErrors.js';

export class LoginUser {
  constructor({ userRepository, hashService, tokenService }) {
    this.userRepository = userRepository;
    this.hashService = hashService;
    this.tokenService = tokenService;
  }

  async execute({ email, password }) {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const matches = await this.hashService.compare(String(password ?? ''), user.passwordHash);
    if (!matches) {
      throw new InvalidCredentialsError();
    }

    const token = this.tokenService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    };
  }
}
