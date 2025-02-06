const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('register', async () => {
  const registerTestUser = createUser()
  const RegisterRes = await request(app)
  .post('/api/auth')
  .send(registerTestUser);
  expect(RegisterRes.status).toBe(200);
  expectValidJwt(RegisterRes.body.token);

  const expectedUser = { ...registerTestUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(RegisterRes.body.user).toMatchObject(expectedUser);
});

test('register without password', async () => {
  const registerUser = createUser();
  registerUser.password = "";
  const RegisterRes = await request(app)
  .post('/api/auth')
  .send(registerUser);
  expect(RegisterRes.status).toBe(400);
});

test('login', async () => {
  const loginRes = await request(app)
  .put('/api/auth')
  .send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('double login', async () => {
  const loginRes = await request(app)
  .put('/api/auth')
  .send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);

  secondLoginRequest = await request(app)
  .put('/api/auth')
  .send(testUser);
  expect(secondLoginRequest.status).toBe(200);
  expectValidJwt(secondLoginRequest.body.token);

  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('logout', async () => {
  const loginResponse = await request(app)
    .put('/api/auth')
    .send(testUser);
  expect(loginResponse.status).toBe(200);
  expectValidJwt(loginResponse.body.token);

  const authToken = loginResponse.body.token;
  expect(authToken).toBeDefined();

  const logoutResponse = await request(app)
    .delete('/api/auth')
    .set('Authorization', `Bearer ${authToken}`);

  expect(logoutResponse.status).toBe(200);
  expect(logoutResponse.body.message).toBe('logout successful');
});


function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

function createUser() {
  const newUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
  newUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  return newUser
}