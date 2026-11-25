import { FINISHED_BY } from '../control/ControlComponent.js';
import { HypothesisNotFoundError, ValidationError } from '../errors/DomainErrors.js';
import { Evidence } from './Evidence.js';
import { Hypothesis, HYPOTHESIS_STATUSES } from './Hypothesis.js';

/** Origem das evidências escritas por um técnico humano ao revisar uma hipótese. */
export const REVIEW_SOURCE = 'Revisão técnica';

const REVIEW_ACTIONS = Object.freeze({
  CONFIRMED: { apply: (h) => h.confirm(), polarity: 'SUPPORTS', verb: 'Confirmada' },
  REJECTED: { apply: (h) => h.reject(), polarity: 'REFUTES', verb: 'Descartada' },
  OPEN: { apply: (h) => h.reopen(), polarity: null, verb: null },
});

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

  /**
   * Um técnico (especialista humano) escreve no quadro já salvo: muda o status da hipótese
   * e registra uma evidência de origem REVIEW_SOURCE que a apoia (confirmação) ou a refuta
   * (descarte). Reabrir (OPEN) remove a revisão anterior. Substitui `this.state` por uma cópia.
   */
  reviewHypothesis({ hypothesisId, status, reviewerName, reviewedAt }) {
    if (!HYPOTHESIS_STATUSES.includes(status)) {
      throw new ValidationError(`Status de hipótese inválido: ${status}`);
    }
    const index = this.state.hypotheses.findIndex((h) => h.id === hypothesisId);
    if (index === -1) {
      throw new HypothesisNotFoundError();
    }

    const action = REVIEW_ACTIONS[status];
    const hypothesis = new Hypothesis(this.state.hypotheses[index]);
    action.apply(hypothesis);

    // Só a revisão mais recente vale: remove a evidência de revisão anterior desta hipótese.
    const evidences = this.state.evidences.filter(
      (e) => !(e.supports === hypothesisId && e.source === REVIEW_SOURCE),
    );
    if (action.polarity) {
      evidences.push(
        new Evidence({
          description: `${action.verb} por ${reviewerName}`,
          supports: hypothesisId,
          polarity: action.polarity,
          source: REVIEW_SOURCE,
        }).toJSON(),
      );
    }

    const hypotheses = [...this.state.hypotheses];
    hypotheses[index] = {
      ...hypothesis.toJSON(),
      reviewedBy: action.polarity ? reviewerName : null,
      reviewedAt: action.polarity ? reviewedAt : null,
    };

    this.state = { ...this.state, hypotheses, evidences };
    return hypotheses[index];
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
