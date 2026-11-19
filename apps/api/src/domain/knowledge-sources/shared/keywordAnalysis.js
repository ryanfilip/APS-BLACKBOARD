import { Blackboard } from '../../blackboard/Blackboard.js';
import { Evidence } from '../../entities/Evidence.js';
import { Hypothesis } from '../../entities/Hypothesis.js';
import { ValidationError } from '../../errors/DomainErrors.js';

/**
 * Análise de palavras-chave compartilhada pelas Knowledge Sources.
 *
 * Cada KS declara regras no formato { description, keywords: [...] }: a hipótese
 * `description` é gerada quando alguma das `keywords` aparece no texto do incidente
 * (campos description e equipment). Funções puras, sem dependência de frameworks.
 */

export const MIN_CONFIDENCE = 50;
export const MAX_CONFIDENCE = 90;
const CONFIDENCE_STEP = 10;

/** Minúsculas, sem acentos e com espaços normalizados ("Memória" e "memoria" são iguais). */
export function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Procura a palavra-chave como palavra inteira (aceitando plural simples: -s / -es).
 * Assim "ram" não casa com "programa", mas "RAMs" e "erros" casam.
 */
export function containsKeyword(normalizedText, keyword) {
  const key = normalizeText(keyword);
  if (key === '') return false;

  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(key)}(?:es|s)?(?![\\p{L}\\p{N}])`, 'u');
  return pattern.test(normalizedText);
}

/** Texto analisado: description + equipment do incidente, normalizado. */
export function getIncidentText(blackboard) {
  if (!(blackboard instanceof Blackboard)) {
    throw new ValidationError('É necessário um Blackboard válido para a análise');
  }
  const { description, equipment } = blackboard.incident;
  return normalizeText(`${description} ${equipment}`);
}

/** Palavras-chave (na grafia original) que aparecem no texto. */
export function findMatchedKeywords(normalizedText, keywords) {
  return keywords.filter((keyword) => containsKeyword(normalizedText, keyword));
}

/** União, sem repetição, das palavras-chave de todas as regras. */
export function collectKeywords(rules) {
  return [...new Set(rules.flatMap((rule) => rule.keywords))];
}

/** 1 palavra-chave = 50; cada palavra a mais soma 10; limitada a 90. */
export function calculateConfidence(matchedCount) {
  const raw = MIN_CONFIDENCE + (matchedCount - 1) * CONFIDENCE_STEP;
  return Math.min(MAX_CONFIDENCE, Math.max(MIN_CONFIDENCE, raw));
}

/**
 * Decide o que a KS geraria agora: regras com alguma palavra-chave presente no texto
 * cuja hipótese ainda não esteja no Blackboard. Não altera o Blackboard.
 */
export function planAnalysis(blackboard, rules) {
  const text = getIncidentText(blackboard);

  return rules.flatMap((rule) => {
    const matchedKeywords = findMatchedKeywords(text, rule.keywords);
    if (matchedKeywords.length === 0 || blackboard.hasHypothesis(rule.description)) {
      return [];
    }
    return [{ description: rule.description, matchedKeywords }];
  });
}

/** Escreve no Blackboard as hipóteses do plano, com uma evidência SUPPORTS por sintoma encontrado. */
export function applyAnalysis(blackboard, plan, source) {
  for (const { description, matchedKeywords } of plan) {
    const hypothesis = new Hypothesis({
      description,
      source,
      confidence: calculateConfidence(matchedKeywords.length),
    });

    if (!blackboard.addHypothesis(hypothesis)) continue;

    for (const keyword of matchedKeywords) {
      blackboard.addEvidence(
        new Evidence({
          description: `Sintoma '${keyword}' relatado`,
          supports: hypothesis.id,
          polarity: 'SUPPORTS',
          source,
        }),
      );
    }
  }
}
