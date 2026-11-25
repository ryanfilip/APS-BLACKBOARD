import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Prisma falso em memória para as rotas de TECH/ADMIN (atendimento e administração).
const { db, fakePrisma } = vi.hoisted(() => {
  const db = { incidents: [], users: [], diagnoses: [], clock: 0 };
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
      delete: async ({ where }) => {
        const index = db.incidents.findIndex((r) => r.id === where.id);
        return db.incidents.splice(index, 1)[0];
      },
    },
    $transaction: async (operations) => Promise.all(operations),
    diagnosis: {
      create: async ({ data }) => {
        const record = { id: `diag-${db.diagnoses.length + 1}`, createdAt: tick(), ...data, state: JSON.parse(JSON.stringify(data.state)) };
        db.diagnoses.push(record);
        return record;
      },
      findFirst: async ({ where }) =>
        db.diagnoses.filter((r) => r.incidentId === where.incidentId).sort((a, b) => b.createdAt - a.createdAt)[0] ?? null,
      findUnique: async ({ where }) => db.diagnoses.find((r) => r.id === where.id) ?? null,
      findMany: async ({ where }) =>
        db.diagnoses.filter((r) => r.incidentId === where.incidentId).sort((a, b) => b.createdAt - a.createdAt),
      deleteMany: async ({ where }) => {
        const before = db.diagnoses.length;
        db.diagnoses = db.diagnoses.filter((r) => r.incidentId !== where.incidentId);
        return { count: before - db.diagnoses.length };
      },
      update: async ({ where, data }) => {
        const record = db.diagnoses.find((r) => r.id === where.id);
        record.state = JSON.parse(JSON.stringify(data.state));
        return record;
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
  db.diagnoses = [];
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

describe('PATCH /api/incidents/:id/diagnoses/:diagnosisId/hypotheses/:hypothesisId', () => {
  const setup = async () => {
    const id = await createIncident('user-a');
    const run = await request(app).post(`/api/incidents/${id}/diagnose`).set(auth('user-a'));
    const { diagnosis } = run.body;
    return { id, diagnosis, hypothesis: diagnosis.state.hypotheses[0] };
  };
  const url = ({ id, diagnosis, hypothesis }) =>
    `/api/incidents/${id}/diagnoses/${diagnosis.id}/hypotheses/${hypothesis.id}`;

  it('USER recebe 403', async () => {
    const ctx = await setup();

    const response = await request(app).patch(url(ctx)).set(auth('user-a')).send({ status: 'CONFIRMED' });

    expect(response.status).toBe(403);
  });

  it('TECH confirma: status CONFIRMED, revisor salvo e evidência SUPPORTS da revisão técnica', async () => {
    const ctx = await setup();

    const response = await request(app).patch(url(ctx)).set(auth('tech-1', 'TECH')).send({ status: 'CONFIRMED' });

    expect(response.status).toBe(200);
    const { state } = response.body.diagnosis;
    const reviewed = state.hypotheses.find((h) => h.id === ctx.hypothesis.id);
    expect(reviewed).toMatchObject({ status: 'CONFIRMED', reviewedBy: 'Téo' });
    expect(state.evidences).toContainEqual(
      expect.objectContaining({ supports: ctx.hypothesis.id, polarity: 'SUPPORTS', source: 'Revisão técnica', description: 'Confirmada por Téo' }),
    );
    // Persistido: a próxima leitura já traz a revisão.
    const reread = await request(app).get(`/api/incidents/${ctx.id}/diagnosis`).set(auth('user-a'));
    expect(reread.body.diagnosis.state.hypotheses.find((h) => h.id === ctx.hypothesis.id).status).toBe('CONFIRMED');
  });

  it('descartar troca a evidência para REFUTES; reabrir remove a revisão', async () => {
    const ctx = await setup();
    const tech = auth('tech-1', 'TECH');
    const reviewEvidences = (state) => state.evidences.filter((e) => e.source === 'Revisão técnica');

    await request(app).patch(url(ctx)).set(tech).send({ status: 'CONFIRMED' });
    const rejected = await request(app).patch(url(ctx)).set(tech).send({ status: 'REJECTED' });
    expect(reviewEvidences(rejected.body.diagnosis.state)).toEqual([
      expect.objectContaining({ polarity: 'REFUTES', description: 'Descartada por Téo' }),
    ]);

    const reopened = await request(app).patch(url(ctx)).set(tech).send({ status: 'OPEN' });
    expect(reviewEvidences(reopened.body.diagnosis.state)).toEqual([]);
    expect(reopened.body.diagnosis.state.hypotheses.find((h) => h.id === ctx.hypothesis.id)).toMatchObject({
      status: 'OPEN',
      reviewedBy: null,
    });
  });

  it('hipótese ou diagnóstico inexistentes respondem 404; status inválido responde 400', async () => {
    const ctx = await setup();
    const tech = auth('tech-1', 'TECH');

    const noHypothesis = await request(app)
      .patch(url({ ...ctx, hypothesis: { id: 'h-x' } }))
      .set(tech)
      .send({ status: 'CONFIRMED' });
    const noDiagnosis = await request(app)
      .patch(url({ ...ctx, diagnosis: { id: 'diag-x' } }))
      .set(tech)
      .send({ status: 'CONFIRMED' });
    const badStatus = await request(app).patch(url(ctx)).set(tech).send({ status: 'TALVEZ' });

    expect(noHypothesis.status).toBe(404);
    expect(noHypothesis.body.error).toBe('Hipótese não encontrada neste diagnóstico');
    expect(noDiagnosis.status).toBe(404);
    expect(badStatus.status).toBe(400);
  });
});

describe('Histórico de diagnósticos', () => {
  it('GET /diagnoses lista os resumos do mais recente ao mais antigo', async () => {
    const id = await createIncident('user-a');
    await request(app).post(`/api/incidents/${id}/diagnose`).set(auth('user-a'));
    await request(app).post(`/api/incidents/${id}/diagnose`).set(auth('user-a'));

    const response = await request(app).get(`/api/incidents/${id}/diagnoses`).set(auth('user-a'));

    expect(response.status).toBe(200);
    expect(response.body.diagnoses.map((d) => d.id)).toEqual(['diag-2', 'diag-1']);
    expect(response.body.diagnoses[0]).toMatchObject({
      iterations: 2,
      finishedBy: 'NO_MORE_ACTIONS',
      hypothesisCount: 4,
      confirmedCount: 0,
      topHypothesis: { confidence: 50 },
    });
    expect(response.body.diagnoses[0]).not.toHaveProperty('state');
  });

  it('GET /diagnoses/:diagnosisId abre um diagnóstico antigo específico', async () => {
    const id = await createIncident('user-a');
    await request(app).post(`/api/incidents/${id}/diagnose`).set(auth('user-a'));
    await request(app).post(`/api/incidents/${id}/diagnose`).set(auth('user-a'));

    const response = await request(app).get(`/api/incidents/${id}/diagnoses/diag-1`).set(auth('user-a'));

    expect(response.status).toBe(200);
    expect(response.body.diagnosis.id).toBe('diag-1');
  });

  it('não abre diagnóstico de outro incidente nem de outro usuário (404)', async () => {
    const mine = await createIncident('user-a');
    const other = await createIncident('user-b');
    await request(app).post(`/api/incidents/${other}/diagnose`).set(auth('user-b'));

    const crossIncident = await request(app).get(`/api/incidents/${mine}/diagnoses/diag-1`).set(auth('user-a'));
    const crossUser = await request(app).get(`/api/incidents/${other}/diagnoses`).set(auth('user-a'));

    expect(crossIncident.status).toBe(404);
    expect(crossUser.status).toBe(404);
  });
});

describe('Editar e excluir incidente', () => {
  const edited = { title: 'Título corrigido', description: 'Descrição corrigida do problema', equipment: 'Notebook HP' };

  it('GET /:id informa as permissões do usuário', async () => {
    const id = await createIncident('user-a');

    const owner = await request(app).get(`/api/incidents/${id}`).set(auth('user-a'));
    const tech = await request(app).get(`/api/incidents/${id}`).set(auth('tech-1', 'TECH'));
    const admin = await request(app).get(`/api/incidents/${id}`).set(auth('admin-1', 'ADMIN'));

    expect(owner.body.incident.permissions).toEqual({ canEdit: true, canDelete: true });
    expect(tech.body.incident.permissions).toEqual({ canEdit: false, canDelete: false });
    expect(admin.body.incident.permissions).toEqual({ canEdit: false, canDelete: true });
  });

  it('o dono edita o chamado aberto (PUT)', async () => {
    const id = await createIncident('user-a');

    const response = await request(app).put(`/api/incidents/${id}`).set(auth('user-a')).send(edited);

    expect(response.status).toBe(200);
    expect(response.body.incident).toMatchObject(edited);
    expect(db.incidents[0].title).toBe('Título corrigido');
  });

  it('PUT valida os campos (400), bloqueia outro USER (404), TECH (403) e chamado em atendimento (409)', async () => {
    const id = await createIncident('user-a');

    const invalid = await request(app).put(`/api/incidents/${id}`).set(auth('user-a')).send({ ...edited, title: 'a' });
    const otherUser = await request(app).put(`/api/incidents/${id}`).set(auth('user-b')).send(edited);
    const tech = await request(app).put(`/api/incidents/${id}`).set(auth('tech-1', 'TECH')).send(edited);
    await request(app).patch(`/api/incidents/${id}/status`).set(auth('tech-1', 'TECH')).send({ status: 'IN_PROGRESS' });
    const locked = await request(app).put(`/api/incidents/${id}`).set(auth('user-a')).send(edited);

    expect(invalid.status).toBe(400);
    expect(otherUser.status).toBe(404);
    expect(tech.status).toBe(403);
    expect(locked.status).toBe(409);
    expect(locked.body.error).toBe('Só é possível alterar chamados com status Aberto');
    expect(db.incidents[0].title).toBe('Computador com problemas');
  });

  it('o dono exclui o chamado aberto junto com os diagnósticos (204)', async () => {
    const id = await createIncident('user-a');
    await request(app).post(`/api/incidents/${id}/diagnose`).set(auth('user-a'));

    const response = await request(app).delete(`/api/incidents/${id}`).set(auth('user-a'));

    expect(response.status).toBe(204);
    expect(db.incidents).toHaveLength(0);
    expect(db.diagnoses).toHaveLength(0);
  });

  it('o dono não exclui chamado em atendimento (409); TECH não exclui (403); ADMIN exclui (204)', async () => {
    const id = await createIncident('user-a');
    await request(app).patch(`/api/incidents/${id}/status`).set(auth('tech-1', 'TECH')).send({ status: 'IN_PROGRESS' });

    const owner = await request(app).delete(`/api/incidents/${id}`).set(auth('user-a'));
    const tech = await request(app).delete(`/api/incidents/${id}`).set(auth('tech-1', 'TECH'));
    const admin = await request(app).delete(`/api/incidents/${id}`).set(auth('admin-1', 'ADMIN'));

    expect(owner.status).toBe(409);
    expect(tech.status).toBe(403);
    expect(admin.status).toBe(204);
    expect(db.incidents).toHaveLength(0);
  });
});
