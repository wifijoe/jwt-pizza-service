const request = require('supertest');
const app = require('../service');

let testFranchise;
let testStore;
let adminUserAuthToken;
let testStoreId;
let testFranchiseId;

beforeAll(async () => {
    const adminUser = {email: "a@jwt.com", password: "admin"};
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    expect(loginRes.status).toBe(200);
    adminUserAuthToken = loginRes.body.token;
    expectValidJwt(adminUserAuthToken);
});

test('create franchise', async () => {
    testFranchise = createFranchise()
    const testFranchiseCreateRequest = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send(testFranchise);
    expect(testFranchiseCreateRequest.status).toBe(200);

    let expectedResult = {name: testFranchise.name, admins: [{ email: 'f@jwt.com', id: 3, name: 'pizza franchisee' }], id: /^[0-9]*\.$/}
    expect(testFranchiseCreateRequest.body).toMatchObject(expectedResult)
    testFranchiseId = testFranchiseCreateRequest.body.id
});

test('create store', async () => {
    testStore = createStore(testFranchiseId);
    const testStoreCreateRequest = await request(app)
        .post(`/api/franchise/${testFranchiseId}/store`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send(testStore);
    expect(testStoreCreateRequest.status).toBe(200);

    expectedResult = {id: expect.any(Number), name: testStore.name};
    expect(testStoreCreateRequest.body).toMatchObject(expectedResult);
    testStoreId = testStoreCreateRequest.body.id;
});

test('list all franchises', async () => {
    const getFranchiseListResponse = await request(app)
        .get('/api/franchise');
    expect(getFranchiseListResponse.status).toBe(200);
    expect(getFranchiseListResponse.body).toMatchObject(expect.any(Array));
});

test('get franchise page', async () => {
    const franchiseUser = {email: 'f@jwt.com', password: 'franchisee'}
    const loginFranchisee = await request(app).put('/api/auth').send(franchiseUser);
    expect(loginFranchisee.status).toBe(200);
    const franchiseeAuth = loginFranchisee.body.token;
    expectValidJwt(franchiseeAuth);

    const getFranchisePageResponse = await request(app)
        .get(`/api/franchise/3`)
        .set('Authorization', `Bearer ${franchiseeAuth}`);
    expect(getFranchisePageResponse.status).toBe(200);

    expect(getFranchisePageResponse.body).toMatchObject(expect.any(Array));
});

test('delete store', async () => {
    const deleteStoreResponse = await request(app)
        .delete(`/api/franchise/${testFranchiseId}/store/${testStoreId}`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`);
    expect(deleteStoreResponse.status).toBe(200);
    expect(deleteStoreResponse.body.message).toBe('store deleted');
});

test('delete franchise', async () => {
    const deleteFranchiseResponse = await request(app)
        .delete(`/api/franchise/${testFranchiseId}`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
    expect(deleteFranchiseResponse.status).toBe(200);
    expect(deleteFranchiseResponse.body.message).toBe('franchise deleted');
});

function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  }
  
function createStore(franchiseId) {
    const newStore = {franchiseId: franchiseId, name:"SLC"};
    newStore.name = Math.random().toString(36).substring(2, 12);
    return newStore;
}

function createFranchise() {
    const newFranchise = {name: "pizzaPocket", admins: [{email: "f@jwt.com"}]};
    newFranchise.name = Math.random().toString(36).substring(2, 12);
    return newFranchise;
}