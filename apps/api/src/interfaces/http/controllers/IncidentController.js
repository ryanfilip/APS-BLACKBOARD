import { handleDomainError } from '../middlewares/handleDomainError.js';
import { changeStatusSchema, createIncidentSchema } from '../validators/incidentValidators.js';

/**
 * Controller fino: valida a entrada, chama o caso de uso e traduz erros em status HTTP.
 * O usuário (id e papel) vem sempre do token (req.user), nunca do corpo da requisição.
 */
export class IncidentController {
  constructor({ createIncident, listIncidents, getIncident, changeIncidentStatus, updateIncident, deleteIncident }) {
    this.createIncident = createIncident;
    this.listIncidents = listIncidents;
    this.getIncident = getIncident;
    this.changeIncidentStatus = changeIncidentStatus;
    this.updateIncident = updateIncident;
    this.deleteIncident = deleteIncident;
  }

  create = async (req, res, next) => {
    try {
      const input = createIncidentSchema.parse(req.body ?? {});
      const result = await this.createIncident.execute({ ...input, userId: req.user.id });
      return res.status(201).json(result);
    } catch (error) {
      return handleDomainError(error, res, next);
    }
  };

  list = async (req, res, next) => {
    try {
      const result = await this.listIncidents.execute({ userId: req.user.id, role: req.user.role });
      return res.status(200).json(result);
    } catch (error) {
      return handleDomainError(error, res, next);
    }
  };

  getById = async (req, res, next) => {
    try {
      const result = await this.getIncident.execute({
        id: req.params.id,
        userId: req.user.id,
        role: req.user.role,
      });
      return res.status(200).json(result);
    } catch (error) {
      return handleDomainError(error, res, next);
    }
  };

  update = async (req, res, next) => {
    try {
      // Mesmas regras de conteúdo do cadastro.
      const input = createIncidentSchema.parse(req.body ?? {});
      const result = await this.updateIncident.execute({
        ...input,
        incidentId: req.params.id,
        userId: req.user.id,
        role: req.user.role,
      });
      return res.status(200).json(result);
    } catch (error) {
      return handleDomainError(error, res, next);
    }
  };

  remove = async (req, res, next) => {
    try {
      await this.deleteIncident.execute({ incidentId: req.params.id, userId: req.user.id, role: req.user.role });
      return res.status(204).send();
    } catch (error) {
      return handleDomainError(error, res, next);
    }
  };

  changeStatus = async (req, res, next) => {
    try {
      const { status } = changeStatusSchema.parse(req.body ?? {});
      const result = await this.changeIncidentStatus.execute({
        incidentId: req.params.id,
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
