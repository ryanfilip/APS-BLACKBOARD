import { ValidationError } from '../../../domain/errors/DomainErrors.js';

export class ListIncidents {
  constructor({ incidentRepository }) {
    this.incidentRepository = incidentRepository;
  }

  async execute({ userId }) {
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new ValidationError('O usuário é obrigatório');
    }

    const incidents = await this.incidentRepository.findAllByUserId(userId);
    return { incidents: incidents.map((incident) => incident.toPublic()) };
  }
}
