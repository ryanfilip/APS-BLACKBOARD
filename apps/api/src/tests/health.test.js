import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// O teste de fumaça não precisa de banco nem do Prisma Client gerado.
vi.mock('../infra/database/prisma/client.js', () => ({ prisma: {}, default: {} }));

const { default: app } = await import('../app.js');

describe('GET /api/health', () => {
  it('responde 200 { status: "ok" }', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /api/auth/me sem token responde 401', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
  });
});
