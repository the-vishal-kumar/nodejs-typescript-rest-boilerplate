import 'newrelic';

import { NodeApp, MongoApp } from './app';
import { Logger } from './util';

const main = async (): Promise<void> => {
  const mongoUri = String(process.env.MONGO_URI);
  const nodePort = Number(process.env.PORT);

  const mongoApp = new MongoApp();
  const mongoServer = await mongoApp.init(mongoUri);
  // if (process.env.NODE_ENV === 'test') await mongoServer.connection.db.dropDatabase();

  const nodeApp = new NodeApp();
  const nodeServer = await nodeApp.init(nodePort);

  process.on('uncaughtException', err => {
    Logger.error('Uncaught Exception:- ', err);
    process.exit(1);
  });

  process.on(`unhandledRejection`, err => {
    Logger.error(`Unhandled Rejection:- `, err);
    process.exit(2);
  });

  process.on('SIGTERM', async () => {
    Logger.error('SIGTERM signal received');

    if (nodeServer && nodeServer.close) await nodeServer.close();
    Logger.error('NodeJs server closed');

    if (mongoServer && mongoServer.disconnect) await mongoServer.disconnect();
    Logger.error('Mongo database disconnected');
  });
};

void (async (): Promise<void> => {
  await main();
})();
