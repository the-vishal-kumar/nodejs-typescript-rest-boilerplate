import { Logger } from '../../../util';
import { config } from '../../../util/logger';

describe('Logger', () => {
  test('Logger is defined', () => {
    expect(Logger).toBeDefined();
  });

  test('Logger has the correct log level', () => {
    expect(Logger.level).toBe('info');
  });

  test('Logger has transports', () => {
    expect(Logger.transports.length).toBeGreaterThan(0);
  });

  test('Logger handles exceptions and rejections', () => {
    expect(config.handleExceptions).toBe(true);
    expect(config.handleRejections).toBe(true);
  });
});
