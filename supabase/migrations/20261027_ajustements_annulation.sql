-- ================================================================
-- Migration : garder la trace des changements d'activité ANNULÉS
-- À exécuter UNE SEULE FOIS dans l'éditeur SQL du dashboard Supabase
-- (prérequis : 20261026_ajustements_activite.sql déjà exécuté).
--
-- Jusqu'ici, annuler un changement supprimait sa ligne : il disparaissait
-- de l'export Excel, et le comptable ne pouvait pas comprendre pourquoi.
-- Désormais la ligne est conservée et marquée annulée (date + auteur) :
-- elle ne compte plus nulle part (théorique, effectifs, répartition) mais
-- reste visible, grisée, dans l'historique du site et dans l'Excel.
--
-- Ajout de deux colonnes vides : aucune donnée existante n'est modifiée.
-- Pour annuler :
--   ALTER TABLE public.ajustements_activite DROP COLUMN annule_le, DROP COLUMN annule_par;
--   DROP POLICY "admins_annulation_ajustements" ON public.ajustements_activite;
-- ================================================================

ALTER TABLE public.ajustements_activite ADD COLUMN IF NOT EXISTS annule_le TIMESTAMPTZ;
ALTER TABLE public.ajustements_activite ADD COLUMN IF NOT EXISTS annule_par TEXT;

-- Annuler = mettre à jour la ligne (admins uniquement, comme la création)
CREATE POLICY "admins_annulation_ajustements" ON public.ajustements_activite
  FOR UPDATE TO authenticated
  USING (public.get_auth_user_role() = 'admin')
  WITH CHECK (public.get_auth_user_role() = 'admin');
