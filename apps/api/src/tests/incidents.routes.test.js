import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Prisma falso em memória: permite testar as rotas HTTP de ponta a ponta sem banco.
const { rows, fakePrisma } = vi.hoisted(() => {
  const rows = [];
  const fakePrisma = {
    incident: {
      create: async ({ data }) => {
        const now = new Date();
        const record = {
          id: `inc-${rows.length + 1}`,
          status: 'OPEN',
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        rows.push(record);
        return record;
      },
      findMany: async ({ where }) =>
        rows.filter((r) => r.userId === where.userId).sort((a, b) => b.createdAt - a.createdAt),
      findFirst: async ({ where }) =>
        rows.find((r) => r.id === where.id && r.userId === where.userId) ?? null,
    },
    user: {},
  };
  return { rows, fakePrisma };
});

vi.mock('../infra/database/prisma/client.js', () => ({ prisma: fakePrisma, default: fakePrisma }));

const { default: app } = await import('../app.js');
const { jwtTokenService } = await import('../infra/security/JwtTokenService.js');

const tokenFor = (id) => jwtTokenService.sign({ sub: id, email: `${id}@exemplo.com`, role: 'USER' });
const auth = (id) => ({ Authorization: `Bearer ${tokenFor(id)}` });

const validBody = {
  title: 'Monitor sem imagem',
  description: 'O monitor liga, mas a tela fica preta o tempo todo.',
  equipment: 'Monitor LG',
};

describe('/api/incidents', () => {
  beforeEach(() => {
    rows.length = 0;
  });

  it('exige autenticação em todas as rotas', async () => {
    expect((await request(app).get('/api/incidents')).status).toBe(401);
    expect((await request(app).post('/api/incidents').send(validBody)).status).toBe(401);
    expect((await request(app).get('/api/incidents/inc-1')).status).toBe(401);
  });

  it('POST cria incidente OPEN do usuário logado e ignora userId/status do corpo', async () => {
    const response = await request(app)
      .post('/api/incidents')
      .set(auth('user-a'))
      .send({ ...validBody, userId: 'user-b', status: 'RESOLVED' });

    expect(response.status).toBe(201);
    expect(response.body.incident).toMatchObject({ title: validBody.title, status: 'OPEN' });
    expect(rows[0].userId).toBe('user-a');
  });

  it('POST valida o payload com mensagens em português (400)', async () => {
    const response = await request(app)
      .post('/api/incidents')
      .set(auth('user-a'))
      .send({ title: 'ab', description: 'curta', equipment: 'x' });

    expect(response.status).toBe(400);
    const messages = response.body.details.map((d) => d.message);
    expect(messages).toContain('O título deve ter no mínimo 3 caracteres');
    expect(messages).toContain('A descrição deve ter no mínimo 10 caracteres');
    expect(messages).toContain('O equipamento deve ter no mínimo 2 caracteres');
  });

  it('GET lista somente os incidentes do próprio usuário', async () => {
    await request(app).post('/api/incidents').set(auth('user-a')).send(validBody);
    await request(app).post('/api/incidents').set(auth('user-b')).send(validBody);

    const response = await request(app).get('/api/incidents').set(auth('user-a'));

    expect(response.status).toBe(200);
    expect(response.body.incidents).toHaveLength(1);
  });

  it('GET /:id retorna o incidente do dono', async () => {
    const created = await request(app).post('/api/incidents').set(auth('user-a')).send(validBody);

    const response = await request(app)
      .get(`/api/incidents/${created.body.incident.id}`)
      .set(auth('user-a'));

    expect(response.status).toBe(200);
    expect(response.body.incident.id).toBe(created.body.incident.id);
  });

  it('GET /:id de outro usuário responde 404 em português', async () => {
    const created = await request(app).post('/api/incidents').set(auth('user-a')).send(validBody);

    const response = await request(app)
      .get(`/api/incidents/${created.body.incident.id}`)
      .set(auth('user-b'));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Incidente não encontrado' });
  });
});
