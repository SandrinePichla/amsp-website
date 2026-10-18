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
import { client } from "@/sanityClient";
import { appelerChangerEmail, texteAvertissementEmail } from "@/lib/changerEmail";

/** Inscription rattachée au compte, telle qu'affichée dans "Personnes inscrites avec ce compte". */
interface InscriptionCompte {
  id: string;
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
  disciplines: string | null;
  saison: string | null;
  statut: string;
}

const calcAge = (ddn: string | null) => {
  if (!ddn) return null;
  const n = new Date(ddn), t = new Date();
  let age = t.getFullYear() - n.getFullYear();
  if (t.getMonth() < n.getMonth() || (t.getMonth() === n.getMonth() && t.getDate() < n.getDate())) age--;
  return age;
};

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
  const [formEmail, setFormEmail] = useState({ email: "", motDePasse: "" });
  // Changement d'email en attente de confirmation (adresse demandée), et message de l'envoi
  const [emailEnAttente, setEmailEnAttente] = useState<string | null>(null);
  const [retourEmail, setRetourEmail] = useState<{ ok: boolean; texte: string } | null>(null);
  // Nouvelle adresse déjà portée par d'autres inscriptions : l'adhérent confirme en connaissance de cause
  const [avertissementEmail, setAvertissementEmail] = useState<string | null>(null);
  const [formPassword, setFormPassword] = useState({ password: "", confirm: "" });

  // Personnes inscrites avec ce compte (saison la plus récente) : même règle de rattachement que
  // l'ancien espace membre — identifiant du compte ou même email.
  const [inscritsCompte, setInscritsCompte] = useState<{ saison: string | null; liste: InscriptionCompte[] }>({ saison: null, liste: [] });
  const [nomsDisciplines, setNomsDisciplines] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!user) return;
    const champs = "id, nom, prenom, date_naissance, disciplines, saison, statut";
    Promise.all([
      supabase.from("inscriptions").select(champs).eq("user_id", user.id),
      supabase.from("inscriptions").select(champs).ilike("email", (user.email ?? "").replace(/[\\%_]/g, (c) => `\\${c}`)),
    ]).then(([parId, parEmail]) => {
      const vues = new Set<string>();
      const toutes = [...(parId.data ?? []), ...(parEmail.data ?? [])]
        .filter((i) => i.statut !== "refusee" && i.statut !== "supprimee" && !vues.has(i.id) && vues.add(i.id)) as InscriptionCompte[];
      const saison = toutes.map((i) => i.saison || "").sort().pop() || null;
      setInscritsCompte({
        saison,
        liste: toutes.filter((i) => (i.saison || null) === saison)
          .sort((a, b) => (calcAge(b.date_naissance) ?? -1) - (calcAge(a.date_naissance) ?? -1)),
      });
    });
    client.fetch(`*[_type == "discipline"]{ _id, nom }`)
      .then((d: { _id: string; nom: string }[]) => setNomsDisciplines(Object.fromEntries(d.map((x) => [x._id, x.nom]))))
      .catch(() => {});
  }, [user]);

  // Supabase garde la nouvelle adresse demandée (new_email) tant que le lien n'a pas été cliqué
  useEffect(() => {
    if (!user) return;
    supabase.auth.getUser().then(({ data }) => setEmailEnAttente(data.user?.new_email ?? null));
  }, [user]);

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

  /**
   * Demande de changement de l'email de connexion. Passe par la même fonction serveur que les
   * admins ("changer-email") : lien de confirmation en français envoyé à la nouvelle adresse,
   * ancienne adresse prévenue, refus d'une adresse déjà utilisée, trace dans le journal. Le
   * changement n'est effectif qu'au clic ; le déclencheur SQL met alors à jour profil et inscriptions.
   */
  const handleSaveEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.email) return;
    const nouvelEmail = formEmail.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(nouvelEmail)) {
      setRetourEmail({ ok: false, texte: "Adresse email invalide." });
      return;
    }
    if (nouvelEmail === user.email.toLowerCase()) {
      setRetourEmail({ ok: false, texte: "C'est déjà votre adresse mail actuelle." });
      return;
    }
    setSavingEmail(true);
    setRetourEmail(null);

    // Action sensible : on revérifie le mot de passe actuel avant d'envoyer la demande
    const { error: errMdp } = await supabase.auth.signInWithPassword({ email: user.email, password: formEmail.motDePasse });
    if (errMdp) {
      setSavingEmail(false);
      setRetourEmail({ ok: false, texte: "Mot de passe incorrect." });
      return;
    }

    const corps = { profilId: user.id, nouvelEmail, redirectTo: `${window.location.origin}/profil` };
    // 1er clic : vérification seulement. Si l'adresse est déjà utilisée par d'autres inscriptions,
    // on avertit et on s'arrête ; le clic suivant ("Confirmer quand même") envoie la demande.
    if (!avertissementEmail) {
      const verif = await appelerChangerEmail({ ...corps, verifierSeulement: true });
      if (verif.erreur) { setSavingEmail(false); setRetourEmail({ ok: false, texte: verif.erreur }); return; }
      if (verif.data?.nombre) {
        setSavingEmail(false);
        setAvertissementEmail(texteAvertissementEmail(verif.data.nombre, verif.data.noms ?? [], false));
        return;
      }
    }

    const { erreur: message } = await appelerChangerEmail(corps);
    setSavingEmail(false);
    if (message) {
      setRetourEmail({ ok: false, texte: message });
      return;
    }
    setAvertissementEmail(null);
    setEmailEnAttente(nouvelEmail);
    setFormEmail({ email: "", motDePasse: "" });
    setRetourEmail({
      ok: true,
      texte: `Un lien de confirmation a été envoyé à ${nouvelEmail}, et votre adresse actuelle a été prévenue. Cliquez sur ce lien pour terminer le changement.`,
    });
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
                    <h2 className="font-serif font-bold">Titulaire du compte</h2>
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

                  {inscritsCompte.liste.length > 0 && (
                    <div className="mt-4 border-t border-border/50 pt-4">
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">
                        Personnes inscrites avec ce compte{inscritsCompte.saison ? ` (${inscritsCompte.saison})` : ""}
                      </p>
                      <ul className="space-y-1.5">
                        {inscritsCompte.liste.map((i) => {
                          const age = calcAge(i.date_naissance);
                          const discs = (i.disciplines || "").split(",").map((s) => s.trim()).filter(Boolean)
                            .map((id) => nomsDisciplines[id]).filter(Boolean);
                          return (
                            <li key={i.id} className="text-xs">
                              <span className="font-medium">{[i.nom?.toUpperCase(), i.prenom].filter(Boolean).join(" ")}</span>
                              <span className="text-muted-foreground">
                                {age !== null ? ` · ${age} ans` : ""}{discs.length ? ` · ${discs.join(", ")}` : ""}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
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
                  <p className="mb-4 text-sm">
                    <span className="text-muted-foreground">Adresse actuelle : </span>
                    <span className="font-medium">{user?.email}</span>
                  </p>
                  {emailEnAttente && (
                    <p className="mb-4 rounded-md border border-amber-200/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                      ⏳ Changement en attente vers <strong>{emailEnAttente}</strong>. Cliquez sur le lien reçu à cette adresse pour le terminer.
                      D'ici là, continuez à vous connecter avec votre adresse actuelle.
                    </p>
                  )}
                  <form onSubmit={handleSaveEmail} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Nouvelle adresse mail</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        maxLength={255}
                        placeholder="nouvelle@adresse.fr"
                        value={formEmail.email}
                        onChange={(e) => { setFormEmail({ ...formEmail, email: e.target.value }); setRetourEmail(null); setAvertissementEmail(null); }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mdp-email">Mot de passe actuel</Label>
                      <Input
                        id="mdp-email"
                        type="password"
                        required
                        autoComplete="current-password"
                        placeholder="Pour confirmer que c'est bien vous"
                        value={formEmail.motDePasse}
                        onChange={(e) => { setFormEmail({ ...formEmail, motDePasse: e.target.value }); setRetourEmail(null); }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Un lien de confirmation sera envoyé à la nouvelle adresse, et votre adresse actuelle sera prévenue.
                        Votre mot de passe ne change pas.
                      </p>
                    </div>
                    {avertissementEmail && (
                      <p className="rounded-md border border-amber-200/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                        ⚠️ {avertissementEmail}
                      </p>
                    )}
                    {retourEmail && (
                      <p className={`rounded-md border px-3 py-2 text-xs ${retourEmail.ok
                        ? "border-green-200 bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-300"
                        : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
                        {retourEmail.ok ? "✅ " : ""}{retourEmail.texte}
                      </p>
                    )}
                    <Button type="submit" className="w-full" disabled={savingEmail}>
                      {savingEmail ? "Envoi..." : avertissementEmail ? "Confirmer quand même" : "Changer l'adresse mail"}
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
