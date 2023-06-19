import mongoose, { Connection } from 'mongoose';
import { Logger } from '../../util';
import { mongoConfig } from '../../config';
const { dbOptions } = mongoConfig;

class MongoDB {
  private connection: Connection;

  constructor() {
    this.connection = mongoose.connection;
  }

  public init = async (mongoUri: string): Promise<typeof mongoose> => {
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
