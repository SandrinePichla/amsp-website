import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";
import emailjs from "@emailjs/browser";
import { CheckCircle } from "lucide-react";

const SERVICE_ID = "service_hvx0rnw";
const TEMPLATE_ID = "template_konhz3s";
const PUBLIC_KEY = "r044e90XA84E6Ua5B";

const Rejoindre = () => {
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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

    // 3. Notifier l'administratrice par email
    try {
      const fullName = [form.prenom, form.nom].filter(Boolean).join(" ") || form.email;
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          from_name: fullName,
          from_email: form.email,
          subject: "Demande d'accès espace membres",
          message: `${fullName} (${form.email}) souhaite rejoindre l'espace membres.\n\nPour approuver ou refuser cette demande, connectez-vous sur le site avec votre compte administrateur et rendez-vous dans "Gestion des membres".`,
        },
        PUBLIC_KEY
      );
    } catch {
      // L'email est optionnel — ne pas bloquer si ça échoue
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
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Votre demande sera examinée par l'administratrice avant activation.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  placeholder="Prénom"
                  maxLength={100}
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  placeholder="Nom"
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
