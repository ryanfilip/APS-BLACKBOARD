import { ValidationError } from '../errors/DomainErrors.js';

export const ROLES = Object.freeze(['USER', 'TECH', 'ADMIN']);

/** Papéis da equipe de suporte: enxergam e atendem os chamados de todos os usuários. */
export const STAFF_ROLES = Object.freeze(['TECH', 'ADMIN']);

export function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

export class User {
  constructor({ id, name, email, passwordHash, role = 'USER', createdAt }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
    this.role = role;
    this.createdAt = createdAt;
  }

  static create({ name, email, passwordHash, role = 'USER' }) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('O nome é obrigatório');
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new ValidationError('E-mail inválido');
    }
    if (typeof passwordHash !== 'string' || passwordHash.length === 0) {
      throw new ValidationError('O hash da senha é obrigatório');
    }
    if (!ROLES.includes(role)) {
      throw new ValidationError(`Papel inválido: ${role}`);
    }

    return new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
    });
  }

  toPublic() {
    return { id: this.id, name: this.name, email: this.email, role: this.role };
  }
}
