import { KnowledgeSource } from '../KnowledgeSource.js';
import { applyAnalysis, collectKeywords, planAnalysis } from '../shared/keywordAnalysis.js';

const HYPOTHESIS_RULES = Object.freeze([
  {
    description: 'Conflito entre aplicativos',
    keywords: ['programa', 'app', 'instalação', 'fechando', 'crash', 'navegador'],
  },
  {
    description: 'Software desatualizado ou corrompido',
    keywords: ['programa', 'app', 'instalação', 'erro', 'fechando', 'crash', 'word', 'excel', 'navegador'],
  },
]);

/** Especialista em software de aplicação: programas, instalações e falhas de execução. */
export class KS4_Software extends KnowledgeSource {
  get keywords() {
    return collectKeywords(HYPOTHESIS_RULES);
  }

  canExecute(blackboard) {
    return planAnalysis(blackboard, HYPOTHESIS_RULES).length > 0;
  }

  execute(blackboard) {
    applyAnalysis(blackboard, planAnalysis(blackboard, HYPOTHESIS_RULES), this.name);
  }
}
