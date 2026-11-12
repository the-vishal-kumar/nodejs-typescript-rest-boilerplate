import express, { Request, Response } from 'express';
import mongoose from 'mongoose';

export interface Lifecycle {
  /** True once SIGTERM/SIGINT is received; readiness then fails so traffic drains. */
  isShuttingDown: () => boolean;
}

/**
 * Liveness answers "is the process able to serve at all" and never touches
 * the database, so a MongoDB outage does not get every pod restarted.
 * Readiness answers "should this instance receive traffic".
 */
export default class HealthRoute {
  public router: express.Router;

  constructor(private readonly lifecycle: Lifecycle) {
    this.router = express.Router();
    this.router.get('/live', this.live);
    this.router.get('/ready', this.ready);
  }

  private live = (_req: Request, res: Response): void => {
    res.status(200).json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  };

  private ready = async (_req: Request, res: Response): Promise<void> => {
    const checks: Record<string, 'ok' | 'fail'> = {
      mongo: 'fail',
      shutdown: this.lifecycle.isShuttingDown() ? 'fail' : 'ok',
    };
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      try {
        await mongoose.connection.db.admin().ping();
        checks.mongo = 'ok';
      } catch {
        checks.mongo = 'fail';
      }
    }
    const ready = Object.values(checks).every(check => check === 'ok');
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not ready', checks });
  };
}
