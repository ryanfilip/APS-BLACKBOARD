import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Prisma falso em memória para as rotas de TECH/ADMIN (atendimento e administração).
const { db, fakePrisma } = vi.hoisted(() => {
  const db = { incidents: [], users: [], clock: 0 };
  const tick = () => new Date(1_800_000_000_000 + (db.clock += 1000));
  const withOwner = (r) => r && { ...r, user: { name: db.users.find((u) => u.id === r.userId)?.name } };
  const fakePrisma = {
    incident: {
      create: async ({ data }) => {
        const record = { id: `inc-${db.incidents.length + 1}`, status: 'OPEN', createdAt: tick(), updatedAt: tick(), ...data };
        db.incidents.push(record);
        return record;
      },
      findMany: async ({ where } = {}) =>
        db.incidents.filter((r) => !where || r.userId === where.userId).map(withOwner),
      findFirst: async ({ where }) =>
        withOwner(db.incidents.find((r) => r.id === where.id && r.userId === where.userId)) ?? null,
      findUnique: async ({ where }) => withOwner(db.incidents.find((r) => r.id === where.id)) ?? null,
      update: async ({ where, data }) => {
        const record = db.incidents.find((r) => r.id === where.id);
        Object.assign(record, data, { updatedAt: tick() });
        return withOwner(record);
      },
    },
    user: {
      findMany: async () => db.users,
      findUnique: async ({ where }) => db.users.find((u) => u.id === where.id) ?? null,
      update: async ({ where, data }) => {
        const record = db.users.find((u) => u.id === where.id);
        Object.assign(record, data);
        return record;
      },
    },
  };
  return { db, fakePrisma };
});

vi.mock('../infra/database/prisma/client.js', () => ({ prisma: fakePrisma, default: fakePrisma }));

const { default: app } = await import('../app.js');
const { jwtTokenService } = await import('../infra/security/JwtTokenService.js');

const auth = (id, role = 'USER') => ({
  Authorization: `Bearer ${jwtTokenService.sign({ sub: id, email: `${id}@exemplo.com`, role })}`,
});

const createIncident = async (userId) => {
  const response = await request(app).post('/api/incidents').set(auth(userId)).send({
    title: 'Computador com problemas',
    description: 'Computador lento e sem internet',
    equipment: 'Desktop Dell',
  });
  return response.body.incident.id;
};

beforeEach(() => {
  db.incidents.length = 0;
  db.users.length = 0;
  db.clock = 0;
  db.users.push(
    { id: 'user-a', name: 'Ana', email: 'ana@x.com', password: 'h', role: 'USER', createdAt: new Date() },
    { id: 'tech-1', name: 'Téo', email: 'teo@x.com', password: 'h', role: 'TECH', createdAt: new Date() },
    { id: 'admin-1', name: 'Adm', email: 'adm@x.com', password: 'h', role: 'ADMIN', createdAt: new Date() },
  );
});

describe('TECH/ADMIN: fila de atendimento', () => {
  it('USER lista só os próprios; TECH lista todos com o nome de quem relatou', async () => {
    await createIncident('user-a');
    await createIncident('user-b');

    const asUser = await request(app).get('/api/incidents').set(auth('user-a'));
    const asTech = await request(app).get('/api/incidents').set(auth('tech-1', 'TECH'));

    expect(asUser.body.incidents).toHaveLength(1);
    expect(asTech.body.incidents).toHaveLength(2);
    expect(asTech.body.incidents.map((i) => i.ownerName)).toContain('Ana');
  });

  it('TECH vê e diagnostica o incidente de outro usuário', async () => {
    const id = await createIncident('user-a');

    const view = await request(app).get(`/api/incidents/${id}`).set(auth('tech-1', 'TECH'));

    expect(view.status).toBe(200);
    expect(view.body.incident.ownerName).toBe('Ana');
  });
});

describe('PATCH /api/incidents/:id/status', () => {
  it('USER recebe 403', async () => {
    const id = await createIncident('user-a');

    const response = await request(app).patch(`/api/incidents/${id}/status`).set(auth('user-a')).send({ status: 'IN_PROGRESS' });

    expect(response.status).toBe(403);
    expect(db.incidents[0].status).toBe('OPEN');
  });

  it('TECH percorre OPEN -> IN_PROGRESS -> RESOLVED', async () => {
    const id = await createIncident('user-a');
    const tech = auth('tech-1', 'TECH');

    const first = await request(app).patch(`/api/incidents/${id}/status`).set(tech).send({ status: 'IN_PROGRESS' });
    const second = await request(app).patch(`/api/incidents/${id}/status`).set(tech).send({ status: 'RESOLVED' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.incident.status).toBe('RESOLVED');
  });

  it('transição inválida responde 409 em português', async () => {
    const id = await createIncident('user-a');

    const response = await request(app)
      .patch(`/api/incidents/${id}/status`)
      .set(auth('tech-1', 'TECH'))
      .send({ status: 'RESOLVED' });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Não é possível mudar o status de OPEN para RESOLVED');
  });

  it('status desconhecido responde 400', async () => {
    const id = await createIncident('user-a');

    const response = await request(app).patch(`/api/incidents/${id}/status`).set(auth('admin-1', 'ADMIN')).send({ status: 'X' });

    expect(response.status).toBe(400);
  });

  it('incidente inexistente responde 404', async () => {
    const response = await request(app)
      .patch('/api/incidents/nao-existe/status')
      .set(auth('tech-1', 'TECH'))
      .send({ status: 'IN_PROGRESS' });

    expect(response.status).toBe(404);
  });
});

describe('/api/users (ADMIN)', () => {
  it.each([['USER'], ['TECH']])('%s recebe 403', async (role) => {
    expect((await request(app).get('/api/users').set(auth('x', role))).status).toBe(403);
  });

  it('ADMIN lista os usuários sem expor a senha', async () => {
    const response = await request(app).get('/api/users').set(auth('admin-1', 'ADMIN'));

    expect(response.status).toBe(200);
    expect(response.body.users).toHaveLength(3);
    expect(response.body.users[0]).not.toHaveProperty('password');
    expect(response.body.users[0]).not.toHaveProperty('passwordHash');
  });

  it('ADMIN promove um USER a TECH', async () => {
    const response = await request(app).patch('/api/users/user-a/role').set(auth('admin-1', 'ADMIN')).send({ role: 'TECH' });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('TECH');
    expect(db.users[0].role).toBe('TECH');
  });

  it('ADMIN não altera o próprio papel (400)', async () => {
    const response = await request(app).patch('/api/users/admin-1/role').set(auth('admin-1', 'ADMIN')).send({ role: 'USER' });

    expect(response.status).toBe(400);
    expect(db.users[2].role).toBe('ADMIN');
  });

  it('papel inválido (400) e usuário inexistente (404)', async () => {
    const admin = auth('admin-1', 'ADMIN');

    expect((await request(app).patch('/api/users/user-a/role').set(admin).send({ role: 'ROOT' })).status).toBe(400);
    expect((await request(app).patch('/api/users/nao-existe/role').set(admin).send({ role: 'TECH' })).status).toBe(404);
  });
});
