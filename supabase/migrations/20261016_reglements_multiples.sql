-- ================================================================
-- Migration : plusieurs règlements par échéance + statut + montant attendu
-- À exécuter dans l'éditeur SQL du dashboard Supabase
--
-- Contexte : jusqu'ici une échéance (trimestre) d'une inscription ne
-- pouvait être rattachée qu'à UN seul règlement (contrainte UNIQUE sur
-- cheque_echeances(inscription_id, echeance)). Problème remonté par les
-- admins : une famille règle parfois un même trimestre en plusieurs
-- fois et avec plusieurs modes différents (ex : une partie par chèque,
-- le complément en espèces). Impossible à saisir jusqu'ici.
--
-- Cette migration ne touche à aucune ligne existante — elle assouplit
-- une contrainte et ajoute deux colonnes avec valeur par défaut :
--   - cheque_echeances : la contrainte UNIQUE passe de
--     (inscription_id, echeance) à (inscription_id, echeance, cheque_id),
--     ce qui autorise plusieurs règlements différents sur la même
--     échéance tout en empêchant de relier deux fois le même règlement
--     à la même échéance.
--   - cheques.statut : distingue un règlement "reçu" d'un règlement
--     "attendu" (annoncé par la famille, pas encore encaissé). Les
--     lignes déjà existantes passent automatiquement à 'recu', ce qui
--     est correct puisqu'elles représentent des paiements déjà traités.
--   - inscriptions.montant_attendu : montant théorique dû pour la
--     saison, saisi à la main par l'admin (remplace le calcul
--     automatique basé sur la grille tarifaire quand il ne convient
--     pas — ex : nouvel arrivant en cours d'année). NULL = pas de
--     surcharge, on utilise le calcul automatique.
-- ================================================================

-- --- cheque_echeances : autoriser plusieurs règlements par échéance ---
-- Nom de la contrainte généré par Postgres à la création de la table
-- (UNIQUE (inscription_id, echeance) inline) : à vérifier si besoin avec
-- `select conname from pg_constraint where conrelid = 'cheque_echeances'::regclass;`
ALTER TABLE cheque_echeances DROP CONSTRAINT IF EXISTS cheque_echeances_inscription_id_echeance_key;
ALTER TABLE cheque_echeances ADD CONSTRAINT cheque_echeances_inscription_echeance_cheque_key
  UNIQUE (inscription_id, echeance, cheque_id);

-- --- cheques : statut reçu / attendu ---
ALTER TABLE cheques ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'recu';
ALTER TABLE cheques DROP CONSTRAINT IF EXISTS cheques_statut_check;
ALTER TABLE cheques ADD CONSTRAINT cheques_statut_check CHECK (statut IN ('attendu', 'recu'));

-- --- inscriptions : montant attendu éditable (surcharge du calcul automatique) ---
ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS montant_attendu numeric;
