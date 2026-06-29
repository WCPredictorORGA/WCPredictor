-- Migration 002 : Crée le compte utilisateur Botnaru
-- Le bot participe au classement avec ses propres prédictions.
-- Le mot de passe est un hash bcrypt inutilisable (connexion désactivée).

INSERT INTO users (username, email, password_hash, role)
VALUES (
  'Botnaru',
  'botnaru@wcpredictor.ai',
  -- Hash bcrypt invalide — connexion impossible via ce compte
  '$2b$12$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'user'
)
ON CONFLICT (username) DO NOTHING;
