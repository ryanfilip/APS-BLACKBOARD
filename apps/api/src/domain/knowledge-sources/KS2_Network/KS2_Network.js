import { KnowledgeSource } from '../KnowledgeSource.js';
import { applyAnalysis, collectKeywords, planAnalysis } from '../shared/keywordAnalysis.js';

const HYPOTHESIS_RULES = Object.freeze([
  {
    description: 'Problema de resolução de DNS',
    keywords: ['dns', 'site não abre', 'lento para abrir'],
  },
  {
    description: 'Perda de pacotes na rede',
    keywords: ['internet', 'wi-fi', 'conexão', 'lento para abrir'],
  },
  {
    description: 'Falha na placa de rede ou driver',
    keywords: ['internet', 'wi-fi', 'cabo', 'conexão', 'offline'],
  },
]);

/** Especialista em rede: DNS, conectividade e placa de rede. */
export class KS2_Network extends KnowledgeSource {
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
