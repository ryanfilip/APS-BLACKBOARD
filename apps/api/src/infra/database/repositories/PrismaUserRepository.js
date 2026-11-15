import { UserRepository } from '../../../application/ports/UserRepository.js';
import { User } from '../../../domain/entities/User.js';
import { EmailAlreadyExistsError } from '../../../domain/errors/DomainErrors.js';
import { prisma } from '../prisma/client.js';

function toEntity(record) {
  if (!record) return null;
  return new User({
    id: record.id,
    name: record.name,
    email: record.email,
    passwordHash: record.password,
    role: record.role,
    createdAt: record.createdAt,
  });
}

export class PrismaUserRepository extends UserRepository {
  constructor(client = prisma) {
    super();
    this.client = client;
  }

  async findByEmail(email) {
    return toEntity(await this.client.user.findUnique({ where: { email } }));
  }

  async findById(id) {
    return toEntity(await this.client.user.findUnique({ where: { id } }));
  }

  async create(user) {
    try {
      const record = await this.client.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: user.passwordHash,
          role: user.role,
        },
      });
      return toEntity(record);
    } catch (error) {
      // P2002 = violação de unique constraint (corrida entre dois cadastros com o mesmo e-mail)
      if (error?.code === 'P2002') {
        throw new EmailAlreadyExistsError();
      }
      throw error;
    }
  }
}
