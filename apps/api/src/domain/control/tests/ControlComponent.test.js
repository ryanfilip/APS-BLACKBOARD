import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Blackboard } from '../../blackboard/Blackboard.js';
import { Hypothesis } from '../../entities/Hypothesis.js';
import { ValidationError } from '../../errors/DomainErrors.js';
import { KnowledgeSource } from '../../knowledge-sources/KnowledgeSource.js';
import { KS1_Hardware } from '../../knowledge-sources/KS1_Hardware/KS1_Hardware.js';
import { KS2_Network } from '../../knowledge-sources/KS2_Network/KS2_Network.js';
import { KS3_OperatingSystem } from '../../knowledge-sources/KS3_OperatingSystem/KS3_OperatingSystem.js';
import { KS4_Software } from '../../knowledge-sources/KS4_Software/KS4_Software.js';
import { KS5_Security } from '../../knowledge-sources/KS5_Security/KS5_Security.js';
import { containsKeyword, normalizeText } from '../../knowledge-sources/shared/keywordAnalysis.js';
import { ControlComponent, DEFAULT_MAX_ITERATIONS, FINISHED_BY } from '../ControlComponent.js';

const makeBlackboard = () =>
  new Blackboard({
    title: 'Incidente de teste',
    description: 'Descrição qualquer do incidente',
    equipment: 'Equipamento genérico',
  });

/** KS falsa: pode executar até `maxRuns` vezes e registra a ordem global de execução. */
class FakeKs extends KnowledgeSource {
  constructor(label, { maxRuns = 1, log = [] } = {}) {
    super();
    this.label = label;
    this.maxRuns = maxRuns;
    this.runs = 0;
    this.log = log;
  }

  get name() {
    return this.label;
  }

  canExecute() {
    return this.runs < this.maxRuns;
  }

  execute() {
    this.runs += 1;
    this.log.push(this.label);
  }
}

/** KS falsa que sempre diz que pode executar (força o limite de iterações). */
const alwaysReady = () => ({ canExecute: () => true, execute: vi.fn() });

