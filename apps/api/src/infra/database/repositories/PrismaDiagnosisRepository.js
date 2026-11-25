import { DiagnosisRepository } from '../../../application/ports/DiagnosisRepository.js';
import { Diagnosis } from '../../../domain/entities/Diagnosis.js';
import { prisma } from '../prisma/client.js';

function toEntity(record) {
  if (!record) return null;
  return new Diagnosis({
    id: record.id,
    incidentId: record.incidentId,
    state: record.state,
    iterations: record.iterations,
    finishedBy: record.finishedBy,
    createdAt: record.createdAt,
  });
}

// No Prisma, um filtro com valor `undefined` é ignorado e traria o diagnóstico de qualquer incidente.
function assertIncidentId(incidentId) {
  if (typeof incidentId !== 'string' || incidentId.length === 0) {
    throw new Error('incidentId is required');
  }
}

export class PrismaDiagnosisRepository extends DiagnosisRepository {
  constructor(client = prisma) {
    super();
    this.client = client;
  }

  async create(diagnosisData) {
    assertIncidentId(diagnosisData.incidentId);
    const record = await this.client.diagnosis.create({
      data: {
        incidentId: diagnosisData.incidentId,
        // O resultado de Blackboard.getState() vai direto para a coluna Json.
        state: diagnosisData.state,
        iterations: diagnosisData.iterations,
        finishedBy: diagnosisData.finishedBy,
      },
    });
    return toEntity(record);
  }

  async findByIncidentId(incidentId) {
    assertIncidentId(incidentId);
    const record = await this.client.diagnosis.findFirst({
      where: { incidentId },
      orderBy: { createdAt: 'desc' },
    });
    return toEntity(record);
  }

  async findAllByIncidentId(incidentId) {
    assertIncidentId(incidentId);
    const records = await this.client.diagnosis.findMany({
      where: { incidentId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(toEntity);
  }

  async findById(id) {
    if (typeof id !== 'string' || id.length === 0) return null;
    return toEntity(await this.client.diagnosis.findUnique({ where: { id } }));
  }

  async updateState(id, state) {
    return toEntity(await this.client.diagnosis.update({ where: { id }, data: { state } }));
  }
}
