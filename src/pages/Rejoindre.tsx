import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";
import { CheckCircle } from "lucide-react";
import { sendBrevoEmail, TEMPLATES } from "@/lib/brevo";

const Rejoindre = () => {
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", password: "", confirm: "" });
  const [dejaInscrit, setDejaInscrit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.prenom.trim() || !form.nom.trim()) {
      toast.error("Le prénom et le nom sont obligatoires.");
      return;
    }
    if (!dejaInscrit) {
      toast.error("L'espace membre est réservé aux adhérents inscrits à une discipline.");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);

    // 1. Créer le compte Supabase
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (error) {
      toast.error("Erreur : " + error.message);
      setLoading(false);
      return;
    }

    // 2. Créer le profil avec role "en_attente"
    if (data.user) {
      await supabase.from("profils").upsert({
        id: data.user.id,
        email: form.email,
        prenom: form.prenom || null,
        nom: form.nom || null,
        role: "en_attente",
      });
    }

    // 3. Déconnecter immédiatement — le compte doit être validé par l'admin avant connexion
    await supabase.auth.signOut();

    // 4. Notifier l'administratrice par email
    try {
      await sendBrevoEmail(TEMPLATES.REJOINDRE,
        { email: import.meta.env.VITE_BREVO_ADMIN_EMAIL, name: "AMSP" },
        { prenom: form.prenom || "", nom: form.nom || "", email: form.email }
      );
    } catch {
      // Non-bloquant
    }

    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <Layout>
        <section className="flex min-h-[70vh] items-center justify-center py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl border border-border/50 bg-card p-8 text-center"
          >
            <CheckCircle size={48} className="mx-auto mb-4 text-primary" />
            <h2 className="mb-2 font-serif text-2xl font-black">Demande envoyée !</h2>
            <p className="text-muted-foreground text-sm">
              Votre demande d'accès a bien été transmise à l'administratrice. Vous recevrez une
              confirmation dès que votre compte sera activé.
            </p>
            <Link to="/connexion" className="mt-6 inline-block text-sm text-primary hover:underline">
              Retour à la connexion
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
            Rejoindre l'<span className="text-primary">espace membres</span>
          </h1>
          <p className="mb-2 text-center text-sm text-muted-foreground">
            Votre demande sera examinée par l'administratrice avant activation.
          </p>
          <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ L'espace membre est réservé aux adhérents de l'AMSP inscrits à au moins une discipline.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom <span className="text-destructive">*</span></Label>
                <Input
                  id="prenom"
                  placeholder="Prénom"
                  required
                  maxLength={100}
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom <span className="text-destructive">*</span></Label>
                <Input
                  id="nom"
                  placeholder="Nom"
                  required
                  maxLength={100}
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Adresse mail <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                required
                maxLength={255}
                placeholder="votre@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Mot de passe <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="Au moins 6 caractères"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">
                Confirmer le mot de passe <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirm"
                type="password"
                required
                minLength={6}
                placeholder="Répétez le mot de passe"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border p-3">
              <input
                id="dejaInscrit"
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
                checked={dejaInscrit}
                onChange={(e) => setDejaInscrit(e.target.checked)}
              />
              <label htmlFor="dejaInscrit" className="text-sm cursor-pointer leading-snug">
                Je confirme être inscrit(e) à au moins une discipline à l'AMSP. Je comprends que l'espace membre est réservé aux adhérents actifs.
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Envoi de la demande…" : "Envoyer ma demande"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Déjà membre ?{" "}
            <Link to="/connexion" className="text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </motion.div>
      </section>
    </Layout>
  );
};

export default Rejoindre;
