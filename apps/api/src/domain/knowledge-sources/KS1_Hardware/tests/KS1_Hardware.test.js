import { describe, expect, it } from 'vitest';
import { makeBlackboard, describeKeywordKnowledgeSource } from '../../tests/ksTestHelpers.js';
import { KS1_Hardware } from '../KS1_Hardware.js';

describeKeywordKnowledgeSource({
  KsClass: KS1_Hardware,
  expectedName: 'KS1_Hardware',
  specKeywords: ['lento', 'travando', 'memória', 'ram', 'disco', 'aquecendo', 'barulho', 'desliga'],
  scenario: {
    description: 'O computador está lento e travando, acho que é a memória RAM',
    equipment: 'Desktop Dell',
    expected: [
      {
        description: 'Possível falha ou sobrecarga na memória RAM',
        confidence: 80,
        symptoms: ['lento', 'travando', 'memória', 'ram'],
      },
      { description: 'Disco rígido com setores defeituosos', confidence: 60, symptoms: ['lento', 'travando'] },
      { description: 'Superaquecimento do processador', confidence: 50, symptoms: ['travando'] },
    ],
  },
});

describe('KS1_Hardware (casos específicos)', () => {
  const ks = new KS1_Hardware();

  it('"ram" só vale como palavra inteira (não casa com "programa")', () => {
    const bb = makeBlackboard({ description: 'O programa de gravação abre normalmente' });

    expect(ks.canExecute(bb)).toBe(false);
  });

  it('barulho e aquecimento apontam para disco e superaquecimento, não para RAM', () => {
    const bb = makeBlackboard({ description: 'O notebook está aquecendo e fazendo barulho' });

    ks.execute(bb);

    expect(bb.hypotheses.map((h) => h.description).sort()).toEqual([
      'Disco rígido com setores defeituosos',
      'Superaquecimento do processador',
    ]);
  });
});
