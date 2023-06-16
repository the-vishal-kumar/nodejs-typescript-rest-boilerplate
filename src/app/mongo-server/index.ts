import mongoose, { Connection } from 'mongoose';
import { Logger } from '../../util';
import { mongoConfig } from '../../config';
const { mongoUri, dbOptions } = mongoConfig;

class MongoDB {
  private connection: Connection;

  constructor() {
    this.connection = mongoose.connection;
    this.initEventListeners();
  }

  private initEventListeners = (): void => {
    this.connection.once('open', async () => {
      Logger.info('Mongo database event open');
      Logger.debug(`Mongo database connected to ${mongoUri}`);

      this.connection.on('connected', () => {
        Logger.info('Mongo database event connected');
      });

      this.connection.on('disconnected', () => {
        Logger.warn('Mongo database event disconnected');
      });

      this.connection.on('reconnected', () => {
        Logger.info('Mongo database event reconnected');
      });

      this.connection.on('error', (err: Error) => {
        Logger.error('Mongo database event error: ' + err);
      });
    });
  };

  public init = async (): Promise<typeof mongoose> => {
    try {
      await mongoose.connect(mongoUri, dbOptions);
      Logger.info(`🚀Mongo database is accepting connections on ${mongoUri}`);
      return mongoose;
    } catch (err) {
      Logger.error('Failed to connect to Mongo database:- ', err);
      throw err;
    }
  };
}

export default MongoDB;
