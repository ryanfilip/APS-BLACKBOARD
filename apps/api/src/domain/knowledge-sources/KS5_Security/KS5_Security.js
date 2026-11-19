import { KnowledgeSource } from '../KnowledgeSource.js';
import { applyAnalysis, collectKeywords, planAnalysis } from '../shared/keywordAnalysis.js';

const HYPOTHESIS_RULES = Object.freeze([
  {
    description: 'Possível infecção por malware',
    keywords: ['vírus', 'ransomware', 'pop-up', 'lentidão extrema', 'bloqueado'],
  },
  {
    description: 'Política de permissões restritiva',
    keywords: ['permissão', 'acesso negado', 'bloqueado'],
  },
  {
    description: 'Firewall bloqueando serviço',
    keywords: ['acesso negado', 'bloqueado'],
  },
]);

/** Especialista em segurança: malware, permissões e firewall. */
export class KS5_Security extends KnowledgeSource {
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
