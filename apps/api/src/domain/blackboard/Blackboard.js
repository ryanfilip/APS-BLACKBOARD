import { Evidence } from '../entities/Evidence.js';
import { Fact } from '../entities/Fact.js';
import { Hypothesis } from '../entities/Hypothesis.js';
import { ValidationError } from '../errors/DomainErrors.js';
import { assertNonEmptyString } from '../entities/validation.js';

/**
 * Normaliza texto para comparação: ignora maiúsculas, acentos e espaços repetidos.
 * "Memória  RAM com defeito" e "memoria ram com defeito" são a mesma hipótese.
 */
function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Quadro compartilhado de um diagnóstico. JavaScript puro, em memória.
 * Uma instância por diagnóstico; o estado só é persistido ao final (via getState()).
 */
export class Blackboard {
  #facts = [];
  #hypotheses = [];
  #evidences = [];

  constructor({ title, description, equipment } = {}) {
    const incident = {
      title: assertNonEmptyString(title, 'O título do incidente é obrigatório'),
      description: assertNonEmptyString(description, 'A descrição do incidente é obrigatória'),
      equipment: assertNonEmptyString(equipment, 'O equipamento do incidente é obrigatório'),
    };

    // Dados originais ficam acessíveis (somente leitura) para as Knowledge Sources.
    this.incident = Object.freeze(incident);

    this.#facts.push(
      new Fact({
        description: `Incidente relatado — Título: ${incident.title} | Equipamento: ${incident.equipment} | Descrição: ${incident.description}`,
      }),
    );
  }

  /** Cópias somente para leitura: para alterar o quadro use os métodos add*. */
  get facts() {
    return [...this.#facts];
  }

  get hypotheses() {
    return [...this.#hypotheses];
  }

  get evidences() {
    return [...this.#evidences];
  }

  /** Retorna true se o fato foi adicionado. */
  addFact(fact) {
    if (!(fact instanceof Fact)) {
      throw new ValidationError('O fato deve ser uma instância de Fact');
    }
    if (this.#facts.some((existing) => existing.id === fact.id)) {
      throw new ValidationError(`Já existe um fato com o id ${fact.id}`);
    }

    this.#facts.push(fact);
    return true;
  }

  /** Retorna true se adicionou, ou false se já existia hipótese com a mesma descrição. */
  addHypothesis(hypothesis) {
    if (!(hypothesis instanceof Hypothesis)) {
      throw new ValidationError('A hipótese deve ser uma instância de Hypothesis');
    }
    if (this.hasHypothesis(hypothesis.description)) {
      return false;
    }
    if (this.#hypotheses.some((existing) => existing.id === hypothesis.id)) {
      throw new ValidationError(`Já existe uma hipótese com o id ${hypothesis.id}`);
    }

    this.#hypotheses.push(hypothesis);
    return true;
  }

  /**
   * A evidência precisa referenciar uma hipótese que já esteja no quadro.
   * Retorna true se adicionou, ou false se já existia evidência equivalente
   * (mesma hipótese, mesma polaridade e mesma descrição).
   */
  addEvidence(evidence) {
    if (!(evidence instanceof Evidence)) {
      throw new ValidationError('A evidência deve ser uma instância de Evidence');
    }
    if (!this.#hypotheses.some((hypothesis) => hypothesis.id === evidence.supports)) {
      throw new ValidationError('A evidência referencia uma hipótese que não existe no Blackboard');
    }
    if (this.#evidences.some((existing) => existing.id === evidence.id)) {
      throw new ValidationError(`Já existe uma evidência com o id ${evidence.id}`);
    }

    const key = normalize(evidence.description);
    const isDuplicate = this.#evidences.some(
      (existing) =>
        existing.supports === evidence.supports &&
        existing.polarity === evidence.polarity &&
        normalize(existing.description) === key,
    );
    if (isDuplicate) {
      return false;
    }

    this.#evidences.push(evidence);
    return true;
  }

  /** Hipóteses da maior para a menor confiança (empates mantêm a ordem de inserção). */
  getHypotheses() {
    return [...this.#hypotheses].sort((a, b) => b.confidence - a.confidence);
  }

  /** Evita loops: indica se uma hipótese com esta descrição já foi gerada. */
  hasHypothesis(description) {
    const key = normalize(description);
    if (key === '') return false;
    return this.#hypotheses.some((hypothesis) => normalize(hypothesis.description) === key);
  }

  /** Evidências de uma hipótese; `polarity` ('SUPPORTS' ou 'REFUTES') é opcional e filtra o resultado. */
  getEvidencesFor(hypothesisId, polarity) {
    return this.#evidences.filter(
      (evidence) =>
        evidence.supports === hypothesisId && (polarity === undefined || evidence.polarity === polarity),
    );
  }

  /** Estado completo em objetos simples e serializáveis (arrays em ordem de inserção). */
  getState() {
    return {
      incident: { ...this.incident },
      facts: this.#facts.map((fact) => fact.toJSON()),
      hypotheses: this.#hypotheses.map((hypothesis) => hypothesis.toJSON()),
      evidences: this.#evidences.map((evidence) => evidence.toJSON()),
    };
  }
}
