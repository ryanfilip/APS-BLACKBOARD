import { describe, expect, it } from 'vitest';
import { Blackboard } from '../../blackboard/Blackboard.js';
import { Hypothesis } from '../../entities/Hypothesis.js';
import { KnowledgeSource } from '../KnowledgeSource.js';

export const IRRELEVANT = {
  title: 'Cadeira nova',
  description: 'Preciso trocar a cadeira do escritório por uma mais confortável',
  equipment: 'Cadeira giratória',
};

export function makeBlackboard({ title = 'Incidente de teste', description, equipment = 'Equipamento genérico' }) {
  return new Blackboard({ title, description, equipment });
}

const stripAccents = (text) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '');

/**
 * Contrato comum das KS baseadas em palavras-chave.
 * config: { KsClass, expectedName, specKeywords, scenario: { description, equipment, expected } }
 * expected: [{ description, confidence, symptoms }]
 */
export function describeKeywordKnowledgeSource({ KsClass, expectedName, specKeywords, scenario }) {
  describe(`${expectedName} (contrato comum)`, () => {
    const ks = new KsClass();

    it('é uma KnowledgeSource e usa o próprio nome como source', () => {
      expect(ks).toBeInstanceOf(KnowledgeSource);
      expect(ks.name).toBe(expectedName);
    });

    it('usa exatamente as palavras-chave especificadas', () => {
      expect([...ks.keywords].sort()).toEqual([...specKeywords].sort());
    });

    describe('canExecute', () => {
      it.each(specKeywords)('retorna true com a palavra-chave "%s" na descrição', (keyword) => {
        const bb = makeBlackboard({ description: `Relato do usuário: ${keyword} desde ontem` });

        expect(ks.canExecute(bb)).toBe(true);
      });

      it.each(specKeywords)('ignora maiúsculas e acentos em "%s"', (keyword) => {
        const upper = makeBlackboard({ description: `PROBLEMA: ${keyword.toUpperCase()}.` });
        const plain = makeBlackboard({ description: `problema ${stripAccents(keyword)}` });

        expect(ks.canExecute(upper)).toBe(true);
        expect(ks.canExecute(plain)).toBe(true);
      });

      it('retorna true quando a palavra-chave está só no equipamento', () => {
        const bb = makeBlackboard({
          description: 'Preciso de ajuda com o aparelho',
          equipment: `Aparelho com ${specKeywords[0]}`,
        });

        expect(ks.canExecute(bb)).toBe(true);
      });

      it('retorna false com texto irrelevante', () => {
        expect(ks.canExecute(new Blackboard(IRRELEVANT))).toBe(false);
      });

      it('não analisa o título do incidente (apenas description e equipment)', () => {
        const bb = makeBlackboard({
          title: specKeywords[0],
          description: IRRELEVANT.description,
          equipment: IRRELEVANT.equipment,
        });

        expect(ks.canExecute(bb)).toBe(false);
      });
    });

    describe('execute', () => {
      const run = () => {
        const bb = makeBlackboard(scenario);
        ks.execute(bb);
        return bb;
      };

      it('adiciona as hipóteses corretas com confiança entre 50 e 90', () => {
        const bb = run();

        expect(bb.hypotheses.map((h) => h.description).sort()).toEqual(
          scenario.expected.map((e) => e.description).sort(),
        );
        for (const expected of scenario.expected) {
          const hypothesis = bb.hypotheses.find((h) => h.description === expected.description);
          expect(hypothesis.source).toBe(expectedName);
          expect(hypothesis.status).toBe('OPEN');
          expect(hypothesis.confidence).toBe(expected.confidence);
          expect(hypothesis.confidence).toBeGreaterThanOrEqual(50);
          expect(hypothesis.confidence).toBeLessThanOrEqual(90);
        }
      });

      it('adiciona evidências SUPPORTS ligando cada sintoma encontrado à hipótese', () => {
        const bb = run();

        for (const expected of scenario.expected) {
          const hypothesis = bb.hypotheses.find((h) => h.description === expected.description);
          const evidences = bb.getEvidencesFor(hypothesis.id);

          expect(evidences.length).toBeGreaterThanOrEqual(1);
          expect(evidences.map((e) => e.description).sort()).toEqual(
            expected.symptoms.map((symptom) => `Sintoma '${symptom}' relatado`).sort(),
          );
          for (const evidence of evidences) {
            expect(evidence.polarity).toBe('SUPPORTS');
            expect(evidence.supports).toBe(hypothesis.id);
            expect(evidence.source).toBe(expectedName);
          }
        }
        expect(bb.evidences.every((e) => e.polarity === 'SUPPORTS')).toBe(true);
      });

      it('não roda duas vezes: canExecute vira false e um novo execute não muda o estado', () => {
        const bb = run();
        const before = bb.getState();

        expect(ks.canExecute(bb)).toBe(false);
        ks.execute(bb);

        expect(bb.getState()).toEqual(before);
      });

      it('não altera o Blackboard quando o texto é irrelevante', () => {
        const bb = new Blackboard(IRRELEVANT);
        const before = bb.getState();

        ks.execute(bb);

        expect(bb.getState()).toEqual(before);
      });

      it('gera apenas as hipóteses que ainda não estão no Blackboard', () => {
        const bb = makeBlackboard(scenario);
        const [first, ...rest] = scenario.expected;
        bb.addHypothesis(new Hypothesis({ description: first.description, source: 'OUTRA_KS', confidence: 55 }));

        expect(ks.canExecute(bb)).toBe(rest.length > 0);
        ks.execute(bb);

        expect(bb.hypotheses).toHaveLength(scenario.expected.length);
        expect(bb.hypotheses.find((h) => h.description === first.description).source).toBe('OUTRA_KS');
        expect(bb.getEvidencesFor(bb.hypotheses[0].id)).toEqual([]);
        expect(ks.canExecute(bb)).toBe(false);
      });

      it.each(specKeywords)('toda palavra-chave ("%s") gera ao menos uma hipótese com evidência', (keyword) => {
        const bb = makeBlackboard({ description: `Problema: ${keyword}` });

        ks.execute(bb);

        expect(bb.hypotheses.length).toBeGreaterThanOrEqual(1);
        for (const hypothesis of bb.hypotheses) {
          expect(hypothesis.confidence).toBeGreaterThanOrEqual(50);
          expect(hypothesis.confidence).toBeLessThanOrEqual(90);
          const evidences = bb.getEvidencesFor(hypothesis.id, 'SUPPORTS');
          expect(evidences.length).toBeGreaterThanOrEqual(1);
        }
      });
    });
  });
}
