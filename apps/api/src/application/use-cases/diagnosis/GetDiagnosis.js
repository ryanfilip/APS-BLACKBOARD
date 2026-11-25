import { DiagnosisNotFoundError } from '../../../domain/errors/DomainErrors.js';
import { findAccessibleIncident } from '../incidents/findAccessibleIncident.js';

/** Busca o diagnóstico mais recente de um incidente acessível ao usuário (dono ou TECH/ADMIN). */
export class GetDiagnosis {
  constructor({ incidentRepository, diagnosisRepository }) {
    this.incidentRepository = incidentRepository;
    this.diagnosisRepository = diagnosisRepository;
  }

  async execute({ incidentId, userId, role }) {
    const incident = await findAccessibleIncident(this.incidentRepository, { incidentId, userId, role });

    const diagnosis = await this.diagnosisRepository.findByIncidentId(incident.id);
    if (!diagnosis) {
      throw new DiagnosisNotFoundError();
    }

    return { diagnosis: diagnosis.toPublic() };
  }
}
