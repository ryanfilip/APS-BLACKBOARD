import { UserNotFoundError, ValidationError } from '../../../domain/errors/DomainErrors.js';
import { ROLES } from '../../../domain/entities/User.js';

/**
 * ADMIN: altera o papel (USER/TECH/ADMIN) de outro usuário.
 * O novo papel vale a partir do próximo login do usuário (o papel viaja no token JWT).
 */
export class ChangeUserRole {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ targetUserId, role, adminId }) {
    if (!ROLES.includes(role)) {
      throw new ValidationError(`Papel inválido: ${role}`);
    }
    // Impede que o administrador remova o próprio acesso por engano.
    if (targetUserId === adminId) {
      throw new ValidationError('Você não pode alterar o seu próprio papel');
    }

    const user = await this.userRepository.findById(targetUserId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const saved = await this.userRepository.updateRole(user.id, role);
    return { user: saved.toPublic() };
  }
}
