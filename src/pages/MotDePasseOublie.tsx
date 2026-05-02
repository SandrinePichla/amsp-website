import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { supabase } from "@/supabaseClient";

const MotDePasseOublie = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }
    setError("");
    setLoading(true);
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}reinitialisation-mot-de-passe`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    if (error) {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } else {
      setSent(true);
    }
  };

  return (
    <Layout>
      <section className="flex min-h-[70vh] items-center justify-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-xl border border-border/50 bg-card p-8"
        >
          <h1 className="mb-2 text-center font-serif text-3xl font-black">
            Mot de passe <span className="text-primary">oublié</span>
          </h1>
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Saisissez votre email pour recevoir un lien de réinitialisation
          </p>

          {sent ? (
            <div className="space-y-4 text-center">
              <div className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte mail (et vos spams).
              </div>
              <Link to="/connexion" className="block text-sm text-primary hover:underline">
                Retour à la connexion
              </Link>
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
                  <label className="mb-1.5 block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="votre@email.com"
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? "Envoi en cours..." : "Envoyer le lien"}
                </button>
              </div>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                <Link to="/connexion" className="text-primary hover:underline">
                  Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </section>
    </Layout>
  );
};

export default MotDePasseOublie;
