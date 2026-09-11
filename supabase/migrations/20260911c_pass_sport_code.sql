-- ================================================================
-- Migration : code Pass Sport par inscription
-- À exécuter dans l'éditeur SQL du dashboard Supabase
--
-- Contexte : pour les inscriptions réglées en "Chèque 3x + code Pass
-- Sport", le comptable doit pouvoir noter le code Pass Sport transmis
-- par la famille (nécessaire pour justifier la subvention).
--
-- Aucune nouvelle policy RLS nécessaire : la colonne est couverte par
-- les policies déjà en place sur la table inscriptions.
-- ================================================================

ALTER TABLE inscriptions
  ADD COLUMN IF NOT EXISTS pass_sport_code text;
