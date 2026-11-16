import { describe, expect, it } from 'vitest';
import { Blackboard } from '../../blackboard/Blackboard.js';
import { Hypothesis } from '../../entities/Hypothesis.js';
import { KnowledgeSource } from '../KnowledgeSource.js';

const blackboard = () =>
  new Blackboard({ title: 'PC lento', description: 'O computador demora para abrir programas.', equipment: 'Desktop' });

describe('KnowledgeSource', () => {
  it('podeExecutar e executar lançam "Not implemented" se não forem sobrescritos', () => {
    const ks = new KnowledgeSource();

    expect(() => ks.podeExecutar(blackboard())).toThrow('Not implemented');
    expect(() => ks.executar(blackboard())).toThrow('Not implemented');
  });

  it('uma subclasse que sobrescreve os métodos funciona sobre o Blackboard', () => {
    class DummyKs extends KnowledgeSource {
      podeExecutar(bb) {
        return !bb.hasHypothesis('Disco cheio');
      }

      executar(bb) {
        bb.addHypothesis(new Hypothesis({ description: 'Disco cheio', source: this.name, confidence: 40 }));
      }
    }

    const ks = new DummyKs();
    const bb = blackboard();

    expect(ks.name).toBe('DummyKs');
    expect(ks.podeExecutar(bb)).toBe(true);

    ks.executar(bb);

    expect(bb.hypotheses[0].source).toBe('DummyKs');
    expect(ks.podeExecutar(bb)).toBe(false);
  });
});
