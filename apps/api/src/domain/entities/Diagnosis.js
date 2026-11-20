import { FINISHED_BY } from '../control/ControlComponent.js';
import { ValidationError } from '../errors/DomainErrors.js';

/**
 * Resultado persistido de uma execução do Control Component sobre um incidente.
 * `state` é o objeto serializável retornado por Blackboard.getState().
 */
export class Diagnosis {
  constructor({ id, incidentId, state, iterations, finishedBy, createdAt }) {
    this.id = id;
    this.incidentId = incidentId;
    this.state = state;
    this.iterations = iterations;
    this.finishedBy = finishedBy;
    this.createdAt = createdAt;
  }

  static create({ incidentId, state, iterations, finishedBy }) {
    if (typeof incidentId !== 'string' || incidentId.length === 0) {
      throw new ValidationError('O incidente do diagnóstico é obrigatório');
    }
    if (
      state === null ||
      typeof state !== 'object' ||
      !Array.isArray(state.facts) ||
      !Array.isArray(state.hypotheses) ||
      !Array.isArray(state.evidences)
    ) {
      throw new ValidationError('O estado do diagnóstico é inválido');
    }
    if (!Number.isInteger(iterations) || iterations < 0) {
      throw new ValidationError('O número de iterações deve ser um inteiro maior ou igual a 0');
    }
    if (!Object.values(FINISHED_BY).includes(finishedBy)) {
      throw new ValidationError(`Motivo de término inválido: ${finishedBy}`);
    }

    return new Diagnosis({ incidentId, state, iterations, finishedBy });
  }

  toPublic() {
    return {
      id: this.id,
      incidentId: this.incidentId,
      state: this.state,
      iterations: this.iterations,
      finishedBy: this.finishedBy,
      createdAt: this.createdAt,
    };
  }
}
