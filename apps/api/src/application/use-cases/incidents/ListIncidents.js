import { ValidationError } from '../../../domain/errors/DomainErrors.js';
import { isStaff } from '../../../domain/entities/User.js';

export class ListIncidents {
  constructor({ incidentRepository }) {
    this.incidentRepository = incidentRepository;
  }

  /** USER lista só os próprios incidentes; TECH/ADMIN listam todos (fila de atendimento). */
  async execute({ userId, role }) {
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new ValidationError('O usuário é obrigatório');
    }

    const incidents = isStaff(role)
      ? await this.incidentRepository.findAll()
      : await this.incidentRepository.findAllByUserId(userId);
    return { incidents: incidents.map((incident) => incident.toPublic()) };
  }
}
