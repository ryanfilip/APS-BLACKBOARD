import { InvalidCredentialsError } from '../../../domain/errors/DomainErrors.js';

export class GetCurrentUser {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ userId }) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new InvalidCredentialsError('Sessão inválida: usuário não encontrado');
    }
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  }
}
