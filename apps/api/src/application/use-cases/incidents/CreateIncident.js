import { Incident } from '../../../domain/entities/Incident.js';

export class CreateIncident {
  constructor({ incidentRepository }) {
    this.incidentRepository = incidentRepository;
  }

  async execute({ title, description, equipment, userId }) {
    // A entidade valida os campos e define o status inicial como OPEN.
    const incident = Incident.create({ title, description, equipment, userId });
    const saved = await this.incidentRepository.create(incident);
    return { incident: saved.toPublic() };
  }
}
