import {
  DiagnosisNotFoundError,
  IncidentNotFoundError,
  ValidationError,
} from '../../../domain/errors/DomainErrors.js';

/**
 * Controller fino: chama o caso de uso e traduz erros em status HTTP.
 * O userId vem sempre do token (req.user); o id do incidente vem da URL.
 */
export class DiagnosisController {
  constructor({ runDiagnosis, getDiagnosis }) {
    this.runDiagnosis = runDiagnosis;
    this.getDiagnosis = getDiagnosis;
  }

  run = async (req, res, next) => {
    try {
      const result = await this.runDiagnosis.execute({ incidentId: req.params.id, userId: req.user.id });
      return res.status(201).json(result);
    } catch (error) {
      return this.#handleError(error, res, next);
    }
  };

  get = async (req, res, next) => {
    try {
      const result = await this.getDiagnosis.execute({ incidentId: req.params.id, userId: req.user.id });
      return res.status(200).json(result);
    } catch (error) {
      return this.#handleError(error, res, next);
    }
  };

  #handleError(error, res, next) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof IncidentNotFoundError || error instanceof DiagnosisNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    return next(error);
  }
}
