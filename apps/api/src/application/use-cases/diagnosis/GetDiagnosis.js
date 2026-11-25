import { DiagnosisNotFoundError } from '../../../domain/errors/DomainErrors.js';
import { findAccessibleIncident } from '../incidents/findAccessibleIncident.js';

/**
 * Busca um diagnóstico de um incidente acessível ao usuário (dono ou TECH/ADMIN):
 * o indicado por `diagnosisId` ou, sem ele, o mais recente.
 */
export class GetDiagnosis {
  constructor({ incidentRepository, diagnosisRepository }) {
    this.incidentRepository = incidentRepository;
    this.diagnosisRepository = diagnosisRepository;
  }

  async execute({ incidentId, diagnosisId, userId, role }) {
    const incident = await findAccessibleIncident(this.incidentRepository, { incidentId, userId, role });

    const diagnosis = diagnosisId
      ? await this.diagnosisRepository.findById(diagnosisId)
      : await this.diagnosisRepository.findByIncidentId(incident.id);
    // Um diagnóstico de outro incidente responde como não encontrado.
    if (!diagnosis || diagnosis.incidentId !== incident.id) {
      throw new DiagnosisNotFoundError();
    }

    return { diagnosis: diagnosis.toPublic() };
  }
}
