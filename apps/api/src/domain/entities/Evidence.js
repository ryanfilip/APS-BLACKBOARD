import { randomUUID } from 'node:crypto';
import { assertNonEmptyString } from './validation.js';

/** Justificativa ligada a uma hipótese. `supports` guarda o id da hipótese relacionada. */
export class Evidence {
  constructor({ id = randomUUID(), description, supports, source } = {}) {
    this.id = assertNonEmptyString(id, 'O id da evidência é obrigatório');
    this.description = assertNonEmptyString(description, 'A descrição da evidência é obrigatória');
    this.supports = assertNonEmptyString(supports, 'A evidência deve referenciar o id de uma hipótese');
    this.source = assertNonEmptyString(source, 'A origem (Knowledge Source) da evidência é obrigatória');
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description,
      supports: this.supports,
      source: this.source,
    };
  }
}
