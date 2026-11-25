/**
 * Porta (interface abstrata) de persistência de usuários.
 * Implementações concretas vivem em infra/.
 */
export class UserRepository {
  // eslint-disable-next-line no-unused-vars
  async findByEmail(email) {
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line no-unused-vars
  async findById(id) {
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line no-unused-vars
  async create(user) {
    throw new Error('Not implemented');
  }

  async findAll() {
    throw new Error('Not implemented');
  }

  /** Salva o novo papel e devolve o usuário atualizado. */
  // eslint-disable-next-line no-unused-vars
  async updateRole(id, role) {
    throw new Error('Not implemented');
  }
}