describe('ControlComponent', () => {
  describe('Teste 1: nenhuma KS pode executar inicialmente', () => {
    it('termina com NO_MORE_ACTIONS e 0 iterações (todas as KS retornam false)', () => {
      const idle = { canExecute: vi.fn(() => false), execute: vi.fn() };
      const control = new ControlComponent({ knowledgeSources: [idle, idle] });
      const blackboard = makeBlackboard();
      const initialState = blackboard.getState();

      const result = control.run(blackboard);

      expect(result).toEqual({ state: initialState, iterations: 0, finishedBy: 'NO_MORE_ACTIONS' });
      expect(idle.execute).not.toHaveBeenCalled();
    });

    it('também termina de imediato com a lista de KS vazia', () => {
      const result = new ControlComponent({ knowledgeSources: [] }).run(makeBlackboard());

      expect(result.iterations).toBe(0);
      expect(result.finishedBy).toBe('NO_MORE_ACTIONS');
    });
  });

  describe('Teste 2: executa KS em sequência até todas retornarem false', () => {
    it('roda cada KS pela ordem do array e finaliza com NO_MORE_ACTIONS', () => {
      const log = [];
      const sources = [new FakeKs('A', { log }), new FakeKs('B', { log }), new FakeKs('C', { log })];

      const result = new ControlComponent({ knowledgeSources: sources }).run(makeBlackboard());

      expect(log).toEqual(['A', 'B', 'C']);
      expect(result.iterations).toBe(3);
      expect(result.finishedBy).toBe('NO_MORE_ACTIONS');
      expect(sources.every((ks) => ks.canExecute() === false)).toBe(true);
    });

    it('a ordem emerge do estado do Blackboard: uma KS só age depois que outra escreveu nele', () => {
      const log = [];

      class Producer extends KnowledgeSource {
        canExecute(bb) {
          return !bb.hasHypothesis('Hipótese inicial');
        }
        execute(bb) {
          log.push('producer');
          bb.addHypothesis(new Hypothesis({ description: 'Hipótese inicial', source: 'producer', confidence: 60 }));
        }
      }
      class Refiner extends KnowledgeSource {
        canExecute(bb) {
          return bb.hasHypothesis('Hipótese inicial') && !bb.hasHypothesis('Hipótese refinada');
        }
        execute(bb) {
          log.push('refiner');
          bb.addHypothesis(new Hypothesis({ description: 'Hipótese refinada', source: 'refiner', confidence: 80 }));
        }
      }

      // O Refiner vem primeiro na lista, mas só passa a poder agir depois do Producer.
      const result = new ControlComponent({ knowledgeSources: [new Refiner(), new Producer()] }).run(
        makeBlackboard(),
      );

      expect(log).toEqual(['producer', 'refiner']);
      expect(result.iterations).toBe(2);
      expect(result.finishedBy).toBe('NO_MORE_ACTIONS');
      expect(result.state.hypotheses.map((h) => h.description)).toEqual(['Hipótese inicial', 'Hipótese refinada']);
    });

    it('prioridade: com várias KS aptas, executa apenas a de menor índice por iteração', () => {
      const log = [];
      const first = new FakeKs('primeira', { maxRuns: 2, log });
      const second = new FakeKs('segunda', { maxRuns: 2, log });

      new ControlComponent({ knowledgeSources: [first, second], maxIterations: 1 }).run(makeBlackboard());

      expect(log).toEqual(['primeira']);
      expect(second.runs).toBe(0);
    });

    it('uma KS de menor índice que volta a poder agir passa na frente das demais', () => {
      const log = [];
      const first = new FakeKs('primeira', { maxRuns: 2, log });
      const second = new FakeKs('segunda', { maxRuns: 1, log });

      new ControlComponent({ knowledgeSources: [first, second] }).run(makeBlackboard());

      expect(log).toEqual(['primeira', 'primeira', 'segunda']);
    });
  });

  describe('Teste 3: limite de iterações', () => {
    it('para em maxIterations e avisa MAX_ITERATIONS_REACHED (KS que sempre pode executar)', () => {
      const stubborn = alwaysReady();
      const control = new ControlComponent({ knowledgeSources: [stubborn], maxIterations: 3 });

      const result = control.run(makeBlackboard());

      expect(result.iterations).toBe(3);
      expect(result.finishedBy).toBe('MAX_ITERATIONS_REACHED');
      expect(stubborn.execute).toHaveBeenCalledTimes(3);
    });

    it('usa 10 como limite padrão', () => {
      const stubborn = alwaysReady();
      const control = new ControlComponent({ knowledgeSources: [stubborn] });

      const result = control.run(makeBlackboard());

      expect(control.maxIterations).toBe(DEFAULT_MAX_ITERATIONS);
      expect(DEFAULT_MAX_ITERATIONS).toBe(10);
      expect(result.iterations).toBe(10);
      expect(result.finishedBy).toBe('MAX_ITERATIONS_REACHED');
    });

    it('se o diagnóstico termina exatamente no limite, o motivo é NO_MORE_ACTIONS', () => {
      const sources = [new FakeKs('A'), new FakeKs('B')];

      const result = new ControlComponent({ knowledgeSources: sources, maxIterations: 2 }).run(makeBlackboard());

      expect(result.iterations).toBe(2);
      expect(result.finishedBy).toBe('NO_MORE_ACTIONS');
    });

    it('nunca executa mais do que maxIterations vezes', () => {
      const stubborn = alwaysReady();

      new ControlComponent({ knowledgeSources: [stubborn, alwaysReady()], maxIterations: 4 }).run(makeBlackboard());

      expect(stubborn.execute).toHaveBeenCalledTimes(4);
    });
  });

  describe('resultado', () => {
    it('devolve exatamente { state, iterations, finishedBy }, com o estado serializável do Blackboard', () => {
      const blackboard = makeBlackboard();
      const result = new ControlComponent({ knowledgeSources: [new FakeKs('A')] }).run(blackboard);

      expect(Object.keys(result).sort()).toEqual(['finishedBy', 'iterations', 'state']);
      expect(result.state).toEqual(blackboard.getState());
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
      expect(Object.values(FINISHED_BY)).toContain(result.finishedBy);
    });

    it('rodar de novo sobre o mesmo Blackboard não repete o trabalho das KS reais', () => {
      const blackboard = new Blackboard({
        title: 'PC',
        description: 'Computador lento e sem internet',
        equipment: 'Desktop',
      });
      const control = new ControlComponent({ knowledgeSources: [new KS1_Hardware(), new KS2_Network()] });

      const first = control.run(blackboard);
      const second = control.run(blackboard);

      expect(first.iterations).toBe(2);
      expect(second.iterations).toBe(0);
      expect(second.state).toEqual(first.state);
    });
  });

  describe('validações', () => {
    it.each([undefined, null, 'KS1', {}, 42])('exige um array de KS (recebeu %j)', (knowledgeSources) => {
      expect(() => new ControlComponent({ knowledgeSources })).toThrow(ValidationError);
    });

    it('exige canExecute e execute em todos os itens', () => {
      expect(() => new ControlComponent({ knowledgeSources: [{ canExecute: () => true }] })).toThrow(ValidationError);
      expect(() => new ControlComponent({ knowledgeSources: [null] })).toThrow(ValidationError);
    });

    it.each([0, -1, 1.5, '10', NaN, null])('rejeita maxIterations %j', (maxIterations) => {
      expect(() => new ControlComponent({ knowledgeSources: [], maxIterations })).toThrow(ValidationError);
    });

    it('run exige um Blackboard', () => {
      const control = new ControlComponent({ knowledgeSources: [] });

      expect(() => control.run(undefined)).toThrow(ValidationError);
      expect(() => control.run({})).toThrow(ValidationError);
    });

    it('a lista de KS é copiada: alterar o array original não muda o Control', () => {
      const sources = [new FakeKs('A')];
      const control = new ControlComponent({ knowledgeSources: sources });

      sources.push(new FakeKs('B'));
      control.knowledgeSources.push(new FakeKs('C'));

      expect(control.knowledgeSources).toHaveLength(1);
    });
  });

  describe('não conhece regras de TI', () => {
    it('o código-fonte não contém nenhuma palavra-chave das Knowledge Sources', () => {
      const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'ControlComponent.js');
      const source = normalizeText(readFileSync(file, 'utf8'));
      const keywords = [
        ...new KS1_Hardware().keywords,
        ...new KS2_Network().keywords,
        ...new KS3_OperatingSystem().keywords,
        ...new KS4_Software().keywords,
        ...new KS5_Security().keywords,
      ];

      const found = keywords.filter((keyword) => containsKeyword(source, keyword));

      expect(found).toEqual([]);
    });
  });
});
