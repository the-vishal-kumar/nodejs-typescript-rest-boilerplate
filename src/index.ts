import 'dotenv/config';
import 'newrelic';

import { NodeApp, MongoApp } from './app';
import { Logger } from './util';

const main = async (): Promise<void> => {
  const mongoApp = new MongoApp();
  const mongoServer = await mongoApp.init();

  const nodeApp = new NodeApp();
  const port = Number(process.env.PORT) || 3000;
  const nodeServer = await nodeApp.init(port);

  process.on('uncaughtException', err => {
    Logger.error('Uncaught Exception:- ', err);
    process.exit(1);
  });

  process.on(`unhandledRejection`, err => {
    Logger.error(`Unhandled Rejection:- `, err);
    process.exit(2);
  });

  process.on('SIGTERM', async () => {
    Logger.error('☠️SIGTERM signal received');

    if (nodeServer && nodeServer.close) await nodeServer.close();
    Logger.error('NodeJs server closed');

    if (mongoServer && mongoServer.disconnect) await mongoServer.disconnect();
    Logger.error('Mongo database disconnected');
  });
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async (): Promise<void> => {
  await main();
})();
