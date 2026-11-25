import { ZodError } from 'zod';
import {
  DiagnosisNotFoundError,
  EmailAlreadyExistsError,
  ForbiddenError,
  HypothesisNotFoundError,
  IncidentLockedError,
  IncidentNotFoundError,
  InvalidCredentialsError,
  InvalidStatusTransitionError,
  UserNotFoundError,
  ValidationError,
} from '../../../domain/errors/DomainErrors.js';

// Erro de domínio -> status HTTP. Um só lugar para todos os controllers.
const STATUS_BY_ERROR = [
  [ValidationError, 400],
  [InvalidCredentialsError, 401],
  [ForbiddenError, 403],
  [IncidentNotFoundError, 404],
  [DiagnosisNotFoundError, 404],
  [HypothesisNotFoundError, 404],
  [UserNotFoundError, 404],
  [EmailAlreadyExistsError, 409],
  [InvalidStatusTransitionError, 409],
  [IncidentLockedError, 409],
];

/** Traduz erros de validação/domínio em resposta HTTP; o resto segue para o errorHandler. */
export function handleDomainError(error, res, next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: error.issues[0]?.message ?? 'Dados inválidos',
      details: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const match = STATUS_BY_ERROR.find(([ErrorType]) => error instanceof ErrorType);
  if (match) {
    return res.status(match[1]).json({ error: error.message });
  }
  return next(error);
}
