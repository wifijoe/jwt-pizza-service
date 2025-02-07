const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let testUser;
let testFranchise;
let testStore;
let testUserAuthToken;
let adminUserAuthToken;
let testStoreId;
let testFranchiseId;

beforeAll(async () => {
    testUser = createUser();
    testFranchise = createFranchise();
    testStore = createStore();

    const adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send({email: adminUser.email, password: adminUser.password});
    expect(loginRes.status).toBe(200);
    adminUserAuthToken = loginRes.body.token;
    expectValidJwt(adminUserAuthToken);

    const registerTestUser = createUser()
    const RegisterRes = await request(app)
    .post('/api/auth')
    .send(testUser);
    expect(RegisterRes.status).toBe(200);
    testUserAuthToken = RegisterRes.body.token;
    expectValidJwt(testUserAuthToken);

    testFranchise = createFranchise()
    const testFranchiseCreateRequest = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send(testFranchise);
    expect(testFranchiseCreateRequest.status).toBe(200);
    testFranchiseId = testFranchiseCreateRequest.body.id

    testStore = createStore(testFranchiseId);
    const testStoreCreateRequest = await request(app)
        .post(`/api/franchise/${testFranchiseId}/store`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send(testStore);
    expect(testStoreCreateRequest.status).toBe(200);
    testStoreId = testStoreCreateRequest.body.id;
});

test('Add Item to Menu', async () => {
    const addItemResponse = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send({ title: "Student", description: "No topping, no sauce, just carbs", image:"pizza9.png", price: 0.0001 });
    expect(addItemResponse.status).toBe(200);
    expect(addItemResponse.body).toMatchObject(expect.any(Array));
});

test('Fail to add Menu Item', async () => {
    const addItemResponse = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send({ title: "Student", description: "No topping, no sauce, just carbs", image:"pizza9.png", price: 0.0001 });
    expect(addItemResponse.status).toBe(403);
});

test('Get menu Item', async () => {
    const getItemsResponse = await request(app)
        .get('/api/order/menu');
    expect(getItemsResponse.status).toBe(200);
    expect(getItemsResponse.body).toMatchObject(expect.any(Array));
});

test('Create an Order', async () => {
    const makeOrderResponse = await request(app)
        .post('/api/order')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send({franchiseId: 1, storeId:1, items:[{ menuId: 1, description: "Veggie", price: 0.05 }]});
    expect(makeOrderResponse.status).toBe(200);
    expect(makeOrderResponse.body).toMatchObject({});
});

afterAll(async () => {
    const deleteStoreResponse = await request(app)
        .delete(`/api/franchise/${testFranchiseId}/store/${testStoreId}`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`);
    expect(deleteStoreResponse.status).toBe(200);
    expect(deleteStoreResponse.body.message).toBe('store deleted');

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

function createUser() {
    const newUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
    newUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    return newUser
}

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = Math.random().toString(36).substring(2, 12);
    user.email = user.name + '@admin.com';

    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
}
