const request = require('supertest');
const jwt     = require('jsonwebtoken');

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../scoring', () => ({ scorePredictions: jest.fn().mockResolvedValue(undefined) }));
const pool = require('../db');
const app  = require('../app');

const SECRET     = process.env.JWT_SECRET;
const userToken  = jwt.sign({ id: 1, role: 'user'  }, SECRET);
const adminToken = jwt.sign({ id: 2, role: 'admin' }, SECRET);
const authCookie = (t) => `token=${t}`;

beforeEach(() => jest.resetAllMocks());

// ─────────────────────────────────────────────
//  GET /api/matches
// ─────────────────────────────────────────────
describe('GET /api/matches', () => {
    it('200 — liste des matchs accessible publiquement', async () => {
        pool.query.mockResolvedValueOnce({ rows: [
            { id: 1, home_team: 'France', away_team: 'Brésil', status: 'scheduled' },
        ]});
        const res = await request(app).get('/api/matches');
        expect(res.status).toBe(200);
        expect(res.body.matches).toHaveLength(1);
    });

    it('200 — filtre par statut (scheduled)', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app).get('/api/matches?status=scheduled');
        expect(res.status).toBe(200);
        // Vérifier que le paramètre est bien passé en param SQL (pas en interpolation)
        const queryCall = pool.query.mock.calls[0];
        expect(queryCall[1]).toContain('scheduled'); // param SQL
        expect(queryCall[0]).not.toContain('scheduled'); // pas dans la chaîne SQL
    });

    it('200 — paramètre sort invalide ignoré (liste blanche)', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        // Tenter une injection via le paramètre sort
        const res = await request(app)
            .get('/api/matches?sort=; DROP TABLE matches;--&order=ASC');
        expect(res.status).toBe(200);
        // Vérifier que la colonne de tri est une valeur sûre (par défaut)
        const sql = pool.query.mock.calls[0][0];
        expect(sql).toContain('m.match_datetime'); // colonne par défaut
        expect(sql).not.toContain('DROP');
    });
});

// ─────────────────────────────────────────────
//  POST /api/matches/:id/result
// ─────────────────────────────────────────────
describe('POST /api/matches/:id/result', () => {
    const validResult = { home_score: 2, away_score: 1 };

    it('401 — non authentifié', async () => {
        const res = await request(app).post('/api/matches/1/result').send(validResult);
        expect(res.status).toBe(401);
    });

    it('403 — authentifié mais pas admin', async () => {
        const res = await request(app).post('/api/matches/1/result')
            .set('Cookie', authCookie(userToken))
            .send(validResult);
        expect(res.status).toBe(403);
    });

    it('400 — score supérieur à 99', async () => {
        const res = await request(app).post('/api/matches/1/result')
            .set('Cookie', authCookie(adminToken))
            .send({ home_score: 100, away_score: 0 });
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('home_score');
    });

    it('400 — score négatif', async () => {
        const res = await request(app).post('/api/matches/1/result')
            .set('Cookie', authCookie(adminToken))
            .send({ home_score: -1, away_score: 0 });
        expect(res.status).toBe(400);
    });

    it('400 — ID de match non entier', async () => {
        const res = await request(app).post('/api/matches/abc/result')
            .set('Cookie', authCookie(adminToken))
            .send(validResult);
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('id');
    });

    it('404 — match introuvable', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app).post('/api/matches/999/result')
            .set('Cookie', authCookie(adminToken))
            .send(validResult);
        expect(res.status).toBe(404);
    });

    it('200 — résultat enregistré par un admin', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ id: 1 }] })  // vérif existence match
            .mockResolvedValueOnce({ rows: [] });             // UPDATE
        const res = await request(app).post('/api/matches/1/result')
            .set('Cookie', authCookie(adminToken))
            .send(validResult);
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Résultat enregistré/);
    });
});
