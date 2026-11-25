import { ForbiddenError, IncidentLockedError } from '../../../domain/errors/DomainErrors.js';
import { findAccessibleIncident } from './findAccessibleIncident.js';

/** Exclui o chamado (e seus diagnósticos): o dono enquanto está aberto, ou o ADMIN. */
export class DeleteIncident {
  constructor({ incidentRepository }) {
    this.incidentRepository = incidentRepository;
  }

  async execute({ incidentId, userId, role }) {
    const incident = await findAccessibleIncident(this.incidentRepository, { incidentId, userId, role });

    if (!incident.canBeDeletedBy({ userId, role })) {
      if (incident.belongsTo(userId)) throw new IncidentLockedError();
      throw new ForbiddenError('Apenas quem relatou o chamado ou um administrador pode excluí-lo');
    }

    await this.incidentRepository.delete(incident.id);
  }
}
