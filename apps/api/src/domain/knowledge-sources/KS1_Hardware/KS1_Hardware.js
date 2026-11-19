import { KnowledgeSource } from '../KnowledgeSource.js';
import { applyAnalysis, collectKeywords, planAnalysis } from '../shared/keywordAnalysis.js';

const HYPOTHESIS_RULES = Object.freeze([
  {
    description: 'Possível falha ou sobrecarga na memória RAM',
    keywords: ['lento', 'travando', 'memória', 'ram'],
  },
  {
    description: 'Disco rígido com setores defeituosos',
    keywords: ['lento', 'travando', 'disco', 'barulho'],
  },
  {
    description: 'Superaquecimento do processador',
    keywords: ['travando', 'aquecendo', 'barulho', 'desliga'],
  },
]);

/** Especialista em hardware: memória, disco e temperatura. */
export class KS1_Hardware extends KnowledgeSource {
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
