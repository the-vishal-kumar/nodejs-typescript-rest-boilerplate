import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { api, clientIp, PASSWORD, uniqueEmail } from './lib.mjs';

describe('platform: health', () => {
  it('reports liveness', async () => {
    const response = await api('GET', '/health/live');
    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
  });

  it('reports ready when the database answers', async () => {
    const response = await api('GET', '/health/ready');
    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ready');
    assert.ok(Object.keys(response.body.checks).length >= 2);
    assert.ok(Object.values(response.body.checks).every(check => check === 'ok'));
    assert.equal(response.body.checks.shutdown, 'ok');
  });
});

describe('platform: errors', () => {
  it('answers malformed JSON with 400', async () => {
    const response = await api('POST', '/auth/signin', { body: '{"email": ' });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { status: 400, error: 'Request body is not valid JSON' });
  });

  it('answers an oversized body with 413', async () => {
    const response = await api('POST', '/auth/signup', {
      body: { email: 'a@example.com', password: 'x'.repeat(20_000), firstName: 'A' },
    });
    assert.equal(response.status, 413);
    assert.deepEqual(response.body, { status: 413, error: 'Request body is too large' });
  });

  it('answers a body that is not an object with 422', async () => {
    const response = await api('POST', '/auth/signin', { body: '[1, 2]' });
    assert.equal(response.status, 422);
    assert.ok(Array.isArray(response.body.errors));
  });

  for (const [method, path] of [
    ['GET', '/nope'],
    ['DELETE', '/loan'],
    ['GET', '/auth/signup'],
  ]) {
    it(`answers unknown route ${method} ${path} with 404 JSON`, async () => {
      const response = await api(method, path);
      assert.equal(response.status, 404);
      assert.deepEqual(response.body, { status: 404, error: 'Resource not found' });
    });
  }
});

describe('platform: headers', () => {
  it('sets security headers and hides the framework', async () => {
    for (const path of ['/docs/', '/loan', '/nope']) {
      const response = await api('GET', path);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
      assert.ok(response.headers.get('content-security-policy')?.includes("default-src 'self'"), path);
      assert.ok(response.headers.get('strict-transport-security'), path);
      assert.equal(response.headers.get('x-powered-by'), null, path);
    }
    for (const path of ['/health/live', '/health/ready']) {
      assert.equal((await api('GET', path)).headers.get('x-powered-by'), null, path);
    }
  });

  it('reuses a well-formed X-Request-Id and replaces a malformed one', async () => {
    const kept = await api('GET', '/loan', { headers: { 'X-Request-Id': 'abc-123' } });
    assert.equal(kept.headers.get('x-request-id'), 'abc-123');
    const replaced = await api('GET', '/loan', { headers: { 'X-Request-Id': 'bad id with spaces' } });
    const id = replaced.headers.get('x-request-id');
    assert.ok(id && id !== 'bad id with spaces');
    const generated = await api('GET', '/loan');
    assert.ok(generated.headers.get('x-request-id'));
  });
});

describe('platform: API docs', () => {
  it('redirects / to the docs and serves Swagger UI', async () => {
    const root = await api('GET', '/');
    assert.equal(root.status, 302);
    assert.equal(root.headers.get('location'), '/docs');
    const docs = await api('GET', '/docs/');
    assert.equal(docs.status, 200);
    assert.ok(docs.text.includes('swagger-ui'));
  });

  it('serves the contract at /docs/openapi.json, changing only info.title and info.description', async () => {
    const response = await api('GET', '/docs/openapi.json');
    assert.equal(response.status, 200);
    const contract = JSON.parse(readFileSync(new URL('../contract/openapi.json', import.meta.url), 'utf8'));
    const served = structuredClone(response.body);
    for (const document of [served, contract]) {
      delete document.info.title;
      delete document.info.description;
    }
    assert.deepEqual(served, contract);
  });

  // Every documented operation must reach a handler, not the 404 fallback.
  const contract = JSON.parse(readFileSync(new URL('../contract/openapi.json', import.meta.url), 'utf8'));
  for (const [path, operations] of Object.entries(contract.paths)) {
    for (const method of Object.keys(operations)) {
      it(`routes documented ${method.toUpperCase()} ${path}`, async () => {
        const url = path.replace('{id}', '00000000-0000-4000-8000-000000000000');
        const response = await api(method.toUpperCase(), url, method === 'get' ? {} : { body: {} });
        assert.notEqual(response.status, 404, JSON.stringify(response.body));
      });
    }
  }
});

describe('platform: rate limiting', () => {
  it('answers 429 after too many sign-in attempts from one client', async () => {
    const ip = clientIp();
    const body = { email: uniqueEmail('limited'), password: PASSWORD };
    let response;
    let attempts = 0;
    do {
      response = await api('POST', '/auth/signin', { body, ip });
      attempts++;
      if (response.status !== 429) assert.equal(response.status, 401, `attempt ${attempts}`);
    } while (response.status !== 429 && attempts < 500);
    assert.equal(response.status, 429, `no 429 after ${attempts} attempts`);
    assert.deepEqual(response.body, { status: 429, error: 'Too many authentication attempts, try again later' });
    assert.ok(response.headers.get('ratelimit-policy'), 'RateLimit-Policy header');
    // Other clients are not affected.
    assert.equal((await api('POST', '/auth/signin', { body })).status, 401);
  });
});
