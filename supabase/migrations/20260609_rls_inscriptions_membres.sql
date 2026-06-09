-- ================================================================
-- Migration : Politiques RLS pour la table inscriptions
-- À exécuter dans l'éditeur SQL du dashboard Supabase
--
-- Contexte : les membres ne voyaient pas leurs propres inscriptions
-- dans l'EspaceMembre car la table n'avait pas de policy SELECT
-- pour les utilisateurs non-admin.
-- ================================================================

-- Activer RLS sur inscriptions (ignore si déjà activé)
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- Admin : accès complet (lecture + écriture)
-- ----------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inscriptions' AND policyname = 'admin_all_inscriptions'
  ) THEN
    CREATE POLICY "admin_all_inscriptions" ON inscriptions
      FOR ALL TO authenticated
      USING (public.get_auth_user_role() = 'admin')
      WITH CHECK (public.get_auth_user_role() = 'admin');
  END IF;
END $$;

-- ----------------------------------------------------------------
-- Membres : lire leurs propres inscriptions
-- Correspondance par user_id OU par email (insensible à la casse)
-- pour couvrir les inscriptions créées sans compte web
-- ----------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inscriptions' AND policyname = 'user_read_own_inscriptions'
  ) THEN
    CREATE POLICY "user_read_own_inscriptions" ON inscriptions
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR lower(email) = lower(auth.email())
      );
  END IF;
END $$;

-- ----------------------------------------------------------------
-- Membres : insérer (formulaire d'inscription en ligne)
-- ----------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inscriptions' AND policyname = 'user_insert_inscriptions'
  ) THEN
    CREATE POLICY "user_insert_inscriptions" ON inscriptions
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------
-- Membres : mettre à jour leurs propres inscriptions
-- (ex : upload attestation sur l'honneur)
-- ----------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inscriptions' AND policyname = 'user_update_own_inscriptions'
  ) THEN
    CREATE POLICY "user_update_own_inscriptions" ON inscriptions
      FOR UPDATE TO authenticated
      USING (
        user_id = auth.uid()
        OR lower(email) = lower(auth.email())
      )
      WITH CHECK (
        user_id = auth.uid()
        OR lower(email) = lower(auth.email())
      );
  END IF;
END $$;

-- ----------------------------------------------------------------
-- Accès public en écriture pour les inscriptions anonymes
-- (formulaire d'inscription sans être connecté)
-- ----------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inscriptions' AND policyname = 'anon_insert_inscriptions'
  ) THEN
    CREATE POLICY "anon_insert_inscriptions" ON inscriptions
      FOR INSERT TO anon
      WITH CHECK (true);
  END IF;
END $$;
