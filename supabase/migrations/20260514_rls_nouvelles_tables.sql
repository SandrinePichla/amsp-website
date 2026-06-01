-- ================================================================
-- Migration : RLS et permissions pour les nouvelles tables
-- À exécuter dans l'éditeur SQL du dashboard Supabase
-- ================================================================

-- ----------------------------------------------------------------
-- GRANTS : donner les permissions au rôle authenticated
-- ----------------------------------------------------------------
GRANT ALL ON acces_galerie        TO authenticated;
GRANT ALL ON enfants               TO authenticated;
GRANT ALL ON liens_compte_enfant   TO authenticated;


-- ================================================================
-- TABLE : acces_galerie
-- ================================================================
ALTER TABLE acces_galerie ENABLE ROW LEVEL SECURITY;

-- Admins : accès complet
CREATE POLICY "admin_all_acces_galerie" ON acces_galerie
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'admin_discipline'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'admin_discipline'))
  );

-- Membres : lecture de leurs propres accès (pour l'affichage galerie)
CREATE POLICY "user_read_own_acces_galerie" ON acces_galerie
  FOR SELECT TO authenticated
  USING (compte_id = auth.uid());

-- Membres : insertion de suggestions depuis le formulaire d'inscription
CREATE POLICY "user_insert_suggestion_acces_galerie" ON acces_galerie
  FOR INSERT TO authenticated
  WITH CHECK (compte_id = auth.uid() AND source = 'suggestion_auto');


-- ================================================================
-- TABLE : enfants
-- ================================================================
ALTER TABLE enfants ENABLE ROW LEVEL SECURITY;

-- Admins : accès complet
CREATE POLICY "admin_all_enfants" ON enfants
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'admin_discipline'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'admin_discipline'))
  );


-- ================================================================
-- TABLE : liens_compte_enfant
-- ================================================================
ALTER TABLE liens_compte_enfant ENABLE ROW LEVEL SECURITY;

-- Admins : accès complet
CREATE POLICY "admin_all_liens_compte_enfant" ON liens_compte_enfant
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'admin_discipline'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'admin_discipline'))
  );

-- Membres : lecture de leurs propres liens (espace membre)
CREATE POLICY "user_read_own_liens_compte_enfant" ON liens_compte_enfant
  FOR SELECT TO authenticated
  USING (compte_id = auth.uid());
