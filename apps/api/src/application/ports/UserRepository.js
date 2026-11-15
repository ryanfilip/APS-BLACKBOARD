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
}
