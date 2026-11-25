import { handleDomainError } from '../middlewares/handleDomainError.js';

/**
 * Controller fino: chama o caso de uso e traduz erros em status HTTP.
 * O usuário (id e papel) vem sempre do token (req.user); o id do incidente vem da URL.
 */
export class DiagnosisController {
  constructor({ runDiagnosis, getDiagnosis }) {
    this.runDiagnosis = runDiagnosis;
    this.getDiagnosis = getDiagnosis;
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
}
