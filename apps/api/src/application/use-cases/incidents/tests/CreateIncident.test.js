import { describe, it, expect, vi } from 'vitest';
import { CreateIncident } from '../CreateIncident.js';
import { Incident } from '../../../../domain/entities/Incident.js';
import { ValidationError } from '../../../../domain/errors/DomainErrors.js';

function build() {
  const incidentRepository = {
    create: vi.fn(async (incident) => new Incident({ ...incident, id: 'inc-1' })),
  };
  return { useCase: new CreateIncident({ incidentRepository }), incidentRepository };
}

describe('CreateIncident', () => {
  it('salva o incidente com status OPEN e vinculado ao usuário', async () => {
    const { useCase, incidentRepository } = build();

    const { incident } = await useCase.execute({
      title: '  Notebook não liga ',
      description: 'O notebook não liga mesmo ligado na tomada.',
      equipment: 'Notebook Dell',
      userId: 'user-1',
    });

    const saved = incidentRepository.create.mock.calls[0][0];
    expect(saved.status).toBe('OPEN');
    expect(saved.userId).toBe('user-1');
    expect(saved.title).toBe('Notebook não liga');
    expect(incident.id).toBe('inc-1');
    expect(incident.status).toBe('OPEN');
    expect(incident).not.toHaveProperty('userId');
  });

  it('lança ValidationError para título vazio', async () => {
    const { useCase, incidentRepository } = build();

    await expect(
      useCase.execute({ title: '   ', description: 'Descrição válida longa', equipment: 'PC', userId: 'u1' }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(incidentRepository.create).not.toHaveBeenCalled();
  });

  it('lança ValidationError para descrição vazia', async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ title: 'Título', description: '', equipment: 'PC', userId: 'u1' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('lança ValidationError quando falta o userId', async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ title: 'Título', description: 'Descrição válida longa', equipment: 'PC' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
