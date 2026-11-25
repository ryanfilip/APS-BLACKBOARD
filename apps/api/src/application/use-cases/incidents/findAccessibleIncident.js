import { IncidentNotFoundError, ValidationError } from '../../../domain/errors/DomainErrors.js';
import { isStaff } from '../../../domain/entities/User.js';

/**
 * Busca um incidente respeitando o controle de acesso:
 * - USER: só o próprio (consulta escopada pelo dono + dupla checagem);
 * - TECH/ADMIN: qualquer incidente.
 * Incidente inacessível responde como "não encontrado" para não revelar que existe.
 */
export async function findAccessibleIncident(incidentRepository, { incidentId, userId, role }) {
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new ValidationError('O usuário é obrigatório');
  }

  const incident = isStaff(role)
    ? await incidentRepository.findByIdUnscoped(incidentId)
    : await incidentRepository.findById(incidentId, userId);

  if (!incident || !incident.canBeAccessedBy({ userId, role })) {
    throw new IncidentNotFoundError();
  }
  return incident;
}
