-- Migration 001 : Ajoute les colonnes xG à la table bot_predictions
-- À exécuter UNE SEULE FOIS sur la base de données Render.

ALTER TABLE bot_predictions
  ADD COLUMN IF NOT EXISTS xg_home NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS xg_away NUMERIC(4,2);
