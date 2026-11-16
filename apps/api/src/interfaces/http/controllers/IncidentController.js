import { ZodError } from 'zod';
import { IncidentNotFoundError, ValidationError } from '../../../domain/errors/DomainErrors.js';
import { createIncidentSchema } from '../validators/incidentValidators.js';

/**
 * Controller fino: valida a entrada, chama o caso de uso e traduz erros em status HTTP.
 * O userId vem sempre do token (req.user), nunca do corpo da requisição.
 */
export class IncidentController {
  constructor({ createIncident, listIncidents, getIncident }) {
    this.createIncident = createIncident;
    this.listIncidents = listIncidents;
    this.getIncident = getIncident;
  }

  create = async (req, res, next) => {
    try {
      const input = createIncidentSchema.parse(req.body ?? {});
      const result = await this.createIncident.execute({ ...input, userId: req.user.id });
      return res.status(201).json(result);
    } catch (error) {
      return this.#handleError(error, res, next);
    }
  };

  list = async (req, res, next) => {
    try {
      const result = await this.listIncidents.execute({ userId: req.user.id });
      return res.status(200).json(result);
    } catch (error) {
      return this.#handleError(error, res, next);
    }
  };

  getById = async (req, res, next) => {
    try {
      const result = await this.getIncident.execute({ id: req.params.id, userId: req.user.id });
      return res.status(200).json(result);
    } catch (error) {
      return this.#handleError(error, res, next);
    }
  };

  #handleError(error, res, next) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: error.issues[0]?.message ?? 'Dados inválidos',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof IncidentNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    return next(error);
  }
}
