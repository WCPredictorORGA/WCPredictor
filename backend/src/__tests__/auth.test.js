const request = require('supertest');
const bcrypt  = require('bcryptjs');

// Mock DB avant tout import de l'app
jest.mock('../db', () => ({ query: jest.fn() }));
const pool = require('../db');
const app  = require('../app');

const VALID_USER = { username: 'Testeur', email: 'test@example.com', password: 'Password1' };

beforeEach(() => jest.resetAllMocks());

// ─────────────────────────────────────────────
//  INSCRIPTION
// ─────────────────────────────────────────────
describe('POST /api/auth/register', () => {
    it('201 — crée un compte avec des données valides', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{ id: 1, username: 'Testeur', email: 'test@example.com', role: 'user' }],
        });
        const res = await request(app).post('/api/auth/register').send(VALID_USER);
        expect(res.status).toBe(201);
        expect(res.body.user).toMatchObject({ username: 'Testeur', role: 'user' });
        expect(res.body.user.password_hash).toBeUndefined();
    });

    it('400 — pseudo trop court (< 3 chars)', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ ...VALID_USER, username: 'ab' });
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('username');
    });

    it('400 — pseudo trop long (> 30 chars)', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ ...VALID_USER, username: 'a'.repeat(31) });
        expect(res.status).toBe(400);
    });

    it('400 — injection SQL dans le pseudo (caractères interdits)', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ ...VALID_USER, username: "admin'; DROP TABLE users;--" });
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('username');
    });

    it('400 — email invalide', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ ...VALID_USER, email: 'pas-un-email' });
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('email');
    });

    it('400 — mot de passe trop court (< 8 chars)', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ ...VALID_USER, password: 'Pass1' });
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('password');
    });

    it('400 — mot de passe sans majuscule', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ ...VALID_USER, password: 'password1' });
        expect(res.status).toBe(400);
    });

    it('400 — mot de passe sans chiffre', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ ...VALID_USER, password: 'PasswordNoDigit' });
        expect(res.status).toBe(400);
    });

    it('400 — champs manquants', async () => {
        const res = await request(app).post('/api/auth/register').send({});
        expect(res.status).toBe(400);
        expect(res.body.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('409 — email déjà utilisé', async () => {
        pool.query.mockRejectedValueOnce({ code: '23505' });
        const res = await request(app).post('/api/auth/register').send(VALID_USER);
        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/déjà utilisé/);
    });

    it('ne renvoie jamais le hash du mot de passe', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{ id: 1, username: 'Testeur', email: 'test@example.com', role: 'user' }],
        });
        const res = await request(app).post('/api/auth/register').send(VALID_USER);
        expect(JSON.stringify(res.body)).not.toMatch(/hash/i);
    });
});

// ─────────────────────────────────────────────
//  CONNEXION
// ─────────────────────────────────────────────
describe('POST /api/auth/login', () => {
    const makeUser = async () => ({
        id: 1, username: 'Testeur', role: 'user',
        password_hash: await bcrypt.hash('Password1', 1), // 1 round pour la vitesse des tests
    });

    it('200 — connexion avec des identifiants valides', async () => {
        pool.query.mockResolvedValueOnce({ rows: [await makeUser()] });
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'Password1' });
        expect(res.status).toBe(200);
        expect(res.body.user).toMatchObject({ username: 'Testeur' });
        expect(res.headers['set-cookie']).toBeDefined(); // cookie httpOnly posé
    });

    it('401 — mauvais mot de passe', async () => {
        pool.query.mockResolvedValueOnce({ rows: [await makeUser()] });
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'WrongPass1' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Identifiants invalides');
    });

    it('401 — utilisateur inconnu (même message que mot de passe erroné)', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'inconnu@example.com', password: 'Password1' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Identifiants invalides');
    });

    it('400 — email invalide', async () => {
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'pas-un-email', password: 'Password1' });
        expect(res.status).toBe(400);
    });

    it('400 — mot de passe manquant', async () => {
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'test@example.com' });
        expect(res.status).toBe(400);
    });

    it('ne renvoie jamais le hash ou le token dans le body', async () => {
        pool.query.mockResolvedValueOnce({ rows: [await makeUser()] });
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'Password1' });
        expect(res.body.token).toBeUndefined();
        expect(JSON.stringify(res.body)).not.toMatch(/hash/i);
    });
});

// ─────────────────────────────────────────────
//  DÉCONNEXION
// ─────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
    it('200 — efface le cookie', async () => {
        const res = await request(app).post('/api/auth/logout');
        expect(res.status).toBe(200);
        // Le cookie doit être effacé (Max-Age=0 ou Expires passé)
        const cookie = (res.headers['set-cookie'] || []).find(c => c.startsWith('token='));
        expect(cookie).toBeDefined();
        expect(cookie).toMatch(/Max-Age=0|Expires=.*1970/i);
    });
});
