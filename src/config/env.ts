import Joi from 'joi';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'staging' | 'production';
  port: number;
  mongoUri: string;
  jwtSecretKey: string;
  userTokenTtlMinutes: number;
  adminTokenTtlMinutes: number;
  adminSignupEnabled: boolean;
  corsOrigins: string[] | '*';
  trustProxy: boolean | number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  authRateLimitMax: number;
  shutdownTimeoutMs: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  logFormat: 'json' | 'pretty';
}

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'staging', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  MONGO_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),
  JWT_SECRET_KEY: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET_KEY must be at least 32 characters long',
  }),
  USER_TOKEN_TTL_MINUTES: Joi.number()
    .integer()
    .min(1)
    .default(24 * 60),
  ADMIN_TOKEN_TTL_MINUTES: Joi.number().integer().min(1).default(20),
  ADMIN_SIGNUP_ENABLED: Joi.boolean().default(false),
  CORS_ORIGINS: Joi.string().default('*'),
  TRUST_PROXY: Joi.alternatives(Joi.boolean(), Joi.number().integer().min(0)).default(false),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(60_000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(300),
  AUTH_RATE_LIMIT_MAX: Joi.number().integer().min(1).default(20),
  SHUTDOWN_TIMEOUT_MS: Joi.number().integer().min(0).default(10_000),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty'),
}).unknown(true);

/**
 * Validates environment variables once at start-up and returns a typed config.
 * Fails fast with every problem listed, instead of failing later on first use.
 */
export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => {
  const { value, error } = schema.validate(env, { abortEarly: false, convert: true });
  if (error) {
    const problems = error.details.map(detail => `  - ${detail.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  const corsOrigins: string = value.CORS_ORIGINS.trim();
  return {
    nodeEnv: value.NODE_ENV,
    port: value.PORT,
    mongoUri: value.MONGO_URI,
    jwtSecretKey: value.JWT_SECRET_KEY,
    userTokenTtlMinutes: value.USER_TOKEN_TTL_MINUTES,
    adminTokenTtlMinutes: value.ADMIN_TOKEN_TTL_MINUTES,
    adminSignupEnabled: value.ADMIN_SIGNUP_ENABLED,
    corsOrigins:
      corsOrigins === '*'
        ? '*'
        : corsOrigins
            .split(',')
            .map(origin => origin.trim())
            .filter(Boolean),
    trustProxy: value.TRUST_PROXY,
    rateLimitWindowMs: value.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: value.RATE_LIMIT_MAX,
    authRateLimitMax: value.AUTH_RATE_LIMIT_MAX,
    shutdownTimeoutMs: value.SHUTDOWN_TIMEOUT_MS,
    logLevel: value.LOG_LEVEL,
    logFormat: value.LOG_FORMAT ?? (value.NODE_ENV === 'development' ? 'pretty' : 'json'),
  };
};
