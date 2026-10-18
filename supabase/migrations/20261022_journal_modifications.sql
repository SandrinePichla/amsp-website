-- ================================================================
-- Migration : journal des modifications (qui a corrigé quoi et quand)
-- À exécuter dans l'éditeur SQL du dashboard Supabase
--
-- Contexte : le nom, le prénom et la date de naissance d'une inscription
-- validée deviennent modifiables par les admins. Chaque champ modifié
-- (sur une inscription ou sur le compte membre synchronisé) est tracé ici,
-- avec l'ancienne et la nouvelle valeur, ce qui permet aussi de rattraper
-- une correction faite par erreur.
--
-- Ajout pur : aucune table existante n'est modifiée. Pour annuler :
--   DROP TABLE public.journal_modifications;
-- ================================================================

CREATE TABLE IF NOT EXISTS public.journal_modifications (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Admin auteur de la modification (nom copié pour rester lisible même si le compte disparaît)
  admin_id         UUID        REFERENCES public.profils(id) ON DELETE SET NULL,
  admin_nom        TEXT,
  -- Ligne modifiée : 'inscriptions' ou 'profils'
  table_cible      TEXT        NOT NULL CHECK (table_cible IN ('inscriptions', 'profils')),
  ligne_id         UUID        NOT NULL,
  -- Personne concernée, copiée au moment de la modification (lisible sans jointure)
  personne         TEXT,
  champ            TEXT        NOT NULL,
  ancienne_valeur  TEXT,
  nouvelle_valeur  TEXT
);

CREATE INDEX IF NOT EXISTS idx_journal_modifications_ligne ON public.journal_modifications(ligne_id);
CREATE INDEX IF NOT EXISTS idx_journal_modifications_date  ON public.journal_modifications(created_at DESC);

ALTER TABLE public.journal_modifications ENABLE ROW LEVEL SECURITY;

-- Lecture et ajout réservés aux admins. get_auth_user_role() est SECURITY DEFINER
-- (voir 20260601_rls_admin_discipline_profils_inscriptions.sql) : pas de récursion sur profils.
-- Pas de policy UPDATE / DELETE : le journal ne peut pas être réécrit depuis le site.
CREATE POLICY "admins_lecture_journal" ON public.journal_modifications
  FOR SELECT TO authenticated
  USING (public.get_auth_user_role() IN ('admin', 'admin_discipline'));

CREATE POLICY "admins_ajout_journal" ON public.journal_modifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_auth_user_role() IN ('admin', 'admin_discipline')
    AND admin_id = auth.uid()
  );
