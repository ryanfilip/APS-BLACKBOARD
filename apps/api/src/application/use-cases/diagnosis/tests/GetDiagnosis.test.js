import { describe, expect, it, vi } from 'vitest';
import { Diagnosis } from '../../../../domain/entities/Diagnosis.js';
import { Incident } from '../../../../domain/entities/Incident.js';
import {
  DiagnosisNotFoundError,
  IncidentNotFoundError,
  ValidationError,
} from '../../../../domain/errors/DomainErrors.js';
import { GetDiagnosis } from '../GetDiagnosis.js';

const makeIncident = (overrides = {}) =>
  new Incident({
    id: 'inc-1',
    title: 'Impressora parada',
    description: 'A impressora não imprime nenhum documento.',
    equipment: 'Impressora HP',
    status: 'OPEN',
    userId: 'user-1',
    ...overrides,
  });

const state = { incident: {}, facts: [], hypotheses: [], evidences: [] };
const storedDiagnosis = new Diagnosis({
  id: 'diag-1',
  incidentId: 'inc-1',
  state,
  iterations: 2,
  finishedBy: 'NO_MORE_ACTIONS',
  createdAt: new Date('2026-11-20T10:00:00Z'),
});

const build = ({ incident = makeIncident(), diagnosis = storedDiagnosis } = {}) => {
  const incidentRepository = { findById: vi.fn().mockResolvedValue(incident) };
  const diagnosisRepository = { findByIncidentId: vi.fn().mockResolvedValue(diagnosis) };
  return { useCase: new GetDiagnosis({ incidentRepository, diagnosisRepository }), incidentRepository, diagnosisRepository };
};

describe('GetDiagnosis', () => {
  it('retorna o diagnóstico do incidente do usuário', async () => {
    const { useCase, incidentRepository, diagnosisRepository } = build();

    const { diagnosis } = await useCase.execute({ incidentId: 'inc-1', userId: 'user-1' });

    expect(incidentRepository.findById).toHaveBeenCalledWith('inc-1', 'user-1');
    expect(diagnosisRepository.findByIncidentId).toHaveBeenCalledWith('inc-1');
    expect(diagnosis).toEqual({
      id: 'diag-1',
      incidentId: 'inc-1',
      state,
      iterations: 2,
      finishedBy: 'NO_MORE_ACTIONS',
      createdAt: new Date('2026-11-20T10:00:00Z'),
    });
  });

  it('lança IncidentNotFoundError quando o incidente não existe, sem consultar diagnósticos', async () => {
    const { useCase, diagnosisRepository } = build({ incident: null });

    await expect(useCase.execute({ incidentId: 'x', userId: 'user-1' })).rejects.toBeInstanceOf(
      IncidentNotFoundError,
    );
    expect(diagnosisRepository.findByIncidentId).not.toHaveBeenCalled();
  });

  it('lança IncidentNotFoundError para incidente de outro usuário, sem consultar diagnósticos', async () => {
    const { useCase, diagnosisRepository } = build({ incident: makeIncident({ userId: 'outro-usuario' }) });

    await expect(useCase.execute({ incidentId: 'inc-1', userId: 'user-1' })).rejects.toBeInstanceOf(
      IncidentNotFoundError,
    );
    expect(diagnosisRepository.findByIncidentId).not.toHaveBeenCalled();
  });

  it('lança DiagnosisNotFoundError quando o incidente ainda não foi diagnosticado', async () => {
    const { useCase } = build({ diagnosis: null });

    await expect(useCase.execute({ incidentId: 'inc-1', userId: 'user-1' })).rejects.toBeInstanceOf(
      DiagnosisNotFoundError,
    );
  });

  it('lança ValidationError sem userId', async () => {
    const { useCase, incidentRepository } = build();

    await expect(useCase.execute({ incidentId: 'inc-1' })).rejects.toBeInstanceOf(ValidationError);
    expect(incidentRepository.findById).not.toHaveBeenCalled();
  });
});
