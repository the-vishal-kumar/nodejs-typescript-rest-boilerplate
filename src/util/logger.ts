import { createLogger, format, transports } from 'winston';

/**
 * One log line per event. JSON (the default outside development) is what log
 * shippers expect; `pretty` keeps local output readable.
 */
const useJson = (process.env.LOG_FORMAT ?? (process.env.NODE_ENV === 'development' ? 'pretty' : 'json')) === 'json';

const pretty = format.combine(
  format.colorize(),
  format.printf(info => {
    const { timestamp, level, message, stack, ...meta } = info;
    const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${stack || message}${rest}`;
  }),
);

export const config = {
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'ntrb-api' },
  format: format.combine(format.errors({ stack: true }), format.timestamp(), useJson ? format.json() : pretty),
  transports: [new transports.Console({ silent: process.env.LOG_SILENT === 'true' })],
  handleExceptions: true,
  handleRejections: true,
};

const logger = createLogger(config);

export default logger;
