const request = require('supertest');
const jwt     = require('jsonwebtoken');

jest.mock('../db', () => ({ query: jest.fn() }));
const pool = require('../db');
const app  = require('../app');

const SECRET = process.env.JWT_SECRET;
const userToken  = jwt.sign({ id: 1, role: 'user'  }, SECRET);
const adminToken = jwt.sign({ id: 2, role: 'admin' }, SECRET);
const authCookie = (token) => `token=${token}`;

beforeEach(() => jest.resetAllMocks());

// ─────────────────────────────────────────────
//  GET /api/predictions
// ─────────────────────────────────────────────
describe('GET /api/predictions', () => {
    it('401 — sans authentification', async () => {
        const res = await request(app).get('/api/predictions');
        expect(res.status).toBe(401);
    });

    it('200 — retourne les pronostics de l\'utilisateur', async () => {
        pool.query.mockResolvedValueOnce({ rows: [
            { id: 1, match_id: 10, pred_home: 2, pred_away: 1, points_awarded: 3 },
        ]});
        const res = await request(app).get('/api/predictions')
            .set('Cookie', authCookie(userToken));
        expect(res.status).toBe(200);
        expect(res.body.predictions).toHaveLength(1);
    });

    it('401 — token invalide (falsifié)', async () => {
        const res = await request(app).get('/api/predictions')
            .set('Cookie', 'token=faketoken.invalid.signature');
        expect(res.status).toBe(401);
    });
});

// ─────────────────────────────────────────────
//  POST /api/predictions
// ─────────────────────────────────────────────
describe('POST /api/predictions', () => {
    const validPayload = { match_id: 1, pred_home: 2, pred_away: 0 };

    it('401 — sans authentification', async () => {
        const res = await request(app).post('/api/predictions').send(validPayload);
        expect(res.status).toBe(401);
    });

    it('400 — match_id manquant', async () => {
        const res = await request(app).post('/api/predictions')
            .set('Cookie', authCookie(userToken))
            .send({ pred_home: 1, pred_away: 0 });
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('match_id');
    });

    it('400 — match_id négatif', async () => {
        const res = await request(app).post('/api/predictions')
            .set('Cookie', authCookie(userToken))
            .send({ match_id: -1, pred_home: 1, pred_away: 0 });
        expect(res.status).toBe(400);
    });

    it('400 — match_id non entier (injection SQL)', async () => {
        const res = await request(app).post('/api/predictions')
            .set('Cookie', authCookie(userToken))
            .send({ match_id: "1; DROP TABLE predictions;--", pred_home: 1, pred_away: 0 });
        expect(res.status).toBe(400);
    });

    it('400 — score supérieur à 99', async () => {
        const res = await request(app).post('/api/predictions')
            .set('Cookie', authCookie(userToken))
            .send({ match_id: 1, pred_home: 100, pred_away: 0 });
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('pred_home');
    });

    it('400 — score négatif', async () => {
        const res = await request(app).post('/api/predictions')
            .set('Cookie', authCookie(userToken))
            .send({ match_id: 1, pred_home: -1, pred_away: 0 });
        expect(res.status).toBe(400);
    });

    it('404 — match introuvable', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] }); // match inexistant
        const res = await request(app).post('/api/predictions')
            .set('Cookie', authCookie(userToken))
            .send(validPayload);
        expect(res.status).toBe(404);
    });

    it('403 — match déjà commencé', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ status: 'finished' }] });
        const res = await request(app).post('/api/predictions')
            .set('Cookie', authCookie(userToken))
            .send(validPayload);
        expect(res.status).toBe(403);
    });

    it('201 — pronostic créé avec succès', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ status: 'scheduled' }] })   // vérif match
            .mockResolvedValueOnce({ rows: [{ id: 1, match_id: 1, pred_home: 2, pred_away: 0 }] }); // insert
        const res = await request(app).post('/api/predictions')
            .set('Cookie', authCookie(userToken))
            .send(validPayload);
        expect(res.status).toBe(201);
        expect(res.body.prediction.pred_home).toBe(2);
    });

    it('l\'user_id vient du token, pas du body (pas d\'usurpation)', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ status: 'scheduled' }] })
            .mockResolvedValueOnce({ rows: [{ id: 1, match_id: 1, pred_home: 1, pred_away: 0 }] });
        await request(app).post('/api/predictions')
            .set('Cookie', authCookie(userToken))
            .send({ ...validPayload, user_id: 999 }); // tentative d'usurpation
        // Le premier appel pool.query doit utiliser match_id=1
        // Le second doit utiliser userId=1 (du token), pas 999
        const insertCall = pool.query.mock.calls[1];
        expect(insertCall[1][0]).toBe(1); // userId du token
    });
});
