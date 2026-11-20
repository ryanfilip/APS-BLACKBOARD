import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Prisma falso em memória: testa as rotas HTTP de ponta a ponta (incluindo o motor de diagnóstico).
const { db, fakePrisma } = vi.hoisted(() => {
  const db = { incidents: [], diagnoses: [], clock: 0 };
  const tick = () => new Date(1_800_000_000_000 + (db.clock += 1000));
  const fakePrisma = {
    incident: {
      create: async ({ data }) => {
        const record = { id: `inc-${db.incidents.length + 1}`, status: 'OPEN', createdAt: tick(), updatedAt: tick(), ...data };
        db.incidents.push(record);
        return record;
      },
      findMany: async ({ where }) => db.incidents.filter((r) => r.userId === where.userId),
      findFirst: async ({ where }) => db.incidents.find((r) => r.id === where.id && r.userId === where.userId) ?? null,
    },
    diagnosis: {
      create: async ({ data }) => {
        // Simula a coluna Json: o que volta do banco é uma cópia serializada.
        const record = {
          id: `diag-${db.diagnoses.length + 1}`,
          createdAt: tick(),
          ...data,
          state: JSON.parse(JSON.stringify(data.state)),
        };
        db.diagnoses.push(record);
        return record;
      },
      findFirst: async ({ where }) =>
        db.diagnoses
          .filter((r) => r.incidentId === where.incidentId)
          .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null,
    },
    user: {},
  };
  return { db, fakePrisma };
});

vi.mock('../infra/database/prisma/client.js', () => ({ prisma: fakePrisma, default: fakePrisma }));

const { default: app } = await import('../app.js');
const { jwtTokenService } = await import('../infra/security/JwtTokenService.js');

const auth = (id) => ({ Authorization: `Bearer ${jwtTokenService.sign({ sub: id, email: `${id}@exemplo.com`, role: 'USER' })}` });

const createIncident = async (userId, overrides = {}) => {
  const response = await request(app)
    .post('/api/incidents')
    .set(auth(userId))
    .send({
      title: 'Computador com problemas',
      description: 'Computador lento e sem internet',
      equipment: 'Desktop Dell',
      ...overrides,
    });
  return response.body.incident.id;
};

describe('POST /api/incidents/:id/diagnose e GET /api/incidents/:id/diagnosis', () => {
  beforeEach(() => {
    db.incidents.length = 0;
    db.diagnoses.length = 0;
    db.clock = 0;
  });

  it('exige autenticação nas duas rotas', async () => {
    expect((await request(app).post('/api/incidents/inc-1/diagnose')).status).toBe(401);
    expect((await request(app).get('/api/incidents/inc-1/diagnosis')).status).toBe(401);
  });

  it('POST executa o diagnóstico, salva no banco e responde 201 com o diagnóstico salvo', async () => {
    const incidentId = await createIncident('user-a');

    const response = await request(app).post(`/api/incidents/${incidentId}/diagnose`).set(auth('user-a'));

    expect(response.status).toBe(201);
    const { diagnosis } = response.body;
    expect(diagnosis).toMatchObject({
      id: 'diag-1',
      incidentId,
      iterations: 2,
      finishedBy: 'NO_MORE_ACTIONS',
    });
    expect(diagnosis.state.incident.title).toBe('Computador com problemas');
    expect([...new Set(diagnosis.state.hypotheses.map((h) => h.source))].sort()).toEqual(['KS1_Hardware', 'KS2_Network']);

    expect(db.diagnoses).toHaveLength(1);
    expect(db.diagnoses[0].state).toEqual(diagnosis.state);
  });

  it('GET devolve o diagnóstico salvo', async () => {
    const incidentId = await createIncident('user-a');
    const created = await request(app).post(`/api/incidents/${incidentId}/diagnose`).set(auth('user-a'));

    const response = await request(app).get(`/api/incidents/${incidentId}/diagnosis`).set(auth('user-a'));

    expect(response.status).toBe(200);
    expect(response.body.diagnosis).toEqual(created.body.diagnosis);
  });

  it('GET antes de diagnosticar responde 404 em português', async () => {
    const incidentId = await createIncident('user-a');

    const response = await request(app).get(`/api/incidents/${incidentId}/diagnosis`).set(auth('user-a'));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Este incidente ainda não possui diagnóstico' });
  });

  it('rodar de novo cria outro diagnóstico e o GET devolve o mais recente', async () => {
    const incidentId = await createIncident('user-a');
    await request(app).post(`/api/incidents/${incidentId}/diagnose`).set(auth('user-a'));
    const second = await request(app).post(`/api/incidents/${incidentId}/diagnose`).set(auth('user-a'));

    const response = await request(app).get(`/api/incidents/${incidentId}/diagnosis`).set(auth('user-a'));

    expect(db.diagnoses).toHaveLength(2);
    expect(response.body.diagnosis.id).toBe(second.body.diagnosis.id);
  });

  it('outro usuário não executa nem vê o diagnóstico (404) e nada é salvo', async () => {
    const incidentId = await createIncident('user-a');
    await request(app).post(`/api/incidents/${incidentId}/diagnose`).set(auth('user-a'));
    const savedBefore = db.diagnoses.length;

    const run = await request(app).post(`/api/incidents/${incidentId}/diagnose`).set(auth('user-b'));
    const get = await request(app).get(`/api/incidents/${incidentId}/diagnosis`).set(auth('user-b'));

    expect(run.status).toBe(404);
    expect(run.body).toEqual({ error: 'Incidente não encontrado' });
    expect(get.status).toBe(404);
    expect(get.body).toEqual({ error: 'Incidente não encontrado' });
    expect(db.diagnoses).toHaveLength(savedBefore);
  });

  it('incidente inexistente responde 404', async () => {
    const response = await request(app).post('/api/incidents/nao-existe/diagnose').set(auth('user-a'));

    expect(response.status).toBe(404);
  });
});
