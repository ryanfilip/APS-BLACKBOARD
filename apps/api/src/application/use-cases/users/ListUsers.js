/** ADMIN: lista todos os usuários com seus papéis. */
export class ListUsers {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute() {
    const users = await this.userRepository.findAll();
    return { users: users.map((user) => user.toPublic()) };
  }
}
