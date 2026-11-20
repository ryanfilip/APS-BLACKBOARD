import { describe, expect, it } from 'vitest';
import { Diagnosis } from '../Diagnosis.js';
import { ValidationError } from '../../errors/DomainErrors.js';

const validData = () => ({
  incidentId: 'inc-1',
  state: { incident: {}, facts: [], hypotheses: [], evidences: [] },
  iterations: 3,
  finishedBy: 'NO_MORE_ACTIONS',
});

describe('Diagnosis', () => {
  it('cria com dados válidos, guardando o state como veio', () => {
    const data = validData();

    const diagnosis = Diagnosis.create(data);

    expect(diagnosis.incidentId).toBe('inc-1');
    expect(diagnosis.state).toBe(data.state);
    expect(diagnosis.iterations).toBe(3);
    expect(diagnosis.toPublic()).toEqual({ id: undefined, createdAt: undefined, ...data });
  });

  it.each(['NO_MORE_ACTIONS', 'MAX_ITERATIONS_REACHED'])('aceita finishedBy %s', (finishedBy) => {
    expect(Diagnosis.create({ ...validData(), finishedBy }).finishedBy).toBe(finishedBy);
  });

  it('aceita 0 iterações', () => {
    expect(Diagnosis.create({ ...validData(), iterations: 0 }).iterations).toBe(0);
  });

  it.each([
    ['incidentId vazio', { incidentId: '' }],
    ['state nulo', { state: null }],
    ['state sem hipóteses', { state: { facts: [], evidences: [] } }],
    ['state que não é objeto', { state: 'texto' }],
    ['iterações negativas', { iterations: -1 }],
    ['iterações fracionárias', { iterations: 1.5 }],
    ['finishedBy desconhecido', { finishedBy: 'DONE' }],
  ])('rejeita %s', (_label, overrides) => {
    expect(() => Diagnosis.create({ ...validData(), ...overrides })).toThrow(ValidationError);
  });
});
