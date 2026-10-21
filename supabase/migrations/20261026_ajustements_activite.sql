-- ================================================================
-- Migration : changements d'activité en cours d'année
-- À exécuter UNE SEULE FOIS dans l'éditeur SQL du dashboard Supabase,
-- APRÈS une sauvegarde de la base.
--
-- Règles de l'association (octobre 2026) :
--   - toujours au prorata, au mois, sur 10 mois (septembre → juin),
--     le mois commencé étant dû ;
--   - réductions (remise famille, tarif dégressif, Karaté combiné)
--     uniquement pour une souscription groupée en début d'année : un ajout
--     d'activité ou de membre en cours d'année est au prix de l'activité seule ;
--   - le site suggère le montant, l'admin le corrige ;
--   - seuls les admins (pas les admins de discipline) font ces changements.
--
-- Une ligne = un ajustement daté du montant théorique d'une personne :
--   théorique = montant de départ (figé au 1er ajustement dans
--   inscriptions.montant_attendu) + somme des ajustements.
-- montant : signé (+ ajout, − arrêt ou passage à moins cher).
-- disciplines_avant / montant_attendu_avant : état avant le changement,
-- pour pouvoir l'annuler proprement.
--
-- Ajout pur : aucune table existante n'est modifiée. Pour annuler :
--   DROP TABLE public.ajustements_activite;
-- ================================================================

CREATE TABLE IF NOT EXISTS public.ajustements_activite (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inscription_id         UUID        NOT NULL REFERENCES public.inscriptions(id) ON DELETE CASCADE,
  saison                 TEXT,
  type                   TEXT        NOT NULL CHECK (type IN ('ajout', 'changement', 'arret', 'inscription_tardive')),
  discipline_retiree     TEXT,
  discipline_ajoutee     TEXT,
  date_effet             DATE        NOT NULL,
  mois_restants          INTEGER     NOT NULL CHECK (mois_restants BETWEEN 0 AND 10),
  montant_suggere        NUMERIC(10,2),
  montant                NUMERIC(10,2) NOT NULL,
  -- Changement : part du montant attribuée à l'activité retirée (export par activité)
  part_retiree           NUMERIC(10,2),
  tranche_karate         TEXT,
  motif                  TEXT,
  disciplines_avant      TEXT,
  montant_attendu_avant  NUMERIC(10,2),
  admin_id               UUID        REFERENCES public.profils(id) ON DELETE SET NULL,
  admin_nom              TEXT
);

CREATE INDEX IF NOT EXISTS idx_ajustements_activite_inscription ON public.ajustements_activite(inscription_id);

ALTER TABLE public.ajustements_activite ENABLE ROW LEVEL SECURITY;

-- Lecture : admins et admins de discipline (le théorique en dépend partout)
CREATE POLICY "admins_lecture_ajustements" ON public.ajustements_activite
  FOR SELECT TO authenticated
  USING (public.get_auth_user_role() IN ('admin', 'admin_discipline'));

-- Écriture : admins uniquement (règle de l'association)
CREATE POLICY "admins_ecriture_ajustements" ON public.ajustements_activite
  FOR INSERT TO authenticated
  WITH CHECK (public.get_auth_user_role() = 'admin');

CREATE POLICY "admins_suppression_ajustements" ON public.ajustements_activite
  FOR DELETE TO authenticated
  USING (public.get_auth_user_role() = 'admin');
