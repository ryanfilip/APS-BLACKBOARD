import { Blackboard } from '../../../domain/blackboard/Blackboard.js';
import { ControlComponent } from '../../../domain/control/ControlComponent.js';
import { Diagnosis } from '../../../domain/entities/Diagnosis.js';
import { IncidentNotFoundError, ValidationError } from '../../../domain/errors/DomainErrors.js';
import {
  KS1_Hardware,
  KS2_Network,
  KS3_OperatingSystem,
  KS4_Software,
  KS5_Security,
} from '../../../domain/knowledge-sources/index.js';

/** Instâncias novas a cada diagnóstico. A ordem da lista é a prioridade do Control Component. */
function createKnowledgeSources() {
  return [
    new KS1_Hardware(),
    new KS2_Network(),
    new KS3_OperatingSystem(),
    new KS4_Software(),
    new KS5_Security(),
  ];
}

/**
 * Roda o diagnóstico de um incidente do usuário, salva o resultado e devolve o diagnóstico salvo.
 * O `state` do Blackboard (getState) é persistido como veio, sem transformação.
 */
export class RunDiagnosis {
  constructor({ incidentRepository, diagnosisRepository, maxIterations }) {
    this.incidentRepository = incidentRepository;
    this.diagnosisRepository = diagnosisRepository;
    this.maxIterations = maxIterations;
  }

  async execute({ incidentId, userId }) {
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new ValidationError('O usuário é obrigatório');
    }

    const incident = await this.incidentRepository.findById(incidentId, userId);

    // Incidente de outro usuário responde como "não encontrado" (mesma regra do GetIncident).
    if (!incident || !incident.belongsTo(userId)) {
      throw new IncidentNotFoundError();
    }

    const blackboard = new Blackboard({
      title: incident.title,
      description: incident.description,
      equipment: incident.equipment,
    });

    const control = new ControlComponent({
      knowledgeSources: createKnowledgeSources(),
      maxIterations: this.maxIterations,
    });

    const { state, iterations, finishedBy } = control.run(blackboard);

    const saved = await this.diagnosisRepository.create(
      Diagnosis.create({ incidentId: incident.id, state, iterations, finishedBy }),
    );

    return { diagnosis: saved.toPublic() };
  }
}
