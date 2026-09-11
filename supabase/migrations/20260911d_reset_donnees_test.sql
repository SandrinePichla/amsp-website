-- ================================================================
-- Script de remise à zéro — fin des tests, passage aux vraies adhésions
-- À exécuter dans l'éditeur SQL du dashboard Supabase
--
-- ⚠️ IRRÉVERSIBLE. Ce script supprime toutes les inscriptions, enfants,
-- accès galerie, chèques et logs de connexion de test.
--
-- Les comptes ADMIN et ADMIN DE DISCIPLINE sont CONSERVÉS (décision du
-- 11/09/2026) : seuls les comptes membre / tiers / en_attente / refuse
-- sont supprimés de la table profils.
--
-- Ordre de suppression : des tables les plus dépendantes vers les
-- moins dépendantes, pour ne jamais dépendre du comportement des
-- contraintes de clé étrangère (CASCADE / SET NULL / RESTRICT).
-- ================================================================

-- ----------------------------------------------------------------
-- 0. Photo avant suppression — à regarder avant de valider le reste.
--    Si un chiffre te paraît anormal (ex: un admin qui apparaîtrait
--    dans "profils à supprimer"), STOP, ne lance pas la suite.
-- ----------------------------------------------------------------
SELECT
  (SELECT count(*) FROM inscriptions)                                            AS inscriptions,
  (SELECT count(*) FROM enfants)                                                 AS enfants,
  (SELECT count(*) FROM liens_compte_enfant)                                     AS liens_compte_enfant,
  (SELECT count(*) FROM acces_galerie)                                           AS acces_galerie,
  (SELECT count(*) FROM cheques)                                                 AS cheques,
  (SELECT count(*) FROM cheque_echeances)                                        AS cheque_echeances,
  (SELECT count(*) FROM connexions_log)                                          AS connexions_log,
  (SELECT count(*) FROM profils WHERE role NOT IN ('admin', 'admin_discipline')) AS profils_a_supprimer,
  (SELECT count(*) FROM profils WHERE role IN ('admin', 'admin_discipline'))     AS profils_conserves;

-- ----------------------------------------------------------------
-- Étape suivante : si les chiffres ci-dessus correspondent à ce que
-- tu attends, sélectionne et exécute le bloc ci-dessous.
-- ----------------------------------------------------------------

-- 1. Chèques (dépend de cheques + inscriptions)
DELETE FROM cheque_echeances;

-- 2. Chèques
DELETE FROM cheques;

-- 3. Accès galerie (dépend de profils + inscriptions)
DELETE FROM acces_galerie;

-- 4. Liens compte ↔ enfant (dépend de profils + enfants)
DELETE FROM liens_compte_enfant;

-- 5. Historique des connexions
DELETE FROM connexions_log;

-- 6. Inscriptions (dépend de enfants + profils)
DELETE FROM inscriptions;

-- 7. Enfants
DELETE FROM enfants;

-- 8. Profils de test — on garde les comptes admin et admin de discipline
DELETE FROM profils WHERE role NOT IN ('admin', 'admin_discipline');

-- ----------------------------------------------------------------
-- Vérification finale — tout doit être à 0, sauf profils_conserves
-- ----------------------------------------------------------------
SELECT
  (SELECT count(*) FROM inscriptions)          AS inscriptions,
  (SELECT count(*) FROM enfants)                AS enfants,
  (SELECT count(*) FROM liens_compte_enfant)    AS liens_compte_enfant,
  (SELECT count(*) FROM acces_galerie)          AS acces_galerie,
  (SELECT count(*) FROM cheques)                AS cheques,
  (SELECT count(*) FROM cheque_echeances)       AS cheque_echeances,
  (SELECT count(*) FROM connexions_log)         AS connexions_log,
  (SELECT count(*) FROM profils)                AS profils_conserves;

-- ================================================================
-- À faire séparément, à la main, si besoin (pas dans ce script) :
--
-- Comptes de connexion (auth.users) des membres de test supprimés
-- ci-dessus : ils ne sont PAS touchés par ce script (Supabase gère
-- l'authentification à part de la table profils). Une personne dont
-- le compte de test a été supprimé peut donc encore se connecter,
-- mais n'aura plus aucun profil ni droit associé.
-- Pour les supprimer aussi : dashboard Supabase → Authentication →
-- Users → sélectionner les comptes de test → Delete.
-- ================================================================
