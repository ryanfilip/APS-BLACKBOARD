import { randomUUID } from 'node:crypto';
import { ValidationError } from '../errors/DomainErrors.js';
import { assertNonEmptyString } from './validation.js';

export const EVIDENCE_POLARITIES = Object.freeze(['SUPPORTS', 'REFUTES']);

/**
 * Justificativa ligada a uma hipótese.
 * `supports` guarda o id da hipótese relacionada e `polarity` diz se a evidência
 * a apoia (SUPPORTS) ou a refuta (REFUTES).
 */
export class Evidence {
  constructor({ id = randomUUID(), description, supports, polarity, source } = {}) {
    if (!EVIDENCE_POLARITIES.includes(polarity)) {
      throw new ValidationError('A polaridade da evidência deve ser SUPPORTS ou REFUTES');
    }

    this.id = assertNonEmptyString(id, 'O id da evidência é obrigatório');
    this.description = assertNonEmptyString(description, 'A descrição da evidência é obrigatória');
    this.supports = assertNonEmptyString(supports, 'A evidência deve referenciar o id de uma hipótese');
    this.polarity = polarity;
    this.source = assertNonEmptyString(source, 'A origem (Knowledge Source) da evidência é obrigatória');
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description,
      supports: this.supports,
      polarity: this.polarity,
      source: this.source,
    };
  }
}
