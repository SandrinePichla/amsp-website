-- ================================================================
-- Migration : type de règlement (chèque / espèces / virement)
-- À exécuter dans l'éditeur SQL du dashboard Supabase
--
-- Contexte : jusqu'ici la table `cheques` ne représentait que des
-- chèques (numéro obligatoire). Pour tracer aussi les règlements en
-- espèces et par virement — avec le même mécanisme de partage entre
-- plusieurs inscriptions via cheque_echeances (ex : une famille qui
-- règle ses adhésions en une fois par virement) — on généralise la
-- table : ajout d'un type, et le numéro devient facultatif puisque
-- les espèces et virements n'en ont pas.
--
-- Rien n'est renommé : "cheques" et "cheque_echeances" gardent leurs
-- noms, ils représentent maintenant "un règlement" au sens large.
-- ================================================================

ALTER TABLE cheques ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'cheque';

ALTER TABLE cheques DROP CONSTRAINT IF EXISTS cheques_type_check;
ALTER TABLE cheques ADD CONSTRAINT cheques_type_check CHECK (type IN ('cheque', 'especes', 'virement'));

ALTER TABLE cheques ALTER COLUMN numero DROP NOT NULL;

-- Les chèques déjà enregistrés ont automatiquement type = 'cheque' (valeur par
-- défaut ci-dessus) : rien à corriger sur les lignes existantes.
