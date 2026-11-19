import { describe, expect, it } from 'vitest';
import { Blackboard } from '../../../blackboard/Blackboard.js';
import { ValidationError } from '../../../errors/DomainErrors.js';
import {
  calculateConfidence,
  collectKeywords,
  containsKeyword,
  getIncidentText,
  normalizeText,
} from '../keywordAnalysis.js';

describe('normalizeText', () => {
  it('converte para minúsculas, remove acentos e normaliza espaços', () => {
    expect(normalizeText('  Memória   RAM  Lentidão ')).toBe('memoria ram lentidao');
  });

  it('aceita valores vazios', () => {
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText(null)).toBe('');
  });
});

describe('containsKeyword', () => {
  const text = normalizeText('O programa trava; vários erros e pop-up no navegador. Site não abre!');

  it('encontra palavras inteiras, com plural simples', () => {
    expect(containsKeyword(text, 'erro')).toBe(true);
    expect(containsKeyword(text, 'navegador')).toBe(true);
    expect(containsKeyword(text, 'programa')).toBe(true);
  });

  it('não encontra a palavra dentro de outra', () => {
    expect(containsKeyword(text, 'ram')).toBe(false);
    expect(containsKeyword(text, 'rogram')).toBe(false);
    expect(containsKeyword(normalizeText('ramos e rampas'), 'ram')).toBe(false);
  });

  it('funciona com hífen e com várias palavras', () => {
    expect(containsKeyword(text, 'pop-up')).toBe(true);
    expect(containsKeyword(text, 'site não abre')).toBe(true);
    expect(containsKeyword(text, 'site abre')).toBe(false);
  });

  it('ignora maiúsculas e acentos na palavra-chave', () => {
    expect(containsKeyword(normalizeText('O SITE NÃO ABRE'), 'site nao abre')).toBe(true);
    expect(containsKeyword(normalizeText('o site nao abre'), 'Site Não Abre')).toBe(true);
    expect(containsKeyword(normalizeText('NAO ABRE O SITE'), 'Site Não Abre')).toBe(false);
  });
});

describe('getIncidentText', () => {
  it('usa description e equipment (não o título) e exige um Blackboard', () => {
    const bb = new Blackboard({ title: 'TÍTULO', description: 'Descrição Aqui', equipment: 'Equipamento X' });

    expect(getIncidentText(bb)).toBe('descricao aqui equipamento x');
    expect(() => getIncidentText({ incident: {} })).toThrow(ValidationError);
  });
});

describe('calculateConfidence', () => {
  it('começa em 50, soma 10 por palavra-chave e limita em 90', () => {
    expect([1, 2, 3, 4, 5, 9].map(calculateConfidence)).toEqual([50, 60, 70, 80, 90, 90]);
  });

  it('nunca fica abaixo de 50', () => {
    expect(calculateConfidence(0)).toBe(50);
  });
});

describe('collectKeywords', () => {
  it('une as palavras-chave das regras sem repetir', () => {
    expect(collectKeywords([{ keywords: ['a', 'b'] }, { keywords: ['b', 'c'] }])).toEqual(['a', 'b', 'c']);
  });
});
