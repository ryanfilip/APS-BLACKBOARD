import { handleDomainError } from '../middlewares/handleDomainError.js';
import { reviewHypothesisSchema } from '../validators/diagnosisValidators.js';

/**
 * Controller fino: chama o caso de uso e traduz erros em status HTTP.
 * O usuário (id e papel) vem sempre do token (req.user); o id do incidente vem da URL.
 */
export class DiagnosisController {
  constructor({ runDiagnosis, getDiagnosis, reviewHypothesis }) {
    this.runDiagnosis = runDiagnosis;
    this.getDiagnosis = getDiagnosis;
    this.reviewHypothesis = reviewHypothesis;
  }

  run = async (req, res, next) => {
    try {
      const result = await this.runDiagnosis.execute({
        incidentId: req.params.id,
        userId: req.user.id,
        role: req.user.role,
      });
      return res.status(201).json(result);
    } catch (error) {
      return handleDomainError(error, res, next);
    }
  };

  get = async (req, res, next) => {
    try {
      const result = await this.getDiagnosis.execute({
        incidentId: req.params.id,
        userId: req.user.id,
        role: req.user.role,
      });
      return res.status(200).json(result);
    } catch (error) {
      return handleDomainError(error, res, next);
    }
  };

  review = async (req, res, next) => {
    try {
      const { status } = reviewHypothesisSchema.parse(req.body ?? {});
      const result = await this.reviewHypothesis.execute({
        incidentId: req.params.id,
        diagnosisId: req.params.diagnosisId,
        hypothesisId: req.params.hypothesisId,
        status,
        userId: req.user.id,
        role: req.user.role,
      });
      return res.status(200).json(result);
    } catch (error) {
      return handleDomainError(error, res, next);
    }
  };
}
