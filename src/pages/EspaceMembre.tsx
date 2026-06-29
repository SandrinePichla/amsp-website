import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";
import { client } from "@/sanityClient";
import { useAuth } from "@/contexts/AuthContext";
import {
  User, Mail, Lock, Baby, ClipboardList, PlusCircle,
  ChevronRight, ChevronDown, CheckCircle, Clock, XCircle, Images,
  Pencil, X, Save, AlertTriangle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { sendBrevoEmail, TEMPLATES } from "@/lib/brevo";
import type { Profil, Enfant, LienCompteEnfant, Inscription } from "@/types/supabase";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
type TabId = "compte" | "inscriptions" | "enfants" | "demande";

const MOYENS_PAIEMENT: Record<string, string> = {
  cheque_1x: "Chèque (1×)",
  cheque_4x: "Chèque (4×)",
  especes:   "Espèces",
  virement:  "Virement",
};

const STATUT_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  en_attente: { label: "En attente", color: "text-amber-500", icon: <Clock size={13} /> },
  validee:    { label: "Validée",    color: "text-emerald-500", icon: <CheckCircle size={13} /> },
  refusee:    { label: "Refusée",    color: "text-destructive", icon: <XCircle size={13} /> },
  supprimee:  { label: "Supprimée",  color: "text-muted-foreground", icon: <XCircle size={13} /> },
};

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

interface Discipline { _id: string; nom: string; nomCourt?: string }
interface InscriptionConfig {
  saison?: string;
  reglementInterieur?: string;
  titreInfosPaiement?: string;
  infosPaiement?: string;
  texteAutorisationImage?: string;
  texteAutorisationParentale?: string;
  texteInfosCertificatMedical?: string;
}

const REGLEMENT_BOLD_PHRASES = ["RÈGLEMENT INTÉRIEUR COMMUN", "RÈGLEMENT COMPLEMENTAIRE SPÉCIAL KARATÉ"];
function renderReglement(text: string) {
  let parts: (string | JSX.Element)[] = [text];
  for (const phrase of REGLEMENT_BOLD_PHRASES) {
    parts = parts.flatMap((part, i) => {
      if (typeof part !== 'string') return [part];
      const segments = part.split(phrase);
      return segments.flatMap((seg, j) => j < segments.length - 1 ? [seg, <strong key={`${i}-${j}`}>{phrase}</strong>] : [seg]);
    });
  }
  return <>{parts}</>;
}

