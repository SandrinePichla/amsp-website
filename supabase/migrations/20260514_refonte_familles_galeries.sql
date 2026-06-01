-- ================================================================
-- Migration : Refonte architecture familles, enfants, accès galeries
-- Date : 2026-05-14
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase.
-- Ordre d'exécution : ce fichier en une seule fois.
-- ================================================================


-- ----------------------------------------------------------------
-- 1. Ajouter le rôle 'tiers' à la table profils
--    (si une contrainte CHECK existe sur profils.role, on la met à jour)
-- ----------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE profils DROP CONSTRAINT IF EXISTS profils_role_check;
  ALTER TABLE profils ADD CONSTRAINT profils_role_check
    CHECK (role IN ('admin', 'admin_discipline', 'membre', 'tiers', 'en_attente', 'refuse'));
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN others THEN NULL;
END $$;


-- ----------------------------------------------------------------
-- 2. Table enfants
--    Profil persistant pour les enfants (pas de compte auth).
--    Rattachés à des adultes via liens_compte_enfant.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enfants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             TEXT        NOT NULL,
  prenom          TEXT        NOT NULL,
  date_naissance  DATE,
  groupe_sanguin  TEXT,
  allergie        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ----------------------------------------------------------------
-- 3. Table liens_compte_enfant
--    Associe un compte adulte (profils.id) à un enfant.
--    Créé uniquement par l'admin.
--    type_acces :
--      'parent'        → voit inscriptions + galeries de l'enfant
--      'tiers_galerie' → voit uniquement les galeries (ex: belle-mère)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS liens_compte_enfant (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  compte_id   UUID        NOT NULL REFERENCES profils(id) ON DELETE CASCADE,
  enfant_id   UUID        NOT NULL REFERENCES enfants(id) ON DELETE CASCADE,
  type_acces  TEXT        NOT NULL DEFAULT 'parent'
                CHECK (type_acces IN ('parent', 'tiers_galerie')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (compte_id, enfant_id)
);

CREATE INDEX IF NOT EXISTS idx_liens_compte_enfant_compte  ON liens_compte_enfant(compte_id);
CREATE INDEX IF NOT EXISTS idx_liens_compte_enfant_enfant  ON liens_compte_enfant(enfant_id);


-- ----------------------------------------------------------------
-- 4. Table acces_galerie
--    Remplace la colonne profils.disciplines (CSV).
--    Un enregistrement = un compte peut voir les albums privés
--    d'une discipline donnée.
--    source :
--      'suggestion_auto' → généré par le système (inscription validée)
--      'admin_manuel'    → créé ou modifié manuellement par l'admin
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS acces_galerie (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  compte_id            UUID        NOT NULL REFERENCES profils(id) ON DELETE CASCADE,
  discipline_sanity_id TEXT        NOT NULL,
  actif                BOOLEAN     NOT NULL DEFAULT TRUE,
  source               TEXT        NOT NULL DEFAULT 'admin_manuel'
                         CHECK (source IN ('suggestion_auto', 'admin_manuel')),
  -- Inscription ayant déclenché la suggestion (nullable)
  inscription_id       UUID        REFERENCES inscriptions(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (compte_id, discipline_sanity_id)
);

CREATE INDEX IF NOT EXISTS idx_acces_galerie_compte      ON acces_galerie(compte_id);
CREATE INDEX IF NOT EXISTS idx_acces_galerie_discipline  ON acces_galerie(discipline_sanity_id);


-- ----------------------------------------------------------------
-- 5. Migrer profils.disciplines → acces_galerie
--    La colonne disciplines contient une liste CSV d'IDs Sanity.
--    Ex : "abc123,def456,ghi789"
-- ----------------------------------------------------------------
INSERT INTO acces_galerie (compte_id, discipline_sanity_id, actif, source)
SELECT
  p.id                          AS compte_id,
  trim(unnest_val)              AS discipline_sanity_id,
  TRUE                          AS actif,
  'admin_manuel'                AS source
FROM profils p,
     unnest(string_to_array(p.disciplines, ',')) AS unnest_val
WHERE p.disciplines IS NOT NULL
  AND trim(p.disciplines) != ''
ON CONFLICT (compte_id, discipline_sanity_id) DO NOTHING;


-- ----------------------------------------------------------------
-- 6. Ajouter enfant_id à la table inscriptions
--    Pour les inscriptions d'enfants : enfant_id est renseigné.
--    Pour les inscriptions d'adultes : enfant_id reste NULL.
-- ----------------------------------------------------------------
ALTER TABLE inscriptions
  ADD COLUMN IF NOT EXISTS enfant_id UUID REFERENCES enfants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inscriptions_enfant_id ON inscriptions(enfant_id);


-- ----------------------------------------------------------------
-- FIN DE LA MIGRATION
--
-- NOTE : profils.disciplines est conservée pour compatibilité.
-- Elle sera supprimée une fois tout le code frontend migré.
-- Commande de nettoyage final (à exécuter plus tard) :
--   ALTER TABLE profils DROP COLUMN disciplines;
-- ----------------------------------------------------------------
