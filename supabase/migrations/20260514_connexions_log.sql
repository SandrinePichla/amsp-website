-- Table de logs de connexion utilisateurs
CREATE TABLE IF NOT EXISTS connexions_log (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text,
  prenom     text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE connexions_log ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent insérer leurs propres entrées
CREATE POLICY "user_insert_connexion_log" ON connexions_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Les admins peuvent tout lire
CREATE POLICY "admin_read_connexions_log" ON connexions_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profils
      WHERE id = auth.uid()
        AND role IN ('admin', 'admin_discipline')
    )
  );
