import { beforeEach, describe, expect, it } from 'vitest';
import { Blackboard } from '../Blackboard.js';
import { Evidence } from '../../entities/Evidence.js';
import { Fact } from '../../entities/Fact.js';
import { Hypothesis } from '../../entities/Hypothesis.js';
import { ValidationError } from '../../errors/DomainErrors.js';

const incident = {
  title: 'Notebook não liga',
  description: 'Ao apertar o botão de energia nada acontece, nem as luzes acendem.',
  equipment: 'Notebook Dell Inspiron',
};

const hypothesis = (overrides = {}) =>
  new Hypothesis({
    description: 'Fonte de alimentação com defeito',
    source: 'KS1',
    confidence: 60,
    ...overrides,
  });

describe('Blackboard', () => {
  let blackboard;

  beforeEach(() => {
    blackboard = new Blackboard(incident);
  });

  describe('construtor', () => {
    it('adiciona o incidente original como o primeiro Fact', () => {
      expect(blackboard.facts).toHaveLength(1);

      const [first] = blackboard.facts;
      expect(first).toBeInstanceOf(Fact);
      expect(first.description).toContain(incident.title);
      expect(first.description).toContain(incident.equipment);
      expect(first.description).toContain(incident.description);
    });

    it('começa sem hipóteses nem evidências e expõe os dados originais', () => {
      expect(blackboard.hypotheses).toEqual([]);
      expect(blackboard.evidences).toEqual([]);
      expect(blackboard.incident).toEqual(incident);
      expect(Object.isFrozen(blackboard.incident)).toBe(true);
    });

    it.each(['title', 'description', 'equipment'])('lança ValidationError sem %s', (field) => {
      expect(() => new Blackboard({ ...incident, [field]: '  ' })).toThrow(ValidationError);
    });
  });

  describe('addFact', () => {
    it('adiciona o fato depois do incidente inicial', () => {
      const fact = new Fact({ description: 'O equipamento tem 4 anos de uso' });

      expect(blackboard.addFact(fact)).toBe(true);

      expect(blackboard.facts).toHaveLength(2);
      expect(blackboard.facts[1]).toBe(fact);
    });

    it('rejeita valores que não são Fact', () => {
      expect(() => blackboard.addFact({ description: 'objeto solto' })).toThrow(ValidationError);
    });

    it('rejeita fato com id repetido', () => {
      const fact = new Fact({ description: 'Fato A' });
      blackboard.addFact(fact);

      expect(() => blackboard.addFact(new Fact({ id: fact.id, description: 'Fato B' }))).toThrow(
        ValidationError,
      );
    });
  });

  describe('addHypothesis / hasHypothesis', () => {
    it('adiciona uma hipótese nova', () => {
      expect(blackboard.addHypothesis(hypothesis())).toBe(true);
      expect(blackboard.hypotheses).toHaveLength(1);
    });

    it('não adiciona hipótese duplicada (mesma descrição)', () => {
      blackboard.addHypothesis(hypothesis());

      const added = blackboard.addHypothesis(hypothesis({ source: 'KS2', confidence: 95 }));

      expect(added).toBe(false);
      expect(blackboard.hypotheses).toHaveLength(1);
      expect(blackboard.hypotheses[0].source).toBe('KS1');
    });

    it('ignora maiúsculas, acentos e espaços repetidos na comparação', () => {
      blackboard.addHypothesis(hypothesis({ description: 'Memória RAM com defeito' }));

      expect(blackboard.hasHypothesis('memoria   ram COM defeito ')).toBe(true);
      expect(
        blackboard.addHypothesis(hypothesis({ description: 'MEMORIA RAM com defeito' })),
      ).toBe(false);
    });

    it('hasHypothesis retorna false para descrição desconhecida ou vazia', () => {
      blackboard.addHypothesis(hypothesis());

      expect(blackboard.hasHypothesis('Placa-mãe queimada')).toBe(false);
      expect(blackboard.hasHypothesis('')).toBe(false);
      expect(blackboard.hasHypothesis(undefined)).toBe(false);
    });

    it('rejeita valores que não são Hypothesis', () => {
      expect(() => blackboard.addHypothesis({ description: 'x', confidence: 10 })).toThrow(
        ValidationError,
      );
    });
  });

  describe('addEvidence', () => {
    it('adiciona evidência ligada a uma hipótese existente', () => {
      const h = hypothesis();
      blackboard.addHypothesis(h);
      const evidence = new Evidence({
        description: 'Nenhum LED acende com o carregador conectado',
        supports: h.id,
        polarity: 'SUPPORTS',
        source: 'KS1',
      });

      expect(blackboard.addEvidence(evidence)).toBe(true);

      expect(blackboard.evidences).toEqual([evidence]);
      expect(blackboard.getEvidencesFor(h.id)).toEqual([evidence]);
      expect(blackboard.getEvidencesFor('outro-id')).toEqual([]);
    });

    it('lança ValidationError quando a hipótese referenciada não existe', () => {
      const evidence = new Evidence({
        description: 'Teste',
        supports: 'inexistente',
        polarity: 'SUPPORTS',
        source: 'KS1',
      });

      expect(() => blackboard.addEvidence(evidence)).toThrow(ValidationError);
      expect(blackboard.evidences).toHaveLength(0);
    });

    it('rejeita valores que não são Evidence', () => {
      expect(() => blackboard.addEvidence({ supports: 'x' })).toThrow(ValidationError);
    });

    it('não adiciona evidência duplicada (mesma hipótese, polaridade e descrição)', () => {
      const h = hypothesis();
      blackboard.addHypothesis(h);
      const make = (overrides = {}) =>
        new Evidence({
          description: 'Sintoma de superaquecimento',
          supports: h.id,
          polarity: 'SUPPORTS',
          source: 'KS1',
          ...overrides,
        });

      expect(blackboard.addEvidence(make())).toBe(true);
      expect(blackboard.addEvidence(make({ description: 'sintoma de SUPERAQUECIMENTO' }))).toBe(false);
      expect(blackboard.evidences).toHaveLength(1);
    });

    it('a mesma descrição com polaridade oposta não é duplicata', () => {
      const h = hypothesis();
      blackboard.addHypothesis(h);
      const make = (polarity) =>
        new Evidence({ description: 'Ventoinha funcionando', supports: h.id, polarity, source: 'KS1' });

      expect(blackboard.addEvidence(make('SUPPORTS'))).toBe(true);
      expect(blackboard.addEvidence(make('REFUTES'))).toBe(true);
      expect(blackboard.evidences).toHaveLength(2);
    });

    it('getEvidencesFor filtra pela polaridade quando ela é informada', () => {
      const h = hypothesis();
      blackboard.addHypothesis(h);
      const supports = new Evidence({
        description: 'Computador desliga sozinho',
        supports: h.id,
        polarity: 'SUPPORTS',
        source: 'KS1',
      });
      const refutes = new Evidence({
        description: 'Temperatura normal no teste',
        supports: h.id,
        polarity: 'REFUTES',
        source: 'KS1',
      });
      blackboard.addEvidence(supports);
      blackboard.addEvidence(refutes);

      expect(blackboard.getEvidencesFor(h.id)).toEqual([supports, refutes]);
      expect(blackboard.getEvidencesFor(h.id, 'SUPPORTS')).toEqual([supports]);
      expect(blackboard.getEvidencesFor(h.id, 'REFUTES')).toEqual([refutes]);
    });
  });

  describe('getHypotheses', () => {
    it('ordena da maior para a menor confiança (90 antes de 50)', () => {
      blackboard.addHypothesis(hypothesis({ description: 'Bateria descarregada', confidence: 50 }));
      blackboard.addHypothesis(hypothesis({ description: 'Placa-mãe com defeito', confidence: 90 }));
      blackboard.addHypothesis(hypothesis({ description: 'Cabo de energia solto', confidence: 70 }));

      expect(blackboard.getHypotheses().map((h) => h.confidence)).toEqual([90, 70, 50]);
    });

    it('mantém a ordem de inserção nos empates', () => {
      blackboard.addHypothesis(hypothesis({ description: 'Hipótese A', confidence: 60 }));
      blackboard.addHypothesis(hypothesis({ description: 'Hipótese B', confidence: 60 }));

      expect(blackboard.getHypotheses().map((h) => h.description)).toEqual([
        'Hipótese A',
        'Hipótese B',
      ]);
    });

    it('não altera a ordem interna de inserção', () => {
      blackboard.addHypothesis(hypothesis({ description: 'Baixa', confidence: 10 }));
      blackboard.addHypothesis(hypothesis({ description: 'Alta', confidence: 99 }));

      blackboard.getHypotheses();

      expect(blackboard.hypotheses.map((h) => h.description)).toEqual(['Baixa', 'Alta']);
    });
  });

  describe('getState', () => {
    it('retorna a estrutura completa (incidente, fatos, hipóteses e evidências)', () => {
      const h = hypothesis({ confidence: 80 });
      blackboard.addHypothesis(h);
      blackboard.addEvidence(
        new Evidence({
          description: 'Sem LEDs acesos',
          supports: h.id,
          polarity: 'REFUTES',
          source: 'KS1',
        }),
      );

      const state = blackboard.getState();

      expect(Object.keys(state).sort()).toEqual(['evidences', 'facts', 'hypotheses', 'incident']);
      expect(state.incident).toEqual(incident);
      expect(state.facts).toHaveLength(1);
      expect(state.facts[0]).toEqual({
        id: expect.any(String),
        description: expect.stringContaining(incident.title),
        createdAt: expect.any(String),
      });
      expect(state.hypotheses).toEqual([
        {
          id: h.id,
          description: 'Fonte de alimentação com defeito',
          source: 'KS1',
          confidence: 80,
          status: 'OPEN',
        },
      ]);
      expect(state.evidences).toEqual([
        {
          id: expect.any(String),
          description: 'Sem LEDs acesos',
          supports: h.id,
          polarity: 'REFUTES',
          source: 'KS1',
        },
      ]);
    });

    it('é serializável em JSON sem perda', () => {
      blackboard.addHypothesis(hypothesis());

      const state = blackboard.getState();

      expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    });

    it('devolve cópias: alterar o estado retornado não afeta o Blackboard', () => {
      blackboard.addHypothesis(hypothesis());

      const state = blackboard.getState();
      state.hypotheses[0].description = 'adulterada';
      state.facts.length = 0;

      expect(blackboard.getState().hypotheses[0].description).toBe('Fonte de alimentação com defeito');
      expect(blackboard.getState().facts).toHaveLength(1);
    });
  });

  it('as cópias expostas em facts/hypotheses/evidences não permitem burlar as validações', () => {
    blackboard.facts.push(new Fact({ description: 'tentativa de burlar' }));
    blackboard.hypotheses.push(hypothesis());

    expect(blackboard.facts).toHaveLength(1);
    expect(blackboard.hypotheses).toHaveLength(0);
  });
});
