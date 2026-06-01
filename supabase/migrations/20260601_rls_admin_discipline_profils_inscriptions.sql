-- ================================================================
-- Migration : Policies RLS pour admin_discipline
-- sur les tables profils et inscriptions
-- À exécuter dans l'éditeur SQL du dashboard Supabase
-- ================================================================
-- Contexte : l'admin_discipline peut accéder à la page "Gestion des
-- membres" mais ne voyait que son propre profil car aucune policy RLS
-- ne lui donnait accès aux lignes des autres membres.
-- Le filtrage par discipline reste géré côté application.
--
-- IMPORTANT : La policy sur profils DOIT utiliser une fonction
-- SECURITY DEFINER pour éviter la récursion infinie (policy sur
-- profils qui query profils → Postgres lève une erreur et bloque
-- TOUTES les queries sur profils, y compris pour les admins).
-- ================================================================

-- ----------------------------------------------------------------
-- Fonction helper : lit le rôle de l'utilisateur courant
-- sans déclencher le RLS (SECURITY DEFINER bypass RLS)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profils WHERE id = auth.uid();
$$;


-- ----------------------------------------------------------------
-- TABLE : profils
-- Policy non-récursive grâce à la fonction SECURITY DEFINER
-- ----------------------------------------------------------------
CREATE POLICY "admin_discipline_all_profils" ON profils
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() = 'admin_discipline')
  WITH CHECK (public.get_auth_user_role() = 'admin_discipline');


-- ----------------------------------------------------------------
-- TABLE : inscriptions
-- (query profils depuis inscriptions = pas de récursion, OK)
-- ----------------------------------------------------------------
CREATE POLICY "admin_discipline_all_inscriptions" ON inscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin_discipline')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin_discipline')
  );
