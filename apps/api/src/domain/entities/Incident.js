import { ValidationError } from '../errors/DomainErrors.js';

export const INCIDENT_STATUSES = Object.freeze(['OPEN', 'IN_PROGRESS', 'RESOLVED']);

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
  }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.equipment = equipment;
    this.status = status;
    this.userId = userId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create({ title, description, equipment, userId }) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('O título é obrigatório');
    }
    if (typeof description !== 'string' || description.trim().length === 0) {
      throw new ValidationError('A descrição é obrigatória');
    }
    if (typeof equipment !== 'string' || equipment.trim().length === 0) {
      throw new ValidationError('O equipamento é obrigatório');
    }
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

  belongsTo(userId) {
    return typeof userId === 'string' && userId.length > 0 && this.userId === userId;
  }

  toPublic() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      equipment: this.equipment,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
