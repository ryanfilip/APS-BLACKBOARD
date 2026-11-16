import { ValidationError } from '../errors/DomainErrors.js';

/** Garante string não vazia e devolve o valor sem espaços nas pontas. */
export function assertNonEmptyString(value, message) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(message);
  }
  return value.trim();
}
