import { describe, expect, it } from 'vitest';
import { makeBlackboard, describeKeywordKnowledgeSource } from '../../tests/ksTestHelpers.js';
import { KS2_Network } from '../KS2_Network.js';

describeKeywordKnowledgeSource({
  KsClass: KS2_Network,
  expectedName: 'KS2_Network',
  specKeywords: ['internet', 'wi-fi', 'cabo', 'conexão', 'dns', 'lento para abrir', 'site não abre', 'offline'],
  scenario: {
    description: 'Estou sem internet, o wi-fi conecta mas o site não abre',
    equipment: 'Notebook Lenovo',
    expected: [
      { description: 'Problema de resolução de DNS', confidence: 50, symptoms: ['site não abre'] },
      { description: 'Perda de pacotes na rede', confidence: 60, symptoms: ['internet', 'wi-fi'] },
      { description: 'Falha na placa de rede ou driver', confidence: 60, symptoms: ['internet', 'wi-fi'] },
    ],
  },
});

describe('KS2_Network (casos específicos)', () => {
  const ks = new KS2_Network();

  it('"dns" isolado gera apenas a hipótese de DNS', () => {
    const bb = makeBlackboard({ description: 'Acho que o dns está errado' });

    ks.execute(bb);

    expect(bb.hypotheses.map((h) => h.description)).toEqual(['Problema de resolução de DNS']);
  });

  it('expressões com várias palavras exigem a expressão completa', () => {
    const bb = makeBlackboard({ description: 'O site está bom, mas o processo é lento' });

    expect(ks.canExecute(bb)).toBe(false);
  });
});
