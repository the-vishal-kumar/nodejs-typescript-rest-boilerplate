import mongoose from 'mongoose';
import { Logger } from '../../util';
import { mongoConfig } from '../../config';
const { dbOptions } = mongoConfig;

/** Hides credentials when a connection string is logged. */
export const maskMongoUri = (uri: string): string => uri.replace(/\/\/([^@/]+)@/, '//***@');

export const connectMongo = async (mongoUri: string): Promise<typeof mongoose> => {
  try {
    await mongoose.connect(mongoUri, dbOptions);
    Logger.info('MongoDB connected', { uri: maskMongoUri(mongoUri) });
    // Wait for declared indexes (unique email, session TTL) before taking
    // traffic. Unlike syncIndexes() this never drops an index.
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    return mongoose;
  } catch (err) {
    Logger.error('Failed to connect to MongoDB', { uri: maskMongoUri(mongoUri), err });
    throw err;
  }
};

export const disconnectMongo = async (): Promise<void> => {
  await mongoose.disconnect();
};
