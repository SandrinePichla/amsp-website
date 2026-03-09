import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Shield, Mail, Lock } from "lucide-react";

interface Profil {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  adresse: string | null;
  telephone: string | null;
  role: string;
  created_at: string;
}

const Profil = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [formInfo, setFormInfo] = useState({ nom: "", adresse: "", telephone: "" });
  const [formEmail, setFormEmail] = useState({ email: "" });
  const [formPassword, setFormPassword] = useState({ password: "", confirm: "" });

  useEffect(() => {
    if (!user) {
      navigate("/connexion");
      return;
    }
    supabase
      .from("profils")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          toast.error("Erreur lors du chargement du profil.");
        } else {
          setProfil(data);
          setFormInfo({
            nom: data.nom || "",
            adresse: data.adresse || "",
            telephone: data.telephone || "",
          });
          setFormEmail({ email: data.email || user.email || "" });
        }
        setLoading(false);
      });
  }, [user, navigate]);

  const handleSaveInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingInfo(true);
    const { error } = await supabase
      .from("profils")
      .update({ nom: formInfo.nom, adresse: formInfo.adresse, telephone: formInfo.telephone })
      .eq("id", user!.id);
    if (error) {
      toast.error("Erreur lors de la sauvegarde.");
    } else {
      toast.success("Informations mises à jour !");
      setProfil((prev) => prev ? { ...prev, ...formInfo } : prev);
    }
    setSavingInfo(false);
  };

  const handleSaveEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formEmail.email === user?.email) {
      toast.error("C'est déjà votre adresse mail actuelle.");
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: formEmail.email });
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Un email de confirmation a été envoyé à la nouvelle adresse.");
    }
    setSavingEmail(false);
  };

  const handleSavePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formPassword.password !== formPassword.confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (formPassword.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: formPassword.password });
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Mot de passe mis à jour !");
      setFormPassword({ password: "", confirm: "" });
    }
    setSavingPassword(false);
  };

  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto max-w-lg px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-10 text-center font-serif text-4xl font-black md:text-5xl">
              <span className="text-primary">Mon</span> profil
            </h1>

            {loading ? (
              <p className="text-center text-muted-foreground">Chargement...</p>
            ) : (
              <div className="space-y-6">

                {/* Infos du compte (lecture seule) */}
                <div className="rounded-lg border border-border/50 bg-card p-6 space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <User size={18} className="text-primary" />
                    <h2 className="font-serif font-bold">Informations du compte</h2>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Prénom</span>
                    <span className="font-medium">{profil?.prenom || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Membre depuis</span>
                    <span className="font-medium">
                      {profil?.created_at
                        ? new Date(profil.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric", month: "long", year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rôle</span>
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                      <Shield size={10} />
                      {profil?.role === "admin" ? "Administrateur" : "Membre"}
                    </span>
                  </div>
                </div>

                {/* Informations personnelles */}
                <div className="rounded-lg border border-border/50 bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User size={18} className="text-primary" />
                    <h2 className="font-serif font-bold">Informations personnelles</h2>
                  </div>
                  <form onSubmit={handleSaveInfo} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom</Label>
                      <Input
                        id="nom"
                        maxLength={100}
                        placeholder="Votre nom"
                        value={formInfo.nom}
                        onChange={(e) => setFormInfo({ ...formInfo, nom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adresse">Adresse postale</Label>
                      <Input
                        id="adresse"
                        maxLength={255}
                        placeholder="Votre adresse complète"
                        value={formInfo.adresse}
                        onChange={(e) => setFormInfo({ ...formInfo, adresse: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telephone">Téléphone portable</Label>
                      <Input
                        id="telephone"
                        type="tel"
                        maxLength={20}
                        placeholder="06 00 00 00 00"
                        value={formInfo.telephone}
                        onChange={(e) => setFormInfo({ ...formInfo, telephone: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={savingInfo}>
                      {savingInfo ? "Sauvegarde..." : "Enregistrer"}
                    </Button>
                  </form>
                </div>

                {/* Changer l'adresse mail */}
                <div className="rounded-lg border border-border/50 bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Mail size={18} className="text-primary" />
                    <h2 className="font-serif font-bold">Adresse mail de connexion</h2>
                  </div>
                  <form onSubmit={handleSaveEmail} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Nouvelle adresse mail</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        maxLength={255}
                        placeholder={user?.email || "votre@email.com"}
                        value={formEmail.email}
                        onChange={(e) => setFormEmail({ email: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Un email de confirmation sera envoyé à la nouvelle adresse.
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={savingEmail}>
                      {savingEmail ? "Envoi..." : "Changer l'adresse mail"}
                    </Button>
                  </form>
                </div>

                {/* Changer le mot de passe */}
                <div className="rounded-lg border border-border/50 bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Lock size={18} className="text-primary" />
                    <h2 className="font-serif font-bold">Mot de passe</h2>
                  </div>
                  <form onSubmit={handleSavePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Nouveau mot de passe</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        minLength={6}
                        placeholder="Au moins 6 caractères"
                        value={formPassword.password}
                        onChange={(e) => setFormPassword({ ...formPassword, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                      <Input
                        id="confirm"
                        type="password"
                        required
                        minLength={6}
                        placeholder="Répétez le mot de passe"
                        value={formPassword.confirm}
                        onChange={(e) => setFormPassword({ ...formPassword, confirm: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={savingPassword}>
                      {savingPassword ? "Mise à jour..." : "Changer le mot de passe"}
                    </Button>
                  </form>
                </div>

              </div>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Profil;
