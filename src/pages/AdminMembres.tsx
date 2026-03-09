import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Users, Clock, CheckCircle, XCircle, Shield } from "lucide-react";

interface Membre {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  role: string;
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
    const { data, error } = await supabase
      .from("profils")
      .select("id, email, prenom, nom, role, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setMembres(data);
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
            <h1 className="mb-10 text-center font-serif text-4xl font-black md:text-5xl">
              <span className="text-primary">Gestion</span> des membres
            </h1>

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
                      {actifs.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-md border border-border/30 px-4 py-3 text-sm"
                        >
                          <div>
                            <span className="font-medium">
                              {m.prenom || ""} {m.nom || ""}
                              {!m.prenom && !m.nom && (
                                <span className="text-muted-foreground italic">Sans nom</span>
                              )}
                            </span>
                            <span className="ml-2 text-muted-foreground">{m.email}</span>
                          </div>
                          <span
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              m.role === "admin"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Shield size={10} />
                            {m.role === "admin" ? "Admin" : "Membre"}
                          </span>
                        </div>
                      ))}
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
    </Layout>
  );
};

export default AdminMembres;
