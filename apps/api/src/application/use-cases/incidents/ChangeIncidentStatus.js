import { ForbiddenError } from '../../../domain/errors/DomainErrors.js';
import { isStaff } from '../../../domain/entities/User.js';
import { findAccessibleIncident } from './findAccessibleIncident.js';

/** TECH/ADMIN movem o chamado na máquina de estados (OPEN -> IN_PROGRESS -> RESOLVED). */
export class ChangeIncidentStatus {
  constructor({ incidentRepository }) {
    this.incidentRepository = incidentRepository;
  }

  async execute({ incidentId, status, userId, role }) {
    const incident = await findAccessibleIncident(this.incidentRepository, { incidentId, userId, role });
    if (!isStaff(role)) {
      throw new ForbiddenError('Apenas técnicos e administradores podem alterar o status');
    }

    // A entidade valida a transição; só então o novo status é salvo.
    incident.changeStatus(status);
    const saved = await this.incidentRepository.updateStatus(incident.id, incident.status);
    return { incident: saved.toPublic() };
  }
}
