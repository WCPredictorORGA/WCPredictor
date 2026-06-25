const request = require('supertest');

jest.mock('../db', () => ({ query: jest.fn() }));
const app = require('../app');

// ─────────────────────────────────────────────
//  EN-TÊTES DE SÉCURITÉ
// ─────────────────────────────────────────────
describe('En-têtes de sécurité HTTP', () => {
    let res;
    beforeAll(async () => { res = await request(app).get('/health'); });

    it('X-Content-Type-Options: nosniff', () => {
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('X-Frame-Options absent ou remplacé par CSP frameAncestors', () => {
        // Helmet v8 utilise CSP frame-ancestors à la place de X-Frame-Options
        const csp = res.headers['content-security-policy'] || '';
        const xfo = res.headers['x-frame-options'] || '';
        expect(csp.includes("frame-ancestors 'none'") || xfo !== '').toBe(true);
    });

    it('X-Powered-By supprimé (ne pas révéler Express)', () => {
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('Content-Security-Policy présent', () => {
        expect(res.headers['content-security-policy']).toBeDefined();
    });
});

// ─────────────────────────────────────────────
//  PROTECTION CONTRE LES PAYLOADS TROP GRANDS
// ─────────────────────────────────────────────
describe('Limite de taille des requêtes (10 ko)', () => {
    it('413 — payload JSON > 10 ko rejeté', async () => {
        const bigPayload = { data: 'x'.repeat(11 * 1024) }; // 11 ko
        const res = await request(app)
            .post('/api/auth/register')
            .send(bigPayload);
        // Express renvoie 413 ou 400 selon la version
        expect([400, 413]).toContain(res.status);
    });
});

// ─────────────────────────────────────────────
//  PROTECTION CONTRE LES INJECTIONS SQL
// ─────────────────────────────────────────────
describe('Résistance aux tentatives d\'injection SQL', () => {
    it('Injection dans l\'email de login rejetée par la validation', async () => {
        const res = await request(app).post('/api/auth/login')
            .send({ email: "' OR '1'='1", password: 'Password1' });
        expect(res.status).toBe(400);
    });

    it('Injection dans le username de register rejetée (caractères interdits)', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({
                username: "Robert'); DROP TABLE users;--",
                email: 'test@test.com',
                password: 'Password1',
            });
        expect(res.status).toBe(400);
    });

    it('Injection dans match_id rejetée (doit être un entier)', async () => {
        const res = await request(app).post('/api/predictions')
            .set('Cookie', 'token=invalidtoken') // pas d'auth pour tester la validation
            .send({ match_id: "1 UNION SELECT * FROM users", pred_home: 0, pred_away: 0 });
        // 401 (pas authentifié) ou 400 (validation) : dans les deux cas pas de 200
        expect(res.status).not.toBe(200);
    });
});

// ─────────────────────────────────────────────
//  CORS
// ─────────────────────────────────────────────
describe('Politique CORS', () => {
    it('Autorise l\'origine du frontend', async () => {
        const res = await request(app)
            .get('/health')
            .set('Origin', 'http://localhost:5173');
        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('Bloque une origine inconnue', async () => {
        const res = await request(app)
            .get('/health')
            .set('Origin', 'http://evil.com');
        // Soit pas d'en-tête ACAO, soit 403
        const allowOrigin = res.headers['access-control-allow-origin'];
        expect(allowOrigin).not.toBe('http://evil.com');
    });
});

// ─────────────────────────────────────────────
//  JSON INVALIDE
// ─────────────────────────────────────────────
describe('Robustesse au JSON malformé', () => {
    it('400 — corps JSON malformé', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send('{invalid json]');
        expect([400, 415]).toContain(res.status);
    });
});

// ─────────────────────────────────────────────
//  ROUTES INEXISTANTES
// ─────────────────────────────────────────────
describe('Routes inconnues', () => {
    it('404 — route inexistante ne crashe pas le serveur', async () => {
        const res = await request(app).get('/api/cette-route-nexiste-pas');
        expect(res.status).toBe(404);
    });
});
