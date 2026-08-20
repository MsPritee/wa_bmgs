import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

let dbUp = false;
let adminToken = '';
let bakeryToken = '';

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbUp = true;
  } catch {
    dbUp = false;
  }
  if (dbUp) {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@platform.test', password: 'Admin@1234' });
    adminToken = login.body.data?.accessToken ?? '';
    const bakery = await request(app).post('/api/v1/auth/login').send({ email: 'baker@bakery.test', password: 'Baker@1234' });
    bakeryToken = bakery.body.data?.accessToken ?? '';
  }
});

describe('health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});

describe('auth + tenant isolation (DB-backed)', () => {
  it('logs in and issues tokens', () => {
    if (!dbUp) return;
    expect(adminToken.length).toBeGreaterThan(0);
    expect(bakeryToken.length).toBeGreaterThan(0);
  });

  it('rejects a bad login', async () => {
    if (!dbUp) return;
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'admin@platform.test', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects requests without a token', async () => {
    if (!dbUp) return;
    const res = await request(app).get('/api/v1/customers');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin from creating tenants', async () => {
    if (!dbUp) return;
    const res = await request(app)
      .post('/api/v1/tenants')
      .set('Authorization', `Bearer ${bakeryToken}`)
      .send({ name: 'Nope', slug: 'nope' });
    expect(res.status).toBe(403);
  });

  it('only shows the caller tenant customers (isolation)', async () => {
    if (!dbUp) return;
    const res = await request(app).get('/api/v1/customers').set('Authorization', `Bearer ${bakeryToken}`);
    expect(res.status).toBe(200);
    const phones = res.body.data.map((c: { phone?: string }) => c.phone);
    expect(phones.every((p?: string) => p?.startsWith('9198765432'))).toBe(true);
  });

  it('lists conversations for the bakery', async () => {
    if (!dbUp) return;
    const res = await request(app).get('/api/v1/conversations').set('Authorization', `Bearer ${bakeryToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});