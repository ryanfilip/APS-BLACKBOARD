import { describe, expect, it } from 'vitest';
import { makeBlackboard, describeKeywordKnowledgeSource } from '../../tests/ksTestHelpers.js';
import { KS5_Security } from '../KS5_Security.js';

describeKeywordKnowledgeSource({
  KsClass: KS5_Security,
  expectedName: 'KS5_Security',
  specKeywords: ['vírus', 'bloqueado', 'permissão', 'lentidão extrema', 'ransomware', 'acesso negado', 'pop-up'],
  scenario: {
    description: 'O arquivo está bloqueado com acesso negado e aparece pop-up de vírus',
    equipment: 'Notebook Samsung',
    expected: [
      {
        description: 'Possível infecção por malware',
        confidence: 70,
        symptoms: ['vírus', 'pop-up', 'bloqueado'],
      },
      { description: 'Política de permissões restritiva', confidence: 60, symptoms: ['acesso negado', 'bloqueado'] },
      { description: 'Firewall bloqueando serviço', confidence: 60, symptoms: ['acesso negado', 'bloqueado'] },
    ],
  },
});

describe('KS5_Security (casos específicos)', () => {
  const ks = new KS5_Security();

  it('"ransomware" gera somente a hipótese de malware', () => {
    const bb = makeBlackboard({ description: 'Os arquivos foram criptografados por um ransomware' });

    ks.execute(bb);

    expect(bb.hypotheses.map((h) => h.description)).toEqual(['Possível infecção por malware']);
  });

  it('"permissão" gera somente a hipótese de política de permissões', () => {
    const bb = makeBlackboard({ description: 'Não tenho permissão para abrir a pasta' });

    ks.execute(bb);

    expect(bb.hypotheses.map((h) => h.description)).toEqual(['Política de permissões restritiva']);
  });
});