// ----------------------------------------------------------------
// Main page
// ----------------------------------------------------------------
const EspaceMembre = () => {
  const { user, role, refreshAccesGalerie } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("inscriptions");

  // Profil
  const [profil, setProfil] = useState<Profil | null>(null);
  const [loadingProfil, setLoadingProfil] = useState(true);

  // Inscriptions personnelles
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loadingInscriptions, setLoadingInscriptions] = useState(false);

  // Enfants + leurs inscriptions
  const [liensEnfants, setLiensEnfants] = useState<(LienCompteEnfant & { enfant: Enfant; inscriptions: Inscription[] })[]>([]);
  const [loadingEnfants, setLoadingEnfants] = useState(false);

  // Pour l'édition d'un enfant
  const [editEnfant, setEditEnfant] = useState<Enfant | null>(null);

  // Disciplines Sanity (pour le formulaire d'inscription)
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [inscriptionConfig, setInscriptionConfig] = useState<InscriptionConfig>({});

  useEffect(() => {
    if (!user) { navigate("/connexion"); return; }
    loadProfil();
    loadSanityData();
    loadInscriptions();
  }, [user]);

  const loadProfil = async () => {
    if (!user) return;
    const { data } = await supabase.from("profils").select("*").eq("id", user.id).single();
    setProfil(data);
    setLoadingProfil(false);
  };

  const loadInscriptions = async () => {
    if (!user || loadingInscriptions) return;
    setLoadingInscriptions(true);
    const [{ data: byUserId }, { data: byEmail }] = await Promise.all([
      supabase.from("inscriptions").select("*").eq("user_id", user.id).is("enfant_id", null).order("created_at", { ascending: false }),
      supabase.from("inscriptions").select("*").ilike("email", user.email ?? "").is("enfant_id", null).order("created_at", { ascending: false }),
    ]);
    const seen = new Set<string>();
    const all = [...(byUserId || []), ...(byEmail || [])].filter(i => !seen.has(i.id) && seen.add(i.id));
    setInscriptions(all);
    setLoadingInscriptions(false);
  };

  const loadEnfants = async () => {
    if (!user || loadingEnfants) return;
    setLoadingEnfants(true);
    const { data: liens } = await supabase
      .from("liens_compte_enfant")
      .select("*, enfant:enfants(*)")
      .eq("compte_id", user.id);

    if (!liens || liens.length === 0) {
      setLiensEnfants([]);
      setLoadingEnfants(false);
      return;
    }

    const enfantIds = liens.map((l) => l.enfant_id);
    const { data: inscEnfants } = await supabase
      .from("inscriptions")
      .select("*")
      .in("enfant_id", enfantIds)
      .order("created_at", { ascending: false });

    const enriched = liens.map((l) => ({
      ...l,
      enfant: l.enfant as Enfant,
      inscriptions: (inscEnfants || []).filter((i) => i.enfant_id === l.enfant_id),
    }));
    setLiensEnfants(enriched);
    setLoadingEnfants(false);
  };

  const loadSanityData = async () => {
    const [discs, config] = await Promise.all([
      client.fetch(`*[_type == "discipline"] | order(ordre asc) { _id, nom, nomCourt }`),
      client.fetch(`*[_type == "inscription"][0] { saison, reglementInterieur, titreInfosPaiement, infosPaiement, texteAutorisationImage, texteAutorisationParentale, texteInfosCertificatMedical }`),
    ]);
    setDisciplines(discs || []);
    setInscriptionConfig(config || {});
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === "inscriptions") loadInscriptions();
    if (tab === "enfants") loadEnfants();
  };

  if (!user) return null;

  // Les tiers n'ont accès qu'aux galeries
  if (role === "tiers") {
    return (
      <Layout>
        <section className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-20 text-center">
          <Images size={48} className="text-primary/50" />
          <div>
            <h1 className="font-serif text-2xl font-black">Votre accès</h1>
            <p className="mt-2 text-muted-foreground">
              Votre compte vous donne accès aux galeries photos des disciplines associées.
            </p>
          </div>
          <Button asChild>
            <Link to="/galerie">Voir les galeries</Link>
          </Button>
        </section>
      </Layout>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "inscriptions", label: "Mes inscriptions", icon: <ClipboardList size={16} /> },
  ];

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-8 text-center font-serif text-4xl font-black md:text-5xl">
              Espace <span className="text-primary">membre</span>
            </h1>

            {/* Onglets */}
            <div className="mb-8 flex flex-wrap gap-2 border-b border-border pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenu */}
            {activeTab === "compte" && (
              <TabCompte
                user={user}
                profil={profil}
                loading={loadingProfil}
                onProfilUpdated={loadProfil}
              />
            )}
            {activeTab === "inscriptions" && (
              <TabInscriptions
                inscriptions={inscriptions}
                loading={loadingInscriptions}
                disciplines={disciplines}
              />
            )}
            {activeTab === "enfants" && (
              <TabEnfants
                liens={liensEnfants}
                loading={loadingEnfants}
                disciplines={disciplines}
                editEnfant={editEnfant}
                setEditEnfant={setEditEnfant}
                onEnfantUpdated={loadEnfants}
              />
            )}
            {activeTab === "demande" && (
              <TabDemande
                user={user}
                profil={profil}
                disciplines={disciplines}
                inscriptionConfig={inscriptionConfig}
                enfants={liensEnfants.filter((l) => l.type_acces === "parent").map((l) => l.enfant)}
                onSubmitted={() => {
                  handleTabChange("inscriptions");
                  refreshAccesGalerie();
                }}
              />
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};


// ================================================================
// Tab : Mon compte
// ================================================================
const TabCompte = ({
  user, profil, loading, onProfilUpdated,
}: {
  user: { id: string; email?: string };
  profil: Profil | null;
  loading: boolean;
  onProfilUpdated: () => void;
}) => {
  const [formInfo, setFormInfo] = useState({ nom: "", prenom: "", adresse: "", telephone: "" });
  const [formEmail, setFormEmail] = useState({ email: "" });
  const [formPassword, setFormPassword] = useState({ password: "", confirm: "" });
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profil) {
      setFormInfo({
        nom: profil.nom || "",
        prenom: profil.prenom || "",
        adresse: profil.adresse || "",
        telephone: profil.telephone || "",
      });
      setFormEmail({ email: profil.email || user.email || "" });
    }
  }, [profil]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    const { error } = await supabase
      .from("profils")
      .update({ nom: formInfo.nom, prenom: formInfo.prenom, adresse: formInfo.adresse, telephone: formInfo.telephone })
      .eq("id", user.id);
    if (error) toast.error("Erreur lors de la sauvegarde.");
    else { toast.success("Informations mises à jour !"); onProfilUpdated(); }
    setSavingInfo(false);
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formEmail.email === user?.email) { toast.error("C'est déjà votre adresse mail actuelle."); return; }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: formEmail.email });
    if (error) toast.error("Erreur : " + error.message);
    else toast.success("Un email de confirmation a été envoyé à la nouvelle adresse.");
    setSavingEmail(false);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formPassword.password !== formPassword.confirm) { toast.error("Les mots de passe ne correspondent pas."); return; }
    if (formPassword.password.length < 6) { toast.error("Le mot de passe doit contenir au moins 6 caractères."); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: formPassword.password });
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Mot de passe mis à jour !"); setFormPassword({ password: "", confirm: "" }); }
    setSavingPassword(false);
  };

  if (loading) return <p className="text-center text-muted-foreground">Chargement...</p>;

  return (
    <div className="space-y-6">
      <Card icon={<User size={18} />} title="Informations personnelles">
        <form onSubmit={handleSaveInfo} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prénom" id="prenom">
              <Input id="prenom" maxLength={100} value={formInfo.prenom}
                onChange={(e) => setFormInfo({ ...formInfo, prenom: e.target.value })} />
            </Field>
            <Field label="Nom" id="nom">
              <Input id="nom" maxLength={100} value={formInfo.nom}
                onChange={(e) => setFormInfo({ ...formInfo, nom: e.target.value })} />
            </Field>
          </div>
          <Field label="Adresse postale" id="adresse">
            <Input id="adresse" maxLength={255} placeholder="Votre adresse complète" value={formInfo.adresse}
              onChange={(e) => setFormInfo({ ...formInfo, adresse: e.target.value })} />
          </Field>
          <Field label="Téléphone" id="tel">
            <Input id="tel" type="tel" maxLength={20} placeholder="06 00 00 00 00" value={formInfo.telephone}
              onChange={(e) => setFormInfo({ ...formInfo, telephone: e.target.value })} />
          </Field>
          <Button type="submit" className="w-full" disabled={savingInfo}>
            {savingInfo ? "Sauvegarde..." : "Enregistrer"}
          </Button>
        </form>
      </Card>

      <Card icon={<Mail size={18} />} title="Adresse mail de connexion">
        <form onSubmit={handleSaveEmail} className="space-y-4">
          <Field label="Nouvelle adresse mail" id="email">
            <Input id="email" type="email" required maxLength={255}
              placeholder={user?.email || "votre@email.com"} value={formEmail.email}
              onChange={(e) => setFormEmail({ email: e.target.value })} />
            <p className="text-xs text-muted-foreground">Un email de confirmation sera envoyé.</p>
          </Field>
          <Button type="submit" className="w-full" disabled={savingEmail}>
            {savingEmail ? "Envoi..." : "Changer l'adresse mail"}
          </Button>
        </form>
      </Card>

      <Card icon={<Lock size={18} />} title="Mot de passe">
        <form onSubmit={handleSavePassword} className="space-y-4">
          <Field label="Nouveau mot de passe" id="password">
            <Input id="password" type="password" required minLength={6} placeholder="Au moins 6 caractères"
              value={formPassword.password}
              onChange={(e) => setFormPassword({ ...formPassword, password: e.target.value })} />
          </Field>
          <Field label="Confirmer le mot de passe" id="confirm">
            <Input id="confirm" type="password" required minLength={6} placeholder="Répétez le mot de passe"
              value={formPassword.confirm}
              onChange={(e) => setFormPassword({ ...formPassword, confirm: e.target.value })} />
          </Field>
          <Button type="submit" className="w-full" disabled={savingPassword}>
            {savingPassword ? "Mise à jour..." : "Changer le mot de passe"}
          </Button>
        </form>
      </Card>
    </div>
  );
};


