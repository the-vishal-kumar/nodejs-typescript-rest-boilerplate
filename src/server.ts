import { once } from 'node:events';
import { Server } from 'node:http';
import { createApp, connectMongo, disconnectMongo } from './app';
import { AppConfig, getConfig } from './config';
import { Logger } from './util';

/**
 * Stops in a fixed order: fail readiness, stop accepting connections and wait
 * for in-flight requests, then close MongoDB. A timer forces exit if draining
 * takes longer than SHUTDOWN_TIMEOUT_MS.
 */
const registerShutdown = (server: Server, config: AppConfig, markShuttingDown: () => void): void => {
  let started = false;
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (started) return;
    started = true;
    markShuttingDown();
    Logger.info('Shutdown started', { signal });

    const force = setTimeout(() => {
      Logger.error('Shutdown timed out, forcing exit', { timeoutMs: config.shutdownTimeoutMs });
      process.exit(1);
    }, config.shutdownTimeoutMs);
    force.unref();

    try {
      await new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));
      Logger.info('HTTP server closed');
      await disconnectMongo();
      Logger.info('MongoDB disconnected');
      process.exit(0);
    } catch (err) {
      Logger.error('Shutdown failed', { err });
      process.exit(1);
    }
  };

  process.on('SIGTERM', signal => void shutdown(signal));
  process.on('SIGINT', signal => void shutdown(signal));
};

export const start = async (): Promise<Server> => {
  let config: AppConfig;
  try {
    config = getConfig();
  } catch (err) {
    Logger.error((err as Error).message);
    return process.exit(1);
  }

  let shuttingDown = false;
  try {
    await connectMongo(config.mongoUri);
    const app = createApp(config, { isShuttingDown: () => shuttingDown });
    const server = app.listen(config.port);
    await once(server, 'listening');
    // Longer than a typical load balancer idle timeout (60 s), so the LB, not
    // Node, closes idle keep-alive connections.
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;
    registerShutdown(server, config, () => {
      shuttingDown = true;
    });
    Logger.info('HTTP server listening', { port: config.port, nodeEnv: config.nodeEnv });
    return server;
  } catch (err) {
    Logger.error('Start-up failed', { err });
    return process.exit(1);
  }
};
