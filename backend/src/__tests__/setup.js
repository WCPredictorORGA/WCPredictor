// Variables d'environnement pour les tests (avant tout import)
process.env.JWT_SECRET = 'test_secret_for_unit_tests_only_minimum_32_chars_long!!';
process.env.NODE_ENV   = 'test';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
