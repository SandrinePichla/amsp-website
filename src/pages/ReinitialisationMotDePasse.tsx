import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { supabase } from "@/supabaseClient";

const ReinitialisationMotDePasse = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing recovery session (token processed from URL hash on load)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      setError("Une erreur est survenue. Veuillez réessayer ou demander un nouveau lien.");
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/connexion"), 3000);
    }
  };

  if (!sessionReady) {
    return (
      <Layout>
        <section className="flex min-h-[70vh] items-center justify-center py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-xl border border-border/50 bg-card p-8 text-center space-y-4"
          >
            <h1 className="font-serif text-2xl font-black">Lien invalide ou expiré</h1>
            <p className="text-sm text-muted-foreground">
              Ce lien de réinitialisation est invalide ou a expiré. Veuillez faire une nouvelle demande.
            </p>
            <Link
              to="/mot-de-passe-oublie"
              className="inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Demander un nouveau lien
            </Link>
          </motion.div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="flex min-h-[70vh] items-center justify-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-xl border border-border/50 bg-card p-8"
        >
          <h1 className="mb-2 text-center font-serif text-3xl font-black">
            Nouveau <span className="text-primary">mot de passe</span>
          </h1>
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Choisissez un nouveau mot de passe pour votre compte
          </p>

          {success ? (
            <div className="space-y-4 text-center">
              <div className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                Mot de passe modifié avec succès ! Vous allez être redirigé vers la connexion…
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="••••••••"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? "Enregistrement..." : "Enregistrer le mot de passe"}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </section>
    </Layout>
  );
};

export default ReinitialisationMotDePasse;
