import { KnowledgeSource } from '../KnowledgeSource.js';
import { applyAnalysis, collectKeywords, planAnalysis } from '../shared/keywordAnalysis.js';

const HYPOTHESIS_RULES = Object.freeze([
  {
    description: 'Conflito de arquivos do sistema',
    keywords: ['tela azul', 'boot', 'reiniciando', 'windows', 'linux', 'sistema'],
  },
  {
    description: 'Atualização do SO corrompida',
    keywords: ['boot', 'reiniciando', 'atualização', 'windows', 'linux'],
  },
  {
    description: 'Driver desatualizado',
    keywords: ['tela azul', 'atualização', 'windows', 'linux', 'sistema'],
  },
]);

/** Especialista em sistema operacional: boot, atualizações e drivers. */
export class KS3_OperatingSystem extends KnowledgeSource {
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
