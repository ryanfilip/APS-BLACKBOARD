import {
  DiagnosisNotFoundError,
  IncidentNotFoundError,
  ValidationError,
} from '../../../domain/errors/DomainErrors.js';

/** Busca o diagnóstico mais recente de um incidente que pertença ao usuário. */
export class GetDiagnosis {
  constructor({ incidentRepository, diagnosisRepository }) {
    this.incidentRepository = incidentRepository;
    this.diagnosisRepository = diagnosisRepository;
  }

  async execute({ incidentId, userId }) {
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new ValidationError('O usuário é obrigatório');
    }

    // Propriedade do incidente primeiro: só então o diagnóstico é consultado.
    const incident = await this.incidentRepository.findById(incidentId, userId);
    if (!incident || !incident.belongsTo(userId)) {
      throw new IncidentNotFoundError();
    }

    const diagnosis = await this.diagnosisRepository.findByIncidentId(incident.id);
    if (!diagnosis) {
      throw new DiagnosisNotFoundError();
    }

    return { diagnosis: diagnosis.toPublic() };
  }
}
