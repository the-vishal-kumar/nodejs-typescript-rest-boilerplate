import { createLogger, format, transports } from 'winston';

const logFormatter = format.printf(info => {
  const { timestamp, level, stack, message } = info;
  const stackOrMessage = stack || message;
  return `${timestamp} ${level}: ${stackOrMessage}`;
});

const logger = createLogger({
  level: 'info',
  format: format.errors({ stack: true }),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple(), format.timestamp(), logFormatter),
    }),
  ],
  handleExceptions: true,
  handleRejections: true,
});

export default logger;