// ================================================================
// Tab : Inscriptions
// ================================================================
const TabInscriptions = ({
  inscriptions, loading, disciplines,
}: {
  inscriptions: Inscription[];
  loading: boolean;
  disciplines: Discipline[];
}) => {
  if (loading) return <p className="text-center text-muted-foreground">Chargement...</p>;

  const bySaison = inscriptions.reduce<Record<string, Inscription[]>>((acc, i) => {
    const s = i.saison || "Saison inconnue";
    (acc[s] ??= []).push(i);
    return acc;
  }, {});

  const mention = (
    <p className="text-sm text-muted-foreground italic">
      Pour tout changement de situation, merci de nous{" "}
      <a href="/amsp-website/contact" className="text-primary underline underline-offset-2 hover:text-primary/80">nous contacter</a>.
    </p>
  );

  if (inscriptions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border/50 bg-card p-10 text-center">
          <ClipboardList size={36} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Aucune inscription trouvée.</p>
        </div>
        {mention}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(bySaison)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([saison, inscs]) => (
          <div key={saison}>
            <h3 className="mb-3 font-serif text-lg font-bold text-primary">{saison}</h3>
            <div className="space-y-3">
              {inscs.map((i) => <InscriptionRow key={i.id} inscription={i} disciplines={disciplines} />)}
            </div>
          </div>
        ))}
      {mention}
    </div>
  );
};

