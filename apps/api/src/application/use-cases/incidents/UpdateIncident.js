import { ForbiddenError } from '../../../domain/errors/DomainErrors.js';
import { findAccessibleIncident } from './findAccessibleIncident.js';

/** O dono corrige o relato enquanto o chamado está aberto. */
export class UpdateIncident {
  constructor({ incidentRepository }) {
    this.incidentRepository = incidentRepository;
  }

  async execute({ incidentId, title, description, equipment, userId, role }) {
    const incident = await findAccessibleIncident(this.incidentRepository, { incidentId, userId, role });
    if (!incident.belongsTo(userId)) {
      throw new ForbiddenError('Apenas quem relatou o chamado pode editá-lo');
    }

    // A entidade bloqueia a edição fora do status OPEN e valida os campos.
    incident.update({ title, description, equipment });
    const saved = await this.incidentRepository.update(incident);
    return { incident: saved.toPublic() };
  }
}
