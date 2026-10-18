-- ================================================================
-- Migration : rattachement explicite à un foyer
-- À exécuter UNE SEULE FOIS dans l'éditeur SQL du dashboard Supabase
--
-- Contexte : jusqu'ici le foyer (remise famille, encaissé et reste dû
-- calculés ensemble) était uniquement déduit des règlements partagés
-- (cheque_echeances). Une personne qui rejoint sa famille en cours d'année
-- en payant ses propres règlements ne pouvait jamais y être rattachée.
--
-- foyer_id : identifiant commun à toutes les inscriptions d'un même foyer
-- (même saison). NULL = pas de rattachement explicite ; les foyers déduits
-- des règlements partagés continuent d'être reconnus en plus.
--
-- Ajout pur : aucune donnée existante n'est modifiée. Pour annuler :
--   ALTER TABLE public.inscriptions DROP COLUMN foyer_id;
-- ================================================================

ALTER TABLE public.inscriptions ADD COLUMN IF NOT EXISTS foyer_id UUID;

CREATE INDEX IF NOT EXISTS idx_inscriptions_foyer ON public.inscriptions(foyer_id) WHERE foyer_id IS NOT NULL;
