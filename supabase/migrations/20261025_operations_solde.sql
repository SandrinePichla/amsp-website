-- ================================================================
-- Migration : opérations de solde d'un foyer (remboursements, écarts acceptés)
-- À exécuter UNE SEULE FOIS dans l'éditeur SQL du dashboard Supabase,
-- APRÈS une sauvegarde de la base.
--
-- Deux opérations de nature comptable différente :
--   - 'remboursement'  : de l'argent SORT (trop-perçu rendu). Statut
--     'a_rembourser' (décidé) puis 'rembourse' (fait). Seul un remboursement
--     fait diminue l'encaissé net du foyer.
--   - 'ecart_accepte'  : AUCUN argent ne bouge. Le club renonce à quelques
--     euros/centimes (montant > 0) ou garde un petit trop-perçu (montant < 0).
--     Ramène le reste dû à zéro, ne compte ni dans l'encaissé ni en banque.
-- Rattachées à une inscription du foyer, cumulées par foyer (comme les règlements).
--
-- Ajout pur : aucune table existante n'est modifiée. Pour annuler :
--   DROP TABLE public.operations_solde;
-- ================================================================

CREATE TABLE IF NOT EXISTS public.operations_solde (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inscription_id  UUID        NOT NULL REFERENCES public.inscriptions(id) ON DELETE CASCADE,
  saison          TEXT,
  type            TEXT        NOT NULL CHECK (type IN ('remboursement', 'ecart_accepte')),
  montant         NUMERIC(10,2) NOT NULL,
  -- Remboursement uniquement
  statut          TEXT        CHECK (statut IN ('a_rembourser', 'rembourse')),
  mode            TEXT        CHECK (mode IN ('cheque', 'virement', 'especes')),
  numero          TEXT,
  date_operation  DATE,
  motif           TEXT,
  admin_id        UUID        REFERENCES public.profils(id) ON DELETE SET NULL,
  admin_nom       TEXT,
  CHECK (
    (type = 'remboursement' AND montant > 0 AND statut IS NOT NULL)
    OR (type = 'ecart_accepte' AND statut IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_operations_solde_inscription ON public.operations_solde(inscription_id);

ALTER TABLE public.operations_solde ENABLE ROW LEVEL SECURITY;

-- Réservé aux admins (get_auth_user_role est SECURITY DEFINER : pas de récursion sur profils)
CREATE POLICY "admins_operations_solde" ON public.operations_solde
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() IN ('admin', 'admin_discipline'))
  WITH CHECK (public.get_auth_user_role() IN ('admin', 'admin_discipline'));
