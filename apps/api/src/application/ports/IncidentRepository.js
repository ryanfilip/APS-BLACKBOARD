/**
 * Porta (interface abstrata) de persistência de incidentes.
 * Toda consulta é escopada pelo dono (userId): um usuário nunca acessa incidentes de outro.
 */
export class IncidentRepository {
  // eslint-disable-next-line no-unused-vars
  async create(incident) {
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line no-unused-vars
  async findAllByUserId(userId) {
    throw new Error('Not implemented');
  }

  /** Retorna o incidente somente se ele pertencer ao userId; caso contrário, null. */
  // eslint-disable-next-line no-unused-vars
  async findById(id, userId) {
    throw new Error('Not implemented');
  }
}
