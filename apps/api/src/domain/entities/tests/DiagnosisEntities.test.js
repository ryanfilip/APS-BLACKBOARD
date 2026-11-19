import { describe, expect, it } from 'vitest';
import { Evidence } from '../Evidence.js';
import { Fact } from '../Fact.js';
import { Hypothesis } from '../Hypothesis.js';
import { ValidationError } from '../../errors/DomainErrors.js';

describe('Fact', () => {
  it('gera id e data de criação', () => {
    const a = new Fact({ description: 'A bateria dura 10 minutos' });
    const b = new Fact({ description: 'Outro fato' });

    expect(a.id).toEqual(expect.any(String));
    expect(a.id).not.toBe(b.id);
    expect(a.createdAt).toBeInstanceOf(Date);
  });

  it('exige descrição', () => {
    expect(() => new Fact({ description: '   ' })).toThrow(ValidationError);
    expect(() => new Fact()).toThrow(ValidationError);
  });

  it('serializa a data em ISO 8601', () => {
    const fact = new Fact({ description: 'x', createdAt: new Date('2026-11-15T10:00:00Z') });

    expect(fact.toJSON().createdAt).toBe('2026-11-15T10:00:00.000Z');
  });
});

describe('Hypothesis', () => {
  const base = { description: 'Memória RAM com defeito', source: 'KS2', confidence: 70 };

  it('começa com status OPEN', () => {
    expect(new Hypothesis(base).status).toBe('OPEN');
  });

  it.each([0, 50, 100, 42.5])('aceita confiança %s', (confidence) => {
    expect(new Hypothesis({ ...base, confidence }).confidence).toBe(confidence);
  });

  it.each([-1, 101, NaN, Infinity, '70', null, undefined])('rejeita confiança %s', (confidence) => {
    expect(() => new Hypothesis({ ...base, confidence })).toThrow(ValidationError);
  });

  it('rejeita status inválido, descrição vazia e origem vazia', () => {
    expect(() => new Hypothesis({ ...base, status: 'DONE' })).toThrow(ValidationError);
    expect(() => new Hypothesis({ ...base, description: '' })).toThrow(ValidationError);
    expect(() => new Hypothesis({ ...base, source: '' })).toThrow(ValidationError);
  });

  it('confirm() e reject() mudam o status', () => {
    const h = new Hypothesis(base);

    h.confirm();
    expect(h.status).toBe('CONFIRMED');

    h.reject();
    expect(h.status).toBe('REJECTED');
  });
});

describe('Evidence', () => {
  const base = { description: 'Teste de RAM falhou', supports: 'h-1', polarity: 'SUPPORTS', source: 'KS3' };

  it('guarda o id da hipótese em supports e a polaridade', () => {
    const evidence = new Evidence(base);

    expect(evidence.supports).toBe('h-1');
    expect(evidence.polarity).toBe('SUPPORTS');
    expect(evidence.toJSON()).toEqual({ id: evidence.id, ...base });
  });

  it.each(['SUPPORTS', 'REFUTES'])('aceita a polaridade %s', (polarity) => {
    expect(new Evidence({ ...base, polarity }).polarity).toBe(polarity);
  });

  it.each([undefined, null, '', 'supports', 'NEUTRAL', true])('rejeita a polaridade %s', (polarity) => {
    expect(() => new Evidence({ ...base, polarity })).toThrow(ValidationError);
  });

  it('a polaridade é obrigatória (não há valor padrão)', () => {
    const { polarity, ...withoutPolarity } = base;

    expect(() => new Evidence(withoutPolarity)).toThrow(ValidationError);
  });

  it.each(['description', 'supports', 'source'])('exige %s', (field) => {
    expect(() => new Evidence({ ...base, [field]: '' })).toThrow(ValidationError);
  });
});
