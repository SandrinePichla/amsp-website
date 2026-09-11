-- ================================================================
-- Migration : chèques partagés entre plusieurs inscriptions
-- À exécuter dans l'éditeur SQL du dashboard Supabase
--
-- Contexte : un même chèque physique peut couvrir plusieurs
-- inscriptions à la fois (ex : un couple + un enfant qui règlent
-- leurs 3 adhésions avec un seul chèque par trimestre). La colonne
-- inscriptions.numeros_cheques (migration précédente) ne pouvait
-- représenter qu'un numéro par inscription, sans savoir qu'il est
-- partagé ni connaître le montant du chèque.
--
-- Remplacée par deux tables :
--   cheques           : un chèque (numéro, montant)
--   cheque_echeances  : ce qu'il couvre — une ligne par (inscription,
--                       échéance) qu'il paie. Plusieurs lignes pour
--                       un même cheque_id = chèque partagé.
--
-- La colonne inscriptions.numeros_cheques n'est PAS supprimée (au
-- cas où elle aurait déjà été utilisée) ; son contenu éventuel est
-- repris ci-dessous dans la nouvelle structure.
-- ================================================================

CREATE TABLE IF NOT EXISTS cheques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  montant numeric,
  saison text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cheque_echeances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cheque_id uuid NOT NULL REFERENCES cheques(id) ON DELETE CASCADE,
  inscription_id uuid NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
  echeance int NOT NULL,
  label text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (inscription_id, echeance)
);

-- ----------------------------------------------------------------
-- RLS — même schéma que les policies admin / admin_discipline déjà
-- en place sur inscriptions (20260601_rls_admin_discipline_profils_inscriptions.sql,
-- 20260609_rls_inscriptions_membres.sql). Réservé aux admins : les
-- membres n'ont pas de policy sur ces deux tables (pas d'accès du tout).
-- ----------------------------------------------------------------
ALTER TABLE cheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheque_echeances ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cheques' AND policyname = 'admin_all_cheques') THEN
    CREATE POLICY "admin_all_cheques" ON cheques
      FOR ALL TO authenticated
      USING (public.get_auth_user_role() = 'admin')
      WITH CHECK (public.get_auth_user_role() = 'admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cheques' AND policyname = 'admin_discipline_all_cheques') THEN
    CREATE POLICY "admin_discipline_all_cheques" ON cheques
      FOR ALL TO authenticated
      USING (public.get_auth_user_role() = 'admin_discipline')
      WITH CHECK (public.get_auth_user_role() = 'admin_discipline');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cheque_echeances' AND policyname = 'admin_all_cheque_echeances') THEN
    CREATE POLICY "admin_all_cheque_echeances" ON cheque_echeances
      FOR ALL TO authenticated
      USING (public.get_auth_user_role() = 'admin')
      WITH CHECK (public.get_auth_user_role() = 'admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cheque_echeances' AND policyname = 'admin_discipline_all_cheque_echeances') THEN
    CREATE POLICY "admin_discipline_all_cheque_echeances" ON cheque_echeances
      FOR ALL TO authenticated
      USING (public.get_auth_user_role() = 'admin_discipline')
      WITH CHECK (public.get_auth_user_role() = 'admin_discipline');
  END IF;
END $$;

-- ----------------------------------------------------------------
-- Reprise des numéros déjà saisis dans inscriptions.numeros_cheques
-- (sans effet si la colonne est vide partout — cas normal si la
-- fonctionnalité précédente n'a pas encore été utilisée).
-- ----------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  elt jsonb;
  new_cheque_id uuid;
BEGIN
  -- Ne fait rien si la migration précédente (qui ajoute cette colonne)
  -- n'a pas encore été exécutée — pas d'erreur dans ce cas.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inscriptions' AND column_name = 'numeros_cheques'
  ) THEN
    RETURN;
  END IF;

  FOR r IN
    EXECUTE 'SELECT id, numeros_cheques FROM inscriptions WHERE numeros_cheques IS NOT NULL AND jsonb_array_length(numeros_cheques) > 0'
  LOOP
    FOR elt IN SELECT * FROM jsonb_array_elements(r.numeros_cheques)
    LOOP
      INSERT INTO cheques (numero, saison)
        SELECT elt->>'numero', saison FROM inscriptions WHERE id = r.id
        RETURNING id INTO new_cheque_id;
      INSERT INTO cheque_echeances (cheque_id, inscription_id, echeance, label)
        VALUES (new_cheque_id, r.id, (elt->>'echeance')::int, elt->>'label')
        ON CONFLICT (inscription_id, echeance) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
