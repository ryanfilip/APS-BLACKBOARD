import { findAccessibleIncident } from './findAccessibleIncident.js';

export class GetIncident {
  constructor({ incidentRepository }) {
    this.incidentRepository = incidentRepository;
  }

  /** USER vê só os próprios incidentes; TECH/ADMIN veem qualquer um. */
  async execute({ id, userId, role }) {
    const incident = await findAccessibleIncident(this.incidentRepository, { incidentId: id, userId, role });
    return { incident: incident.toPublic() };
  }
}
