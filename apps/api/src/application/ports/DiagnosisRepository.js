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
}
