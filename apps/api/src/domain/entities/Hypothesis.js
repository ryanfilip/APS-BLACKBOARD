import { randomUUID } from 'node:crypto';
import { ValidationError } from '../errors/DomainErrors.js';
import { assertNonEmptyString } from './validation.js';

export const HYPOTHESIS_STATUSES = Object.freeze(['OPEN', 'CONFIRMED', 'REJECTED']);

/** Suspeita de causa para o problema (ex.: "Memória RAM com defeito"). */
export class Hypothesis {
  constructor({ id = randomUUID(), description, source, confidence, status = 'OPEN' } = {}) {
    if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
      throw new ValidationError('A confiança da hipótese deve ser um número entre 0 e 100');
    }
    if (!HYPOTHESIS_STATUSES.includes(status)) {
      throw new ValidationError(`Status de hipótese inválido: ${status}`);
    }

    this.id = assertNonEmptyString(id, 'O id da hipótese é obrigatório');
    this.description = assertNonEmptyString(description, 'A descrição da hipótese é obrigatória');
    this.source = assertNonEmptyString(source, 'A origem (Knowledge Source) da hipótese é obrigatória');
    this.confidence = confidence;
    this.status = status;
  }

  confirm() {
    this.status = 'CONFIRMED';
  }

  reject() {
    this.status = 'REJECTED';
  }

  /** Desfaz a revisão: a hipótese volta a ficar em análise. */
  reopen() {
    this.status = 'OPEN';
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description,
      source: this.source,
      confidence: this.confidence,
      status: this.status,
    };
  }
}
