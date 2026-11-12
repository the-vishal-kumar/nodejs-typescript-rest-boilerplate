import { loadConfig } from '../../../config';

const valid = {
  MONGO_URI: 'mongodb://localhost:27017/db',
  JWT_SECRET_KEY: 'a'.repeat(32),
};

describe('loadConfig', () => {
  it('should apply defaults', () => {
    const config = loadConfig(valid);
    expect(config).toMatchObject({
      nodeEnv: 'development',
      port: 3000,
      userTokenTtlMinutes: 1440,
      adminTokenTtlMinutes: 20,
      adminSignupEnabled: false,
      corsOrigins: '*',
      logFormat: 'pretty',
    });
  });

  it('should use JSON logs outside development', () => {
    expect(loadConfig({ ...valid, NODE_ENV: 'production' }).logFormat).toBe('json');
  });

  it('should list every problem at once', () => {
    // Joi reports problems in schema order, so check each one, not the order.
    const load = (): unknown => loadConfig({ PORT: 'eighty', JWT_SECRET_KEY: 'short' });
    expect(load).toThrow(/MONGO_URI" is required/);
    expect(load).toThrow(/PORT" must be a number/);
    expect(load).toThrow(/JWT_SECRET_KEY must be at least 32/);
  });

  it('should reject a non-Mongo connection string', () => {
    expect(() => loadConfig({ ...valid, MONGO_URI: 'postgres://localhost/db' })).toThrow(/MONGO_URI/);
  });

  it('should parse booleans, numbers and the CORS allow-list', () => {
    const config = loadConfig({
      ...valid,
      PORT: '8080',
      ADMIN_SIGNUP_ENABLED: 'true',
      TRUST_PROXY: '1',
      CORS_ORIGINS: 'https://a.example, https://b.example',
    });
    expect(config.port).toBe(8080);
    expect(config.adminSignupEnabled).toBe(true);
    expect(config.trustProxy).toBe(1);
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
  });
});
