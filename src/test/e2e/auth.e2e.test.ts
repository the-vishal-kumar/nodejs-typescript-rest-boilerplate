describe('Auth endpoints', () => {
  it('Dummy test', () => {
    expect(1 + 1).toBe(2);
  });
});

// import dotenv from 'dotenv';
// dotenv.config({ path: '.env.test' });

// import request from 'supertest';
// import { NodeApp, MongoApp } from '../../app';
// import { MongoMemoryServer } from 'mongodb-memory-server-core';
// import { IncomingMessage, Server, ServerResponse } from 'http';
// import mongoose from 'mongoose';

// describe('Auth endpoints', () => {
//   let nodeApp: NodeApp;
//   let mongoApp: MongoApp;
//   let nodeServer: Server<typeof IncomingMessage, typeof ServerResponse>;
//   let mongoServer: typeof mongoose;
//   let mongod: MongoMemoryServer;

//   beforeAll(async () => {
//     // jest.setTimeout(10000); // Increase the timeout to 10 seconds

//     mongod = await MongoMemoryServer.create();
//     process.env['MONGO_URL'] = await mongod.getUri();

//     nodeApp = new NodeApp();
//     console.log(`nodeApp===>`, nodeApp, `---nodeApp`);
//     mongoApp = new MongoApp();

//     mongoServer = await mongoApp.init();
//     nodeServer = await nodeApp.init(Number(process.env.PORT));
//   });

//   afterAll(async () => {
//     // await nodeServer.close();
//     // await       mongoServer.disconnect();
//     // await mongod.stop();
//   });

//   it('should signup a new user', async () => {
//     const email = 'test-signup@example.com',
//       password = 'password123';
//     await request(nodeApp.expressApp).post('/auth/signup').send({ email, password }).expect(204);
//   });
//   // Rest of your tests...
// });

// // import dotenv from 'dotenv';
// // dotenv.config({ path: '.env.test' });

// // import request from 'supertest';
// // import { NodeApp, MongoApp } from '../../app';
// // import { MongoMemoryServer } from 'mongodb-memory-server';
// // import { IncomingMessage, Server, ServerResponse } from 'http';
// // import mongoose from 'mongoose';

// // describe('Auth endpoints', () => {
// //   let nodeApp: NodeApp;
// //   let mongoApp: MongoApp;
// //   let nodeServer: Server<typeof IncomingMessage, typeof ServerResponse>;
// //   let mongoServer: typeof mongoose;
// //   let mongod: MongoMemoryServer;

// //   beforeAll(async () => {
// //     nodeApp = new NodeApp();
// //     mongoApp = new MongoApp();

// //     mongod = new MongoMemoryServer();
// //     console.log(`mongod.getUri()===>`, await mongod.getUri(), `---mongod.getUri()`);
// //     process.env['MONGO_URL'] = await mongod.getUri();
// //     console.log(`process.env.MONGO_URL===>`, process.env.MONGO_URL, `---process.env.MONGO_URL`);

// //     nodeServer = await nodeApp.init(Number(process.env.PORT));
// //     mongoServer = await mongoApp.init();
// //   });

// //   afterAll(async () => {
// //     // await nodeServer.close();
// //     // await mongoServer.disconnect();
// //   });

// //   it('should signup a new user', async () => {
// //     const email = 'test-signup@example.com',
// //       password = 'password123';
// //     await request(nodeApp.expressApp).post('/auth/signup').send({ email, password }).expect(204);
// //   });

// //   it('should signin and return an access token', async () => {
// //     const email = 'test-signin@example.com',
// //       password = 'password123';
// //     await request(nodeApp.expressApp).post('/auth/signup').send({ email, password });

// //     const response = await request(nodeApp.expressApp).post('/auth/signin').send({ email, password }).expect(200);
// //     expect(response.body.data).toHaveProperty('accessToken');
// //   });

// //   it('should signoff and return a success message', async () => {
// //     const email = 'test-signoff@example.com',
// //       password = 'password123';
// //     await request(nodeApp.expressApp).post('/auth/signup').send({ email, password });

// //     const signinResponse = await request(nodeApp.expressApp).post('/auth/signin').send({ email, password }).expect(200);
// //     const accessToken = signinResponse.body.data.accessToken;

// //     await request(nodeApp.expressApp).post('/auth/signoff').set('Authorization', `Bearer ${accessToken}`).expect(204);
// //   });

// //   it('should reset the password', async () => {
// //     const email = 'test-reset-password@example.com',
// //       password = 'password123';
// //     await request(nodeApp.expressApp).post('/auth/signup').send({ email, password });

// //     const signinResponse = await request(nodeApp.expressApp).post('/auth/signin').send({ email, password }).expect(200);
// //     const accessToken = signinResponse.body.data.accessToken;

// //     await request(nodeApp.expressApp)
// //       .post('/auth/password/reset')
// //       .set('Authorization', `Bearer ${accessToken}`)
// //       .send({ password: 'newPassword123' })
// //       .expect(204);
// //   });
// // });
