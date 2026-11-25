/**
 * Porta (interface abstrata) de persistência de diagnósticos.
 * A checagem de que o incidente pertence ao usuário é feita nos casos de uso
 * (via IncidentRepository) antes de qualquer chamada a esta porta.
 */
export class DiagnosisRepository {
  /** Salva um diagnóstico ({ incidentId, state, iterations, finishedBy }) e devolve o registro salvo. */
  // eslint-disable-next-line no-unused-vars
  async create(diagnosisData) {
    throw new Error('Not implemented');
  }

  /** Devolve o diagnóstico mais recente do incidente, ou null se ainda não houver. */
  // eslint-disable-next-line no-unused-vars
  async findByIncidentId(incidentId) {
    throw new Error('Not implemented');
  }

  /** Todos os diagnósticos do incidente, do mais recente para o mais antigo. */
  // eslint-disable-next-line no-unused-vars
  async findAllByIncidentId(incidentId) {
    throw new Error('Not implemented');
  }

  /** Diagnóstico pelo id, ou null. */
  // eslint-disable-next-line no-unused-vars
  async findById(id) {
    throw new Error('Not implemented');
  }

  /** Salva um novo `state` (ex.: após a revisão de uma hipótese) e devolve o diagnóstico atualizado. */
  // eslint-disable-next-line no-unused-vars
  async updateState(id, state) {
    throw new Error('Not implemented');
  }
}
