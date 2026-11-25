import { DiagnosisNotFoundError, ForbiddenError } from '../../../domain/errors/DomainErrors.js';
import { isStaff } from '../../../domain/entities/User.js';
import { findAccessibleIncident } from '../incidents/findAccessibleIncident.js';

/**
 * TECH/ADMIN confirmam, descartam ou reabrem uma hipótese de um diagnóstico salvo.
 * O técnico atua como uma Knowledge Source humana: a revisão vira evidência no quadro.
 */
export class ReviewHypothesis {
  constructor({ incidentRepository, diagnosisRepository, userRepository, now = () => new Date() }) {
    this.incidentRepository = incidentRepository;
    this.diagnosisRepository = diagnosisRepository;
    this.userRepository = userRepository;
    this.now = now;
  }

  async execute({ incidentId, diagnosisId, hypothesisId, status, userId, role }) {
    const incident = await findAccessibleIncident(this.incidentRepository, { incidentId, userId, role });
    if (!isStaff(role)) {
      throw new ForbiddenError('Apenas técnicos e administradores podem revisar hipóteses');
    }

    const diagnosis = await this.diagnosisRepository.findById(diagnosisId);
    if (!diagnosis || diagnosis.incidentId !== incident.id) {
      throw new DiagnosisNotFoundError('Diagnóstico não encontrado');
    }

    const reviewer = await this.userRepository.findById(userId);
    diagnosis.reviewHypothesis({
      hypothesisId,
      status,
      reviewerName: reviewer?.name ?? 'Técnico',
      reviewedAt: this.now().toISOString(),
    });

    const saved = await this.diagnosisRepository.updateState(diagnosis.id, diagnosis.state);
    return { diagnosis: saved.toPublic() };
  }
}
