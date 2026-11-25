import { IncidentLockedError, InvalidStatusTransitionError, ValidationError } from '../errors/DomainErrors.js';
import { isStaff } from './User.js';

export const INCIDENT_STATUSES = Object.freeze(['OPEN', 'IN_PROGRESS', 'RESOLVED']);

/**
 * Máquina de estados do chamado: para cada status, os status para os quais ele pode ir.
 *   OPEN -> IN_PROGRESS            (técnico assume o chamado)
 *   IN_PROGRESS -> RESOLVED        (problema resolvido)
 *   IN_PROGRESS -> OPEN            (técnico devolve o chamado para a fila)
 *   RESOLVED -> IN_PROGRESS        (chamado reaberto)
 */
export const STATUS_TRANSITIONS = Object.freeze({
  OPEN: Object.freeze(['IN_PROGRESS']),
  IN_PROGRESS: Object.freeze(['OPEN', 'RESOLVED']),
  RESOLVED: Object.freeze(['IN_PROGRESS']),
});

export class Incident {
  constructor({
    id,
    title,
    description,
    equipment,
    status = 'OPEN',
    userId,
    createdAt,
    updatedAt,
    ownerName,
    diagnosisCount,
  }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.equipment = equipment;
    this.status = status;
    this.userId = userId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    // Dados de leitura opcionais, preenchidos pelo repositório quando disponíveis.
    this.ownerName = ownerName;
    this.diagnosisCount = diagnosisCount;
  }

  static #assertContent({ title, description, equipment }) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('O título é obrigatório');
    }
    if (typeof description !== 'string' || description.trim().length === 0) {
      throw new ValidationError('A descrição é obrigatória');
    }
    if (typeof equipment !== 'string' || equipment.trim().length === 0) {
      throw new ValidationError('O equipamento é obrigatório');
    }
  }

  static create({ title, description, equipment, userId }) {
    Incident.#assertContent({ title, description, equipment });
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new ValidationError('O usuário do incidente é obrigatório');
    }

    return new Incident({
      title: title.trim(),
      description: description.trim(),
      equipment: equipment.trim(),
      status: 'OPEN',
      userId,
    });
  }

  /** O dono vê o próprio chamado; a equipe (TECH/ADMIN) vê todos. */
  canBeAccessedBy({ userId, role } = {}) {
    return isStaff(role) || this.belongsTo(userId);
  }

  canTransitionTo(status) {
    return (STATUS_TRANSITIONS[this.status] ?? []).includes(status);
  }

  changeStatus(status) {
    if (!INCIDENT_STATUSES.includes(status)) {
      throw new ValidationError(`Status inválido: ${status}`);
    }
    if (!this.canTransitionTo(status)) {
      throw new InvalidStatusTransitionError(
        `Não é possível mudar o status de ${this.status} para ${status}`,
      );
    }
    this.status = status;
  }

  /** Só o dono edita, e apenas enquanto o chamado está aberto (antes do atendimento). */
  canBeEditedBy({ userId } = {}) {
    return this.belongsTo(userId) && this.status === 'OPEN';
  }

  /** O dono exclui enquanto o chamado está aberto; o ADMIN exclui a qualquer momento. */
  canBeDeletedBy({ userId, role } = {}) {
    return role === 'ADMIN' || this.canBeEditedBy({ userId });
  }

  /** Altera o relato. O status e o dono não mudam por aqui. */
  update({ title, description, equipment }) {
    if (this.status !== 'OPEN') {
      throw new IncidentLockedError();
    }
    Incident.#assertContent({ title, description, equipment });
    this.title = title.trim();
    this.description = description.trim();
    this.equipment = equipment.trim();
  }

  belongsTo(userId) {
    return typeof userId === 'string' && userId.length > 0 && this.userId === userId;
  }

  toPublic() {
    const data = {
      id: this.id,
      title: this.title,
      description: this.description,
      equipment: this.equipment,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    if (this.ownerName !== undefined) data.ownerName = this.ownerName;
    if (this.diagnosisCount !== undefined) data.diagnosisCount = this.diagnosisCount;
    return data;
  }
}
