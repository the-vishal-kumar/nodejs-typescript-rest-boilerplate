export default {
  dbOptions: {
    // Fail start-up and readiness quickly instead of hanging when MongoDB is down.
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  },
};
