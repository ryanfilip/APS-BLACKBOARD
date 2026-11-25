import { findAccessibleIncident } from './findAccessibleIncident.js';

export class GetIncident {
  constructor({ incidentRepository }) {
    this.incidentRepository = incidentRepository;
  }

  /** USER vê só os próprios incidentes; TECH/ADMIN veem qualquer um. */
  async execute({ id, userId, role }) {
    const incident = await findAccessibleIncident(this.incidentRepository, { incidentId: id, userId, role });
    // O que este usuário pode fazer com o chamado (a tela usa para mostrar os botões).
    const permissions = {
      canEdit: incident.canBeEditedBy({ userId }),
      canDelete: incident.canBeDeletedBy({ userId, role }),
    };
    return { incident: { ...incident.toPublic(), permissions } };
  }
}
