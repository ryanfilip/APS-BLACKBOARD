import { describe, expect, it } from 'vitest';
import { makeBlackboard, describeKeywordKnowledgeSource } from '../../tests/ksTestHelpers.js';
import { KS3_OperatingSystem } from '../KS3_OperatingSystem.js';

describeKeywordKnowledgeSource({
  KsClass: KS3_OperatingSystem,
  expectedName: 'KS3_OperatingSystem',
  specKeywords: ['tela azul', 'boot', 'reiniciando', 'atualização', 'windows', 'linux', 'sistema'],
  scenario: {
    description: 'Tela azul toda vez que ligo o Windows',
    equipment: 'Notebook Acer',
    expected: [
      { description: 'Conflito de arquivos do sistema', confidence: 60, symptoms: ['tela azul', 'windows'] },
      { description: 'Atualização do SO corrompida', confidence: 50, symptoms: ['windows'] },
      { description: 'Driver desatualizado', confidence: 60, symptoms: ['tela azul', 'windows'] },
    ],
  },
});

describe('KS3_OperatingSystem (casos específicos)', () => {
  const ks = new KS3_OperatingSystem();

  it('"atualização" aponta para atualização corrompida e driver desatualizado', () => {
    const bb = makeBlackboard({ description: 'Depois da última atualização nada funciona direito' });

    ks.execute(bb);

    expect(bb.hypotheses.map((h) => h.description).sort()).toEqual([
      'Atualização do SO corrompida',
      'Driver desatualizado',
    ]);
  });

  it('reconhece "reiniciando" e "boot" no texto', () => {
    const bb = makeBlackboard({ description: 'Fica reiniciando em loop e não passa do boot' });

    ks.execute(bb);

    const conflict = bb.hypotheses.find((h) => h.description === 'Conflito de arquivos do sistema');
    expect(conflict.confidence).toBe(60);
  });
});
