-- ================================================================
-- Migration : ajout du statut "remis en banque" sur les règlements
-- À exécuter dans l'éditeur SQL du dashboard Supabase
--
-- Contexte : jusqu'ici un règlement n'avait que 2 statuts possibles
-- ("attendu" / "reçu"). Pratique courante en comptabilité associative :
-- un chèque reçu n'est pas encore "sécurisé" tant qu'il n'a pas été
-- physiquement déposé en banque (bordereau de remise). On ajoute donc
-- un 3ᵉ statut "depose" entre les deux premiers.
--
-- Les lignes existantes ne sont pas affectées (toujours 'attendu' ou
-- 'recu' selon leur valeur actuelle) — seule la contrainte qui limite
-- les valeurs autorisées est élargie.
-- ================================================================

ALTER TABLE cheques DROP CONSTRAINT IF EXISTS cheques_statut_check;
ALTER TABLE cheques ADD CONSTRAINT cheques_statut_check CHECK (statut IN ('attendu', 'recu', 'depose'));
