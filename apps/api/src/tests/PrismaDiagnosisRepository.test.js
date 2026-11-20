import { describe, expect, it, vi } from 'vitest';
import { PrismaDiagnosisRepository } from '../infra/database/repositories/PrismaDiagnosisRepository.js';

// Não precisa do banco nem do Prisma Client gerado: o client real nunca é instanciado.
vi.mock('../infra/database/prisma/client.js', () => ({ prisma: {}, default: {} }));

const makeClient = () => ({ diagnosis: { create: vi.fn(), findFirst: vi.fn() } });

const state = { incident: {}, facts: [], hypotheses: [], evidences: [] };

describe('PrismaDiagnosisRepository', () => {
  it('create grava o state diretamente no campo Json e devolve a entidade', async () => {
    const client = makeClient();
    client.diagnosis.create.mockResolvedValue({
      id: 'diag-1',
      incidentId: 'inc-1',
      state,
      iterations: 2,
      finishedBy: 'NO_MORE_ACTIONS',
      createdAt: new Date('2026-11-20T10:00:00Z'),
    });
    const repository = new PrismaDiagnosisRepository(client);

    const saved = await repository.create({ incidentId: 'inc-1', state, iterations: 2, finishedBy: 'NO_MORE_ACTIONS' });

    const { data } = client.diagnosis.create.mock.calls[0][0];
    expect(data.state).toBe(state);
    expect(data).toEqual({ incidentId: 'inc-1', state, iterations: 2, finishedBy: 'NO_MORE_ACTIONS' });
    expect(saved.id).toBe('diag-1');
    expect(saved.state).toBe(state);
  });

  it('findByIncidentId busca o mais recente do incidente', async () => {
    const client = makeClient();
    client.diagnosis.findFirst.mockResolvedValue(null);
    const repository = new PrismaDiagnosisRepository(client);

    const found = await repository.findByIncidentId('inc-1');

    expect(found).toBeNull();
    expect(client.diagnosis.findFirst).toHaveBeenCalledWith({
      where: { incidentId: 'inc-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('exige incidentId (o Prisma ignoraria um filtro undefined)', async () => {
    const client = makeClient();
    const repository = new PrismaDiagnosisRepository(client);

    await expect(repository.findByIncidentId(undefined)).rejects.toThrow('incidentId is required');
    await expect(repository.create({ state, iterations: 0, finishedBy: 'NO_MORE_ACTIONS' })).rejects.toThrow(
      'incidentId is required',
    );
    expect(client.diagnosis.findFirst).not.toHaveBeenCalled();
    expect(client.diagnosis.create).not.toHaveBeenCalled();
  });
});
