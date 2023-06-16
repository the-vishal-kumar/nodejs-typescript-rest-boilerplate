export default {
  mongoUri: process.env.MONGO_URL || `mongodb://localhost:27017/nodejs-typescript-rest-boilerplate`,
  dbOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 1000,
  },
};
