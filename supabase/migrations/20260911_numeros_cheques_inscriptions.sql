-- ================================================================
-- Migration : numéros de chèque par inscription
-- À exécuter dans l'éditeur SQL du dashboard Supabase
--
-- Contexte : le comptable veut pouvoir noter le(s) numéro(s) de
-- chèque reçu(s) pour une inscription, qu'elle ait été saisie en
-- ligne ou sur papier. Un paiement en plusieurs fois (4x, 3x + Pass
-- Sport) peut correspondre à plusieurs chèques différents — un par
-- échéance — d'où un tableau JSON plutôt qu'un simple champ texte.
--
-- Format de numeros_cheques :
-- [{ "echeance": 1, "label": "À l'inscription", "numero": "1234567" },
--  { "echeance": 2, "label": "Décembre 2026",    "numero": "1234568" }, ...]
--
-- Aucune nouvelle policy RLS nécessaire : la colonne est couverte
-- par les policies déjà en place sur la table inscriptions
-- (voir 20260609_rls_inscriptions_membres.sql — admin : lecture et
-- écriture complètes ; admin_discipline : accès géré côté appli).
-- ================================================================

ALTER TABLE inscriptions
  ADD COLUMN IF NOT EXISTS numeros_cheques jsonb NOT NULL DEFAULT '[]'::jsonb;
