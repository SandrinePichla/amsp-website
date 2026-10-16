-- ================================================================
-- Migration : retrait du blocage "par compte" dans la vérification de doublon
-- À exécuter dans l'éditeur SQL du dashboard Supabase
--
-- Contexte : check_inscription_doublon() (créée directement dans le SQL
-- Editor, jamais suivie dans une migration jusqu'ici) bloquait une nouvelle
-- inscription en ligne dès qu'un compte membre connecté avait déjà une
-- inscription pour la saison — y compris pour un enfant au nom différent.
-- Un parent connecté ne pouvait donc pas inscrire plusieurs enfants dans la
-- même saison depuis son espace membre.
--
-- La vérification par identité (nom + prénom + date de naissance, voir plus
-- bas) suffit déjà à empêcher qu'une même personne soit inscrite deux fois,
-- y compris pour un compte qui resoumettrait sa propre fiche par erreur.
-- Le blocage par compte n'apportait donc aucune protection supplémentaire
-- réelle, seulement une gêne pour les familles à plusieurs enfants.
--
-- Changement : suppression de la branche "(p_user_id IS NOT NULL AND
-- user_id = p_user_id)". Le paramètre p_user_id reste dans la signature
-- (pour ne rien casser côté code, qui continue à l'envoyer) mais n'est
-- plus utilisé dans la vérification.
-- ================================================================

CREATE OR REPLACE FUNCTION public.check_inscription_doublon(
  p_nom text,
  p_prenom text,
  p_saison text,
  p_user_id uuid DEFAULT NULL::uuid,
  p_date_naissance text DEFAULT NULL::text
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM inscriptions
    WHERE saison = p_saison
      AND statut NOT IN ('refusee', 'supprimee')
      AND lower(trim(nom))    = lower(trim(p_nom))
      AND lower(trim(prenom)) = lower(trim(p_prenom))
      AND (p_date_naissance IS NULL OR date_naissance::text = p_date_naissance)
  );
END;
$function$;
