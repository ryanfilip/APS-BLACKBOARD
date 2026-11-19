import { ValidationError } from '../errors/DomainErrors.js';

export const DEFAULT_MAX_ITERATIONS = 10;

export const FINISHED_BY = Object.freeze({
  NO_MORE_ACTIONS: 'NO_MORE_ACTIONS',
  MAX_ITERATIONS_REACHED: 'MAX_ITERATIONS_REACHED',
});

/**
 * Control Component do padrão Blackboard: o "maestro" do diagnóstico.
 *
 * Ele não conhece nenhuma regra de TI. Só pergunta a cada Knowledge Source se ela pode
 * agir (`canExecute`), escolhe uma e manda executar (`execute`), até não restar nada a fazer.
 *
 * ESTRATÉGIA DE PRIORIDADE: ordem do array. A cada iteração, entre as Knowledge Sources
 * que podem executar, roda a de MENOR ÍNDICE na lista recebida; as demais esperam a vez
 * (a cada iteração a lista é consultada de novo, já com o Blackboard atualizado).
 * Quem monta a lista define a prioridade.
 *
 * PROTEÇÃO CONTRA LOOP INFINITO: no máximo `maxIterations` execuções. Se ainda houver
 * Knowledge Source apta a rodar quando o limite é atingido, o resultado é MAX_ITERATIONS_REACHED.
 * Se o diagnóstico terminou por conta própria, é NO_MORE_ACTIONS, mesmo que no limite exato.
 *
 * Execução síncrona. Falhas lançadas por uma Knowledge Source não são capturadas aqui.
 * Este componente também não persiste nada: apenas devolve o resultado.
 */
export class ControlComponent {
  #knowledgeSources;

  constructor({ knowledgeSources, maxIterations = DEFAULT_MAX_ITERATIONS } = {}) {
    if (!Array.isArray(knowledgeSources)) {
      throw new ValidationError('A lista de Knowledge Sources é obrigatória');
    }
    knowledgeSources.forEach((source, index) => {
      if (typeof source?.canExecute !== 'function' || typeof source?.execute !== 'function') {
        throw new ValidationError(
          `A Knowledge Source na posição ${index} deve implementar canExecute e execute`,
        );
      }
    });
    if (!Number.isInteger(maxIterations) || maxIterations < 1) {
      throw new ValidationError('maxIterations deve ser um inteiro maior ou igual a 1');
    }

    this.#knowledgeSources = [...knowledgeSources];
    this.maxIterations = maxIterations;
  }

  /** Cópia da lista, na ordem de prioridade. */
  get knowledgeSources() {
    return [...this.#knowledgeSources];
  }

  /**
   * Executa o loop de diagnóstico sobre o Blackboard recebido.
   * @returns {{ state: object, iterations: number, finishedBy: 'NO_MORE_ACTIONS' | 'MAX_ITERATIONS_REACHED' }}
   */
  run(blackboard) {
    if (typeof blackboard?.getState !== 'function') {
      throw new ValidationError('É necessário um Blackboard para executar o diagnóstico');
    }

    let iterations = 0;
    let finishedBy;

    for (;;) {
      const available = this.#knowledgeSources.filter((source) => source.canExecute(blackboard));

      if (available.length === 0) {
        finishedBy = FINISHED_BY.NO_MORE_ACTIONS;
        break;
      }
      if (iterations >= this.maxIterations) {
        finishedBy = FINISHED_BY.MAX_ITERATIONS_REACHED;
        break;
      }

      const [selected] = available;
      selected.execute(blackboard);
      iterations += 1;
    }

    return { state: blackboard.getState(), iterations, finishedBy };
  }
}
