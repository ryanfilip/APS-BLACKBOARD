import { describe, it, expect, vi } from 'vitest';
import { GetIncident } from '../GetIncident.js';
import { ListIncidents } from '../ListIncidents.js';
import { Incident } from '../../../../domain/entities/Incident.js';
import { IncidentNotFoundError, ValidationError } from '../../../../domain/errors/DomainErrors.js';

const makeIncident = (overrides = {}) =>
  new Incident({
    id: 'inc-1',
    title: 'Impressora parada',
    description: 'A impressora não imprime nenhum documento.',
    equipment: 'Impressora HP',
    status: 'OPEN',
    userId: 'user-1',
    createdAt: new Date('2026-11-14T10:00:00Z'),
    updatedAt: new Date('2026-11-14T10:00:00Z'),
    ...overrides,
  });

describe('GetIncident', () => {
  it('retorna o incidente quando ele pertence ao usuário', async () => {
    const incidentRepository = { findById: vi.fn().mockResolvedValue(makeIncident()) };
    const useCase = new GetIncident({ incidentRepository });

    const { incident } = await useCase.execute({ id: 'inc-1', userId: 'user-1' });

    expect(incidentRepository.findById).toHaveBeenCalledWith('inc-1', 'user-1');
    expect(incident.title).toBe('Impressora parada');
  });

  it('lança IncidentNotFoundError quando não existe', async () => {
    const incidentRepository = { findById: vi.fn().mockResolvedValue(null) };
    const useCase = new GetIncident({ incidentRepository });

    await expect(useCase.execute({ id: 'x', userId: 'user-1' })).rejects.toBeInstanceOf(
      IncidentNotFoundError,
    );
  });

  it('lança IncidentNotFoundError se o repositório devolver incidente de outro usuário', async () => {
    const incidentRepository = {
      findById: vi.fn().mockResolvedValue(makeIncident({ userId: 'outro-usuario' })),
    };
    const useCase = new GetIncident({ incidentRepository });

    await expect(useCase.execute({ id: 'inc-1', userId: 'user-1' })).rejects.toBeInstanceOf(
      IncidentNotFoundError,
    );
  });

  it('lança ValidationError sem userId', async () => {
    const incidentRepository = { findById: vi.fn() };
    const useCase = new GetIncident({ incidentRepository });

    await expect(useCase.execute({ id: 'inc-1' })).rejects.toBeInstanceOf(ValidationError);
    expect(incidentRepository.findById).not.toHaveBeenCalled();
  });
});

describe('ListIncidents', () => {
  it('lista apenas os incidentes do usuário informado', async () => {
    const incidentRepository = {
      findAllByUserId: vi.fn().mockResolvedValue([makeIncident(), makeIncident({ id: 'inc-2' })]),
    };
    const useCase = new ListIncidents({ incidentRepository });

    const { incidents } = await useCase.execute({ userId: 'user-1' });

    expect(incidentRepository.findAllByUserId).toHaveBeenCalledWith('user-1');
    expect(incidents).toHaveLength(2);
    expect(incidents[0]).not.toHaveProperty('userId');
  });

  it('lança ValidationError sem userId', async () => {
    const incidentRepository = { findAllByUserId: vi.fn() };
    const useCase = new ListIncidents({ incidentRepository });

    await expect(useCase.execute({})).rejects.toBeInstanceOf(ValidationError);
    expect(incidentRepository.findAllByUserId).not.toHaveBeenCalled();
  });
});
