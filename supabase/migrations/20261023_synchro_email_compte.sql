-- ================================================================
-- Migration : synchronisation automatique d'un changement d'email de connexion
-- À exécuter UNE SEULE FOIS dans l'éditeur SQL du dashboard Supabase
-- (prérequis : 20261022_journal_modifications.sql déjà exécuté)
--
-- Contexte : un changement d'email de connexion (demandé par un admin via la
-- fonction "changer-email", ou plus tard par l'adhérent lui-même) ne devient
-- effectif qu'au clic sur le lien de confirmation, parfois des jours plus tard.
-- Ce déclencheur, posé sur auth.users, recopie alors le nouvel email partout
-- où l'ancien était utilisé — quel que soit le chemin du changement :
--   - profils.email du compte ;
--   - inscriptions.email, parent1_email, parent2_email de toutes les saisons ;
-- et trace chaque recopie dans journal_modifications (ancienne → nouvelle valeur).
--
-- Ajout pur : aucune table n'est modifiée. Pour annuler :
--   DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;
--   DROP FUNCTION IF EXISTS public.synchroniser_email_compte();
-- ================================================================

CREATE OR REPLACE FUNCTION public.synchroniser_email_compte()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ancien  text := lower(trim(OLD.email));
  nouveau text := trim(NEW.email);
  auteur  text := 'Automatique (email confirmé)';
BEGIN
  IF OLD.email IS NULL OR NEW.email IS NULL OR lower(trim(OLD.email)) = lower(trim(NEW.email)) THEN
    RETURN NEW;
  END IF;

  -- Compte membre
  INSERT INTO journal_modifications (admin_id, admin_nom, table_cible, ligne_id, personne, champ, ancienne_valeur, nouvelle_valeur)
  SELECT NULL, auteur, 'profils', p.id, trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), 'Email de connexion', p.email, nouveau
  FROM profils p WHERE p.id = NEW.id;
  UPDATE profils SET email = nouveau WHERE id = NEW.id;

  -- Inscriptions (toutes saisons) : email de l'adhérent adulte
  INSERT INTO journal_modifications (admin_id, admin_nom, table_cible, ligne_id, personne, champ, ancienne_valeur, nouvelle_valeur)
  SELECT NULL, auteur, 'inscriptions', i.id, trim(coalesce(i.prenom, '') || ' ' || coalesce(i.nom, '')), 'Email', i.email, nouveau
  FROM inscriptions i WHERE lower(trim(i.email)) = ancien;
  UPDATE inscriptions SET email = nouveau WHERE lower(trim(email)) = ancien;

  -- Inscriptions de mineurs : email du parent 1
  INSERT INTO journal_modifications (admin_id, admin_nom, table_cible, ligne_id, personne, champ, ancienne_valeur, nouvelle_valeur)
  SELECT NULL, auteur, 'inscriptions', i.id, trim(coalesce(i.prenom, '') || ' ' || coalesce(i.nom, '')), 'Parent 1 — email', i.parent1_email, nouveau
  FROM inscriptions i WHERE lower(trim(i.parent1_email)) = ancien;
  UPDATE inscriptions SET parent1_email = nouveau WHERE lower(trim(parent1_email)) = ancien;

  -- Inscriptions de mineurs : email du parent 2 (qui peut avoir son propre espace)
  INSERT INTO journal_modifications (admin_id, admin_nom, table_cible, ligne_id, personne, champ, ancienne_valeur, nouvelle_valeur)
  SELECT NULL, auteur, 'inscriptions', i.id, trim(coalesce(i.prenom, '') || ' ' || coalesce(i.nom, '')), 'Parent 2 — email', i.parent2_email, nouveau
  FROM inscriptions i WHERE lower(trim(i.parent2_email)) = ancien;
  UPDATE inscriptions SET parent2_email = nouveau WHERE lower(trim(parent2_email)) = ancien;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;
CREATE TRIGGER on_auth_user_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.synchroniser_email_compte();
