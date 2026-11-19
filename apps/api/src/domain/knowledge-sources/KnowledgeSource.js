/**
 * Classe base (abstrata) de todos os especialistas (KS1 a KS5).
 * Cada Knowledge Source lê o Blackboard e escreve nele; nunca conhece as outras KS.
 * Quem decide a ordem de execução é o Control Component (Bloco 6).
 */
export class KnowledgeSource {
  /** Nome usado como `source` nas hipóteses e evidências geradas. Pode ser sobrescrito. */
  get name() {
    return this.constructor.name;
  }

  /** Retorna true se esta KS tem regras aplicáveis ao estado atual do Blackboard. */
  // eslint-disable-next-line no-unused-vars
  canExecute(blackboard) {
    throw new Error('Not implemented');
  }

  /** Executa a análise, adicionando hipóteses e/ou evidências ao Blackboard. */
  // eslint-disable-next-line no-unused-vars
  execute(blackboard) {
    throw new Error('Not implemented');
  }
}