const InscriptionRow = ({ inscription: i, disciplines }: { inscription: Inscription; disciplines: Discipline[] }) => {
  const [open, setOpen] = useState(false);
  const statut = STATUT_LABELS[i.statut || "en_attente"] ?? STATUT_LABELS.en_attente;
  const discNoms = (i.disciplines || "")
    .split(",")
    .map((id) => disciplines.find((d) => d._id === id.trim())?.nom)
    .filter(Boolean)
    .join(", ");
  const nomComplet = [i.prenom, i.nom].filter(Boolean).join(" ");
  const isMineur = i.type_inscription === "mineur";

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      {/* En-tête cliquable */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
      >
        <div>
          <p className="font-medium text-sm">{discNoms || "Discipline non trouvée"}</p>
          <p className="text-xs text-muted-foreground">
            {nomComplet && <span className="font-medium text-foreground">{nomComplet} · </span>}
            Soumise le {formatDate(i.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className={`flex items-center gap-1.5 text-xs font-medium ${statut.color}`}>
            {statut.icon} {statut.label}
          </span>
          <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Détail complet */}
      {open && (
        <div className="border-t border-border/50 px-4 py-4 space-y-4 text-sm">

          <DetailSection title="Identité">
            <DetailGrid>
              <DetailItem label="Prénom" value={i.prenom} />
              <DetailItem label="Nom" value={i.nom} />
              <DetailItem label="Date de naissance" value={formatDate(i.date_naissance)} />
              <DetailItem label="Groupe sanguin" value={i.groupe_sanguin} />
              <DetailItem label="Allergie / Remarque médicale" value={i.allergie} fullWidth />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Coordonnées">
            <DetailGrid>
              <DetailItem label="Adresse" value={i.adresse} fullWidth />
              {!isMineur && (
                <>
                  <DetailItem label="Téléphone" value={i.tel_mobile} />
                  <DetailItem label="Email" value={i.email} />
                </>
              )}
              <DetailItem label="Contact d'urgence" value={i.urgence_contact} fullWidth />
            </DetailGrid>
          </DetailSection>

          {isMineur && (
            <DetailSection title="Responsable légal">
              <DetailGrid>
                <DetailItem label="Parent / Tuteur 1" value={[i.parent1_prenom, i.parent1_nom].filter(Boolean).join(" ")} />
                <DetailItem label="Téléphone parent 1" value={i.parent1_tel} />
                <DetailItem label="Email parent 1" value={i.parent1_email} fullWidth />
                {(i.parent2_nom || i.parent2_prenom) && (
                  <>
                    <DetailItem label="Parent / Tuteur 2" value={[i.parent2_prenom, i.parent2_nom].filter(Boolean).join(" ")} />
                    <DetailItem label="Téléphone parent 2" value={i.parent2_tel} />
                    <DetailItem label="Email parent 2" value={i.parent2_email} fullWidth />
                  </>
                )}
              </DetailGrid>
            </DetailSection>
          )}

          <DetailSection title="Inscription">
            <DetailGrid>
              <DetailItem label="Discipline(s)" value={discNoms} fullWidth />
              <DetailItem label="Niveau" value={i.niveau} />
              <DetailItem label="Saison" value={i.saison} />
              <DetailItem label="Source" value={i.source === "en_ligne" ? "En ligne" : i.source === "papier" ? "Papier" : null} />
              <DetailItem label="Date de soumission" value={formatDate(i.created_at)} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Modalités & autorisations">
            <DetailGrid>
              <DetailItem label="Moyen de paiement" value={MOYENS_PAIEMENT[i.moyen_paiement || ""] || i.moyen_paiement} />
              <DetailItem label="Pass Sport" value={i.pass_sport ? "Oui" : "Non"} />
              <DetailItem label="Droit à l'image" value={i.droit_image ? "Oui" : "Non"} />
              {isMineur && <DetailItem label="Autorisation parentale" value={i.autorisation_parentale ? "Oui" : "Non"} />}
            </DetailGrid>
          </DetailSection>

        </div>
      )}
    </div>
  );
};


// ================================================================
// Tab : Mes enfants
// ================================================================
const TabEnfants = ({
  liens, loading, disciplines, editEnfant, setEditEnfant, onEnfantUpdated,
}: {
  liens: (LienCompteEnfant & { enfant: Enfant; inscriptions: Inscription[] })[];
  loading: boolean;
  disciplines: Discipline[];
  editEnfant: Enfant | null;
  setEditEnfant: (e: Enfant | null) => void;
  onEnfantUpdated: () => void;
}) => {
  const [editForm, setEditForm] = useState<Partial<Enfant>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editEnfant) setEditForm({ ...editEnfant });
  }, [editEnfant]);

  const handleSave = async () => {
    if (!editEnfant) return;
    setSaving(true);
    const { error } = await supabase.from("enfants").update({
      nom: editForm.nom,
      prenom: editForm.prenom,
      date_naissance: editForm.date_naissance || null,
      groupe_sanguin: editForm.groupe_sanguin || null,
      allergie: editForm.allergie || null,
    }).eq("id", editEnfant.id);
    if (error) toast.error("Erreur lors de la sauvegarde.");
    else { toast.success("Profil mis à jour !"); setEditEnfant(null); onEnfantUpdated(); }
    setSaving(false);
  };

  if (loading) return <p className="text-center text-muted-foreground">Chargement...</p>;

  if (liens.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-10 text-center">
        <Baby size={36} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Aucun enfant rattaché à votre compte.</p>
        <p className="mt-1 text-xs text-muted-foreground">Contactez l'administration pour associer un profil enfant.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {liens.map(({ enfant, type_acces, inscriptions }) => (
          <div key={enfant.id} className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/50 bg-secondary/30 px-5 py-3">
              <div className="flex items-center gap-2">
                <Baby size={16} className="text-primary" />
                <span className="font-semibold">{enfant.prenom} {enfant.nom}</span>
                {enfant.date_naissance && (
                  <span className="text-xs text-muted-foreground">
                    · né(e) le {formatDate(enfant.date_naissance)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {type_acces === "tiers_galerie" && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                    Galerie uniquement
                  </span>
                )}
                {type_acces === "parent" && (
                  <button
                    onClick={() => setEditEnfant(enfant)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil size={12} /> Modifier
                  </button>
                )}
              </div>
            </div>

            <div className="p-5">
              {type_acces === "parent" && (
                <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                  <InfoLine label="Groupe sanguin" value={enfant.groupe_sanguin} />
                  <InfoLine label="Allergie" value={enfant.allergie} />
                </div>
              )}

              {inscriptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune inscription.</p>
              ) : (
                <div className="space-y-2">
                  {inscriptions.slice(0, 5).map((i) => (
                    <InscriptionRow key={i.id} inscription={i} disciplines={disciplines} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modale édition enfant */}
      <Dialog open={!!editEnfant} onOpenChange={(o) => !o && setEditEnfant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le profil de {editEnfant?.prenom}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prénom" id="ep">
                <Input id="ep" value={editForm.prenom || ""} onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })} />
              </Field>
              <Field label="Nom" id="en">
                <Input id="en" value={editForm.nom || ""} onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })} />
              </Field>
            </div>
            <Field label="Date de naissance" id="edn">
              <Input id="edn" type="date" value={editForm.date_naissance || ""}
                onChange={(e) => setEditForm({ ...editForm, date_naissance: e.target.value })} />
            </Field>
            <Field label="Groupe sanguin" id="egs">
              <Input id="egs" placeholder="A+, B-, O+…" value={editForm.groupe_sanguin || ""}
                onChange={(e) => setEditForm({ ...editForm, groupe_sanguin: e.target.value })} />
            </Field>
            <Field label="Allergie / Remarque médicale" id="eal">
              <Input id="eal" value={editForm.allergie || ""}
                onChange={(e) => setEditForm({ ...editForm, allergie: e.target.value })} />
            </Field>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditEnfant(null)}>
                <X size={14} className="mr-1" /> Annuler
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                <Save size={14} className="mr-1" /> {saving ? "Sauvegarde..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};


// ================================================================
// Tab : Nouvelle demande d'inscription
// ================================================================
const TabDemande = ({
  user, profil, disciplines, inscriptionConfig, enfants, onSubmitted,
}: {
  user: { id: string; email?: string };
  profil: Profil | null;
  disciplines: Discipline[];
  inscriptionConfig: InscriptionConfig;
  enfants: Enfant[];
  onSubmitted: () => void;
}) => {
  const saison = inscriptionConfig.saison || "";

  const [pour, setPour] = useState<"moi" | string>("moi"); // "moi" ou enfant.id
  const [typeInscription, setTypeInscription] = useState<"adulte" | "mineur">("adulte");
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [form, setForm] = useState({
    nom: "", prenom: "", adresse: "", telMobile: "", email: "",
    dateNaissance: "", groupeSanguin: "", allergie: "",
    urgencePrenom: "", urgenceNom: "", urgenceTel: "", niveau: "",
  });
  const [parent1, setParent1] = useState({ nom: "", prenom: "", email: "", tel: "" });
  const [parent2, setParent2] = useState({ nom: "", prenom: "", email: "", tel: "" });
  const [moyenPaiement, setMoyenPaiement] = useState("");
  const [passSport, setPassSport] = useState(false);
  const [droitImage, setDroitImage] = useState(false);
  const [autorisationParentale, setAutorisationParentale] = useState(false);
  const [reglementAccepte, setReglementAccepte] = useState(false);
  const [reglementLu, setReglementLu] = useState(false);
  const reglementScrollRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Pré-remplir selon la sélection "Pour qui ?"
  useEffect(() => {
    if (pour === "moi") {
      setTypeInscription("adulte");
      setForm((f) => ({
        ...f,
        nom: profil?.nom || "",
        prenom: profil?.prenom || "",
        adresse: profil?.adresse || "",
        telMobile: profil?.telephone || "",
        email: profil?.email || user.email || "",
      }));
      setParent1({ nom: "", prenom: "", email: "", tel: "" });
    } else {
      const enfant = enfants.find((e) => e.id === pour);
      if (!enfant) return;
      setTypeInscription("mineur");
      setForm((f) => ({
        ...f,
        nom: enfant.nom,
        prenom: enfant.prenom,
        adresse: profil?.adresse || "",
        telMobile: "",
        email: profil?.email || user.email || "",
        dateNaissance: enfant.date_naissance || "",
        groupeSanguin: enfant.groupe_sanguin || "",
        allergie: enfant.allergie || "",
      }));
      setParent1({
        nom: profil?.nom || "",
        prenom: profil?.prenom || "",
        email: profil?.email || user.email || "",
        tel: profil?.telephone || "",
      });
    }
  }, [pour, profil]);

  const toggleDiscipline = (id: string) =>
    setSelectedDisciplines((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDisciplines.length === 0) { toast.error("Sélectionnez au moins une discipline."); return; }
    if (!reglementAccepte) { toast.error("Veuillez accepter le règlement intérieur."); return; }
    if (!moyenPaiement) { toast.error("Veuillez sélectionner un moyen de paiement."); return; }
    if (typeInscription === "mineur" && (!parent1.nom.trim() || !parent1.prenom.trim())) {
      toast.error("Le nom et prénom du parent / tuteur 1 sont obligatoires."); return;
    }
    if (typeInscription === "mineur" && !autorisationParentale) {
      toast.error("L'autorisation parentale est obligatoire pour un mineur."); return;
    }
    setSending(true);

    const disciplinesIds = selectedDisciplines.join(",");
    const disciplinesNoms = selectedDisciplines
      .map((id) => disciplines.find((d) => d._id === id)?.nom).filter(Boolean).join(", ");
    const enfantId = pour !== "moi" ? pour : null;

    try {
      const { error } = await supabase.from("inscriptions").insert({
        nom: form.nom,
        prenom: form.prenom,
        adresse: form.adresse,
        date_naissance: form.dateNaissance || null,
        groupe_sanguin: form.groupeSanguin || null,
        allergie: form.allergie || null,
        tel_mobile: typeInscription === "mineur" ? "" : form.telMobile,
        email: typeInscription === "mineur" ? (parent1.email.trim() || "") : form.email,
        urgence_contact: [[form.urgencePrenom, form.urgenceNom].filter(Boolean).join(" "), form.urgenceTel].filter(Boolean).join(" — "),
        disciplines: disciplinesIds,
        niveau: form.niveau || null,
        autorisation_parentale: typeInscription === "mineur" ? autorisationParentale : false,
        droit_image: droitImage,
        saison,
        statut: "en_attente",
        source: "en_ligne",
        type_inscription: typeInscription,
        pass_sport: passSport,
        moyen_paiement: moyenPaiement,
        parent1_nom: typeInscription === "mineur" ? parent1.nom.trim() || null : null,
        parent1_prenom: typeInscription === "mineur" ? parent1.prenom.trim() || null : null,
        parent1_email: typeInscription === "mineur" ? parent1.email.trim() || null : null,
        parent1_tel: typeInscription === "mineur" ? parent1.tel.trim() || null : null,
        parent2_nom: typeInscription === "mineur" && parent2.nom.trim() ? parent2.nom.trim() : null,
        parent2_prenom: typeInscription === "mineur" && parent2.prenom.trim() ? parent2.prenom.trim() : null,
        parent2_email: typeInscription === "mineur" && parent2.email.trim() ? parent2.email.trim() : null,
        parent2_tel: typeInscription === "mineur" && parent2.tel.trim() ? parent2.tel.trim() : null,
        user_id: user.id,
        enfant_id: enfantId,
      });
      if (error) throw error;

      // Suggestions d'accès galerie (créées en statut suggestion_auto, actif = false en attente admin)
      for (const discId of selectedDisciplines) {
        await supabase.from("acces_galerie").upsert({
          compte_id: user.id,
          discipline_sanity_id: discId,
          actif: false,
          source: "suggestion_auto",
        }, { onConflict: "compte_id,discipline_sanity_id", ignoreDuplicates: true });
      }

      const emailDest = typeInscription === "mineur" ? (parent1.email.trim() || form.email) : form.email;
      await sendBrevoEmail(TEMPLATES.INSCRIPTION, { email: emailDest, name: `${form.prenom} ${form.nom}` }, {
        nom: form.nom, prenom: form.prenom, adresse: form.adresse,
        tel_mobile: form.telMobile, email: emailDest,
        date_naissance: form.dateNaissance || "", groupe_sanguin: form.groupeSanguin || "",
        allergie: form.allergie || "Aucune", niveau: form.niveau || "Non précisé",
        urgence_contact: [[form.urgencePrenom, form.urgenceNom].filter(Boolean).join(" "), form.urgenceTel].filter(Boolean).join(" — "),
        disciplines: disciplinesNoms,
        autorisation_parentale: autorisationParentale ? "Oui" : "Non / Non concerné",
        droit_image: droitImage ? "Oui" : "Non", saison,
      });

      try {
        await sendBrevoEmail(TEMPLATES.INSCRIPTION_ADMIN, { email: import.meta.env.VITE_BREVO_ADMIN_EMAIL, name: "AMSP" }, {
          nom: form.nom, prenom: form.prenom, email: emailDest,
          tel_mobile: form.telMobile, date_naissance: form.dateNaissance || "",
          niveau: form.niveau || "Non précisé", disciplines: disciplinesNoms, saison,
        });
      } catch { /* non-bloquant */ }

      setSubmitted(true);
      toast.success("Demande envoyée ! Vous recevrez une confirmation par email.");
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    }
    setSending(false);
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-10 text-center">
        <CheckCircle size={40} className="mx-auto mb-4 text-emerald-500" />
        <h3 className="font-serif text-xl font-bold">Demande envoyée !</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre demande est en attente de validation par l'administration.<br />
          Vous recevrez un email de confirmation.
        </p>
        <Button className="mt-6" onClick={() => { setSubmitted(false); onSubmitted(); }}>
          Voir mes inscriptions <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Pour qui ? */}
      {enfants.length > 0 && (
        <Card icon={<Baby size={18} />} title="Pour qui est cette inscription ?">
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setPour("moi")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                pour === "moi" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
              }`}>
              Moi-même
            </button>
            {enfants.map((e) => (
              <button key={e.id} type="button" onClick={() => setPour(e.id)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  pour === e.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                }`}>
                {e.prenom} {e.nom}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Identité */}
      <Card icon={<User size={18} />} title="Identité de l'inscrit(e)">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prénom" id="f-prenom">
              <Input id="f-prenom" required value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
            </Field>
            <Field label="Nom" id="f-nom">
              <Input id="f-nom" required value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </Field>
          </div>
          <Field label="Date de naissance" id="f-dn">
            <Input id="f-dn" type="date" value={form.dateNaissance}
              onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Groupe sanguin" id="f-gs">
              <Input id="f-gs" placeholder="A+, B-, O+…" value={form.groupeSanguin}
                onChange={(e) => setForm({ ...form, groupeSanguin: e.target.value })} />
            </Field>
            <Field label="Allergie / Remarque médicale" id="f-al">
              <Input id="f-al" value={form.allergie}
                onChange={(e) => setForm({ ...form, allergie: e.target.value })} />
            </Field>
          </div>
          <Field label="Adresse postale" id="f-adr">
            <Input id="f-adr" required value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
          </Field>
          {typeInscription === "adulte" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Téléphone mobile" id="f-tel">
                <Input id="f-tel" type="tel" value={form.telMobile}
                  onChange={(e) => setForm({ ...form, telMobile: e.target.value })} />
              </Field>
              <Field label="Email" id="f-email">
                <Input id="f-email" type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
            </div>
          )}
          <Field label="Contact d'urgence (prénom, nom, téléphone)" id="f-urg">
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Prénom" value={form.urgencePrenom}
                onChange={(e) => setForm({ ...form, urgencePrenom: e.target.value })} />
              <Input placeholder="Nom" value={form.urgenceNom}
                onChange={(e) => setForm({ ...form, urgenceNom: e.target.value })} />
              <Input placeholder="Téléphone" value={form.urgenceTel}
                onChange={(e) => setForm({ ...form, urgenceTel: e.target.value })} />
            </div>
          </Field>
        </div>
      </Card>

      {/* Parents (mineur) */}
      {typeInscription === "mineur" && (
        <Card icon={<User size={18} />} title="Responsable légal">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prénom parent/tuteur 1 *" id="p1-prenom">
                <Input id="p1-prenom" required value={parent1.prenom}
                  onChange={(e) => setParent1({ ...parent1, prenom: e.target.value })} />
              </Field>
              <Field label="Nom parent/tuteur 1 *" id="p1-nom">
                <Input id="p1-nom" required value={parent1.nom}
                  onChange={(e) => setParent1({ ...parent1, nom: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email parent 1" id="p1-email">
                <Input id="p1-email" type="email" value={parent1.email}
                  onChange={(e) => setParent1({ ...parent1, email: e.target.value })} />
              </Field>
              <Field label="Téléphone parent 1" id="p1-tel">
                <Input id="p1-tel" type="tel" value={parent1.tel}
                  onChange={(e) => setParent1({ ...parent1, tel: e.target.value })} />
              </Field>
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Ajouter un 2e responsable (optionnel)
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <Field label="Prénom parent 2" id="p2-prenom">
                  <Input id="p2-prenom" value={parent2.prenom}
                    onChange={(e) => setParent2({ ...parent2, prenom: e.target.value })} />
                </Field>
                <Field label="Nom parent 2" id="p2-nom">
                  <Input id="p2-nom" value={parent2.nom}
                    onChange={(e) => setParent2({ ...parent2, nom: e.target.value })} />
                </Field>
                <Field label="Email parent 2" id="p2-email">
                  <Input id="p2-email" type="email" value={parent2.email}
                    onChange={(e) => setParent2({ ...parent2, email: e.target.value })} />
                </Field>
                <Field label="Téléphone parent 2" id="p2-tel">
                  <Input id="p2-tel" type="tel" value={parent2.tel}
                    onChange={(e) => setParent2({ ...parent2, tel: e.target.value })} />
                </Field>
              </div>
            </details>
          </div>
        </Card>
      )}

      {/* Disciplines */}
      <Card icon={<ClipboardList size={18} />} title="Discipline(s)">
        <div className="flex flex-wrap gap-2">
          {disciplines.map((d) => (
            <button key={d._id} type="button" onClick={() => toggleDiscipline(d._id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedDisciplines.includes(d._id)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}>
              {d.nomCourt || d.nom}
            </button>
          ))}
        </div>
        <Field label="Niveau" id="f-niveau" className="mt-4">
          <Input id="f-niveau" placeholder="Débutant, confirmé…" value={form.niveau}
            onChange={(e) => setForm({ ...form, niveau: e.target.value })} />
        </Field>
      </Card>

      {/* Modalités */}
      <Card icon={<ClipboardList size={18} />} title="Modalités">
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium">Moyen de paiement *</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { val: "cheque_1x", label: "Chèque (1×)" },
                { val: "cheque_4x", label: "Chèque (4×)" },
                { val: "especes", label: "Espèces" },
                { val: "virement", label: "Virement" },
              ].map(({ val, label }) => (
                <button key={val} type="button" onClick={() => setMoyenPaiement(val)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    moyenPaiement === val
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox id="pass-sport" checked={passSport} onCheckedChange={(v) => setPassSport(!!v)} />
            <label htmlFor="pass-sport" className="text-sm cursor-pointer">
              J'utilise le Pass'Sport
            </label>
          </div>
        </div>
      </Card>

      {/* Autorisations */}
      <Card icon={<ClipboardList size={18} />} title="Autorisations &amp; règlement">
        {inscriptionConfig.reglementInterieur && (
          <div className="relative mb-1">
            <div
              ref={reglementScrollRef}
              className="max-h-48 overflow-y-auto rounded-md border border-border/50 bg-secondary/30 p-4 text-xs text-muted-foreground whitespace-pre-wrap mb-1"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setReglementLu(true);
              }}
            >
              {renderReglement(inscriptionConfig.reglementInterieur)}
            </div>
            {!reglementLu && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle size={12} className="shrink-0" />
                Faites défiler jusqu'en bas pour débloquer la case à cocher.
              </p>
            )}
          </div>
        )}
        <div className="space-y-3">
          <div className={`flex items-start gap-3 ${reglementLu || !inscriptionConfig.reglementInterieur ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
            <Checkbox
              id="reglement"
              checked={reglementAccepte}
              onCheckedChange={(v) => (reglementLu || !inscriptionConfig.reglementInterieur) && setReglementAccepte(!!v)}
              disabled={!reglementLu && !!inscriptionConfig.reglementInterieur}
            />
            <label htmlFor="reglement" className="text-sm leading-snug">
              J'ai lu et j'accepte le règlement intérieur *
            </label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="droit-image" checked={droitImage} onCheckedChange={(v) => setDroitImage(!!v)} />
            <label htmlFor="droit-image" className="text-sm cursor-pointer leading-snug">
              {inscriptionConfig.texteAutorisationImage || "J'autorise l'utilisation de mon image (photos/vidéos) à des fins associatives."}
            </label>
          </div>
          {typeInscription === "mineur" && (
            <div className="flex items-start gap-3">
              <Checkbox id="auto-parentale" checked={autorisationParentale} onCheckedChange={(v) => setAutorisationParentale(!!v)} />
              <label htmlFor="auto-parentale" className="text-sm cursor-pointer leading-snug">
                {inscriptionConfig.texteAutorisationParentale || "J'autorise mon enfant à participer aux activités de l'association."} *
              </label>
            </div>
          )}
        </div>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={sending}>
        {sending ? "Envoi en cours..." : "Envoyer la demande d'inscription"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Votre demande sera validée par l'administration. Vous recevrez un email de confirmation.
      </p>
    </form>
  );
};


// ================================================================
// Composants utilitaires
// ================================================================
const Card = ({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border/50 bg-card p-6">
    <div className="mb-4 flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <h2 className="font-serif font-bold">{title}</h2>
    </div>
    {children}
  </div>
);

const Field = ({
  label, id, className, children,
}: { label: string; id: string; className?: string; children: React.ReactNode }) => (
  <div className={`space-y-1.5 ${className || ""}`}>
    <Label htmlFor={id}>{label}</Label>
    {children}
  </div>
);

const InfoLine = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value || "—"}</span>
  </div>
);

const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">{title}</p>
    {children}
  </div>
);

const DetailGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
    {children}
  </div>
);

const DetailItem = ({ label, value, fullWidth }: { label: string; value: string | null | undefined; fullWidth?: boolean }) => (
  <div className={fullWidth ? "col-span-2" : ""}>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-medium text-foreground">{value || "—"}</p>
  </div>
);

export default EspaceMembre;
