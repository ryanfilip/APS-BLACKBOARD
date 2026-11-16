import { randomUUID } from 'node:crypto';
import { ValidationError } from '../errors/DomainErrors.js';
import { assertNonEmptyString } from './validation.js';

/** Informação objetiva registrada no Blackboard (ex.: os dados do incidente relatado). */
export class Fact {
  constructor({ id = randomUUID(), description, createdAt = new Date() } = {}) {
    const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      throw new ValidationError('A data de criação do fato é inválida');
    }

    this.id = assertNonEmptyString(id, 'O id do fato é obrigatório');
    this.description = assertNonEmptyString(description, 'A descrição do fato é obrigatória');
    this.createdAt = date;
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
