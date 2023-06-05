import 'dotenv/config';
import 'newrelic';

import App from './app';
import { Logger } from './util';

const main = async (): Promise<void> => {
  const app = new App();
  const port = Number(process.env.PORT) || 3000;

  const server = await app.start(port);

  process.on('uncaughtException', err => {
    Logger.error('Uncaught Exception:- ', err);
    process.exit(1);
  });

  process.on(`unhandledRejection`, err => {
    Logger.log(`Unhandled Rejection:- `, err);
    process.exit(2);
  });

  process.on('SIGTERM', async () => {
    Logger.error('SIGTERM signal received:- closing HTTP server');
    server.close(() => {
      Logger.error('HTTP server closed');
    });
  });
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async (): Promise<void> => {
  await main();
})();
