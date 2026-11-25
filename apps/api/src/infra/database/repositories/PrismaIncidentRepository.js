import { IncidentRepository } from '../../../application/ports/IncidentRepository.js';
import { Incident } from '../../../domain/entities/Incident.js';
import { prisma } from '../prisma/client.js';

function toEntity(record) {
  if (!record) return null;
  return new Incident({
    id: record.id,
    title: record.title,
    description: record.description,
    equipment: record.equipment,
    status: record.status,
    userId: record.userId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ownerName: record.user?.name,
    diagnosisCount: record._count?.diagnoses,
  });
}

// Dados extras de leitura: nome de quem relatou e quantidade de diagnósticos.
const LIST_INCLUDE = {
  user: { select: { name: true } },
  _count: { select: { diagnoses: true } },
};

// No Prisma, um filtro com valor `undefined` é ignorado, o que removeria a restrição de dono.
// Por isso o userId é sempre exigido antes de qualquer consulta.
function assertUserId(userId) {
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new Error('userId is required');
  }
}

export class PrismaIncidentRepository extends IncidentRepository {
  constructor(client = prisma) {
    super();
    this.client = client;
  }

  async create(incident) {
    assertUserId(incident.userId);
    const record = await this.client.incident.create({
      data: {
        title: incident.title,
        description: incident.description,
        equipment: incident.equipment,
        status: incident.status,
        userId: incident.userId,
      },
    });
    return toEntity(record);
  }

  async findAllByUserId(userId) {
    assertUserId(userId);
    const records = await this.client.incident.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: LIST_INCLUDE,
    });
    return records.map(toEntity);
  }

  async findById(id, userId) {
    assertUserId(userId);
    if (typeof id !== 'string' || id.length === 0) return null;

    const record = await this.client.incident.findFirst({ where: { id, userId }, include: LIST_INCLUDE });
    return toEntity(record);
  }
}
