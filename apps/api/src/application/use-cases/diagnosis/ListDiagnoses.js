import { findAccessibleIncident } from '../incidents/findAccessibleIncident.js';

/** Histórico: todos os diagnósticos de um incidente acessível, do mais recente ao mais antigo. */
export class ListDiagnoses {
  constructor({ incidentRepository, diagnosisRepository }) {
    this.incidentRepository = incidentRepository;
    this.diagnosisRepository = diagnosisRepository;
  }

  async execute({ incidentId, userId, role }) {
    const incident = await findAccessibleIncident(this.incidentRepository, { incidentId, userId, role });
    const diagnoses = await this.diagnosisRepository.findAllByIncidentId(incident.id);
    return { diagnoses: diagnoses.map((diagnosis) => diagnosis.toSummary()) };
  }
}
