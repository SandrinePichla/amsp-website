import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Users, Clock, CheckCircle, XCircle, Shield, Download, ChevronDown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  disciplines: string;
  saison: string;
  statut: string;
  created_at: string;
}

const AdminMembres = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [inscriptions, setInscriptions] = useState<Record<string, Inscription[]>>({});
  const [expandedMembre, setExpandedMembre] = useState<string | null>(null);
  const [confirmAdmin, setConfirmAdmin] = useState<Membre | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/connexion");
      return;
    }
    supabase
      .from("profils")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.role !== "admin") {
          navigate("/");
          return;
        }
        setIsAdmin(true);
        setCheckingRole(false);
        loadMembres();
      });
  }, [user, navigate]);

  const loadMembres = async () => {
    setLoading(true);
    const [{ data: profilsData }, { data: inscData }] = await Promise.all([
      supabase
        .from("profils")
        .select("id, email, prenom, nom, adresse, telephone, role, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("inscriptions")
        .select("id, disciplines, saison, statut, created_at, user_id")
        .not("user_id", "is", null)
        .order("created_at", { ascending: false }),
    ]);
    if (profilsData) setMembres(profilsData);
    if (inscData) {
      const grouped: Record<string, Inscription[]> = {};
      inscData.forEach((i) => {
        if (!grouped[i.user_id]) grouped[i.user_id] = [];
        grouped[i.user_id].push(i);
      });
      setInscriptions(grouped);
    }
    setLoading(false);
  };

  const handleApprouver = async (id: string) => {
    setProcessing(id);
    const { error } = await supabase
      .from("profils")
      .update({ role: "membre" })
      .eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Compte approuvé.");
      setMembres((prev) => prev.map((m) => (m.id === id ? { ...m, role: "membre" } : m)));
    }
    setProcessing(null);
  };

  const handleChangerRole = async (id: string, nouveauRole: "admin" | "membre") => {
    setProcessing(id);
    const { error } = await supabase
      .from("profils")
      .update({ role: nouveauRole })
      .eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(nouveauRole === "admin" ? "Membre promu administrateur." : "Droits admin retirés.");
      setMembres((prev) => prev.map((m) => (m.id === id ? { ...m, role: nouveauRole } : m)));
    }
    setProcessing(null);
  };

  const handleRefuser = async (id: string) => {
    setProcessing(id);
    const { error } = await supabase
      .from("profils")
      .update({ role: "refuse" })
      .eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Demande refusée.");
      setMembres((prev) => prev.map((m) => (m.id === id ? { ...m, role: "refuse" } : m)));
    }
    setProcessing(null);
  };

  const enAttente = membres.filter((m) => m.role === "en_attente");
  const actifs = membres.filter((m) => m.role === "membre" || m.role === "admin");
  const refuses = membres.filter((m) => m.role === "refuse");

  const handleExportCSV = async () => {
    const { data, error } = await supabase
      .from("inscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      toast.error("Erreur lors de l'export.");
      return;
    }

    const headers = [
      "Date d'inscription", "Saison", "Statut",
      "Nom", "Prénom", "Date de naissance", "Groupe sanguin", "Allergie(s)",
      "Adresse", "Téléphone fixe", "Téléphone mobile", "Email",
      "Personne à contacter en urgence",
      "Discipline(s)", "Niveau",
      "Autorisation parentale", "Droit à l'image",
    ];

    const rows = data.map((i) => [
      new Date(i.created_at).toLocaleDateString("fr-FR"),
      i.saison || "",
      i.statut === "validee" ? "Validée" : i.statut === "refusee" ? "Refusée" : "En attente",
      i.nom || "",
      i.prenom || "",
      i.date_naissance ? new Date(i.date_naissance).toLocaleDateString("fr-FR") : "",
      i.groupe_sanguin || "",
      i.allergie || "",
      i.adresse || "",
      i.tel_fixe || "",
      i.tel_mobile || "",
      i.email || "",
      i.urgence_contact || "",
      i.disciplines || "",
      i.niveau || "",
      i.autorisation_parentale ? "Oui" : "Non",
      i.droit_image ? "Oui" : "Non",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscriptions_amsp_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (checkingRole) {
    return (
      <Layout>
        <section className="py-20">
          <p className="text-center text-muted-foreground">Vérification des droits…</p>
        </section>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto max-w-2xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <h1 className="text-center font-serif text-4xl font-black md:text-5xl">
                <span className="text-primary">Gestion</span> des membres
              </h1>
              {!loading && (
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 shrink-0">
                  <Download size={14} />
                  Exporter les inscriptions
                </Button>
              )}
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground">Chargement…</p>
            ) : (
              <div className="space-y-6">

                {/* En attente */}
                <div className="rounded-lg border border-border/50 bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={18} className="text-primary" />
                    <h2 className="font-serif font-bold">
                      En attente
                      {enAttente.length > 0 && (
                        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                          {enAttente.length}
                        </span>
                      )}
                    </h2>
                  </div>

                  {enAttente.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
                  ) : (
                    <div className="space-y-3">
                      {enAttente.map((m) => (
                        <div
                          key={m.id}
                          className="flex flex-col gap-3 rounded-md border border-border/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {m.prenom || ""} {m.nom || ""}
                              {!m.prenom && !m.nom && (
                                <span className="text-muted-foreground italic">Sans nom</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{m.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Demande le{" "}
                              {new Date(m.created_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprouver(m.id)}
                              disabled={processing === m.id}
                              className="gap-1"
                            >
                              <CheckCircle size={14} />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRefuser(m.id)}
                              disabled={processing === m.id}
                              className="gap-1 text-destructive hover:text-destructive"
                            >
                              <XCircle size={14} />
                              Refuser
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Membres actifs */}
                <div className="rounded-lg border border-border/50 bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={18} className="text-primary" />
                    <h2 className="font-serif font-bold">Membres actifs ({actifs.length})</h2>
                  </div>
                  {actifs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun membre actif.</p>
                  ) : (
                    <div className="space-y-2">
                      {actifs.map((m) => {
                        const membreInscriptions = inscriptions[m.id] || [];
                        const isExpanded = expandedMembre === m.id;
                        return (
                          <div key={m.id} className="rounded-md border border-border/30 text-sm">
                            <button
                              onClick={() => setExpandedMembre(isExpanded ? null : m.id)}
                              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-secondary/50 rounded-md transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="font-medium truncate">
                                  {m.prenom || ""} {m.nom || ""}
                                  {!m.prenom && !m.nom && (
                                    <span className="text-muted-foreground italic">Sans nom</span>
                                  )}
                                </span>
                                <span className="text-muted-foreground truncate hidden sm:block">{m.email}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {membreInscriptions.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {membreInscriptions.length} inscription{membreInscriptions.length > 1 ? "s" : ""}
                                  </span>
                                )}
                                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                  <Shield size={10} />
                                  {m.role === "admin" ? "Admin" : "Membre"}
                                </span>
                                <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-border/30 px-4 py-3 space-y-3 bg-secondary/20 rounded-b-md">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                  <span className="text-muted-foreground">Email</span>
                                  <span>{m.email}</span>
                                  {m.adresse && (<><span className="text-muted-foreground">Adresse</span><span>{m.adresse}</span></>)}
                                  {m.telephone && (<><span className="text-muted-foreground">Téléphone</span><span>{m.telephone}</span></>)}
                                  <span className="text-muted-foreground">Membre depuis</span>
                                  <span>{new Date(m.created_at).toLocaleDateString("fr-FR")}</span>
                                </div>

                                {m.id !== user?.id && (
                                  <div className="flex justify-end">
                                    {m.role === "admin" ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleChangerRole(m.id, "membre")}
                                        disabled={processing === m.id}
                                        className="gap-1 text-xs text-destructive hover:text-destructive"
                                      >
                                        <Shield size={12} />
                                        Retirer les droits admin
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setConfirmAdmin(m)}
                                        disabled={processing === m.id}
                                        className="gap-1 text-xs text-primary hover:text-primary"
                                      >
                                        <Shield size={12} />
                                        Promouvoir en admin
                                      </Button>
                                    )}
                                  </div>
                                )}

                                {membreInscriptions.length > 0 ? (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Inscriptions</p>
                                    <div className="space-y-1.5">
                                      {membreInscriptions.map((insc) => (
                                        <div key={insc.id} className="flex items-center justify-between rounded border border-border/30 bg-background px-3 py-2 text-xs">
                                          <div>
                                            <span className="font-medium">{insc.disciplines}</span>
                                            <span className="ml-2 text-muted-foreground">— {insc.saison}</span>
                                          </div>
                                          <span className={`rounded-full px-2 py-0.5 text-xs ${insc.statut === "validee" ? "bg-green-500/10 text-green-600" : insc.statut === "refusee" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                                            {insc.statut === "validee" ? "Validée" : insc.statut === "refusee" ? "Refusée" : "En attente"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">Aucune inscription en ligne.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Refusés */}
                {refuses.length > 0 && (
                  <div className="rounded-lg border border-border/50 bg-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <XCircle size={18} className="text-muted-foreground" />
                      <h2 className="font-serif font-bold text-muted-foreground">
                        Refusés ({refuses.length})
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {refuses.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-md border border-border/30 px-4 py-3 text-sm opacity-60"
                        >
                          <div>
                            <span className="font-medium">
                              {m.prenom || ""} {m.nom || ""}
                              {!m.prenom && !m.nom && (
                                <span className="italic">Sans nom</span>
                              )}
                            </span>
                            <span className="ml-2 text-muted-foreground">{m.email}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprouver(m.id)}
                            disabled={processing === m.id}
                            className="gap-1 text-xs"
                          >
                            <CheckCircle size={12} />
                            Réactiver
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
              Vous allez donner les droits administrateur à{" "}
              <strong>{confirmAdmin?.prenom} {confirmAdmin?.nom}</strong> ({confirmAdmin?.email}).
              <br /><br />
              Cette personne pourra gérer les membres et accéder à toutes les fonctions d'administration du site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAdmin) handleChangerRole(confirmAdmin.id, "admin");
                setConfirmAdmin(null);
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default AdminMembres;
