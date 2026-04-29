import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle, XCircle, Shield, Download, ChevronDown, UserX, ClipboardList } from "lucide-react";
import { sendBrevoEmail, TEMPLATES } from "@/lib/brevo";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Membre {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  adresse: string | null;
  telephone: string | null;
  role: string;
  created_at: string;
}

interface Inscription {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  disciplines: string | null;
  saison: string | null;
  statut: string | null;
  adresse: string | null;
  tel_fixe: string | null;
  tel_mobile: string | null;
  urgence_contact: string | null;
  date_naissance: string | null;
  groupe_sanguin: string | null;
  allergie: string | null;
  niveau: string | null;
  autorisation_parentale: boolean;
  droit_image: boolean;
  created_at: string;
  user_id: string | null;
}

type Ligne =
  | { type: "profil"; profil: Membre; inscriptions: Inscription[] }
  | { type: "inscription_seule"; inscription: Inscription };

const roleBadge = (role: string) => {
  if (role === "admin")      return { label: "Admin",      cls: "bg-primary/10 text-primary" };
  if (role === "membre")     return { label: "Membre",     cls: "bg-green-500/10 text-green-700" };
  if (role === "refuse")     return { label: "Refusé",     cls: "bg-red-500/10 text-red-600" };
  if (role === "en_attente") return { label: "En attente", cls: "bg-amber-500/10 text-amber-700" };
  return                            { label: "—",          cls: "bg-muted text-muted-foreground" };
};

const inscBadge = (statut: string | null) => {
  if (statut === "validee")  return { label: "Validée",    cls: "bg-green-500/10 text-green-700" };
  if (statut === "refusee")  return { label: "Refusée",    cls: "bg-red-500/10 text-red-600" };
  return                            { label: "En attente", cls: "bg-amber-500/10 text-amber-700" };
};

