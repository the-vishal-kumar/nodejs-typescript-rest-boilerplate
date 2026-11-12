// Defaults for every test process. CI and `make test` override MONGO_URI.
process.env.NODE_ENV = 'test';
process.env.MONGO_URI ??= 'mongodb://localhost:27017/ntrb-test';
process.env.JWT_SECRET_KEY ??= 'test-only-secret-that-is-at-least-32-chars';
process.env.ADMIN_SIGNUP_ENABLED ??= 'true';
// Tests send many auth requests from one IP; the limiter has its own test.
process.env.RATE_LIMIT_MAX ??= '100000';
process.env.AUTH_RATE_LIMIT_MAX ??= '100000';
process.env.LOG_SILENT ??= 'true';
