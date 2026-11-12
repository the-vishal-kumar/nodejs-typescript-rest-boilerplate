import request from 'supertest';
import mongoose from 'mongoose';
import { openApiDocument } from '../../docs/openapi';
import { createApp } from '../../app';
import { getConfig } from '../../config';
import { PASSWORD, uniqueEmail, useTestApp } from './helpers';

describe('Platform behaviour', () => {
  const { app } = useTestApp();

  describe('health', () => {
    it('should report liveness without touching the database', async () => {
      const response = await request(app()).get('/health/live').expect(200);
      expect(response.body.status).toBe('ok');
    });

    it('should report ready when MongoDB answers', async () => {
      const response = await request(app()).get('/health/ready').expect(200);
      expect(response.body.checks).toEqual({ mongo: 'ok', shutdown: 'ok' });
    });

    it('should report not ready while shutting down', async () => {
      const draining = createApp(getConfig(), { isShuttingDown: () => true });
      const response = await request(draining).get('/health/ready').expect(503);
      expect(response.body.checks.shutdown).toBe('fail');
    });
  });

  describe('errors', () => {
    it('should answer malformed JSON with 400', async () => {
      const response = await request(app())
        .post('/auth/signin')
        .set('Content-Type', 'application/json')
        .send('{"email": ');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Request body is not valid JSON');
    });

    it('should answer an oversized body with 413', async () => {
      const response = await request(app())
        .post('/auth/signup')
        .send({ email: 'a@example.com', password: 'x'.repeat(20_000), firstName: 'A' });
      expect(response.status).toBe(413);
    });

    it('should answer an unknown route with 404 JSON', async () => {
      const response = await request(app()).get('/nope').expect(404);
      expect(response.body).toEqual({ status: 404, error: 'Resource not found' });
    });

    it('should return 500 with a request id, and no internals, when the database fails', async () => {
      const spy = jest.spyOn(mongoose.Model, 'findOne').mockImplementationOnce(() => {
        throw new Error('database exploded');
      });
      const response = await request(app())
        .post('/auth/signup')
        .send({ email: uniqueEmail('boom'), password: PASSWORD, firstName: 'A' });
      spy.mockRestore();
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('An error occurred');
      expect(response.body.requestId).toBe(response.headers['x-request-id']);
      expect(JSON.stringify(response.body)).not.toContain('exploded');
    });
  });

  describe('headers', () => {
    it('should set security headers and hide the framework', async () => {
      const response = await request(app()).get('/health/ready');
      const docs = await request(app()).get('/docs/');
      for (const res of [docs]) {
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['content-security-policy']).toContain("default-src 'self'");
        expect(res.headers['strict-transport-security']).toBeDefined();
      }
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should reuse a well-formed X-Request-Id and replace a malformed one', async () => {
      const kept = await request(app()).get('/loan').set('X-Request-Id', 'abc-123');
      expect(kept.headers['x-request-id']).toBe('abc-123');
      const replaced = await request(app()).get('/loan').set('X-Request-Id', 'bad id with spaces');
      expect(replaced.headers['x-request-id']).not.toBe('bad id with spaces');
    });
  });

  describe('API docs', () => {
    it('should redirect / to the docs and serve Swagger UI', async () => {
      await request(app()).get('/').expect(302).expect('Location', '/docs');
      const response = await request(app()).get('/docs/').expect(200);
      expect(response.text).toContain('swagger-ui');
    });

    it('should serve the OpenAPI document', async () => {
      const response = await request(app()).get('/docs/openapi.json').expect(200);
      expect(response.body.openapi).toBe('3.1.0');
    });

    // Catches docs drifting from the router: every documented operation must
    // reach a handler, not the 404 fallback.
    it.each(
      Object.entries(openApiDocument.paths).flatMap(([path, operations]) =>
        Object.keys(operations).map(method => [method.toUpperCase(), path] as const),
      ),
    )('should route documented %s %s', async (method, path) => {
      const url = path.replace('{id}', '00000000-0000-4000-8000-000000000000');
      const response = await request(app())[method.toLowerCase() as 'get' | 'post' | 'put'](url).send({});
      expect(response.body.error).not.toBe('Resource not found');
    });
  });
});

describe('Rate limiting', () => {
  const { app } = useTestApp({ AUTH_RATE_LIMIT_MAX: '3' });

  it('should answer 429 after too many sign-in attempts', async () => {
    const attempt = (): request.Test =>
      request(app()).post('/auth/signin').send({ email: 'nobody@example.com', password: PASSWORD });
    for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
    const limited = await attempt();
    expect(limited.status).toBe(429);
    expect(limited.body.error).toBe('Too many authentication attempts, try again later');
    expect(limited.headers['ratelimit-policy']).toBeDefined();
  });
});
