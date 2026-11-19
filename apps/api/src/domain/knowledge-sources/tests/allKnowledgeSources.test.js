import { describe, expect, it } from 'vitest';
import { Blackboard } from '../../blackboard/Blackboard.js';
import { KS1_Hardware, KS2_Network, KS3_OperatingSystem, KS4_Software, KS5_Security, KnowledgeSource } from '../index.js';

const allKnowledgeSources = () => [
  new KS1_Hardware(),
  new KS2_Network(),
  new KS3_OperatingSystem(),
  new KS4_Software(),
  new KS5_Security(),
];

describe('as 5 Knowledge Sources juntas', () => {
  it('todas estendem KnowledgeSource e têm nomes distintos', () => {
    const sources = allKnowledgeSources();

    expect(sources.every((ks) => ks instanceof KnowledgeSource)).toBe(true);
    expect(new Set(sources.map((ks) => ks.name)).size).toBe(5);
  });

  it('colaboram apenas via Blackboard e deixam um estado serializável', () => {
    const bb = new Blackboard({
      title: 'Computador muito ruim',
      description: 'Está lento, a internet cai e aparece tela azul depois de abrir o Excel',
      equipment: 'Desktop Dell',
    });

    const triggered = allKnowledgeSources().filter((ks) => ks.canExecute(bb));
    triggered.forEach((ks) => ks.execute(bb));

    expect(triggered.map((ks) => ks.name)).toEqual(['KS1_Hardware', 'KS2_Network', 'KS3_OperatingSystem', 'KS4_Software']);
    expect(new Set(bb.hypotheses.map((h) => h.source))).toEqual(new Set(triggered.map((ks) => ks.name)));
    expect(allKnowledgeSources().some((ks) => ks.canExecute(bb))).toBe(false);

    const ranked = bb.getHypotheses().map((h) => h.confidence);
    expect(ranked).toEqual([...ranked].sort((a, b) => b - a));

    const state = bb.getState();
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    expect(state.evidences.every((e) => e.polarity === 'SUPPORTS')).toBe(true);
  });
});
