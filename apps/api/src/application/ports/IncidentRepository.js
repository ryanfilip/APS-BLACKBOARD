/**
 * Porta (interface abstrata) de persistência de incidentes.
 * As consultas de usuário comum são escopadas pelo dono (userId). Os métodos sem escopo
 * (findAll, findByIdUnscoped) só são chamados pelos casos de uso quando o papel é TECH/ADMIN.
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

  /** Todos os incidentes (uso exclusivo da equipe TECH/ADMIN). */
  async findAll() {
    throw new Error('Not implemented');
  }

  /** Incidente pelo id, de qualquer dono (uso exclusivo da equipe TECH/ADMIN). */
  // eslint-disable-next-line no-unused-vars
  async findByIdUnscoped(id) {
    throw new Error('Not implemented');
  }

  /** Salva título, descrição e equipamento e devolve o incidente atualizado. */
  // eslint-disable-next-line no-unused-vars
  async update(incident) {
    throw new Error('Not implemented');
  }

  /** Exclui o incidente e os diagnósticos dele. */
  // eslint-disable-next-line no-unused-vars
  async delete(id) {
    throw new Error('Not implemented');
  }

  /** Salva o novo status e devolve o incidente atualizado. */
  // eslint-disable-next-line no-unused-vars
  async updateStatus(id, status) {
    throw new Error('Not implemented');
  }
}
