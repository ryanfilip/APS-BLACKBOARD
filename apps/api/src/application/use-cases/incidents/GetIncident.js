import { IncidentNotFoundError, ValidationError } from '../../../domain/errors/DomainErrors.js';

export class GetIncident {
  constructor({ incidentRepository }) {
    this.incidentRepository = incidentRepository;
  }

  async execute({ id, userId }) {
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new ValidationError('O usuário é obrigatório');
    }

    const incident = await this.incidentRepository.findById(id, userId);

    // Dupla checagem de propriedade (o repositório já filtra por userId).
    // Incidente de outro usuário responde como "não encontrado" para não revelar que existe.
    if (!incident || !incident.belongsTo(userId)) {
      throw new IncidentNotFoundError();
    }

    return { incident: incident.toPublic() };
  }
}
