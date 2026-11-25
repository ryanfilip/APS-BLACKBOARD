import { describe, it, expect, vi } from 'vitest';
import { PrismaIncidentRepository } from '../infra/database/repositories/PrismaIncidentRepository.js';

// Não precisa do banco nem do Prisma Client gerado: o client real nunca é instanciado.
vi.mock('../infra/database/prisma/client.js', () => ({ prisma: {}, default: {} }));

// O Prisma ignora filtros `undefined`; o repositório precisa impedir esse cenário.
describe('PrismaIncidentRepository (isolamento por usuário)', () => {
  const client = {
    incident: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  };
  const repository = new PrismaIncidentRepository(client);

  it('findAllByUserId exige userId', async () => {
    await expect(repository.findAllByUserId(undefined)).rejects.toThrow('userId is required');
    expect(client.incident.findMany).not.toHaveBeenCalled();
  });

  it('findById exige userId', async () => {
    await expect(repository.findById('inc-1', undefined)).rejects.toThrow('userId is required');
    expect(client.incident.findFirst).not.toHaveBeenCalled();
  });

  it('findById filtra por id E userId', async () => {
    client.incident.findFirst.mockResolvedValue(null);

    const result = await repository.findById('inc-1', 'user-1');

    expect(result).toBeNull();
    expect(client.incident.findFirst).toHaveBeenCalledWith({
      where: { id: 'inc-1', userId: 'user-1' },
      include: expect.any(Object),
    });
  });

  it('converte o nome do dono e a contagem de diagnósticos vindos do include', async () => {
    client.incident.findMany.mockResolvedValue([
      { id: 'inc-1', title: 't', description: 'd', equipment: 'e', status: 'OPEN', userId: 'user-1', user: { name: 'Ana' }, _count: { diagnoses: 3 } },
    ]);

    const [incident] = await repository.findAllByUserId('user-1');

    expect(incident.toPublic()).toMatchObject({ ownerName: 'Ana', diagnosisCount: 3 });
  });
});