const AdminMembres = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [confirmAdmin, setConfirmAdmin] = useState<Membre | null>(null);

  useEffect(() => {
    if (!user) { navigate("/connexion"); return; }
    supabase.from("profils").select("role").eq("id", user.id).single().then(({ data }) => {
      if (data?.role !== "admin") { navigate("/"); return; }
      setIsAdmin(true);
      setCheckingRole(false);
    });
  }, [user, navigate]);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: profilsData }, { data: inscData }] = await Promise.all([
      supabase.from("profils").select("id, email, prenom, nom, adresse, telephone, role, created_at").order("created_at", { ascending: false }),
      supabase.from("inscriptions").select("*").order("created_at", { ascending: false }),
    ]);
    if (profilsData) setMembres(profilsData);
    if (inscData) setInscriptions(inscData);
    setLoading(false);
  };

  // --- Actions compte membre ---
  const handleApprouverCompte = async (id: string) => {
    setProcessing(id);
    const { error } = await supabase.from("profils").update({ role: "membre" }).eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Compte approuvé.");
      setMembres((prev) => prev.map((m) => m.id === id ? { ...m, role: "membre" } : m));
      const m = membres.find((m) => m.id === id);
      if (m?.email) {
        try {
          await sendBrevoEmail(TEMPLATES.COMPTE, { email: m.email, name: [m.prenom, m.nom].filter(Boolean).join(" ") || m.email }, {
            prenom: m.prenom || "",
            nom: m.nom || "",
          });
        } catch {
          toast.warning("Compte approuvé, mais l'email de confirmation n'a pas pu être envoyé.");
        }
      }
    }
    setProcessing(null);
  };

  const handleRefuserCompte = async (id: string) => {
    setProcessing(id);
    const { error } = await supabase.from("profils").update({ role: "refuse" }).eq("id", id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Demande refusée."); setMembres((prev) => prev.map((m) => m.id === id ? { ...m, role: "refuse" } : m)); }
    setProcessing(null);
  };

  const handleChangerRole = async (id: string, nouveauRole: "admin" | "membre") => {
    setProcessing(id);
    const { error } = await supabase.from("profils").update({ role: nouveauRole }).eq("id", id);
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success(nouveauRole === "admin" ? "Membre promu administrateur." : "Droits admin retirés.");
      setMembres((prev) => prev.map((m) => m.id === id ? { ...m, role: nouveauRole } : m));
    }
    setProcessing(null);
  };

  // --- Actions inscription discipline ---
  const handleValiderInscription = async (id: string) => {
    setProcessing(`insc-${id}`);
    const { error } = await supabase.from("inscriptions").update({ statut: "validee" }).eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Inscription validée.");
      setInscriptions((prev) => prev.map((i) => i.id === id ? { ...i, statut: "validee" } : i));

      // Envoyer un email de confirmation au membre
      const insc = inscriptions.find((i) => i.id === id);
      if (insc?.email) {
        try {
          await sendBrevoEmail(TEMPLATES.VALIDATION, { email: insc.email, name: [insc.prenom, insc.nom].filter(Boolean).join(" ") || insc.email }, {
            nom: insc.nom || "",
            prenom: insc.prenom || "",
            adresse: insc.adresse || "",
            tel_fixe: insc.tel_fixe || "",
            tel_mobile: insc.tel_mobile || "",
            email: insc.email,
            date_naissance: insc.date_naissance || "",
            groupe_sanguin: insc.groupe_sanguin || "",
            allergie: insc.allergie || "Aucune",
            niveau: insc.niveau || "Non précisé",
            urgence_contact: insc.urgence_contact || "",
            disciplines: insc.disciplines || "",
            autorisation_parentale: insc.autorisation_parentale ? "Oui" : "Non / Non concerné",
            droit_image: insc.droit_image ? "Oui" : "Non",
            saison: insc.saison || "",
          });
        } catch {
          // L'inscription est validée même si l'email échoue
          toast.warning("Inscription validée, mais l'email de confirmation n'a pas pu être envoyé.");
        }
      }
    }
    setProcessing(null);
  };

  const handleRefuserInscription = async (id: string) => {
    setProcessing(`insc-${id}`);
    const { error } = await supabase.from("inscriptions").update({ statut: "refusee" }).eq("id", id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Inscription refusée."); setInscriptions((prev) => prev.map((i) => i.id === id ? { ...i, statut: "refusee" } : i)); }
    setProcessing(null);
  };

  // --- Export CSV ---
  const handleExportCSV = async () => {
    const { data, error } = await supabase.from("inscriptions").select("*").order("created_at", { ascending: false });
    if (error || !data) { toast.error("Erreur lors de l'export."); return; }
    const headers = [
      "Date", "Saison", "Statut inscription", "Nom", "Prénom", "Naissance", "Groupe sanguin", "Allergie(s)",
      "Adresse", "Tél. fixe", "Tél. mobile", "Email", "Urgence",
      "Discipline(s)", "Niveau", "Autorisation parentale", "Droit à l'image", "Compte membre",
    ];
    const rows = data.map((i) => {
      const profil = membres.find((m) => m.id === i.user_id);
      const compte = profil?.role === "admin" ? "Admin" : profil?.role === "membre" ? "Oui" : profil?.role === "en_attente" ? "En attente" : "Non";
      const statutInsc = i.statut === "validee" ? "Validée" : i.statut === "refusee" ? "Refusée" : "En attente";
      return [
        new Date(i.created_at).toLocaleDateString("fr-FR"), i.saison || "", statutInsc,
        i.nom || "", i.prenom || "",
        i.date_naissance ? new Date(i.date_naissance).toLocaleDateString("fr-FR") : "",
        i.groupe_sanguin || "", i.allergie || "", i.adresse || "",
        i.tel_fixe || "", i.tel_mobile || "", i.email || "", i.urgence_contact || "",
        i.disciplines || "", i.niveau || "",
        i.autorisation_parentale ? "Oui" : "Non", i.droit_image ? "Oui" : "Non", compte,
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `inscriptions_amsp_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // --- Données dérivées ---
  const enAttenteCompte = membres.filter((m) => m.role === "en_attente");
  const enAttenteInscription = inscriptions.filter((i) => i.statut === "en_attente");

  const lignes: Ligne[] = [];
  membres.forEach((profil) => {
    lignes.push({ type: "profil", profil, inscriptions: inscriptions.filter((i) => i.user_id === profil.id) });
  });
  const profilIds = new Set(membres.map((m) => m.id));
  inscriptions.forEach((insc) => {
    if (!insc.user_id || !profilIds.has(insc.user_id)) {
      lignes.push({ type: "inscription_seule", inscription: insc });
    }
  });

  if (checkingRole) return (
    <Layout><section className="py-20"><p className="text-center text-muted-foreground">Vérification des droits…</p></section></Layout>
  );
  if (!isAdmin) return null;

  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

            <div className="mb-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <h1 className="text-center font-serif text-4xl font-black md:text-5xl">
                <span className="text-primary">Gestion</span> des membres
              </h1>
              {!loading && (
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 shrink-0">
                  <Download size={14} /> Exporter les inscriptions
                </Button>
              )}
            </div>

            {loading ? <p className="text-center text-muted-foreground">Chargement…</p> : (
              <div className="space-y-6">

                {/* Bloc En attente — Comptes membres */}
                <div className="rounded-lg border border-border/50 bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={18} className="text-primary" />
                    <h2 className="font-serif font-bold">
                      Demandes d'accès espace membre
                      {enAttenteCompte.length > 0 && (
                        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{enAttenteCompte.length}</span>
                      )}
                    </h2>
                  </div>
                  {enAttenteCompte.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
                  ) : (
                    <div className="space-y-3">
                      {enAttenteCompte.map((m) => (
                        <div key={m.id} className="flex flex-col gap-3 rounded-md border border-border/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-sm">{m.prenom || ""} {m.nom || ""}{!m.prenom && !m.nom && <span className="text-muted-foreground italic">Sans nom</span>}</p>
                            <p className="text-xs text-muted-foreground">{m.email}</p>
                            <p className="text-xs text-muted-foreground">Demande le {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleApprouverCompte(m.id)} disabled={processing === m.id} className="gap-1"><CheckCircle size={14} /> Approuver</Button>
                            <Button size="sm" variant="outline" onClick={() => handleRefuserCompte(m.id)} disabled={processing === m.id} className="gap-1 text-destructive hover:text-destructive"><XCircle size={14} /> Refuser</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bloc En attente — Inscriptions aux disciplines */}
                <div className="rounded-lg border border-border/50 bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ClipboardList size={18} className="text-primary" />
                    <h2 className="font-serif font-bold">
                      Inscriptions aux disciplines en attente
                      {enAttenteInscription.length > 0 && (
                        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{enAttenteInscription.length}</span>
                      )}
                    </h2>
                  </div>
                  {enAttenteInscription.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune inscription en attente.</p>
                  ) : (
                    <div className="space-y-3">
                      {enAttenteInscription.map((insc) => (
                        <div key={insc.id} className="flex flex-col gap-3 rounded-md border border-border/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-sm">{insc.prenom || ""} {insc.nom || ""}{!insc.prenom && !insc.nom && <span className="text-muted-foreground italic">Sans nom</span>}</p>
                            <p className="text-xs text-muted-foreground">{insc.disciplines || "—"} — {insc.saison || "—"}</p>
                            <p className="text-xs text-muted-foreground">Reçue le {new Date(insc.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleValiderInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="gap-1"><CheckCircle size={14} /> Valider</Button>
                            <Button size="sm" variant="outline" onClick={() => handleRefuserInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-destructive hover:text-destructive"><XCircle size={14} /> Refuser</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tableau unifié */}
                <div className="rounded-lg border border-border/50 bg-card p-6">
                  <h2 className="font-serif font-bold mb-4">Tous les inscrits & membres ({lignes.length})</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50 text-xs text-muted-foreground">
                          <th className="pb-2 pr-4 text-left font-medium">Nom / Prénom</th>
                          <th className="pb-2 pr-4 text-left font-medium hidden md:table-cell">Email</th>
                          <th className="pb-2 pr-4 text-left font-medium hidden lg:table-cell">Discipline(s)</th>
                          <th className="pb-2 pr-4 text-left font-medium">Inscription</th>
                          <th className="pb-2 text-left font-medium">Compte membre</th>
                          <th className="pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lignes.map((ligne) => {
                          const key = ligne.type === "profil" ? `p-${ligne.profil.id}` : `i-${ligne.inscription.id}`;
                          const isExpanded = expandedKey === key;

                          if (ligne.type === "profil") {
                            const { profil, inscriptions: pInsc } = ligne;
                            const roleBdg = roleBadge(profil.role);
                            const derniereInsc = pInsc[0];
                            const inscBdg = derniereInsc ? inscBadge(derniereInsc.statut) : null;

                            return (
                              <>
                                <tr key={key} onClick={() => setExpandedKey(isExpanded ? null : key)} className="border-b border-border/30 cursor-pointer hover:bg-secondary/30 transition-colors">
                                  <td className="py-3 pr-4 font-medium">
                                    {profil.prenom || ""} {profil.nom || ""}
                                    {!profil.prenom && !profil.nom && <span className="text-muted-foreground italic">Sans nom</span>}
                                  </td>
                                  <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell text-xs">{profil.email}</td>
                                  <td className="py-3 pr-4 hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[140px]">{derniereInsc?.disciplines || "—"}</td>
                                  <td className="py-3 pr-4">
                                    {inscBdg
                                      ? <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inscBdg.cls}`}>{inscBdg.label}</span>
                                      : <span className="text-xs text-muted-foreground">—</span>
                                    }
                                    {pInsc.length > 1 && <span className="ml-1 text-xs text-muted-foreground">+{pInsc.length - 1}</span>}
                                  </td>
                                  <td className="py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBdg.cls}`}>{roleBdg.label}</span>
                                  </td>
                                  <td className="py-3 pl-2"><ChevronDown size={14} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} /></td>
                                </tr>

                                {isExpanded && (
                                  <tr key={`${key}-detail`}>
                                    <td colSpan={6} className="bg-secondary/20 px-4 py-4">
                                      {/* Infos du compte */}
                                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs mb-4">
                                        <div><span className="text-muted-foreground">Email </span>{profil.email}</div>
                                        {profil.telephone && <div><span className="text-muted-foreground">Téléphone </span>{profil.telephone}</div>}
                                        {profil.adresse && <div><span className="text-muted-foreground">Adresse </span>{profil.adresse}</div>}
                                        <div><span className="text-muted-foreground">Compte créé le </span>{new Date(profil.created_at).toLocaleDateString("fr-FR")}</div>
                                      </div>

                                      {/* Inscriptions liées */}
                                      {pInsc.length > 0 && (
                                        <div className="mb-4">
                                          <p className="text-xs font-medium text-muted-foreground mb-2">Inscription(s) aux disciplines</p>
                                          <div className="space-y-2">
                                            {pInsc.map((insc) => {
                                              const iBdg = inscBadge(insc.statut);
                                              return (
                                                <div key={insc.id} className="rounded border border-border/30 bg-background px-3 py-2 text-xs">
                                                  <div className="flex items-center justify-between mb-1.5 gap-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                      <span className="font-medium">{insc.disciplines || "—"}</span>
                                                      <span className="text-muted-foreground">{insc.saison || ""}</span>
                                                      <span className="text-muted-foreground">— {new Date(insc.created_at).toLocaleDateString("fr-FR")}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${iBdg.cls}`}>{iBdg.label}</span>
                                                      {insc.statut !== "validee" && (
                                                        <Button size="sm" onClick={() => handleValiderInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="h-6 px-2 text-xs gap-1"><CheckCircle size={10} /> Valider</Button>
                                                      )}
                                                      {insc.statut !== "refusee" && (
                                                        <Button size="sm" variant="outline" onClick={() => handleRefuserInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="h-6 px-2 text-xs gap-1 text-destructive hover:text-destructive"><XCircle size={10} /> Refuser</Button>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-muted-foreground">
                                                    {insc.adresse && <span><span className="font-medium text-foreground">Adresse </span>{insc.adresse}</span>}
                                                    {insc.tel_mobile && <span><span className="font-medium text-foreground">Mobile </span>{insc.tel_mobile}</span>}
                                                    {insc.urgence_contact && <span><span className="font-medium text-foreground">Urgence </span>{insc.urgence_contact}</span>}
                                                    {insc.date_naissance && <span><span className="font-medium text-foreground">Naissance </span>{new Date(insc.date_naissance).toLocaleDateString("fr-FR")}</span>}
                                                    {insc.groupe_sanguin && <span><span className="font-medium text-foreground">Groupe sanguin </span>{insc.groupe_sanguin}</span>}
                                                    {insc.allergie && <span><span className="font-medium text-foreground">Allergie </span>{insc.allergie}</span>}
                                                    {insc.niveau && <span><span className="font-medium text-foreground">Niveau </span>{insc.niveau}</span>}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* Actions compte */}
                                      {profil.id !== user?.id && (
                                        <div className="flex justify-end pt-2 border-t border-border/30 gap-2">
                                          {profil.role === "refuse" ? (
                                            <Button size="sm" variant="outline" onClick={() => handleApprouverCompte(profil.id)} disabled={processing === profil.id} className="gap-1 text-xs"><CheckCircle size={12} /> Réactiver le compte</Button>
                                          ) : profil.role === "admin" ? (
                                            <Button size="sm" variant="outline" onClick={() => handleChangerRole(profil.id, "membre")} disabled={processing === profil.id} className="gap-1 text-xs text-destructive hover:text-destructive"><Shield size={12} /> Retirer les droits admin</Button>
                                          ) : (
                                            <>
                                              <Button size="sm" variant="outline" onClick={() => setConfirmAdmin(profil)} disabled={processing === profil.id} className="gap-1 text-xs text-primary hover:text-primary"><Shield size={12} /> Promouvoir en admin</Button>
                                              <Button size="sm" variant="outline" onClick={() => handleRefuserCompte(profil.id)} disabled={processing === profil.id} className="gap-1 text-xs text-destructive hover:text-destructive"><UserX size={12} /> Révoquer le compte</Button>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          }

                          // Inscription sans compte
                          const { inscription: insc } = ligne;
                          const iBdg = inscBadge(insc.statut);
                          return (
                            <>
                              <tr key={key} onClick={() => setExpandedKey(isExpanded ? null : key)} className="border-b border-border/30 cursor-pointer hover:bg-secondary/30 transition-colors">
                                <td className="py-3 pr-4 font-medium">
                                  {insc.prenom || ""} {insc.nom || ""}
                                  {!insc.prenom && !insc.nom && <span className="text-muted-foreground italic">Sans nom</span>}
                                </td>
                                <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell text-xs">{insc.email || "—"}</td>
                                <td className="py-3 pr-4 hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[140px]">{insc.disciplines || "—"}</td>
                                <td className="py-3 pr-4">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${iBdg.cls}`}>{iBdg.label}</span>
                                </td>
                                <td className="py-3">
                                  <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">Pas de compte</span>
                                </td>
                                <td className="py-3 pl-2"><ChevronDown size={14} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} /></td>
                              </tr>
                              {isExpanded && (
                                <tr key={`${key}-detail`}>
                                  <td colSpan={6} className="bg-secondary/20 px-4 py-4">
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs mb-3">
                                      {insc.email && <div><span className="text-muted-foreground">Email </span>{insc.email}</div>}
                                      {insc.tel_mobile && <div><span className="text-muted-foreground">Mobile </span>{insc.tel_mobile}</div>}
                                      {insc.tel_fixe && <div><span className="text-muted-foreground">Fixe </span>{insc.tel_fixe}</div>}
                                      {insc.adresse && <div><span className="text-muted-foreground">Adresse </span>{insc.adresse}</div>}
                                      {insc.date_naissance && <div><span className="text-muted-foreground">Naissance </span>{new Date(insc.date_naissance).toLocaleDateString("fr-FR")}</div>}
                                      {insc.groupe_sanguin && <div><span className="text-muted-foreground">Groupe sanguin </span>{insc.groupe_sanguin}</div>}
                                      {insc.allergie && <div><span className="text-muted-foreground">Allergie </span>{insc.allergie}</div>}
                                      {insc.urgence_contact && <div><span className="text-muted-foreground">Urgence </span>{insc.urgence_contact}</div>}
                                      {insc.niveau && <div><span className="text-muted-foreground">Niveau </span>{insc.niveau}</div>}
                                      <div><span className="text-muted-foreground">Envoyée le </span>{new Date(insc.created_at).toLocaleDateString("fr-FR")}</div>
                                    </div>
                                    <div className="flex justify-end pt-2 border-t border-border/30 gap-2">
                                      {insc.statut !== "validee" && (
                                        <Button size="sm" onClick={() => handleValiderInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-xs"><CheckCircle size={12} /> Valider l'inscription</Button>
                                      )}
                                      {insc.statut !== "refusee" && (
                                        <Button size="sm" variant="outline" onClick={() => handleRefuserInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-xs text-destructive hover:text-destructive"><XCircle size={12} /> Refuser l'inscription</Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        </div>
      </section>

      <AlertDialog open={!!confirmAdmin} onOpenChange={(open) => { if (!open) setConfirmAdmin(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promouvoir en administrateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez donner les droits administrateur à <strong>{confirmAdmin?.prenom} {confirmAdmin?.nom}</strong> ({confirmAdmin?.email}).
              <br /><br />
              Cette personne pourra gérer les membres et accéder à toutes les fonctions d'administration du site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmAdmin) handleChangerRole(confirmAdmin.id, "admin"); setConfirmAdmin(null); }}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default AdminMembres;
