import { describe, expect, it } from 'vitest';
import { makeBlackboard, describeKeywordKnowledgeSource } from '../../tests/ksTestHelpers.js';
import { KS4_Software } from '../KS4_Software.js';

describeKeywordKnowledgeSource({
  KsClass: KS4_Software,
  expectedName: 'KS4_Software',
  specKeywords: ['programa', 'app', 'instalação', 'erro', 'fechando', 'crash', 'word', 'excel', 'navegador'],
  scenario: {
    description: 'O Excel está fechando sozinho e dá erro ao abrir a planilha',
    equipment: 'Notebook HP',
    expected: [
      { description: 'Conflito entre aplicativos', confidence: 50, symptoms: ['fechando'] },
      {
        description: 'Software desatualizado ou corrompido',
        confidence: 70,
        symptoms: ['erro', 'fechando', 'excel'],
      },
    ],
  },
});

describe('KS4_Software (casos específicos)', () => {
  const ks = new KS4_Software();

  it('aceita plural simples ("erros", "apps")', () => {
    const bb = makeBlackboard({ description: 'Vários erros nos apps depois da migração' });

    ks.execute(bb);

    const corrupted = bb.hypotheses.find((h) => h.description === 'Software desatualizado ou corrompido');
    expect(corrupted.confidence).toBe(60);
  });

  it('"app" não casa com "aplicativo" nem com "apple"', () => {
    const bb = makeBlackboard({ description: 'Meu aplicativo favorito é da apple' });

    expect(ks.canExecute(bb)).toBe(false);
  });
});
