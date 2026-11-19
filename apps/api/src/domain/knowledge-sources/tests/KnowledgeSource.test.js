import { describe, expect, it } from 'vitest';
import { Blackboard } from '../../blackboard/Blackboard.js';
import { Hypothesis } from '../../entities/Hypothesis.js';
import { KnowledgeSource } from '../KnowledgeSource.js';

const blackboard = () =>
  new Blackboard({ title: 'PC lento', description: 'O computador demora para abrir programas.', equipment: 'Desktop' });

describe('KnowledgeSource', () => {
  it('canExecute e execute lançam "Not implemented" se não forem sobrescritos', () => {
    const ks = new KnowledgeSource();

    expect(() => ks.canExecute(blackboard())).toThrow('Not implemented');
    expect(() => ks.execute(blackboard())).toThrow('Not implemented');
  });

  it('uma subclasse que sobrescreve os métodos funciona sobre o Blackboard', () => {
    class DummyKs extends KnowledgeSource {
      canExecute(bb) {
        return !bb.hasHypothesis('Disco cheio');
      }

      execute(bb) {
        bb.addHypothesis(new Hypothesis({ description: 'Disco cheio', source: this.name, confidence: 40 }));
      }
    }

    const ks = new DummyKs();
    const bb = blackboard();

    expect(ks.name).toBe('DummyKs');
    expect(ks.canExecute(bb)).toBe(true);

    ks.execute(bb);

    expect(bb.hypotheses[0].source).toBe('DummyKs');
    expect(ks.canExecute(bb)).toBe(false);
  });
});
