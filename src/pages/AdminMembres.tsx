import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Shield, Download, ChevronDown,
  UserX, ClipboardList, Link2, Plus, FileText, Trash2, Search, Pencil, Upload, ExternalLink,
} from "lucide-react";
import { sendBrevoEmail, TEMPLATES } from "@/lib/brevo";
import { client } from "@/sanityClient";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PrintableInscription, type RecapData } from "@/components/PrintableInscription";

interface Membre {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  adresse: string | null;
  telephone: string | null;
  role: string;
  disciplines: string | null;
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
  source: string | null;
  type_inscription: string | null;
  pass_sport: boolean;
  moyen_paiement: string | null;
  parent1_nom: string | null;
  parent1_prenom: string | null;
  parent1_email: string | null;
  parent1_tel: string | null;
  parent2_nom: string | null;
  parent2_prenom: string | null;
  parent2_email: string | null;
  parent2_tel: string | null;
  document_scan_url: string | null;
}

type Ligne =
  | { type: "profil"; profil: Membre; inscriptions: Inscription[] }
  | { type: "inscription_seule"; inscription: Inscription };

type ActiveTab = "tous" | "en_attente" | "actifs" | "sans_compte";

interface ConnexionLog {
  id: string;
  user_id: string;
  email: string | null;
  prenom: string | null;
  created_at: string;
}

const inscriptionToRecapData = (insc: {
  nom: string | null; prenom: string | null; adresse: string | null; tel_mobile: string | null; email: string | null;
  date_naissance: string | null; groupe_sanguin: string | null; allergie: string | null; niveau: string | null;
  urgence_contact: string | null; disciplines: string | null; saison: string | null; type_inscription: string | null;
  pass_sport: boolean; moyen_paiement: string | null; droit_image: boolean; autorisation_parentale: boolean;
  parent1_nom: string | null; parent1_prenom: string | null; parent1_email: string | null; parent1_tel: string | null;
  parent2_nom: string | null; parent2_prenom: string | null; parent2_email: string | null; parent2_tel: string | null;
  created_at: string; source: string | null;
}): RecapData => ({
  nom: insc.nom || '',
  prenom: insc.prenom || '',
  adresse: insc.adresse || '',
  telMobile: insc.tel_mobile || '',
  email: insc.email || '',
  dateNaissance: insc.date_naissance || '',
  groupeSanguin: insc.groupe_sanguin || '',
  allergie: insc.allergie || '',
  niveau: insc.niveau || '',
  urgenceContact: insc.urgence_contact || '',
  disciplines: insc.disciplines || '',
  saison: insc.saison || '',
  typeInscription: (insc.type_inscription === 'mineur' ? 'mineur' : 'adulte'),
  passSport: insc.pass_sport || false,
  moyenPaiement: insc.moyen_paiement || '',
  droitImage: insc.droit_image || false,
  autorisationParentale: insc.autorisation_parentale || false,
  parent1: { nom: insc.parent1_nom || '', prenom: insc.parent1_prenom || '', email: insc.parent1_email || '', tel: insc.parent1_tel || '' },
  parent2: { nom: insc.parent2_nom || '', prenom: insc.parent2_prenom || '', email: insc.parent2_email || '', tel: insc.parent2_tel || '' },
  dateEnvoi: new Date(insc.created_at).toLocaleDateString('fr-FR'),
  source: insc.source,
});


const papierFormVariants = {
  enter: (dir: number) => ({ x: dir * 80, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
  exit: (dir: number) => ({ x: dir * -80, opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as [number, number, number, number] } }),
};

const roleBadge = (role: string) => {
  if (role === "admin")            return { label: "Admin",            cls: "bg-primary/10 text-primary" };
  if (role === "admin_discipline") return { label: "Admin discipline", cls: "bg-violet-500/10 text-violet-700" };
  if (role === "membre")           return { label: "Membre",           cls: "bg-green-500/10 text-green-700" };
  if (role === "tiers")            return { label: "Tiers (galerie)",  cls: "bg-sky-500/10 text-sky-700" };
  if (role === "refuse")           return { label: "Refusé",           cls: "bg-red-500/10 text-red-600" };
  if (role === "en_attente")       return { label: "En attente",       cls: "bg-amber-500/10 text-amber-700" };
  return                                  { label: "—",                cls: "bg-muted text-muted-foreground" };
};

const inscBadge = (statut: string | null) => {
  if (statut === "validee")   return { label: "Validée",    cls: "bg-green-500/10 text-green-700" };
  if (statut === "refusee")   return { label: "Refusée",    cls: "bg-red-500/10 text-red-600" };
  if (statut === "supprimee") return { label: "Supprimée",  cls: "bg-muted text-muted-foreground line-through" };
  return                             { label: "En attente", cls: "bg-amber-500/10 text-amber-700" };
};

const PAIEMENT_LABELS: Record<string, string> = {
  cheque_1x: "Chèque 1 fois",
  cheque_4x: "Chèque 4 fois",
  especes: "Espèces",
  virement: "Virement",
};


const calcAge = (dateNaissance: string | null): number | null => {
  if (!dateNaissance) return null;
  const birth = new Date(dateNaissance);
  const today = new Date();
  return today.getFullYear() - birth.getFullYear()
    - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
};

const ageBadgeCls = (dateNaissance: string | null) => {
  const age = calcAge(dateNaissance);
  if (age === null) return "bg-secondary text-muted-foreground";
  return age < 18 ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700";
};

const getInitials = (prenom: string | null, nom: string | null) =>
  [(prenom || "").charAt(0), (nom || "").charAt(0)].filter(Boolean).join("").toUpperCase() || "?";

const avatarBg = (str: string) => {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-orange-100 text-orange-700",
    "bg-rose-100 text-rose-700",
    "bg-teal-100 text-teal-700",
    "bg-amber-100 text-amber-700",
  ];
  const code = (str.charCodeAt(0) || 0) + (str.charCodeAt(1) || 0);
  return colors[code % colors.length];
};

const AdminMembres = () => {
  const { user, role: currentUserRole, disciplines: currentUserDisciplines } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [confirmAdmin, setConfirmAdmin] = useState<Membre | null>(null);
  const [linkingProfilId, setLinkingProfilId] = useState<string | null>(null);
  const [linkingInscId, setLinkingInscId] = useState<string>("");
  const [confirmSupprimer, setConfirmSupprimer] = useState<Inscription | null>(null);
  const [disciplinesSanity, setDisciplinesSanity] = useState<{ _id: string; nom: string; nomCourt?: string }[]>([]);
  const [accesGalerieData, setAccesGalerieData] = useState<{ id: string; compte_id: string; discipline_sanity_id: string; actif: boolean; source: string }[]>([]);
  const [enfantsData, setEnfantsData] = useState<{ id: string; nom: string; prenom: string; date_naissance: string | null; groupe_sanguin: string | null; allergie: string | null }[]>([]);
  const [liensData, setLiensData] = useState<{ id: string; compte_id: string; enfant_id: string; type_acces: string; enfant?: { id: string; nom: string; prenom: string; date_naissance: string | null } }[]>([]);
  const [connexionsLog, setConnexionsLog] = useState<ConnexionLog[]>([]);
  const [modalTab, setModalTab] = useState("adhesions");
  const [adminSection, setAdminSection] = useState<"membres" | "familles" | "galeries" | "tiers">("membres");
  const [expandedInscIds, setExpandedInscIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ActiveTab>("tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("");
  const [linkingInscToProfilMode, setLinkingInscToProfilMode] = useState(false);
  const [linkingInscToProfilId, setLinkingInscToProfilId] = useState("");
  const [adminRecapInsc, setAdminRecapInsc] = useState<Inscription | null>(null);
  const adminRecapRef = useRef<HTMLDivElement>(null);
  const dataLoadedRef = useRef(false);
  const preventRedirectRef = useRef(false);

  useEffect(() => {
    if (!adminRecapInsc || !adminRecapRef.current) return;
    const el = adminRecapRef.current;
    import("html2canvas").then(({ default: html2canvas }) => {
      html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false, width: el.scrollWidth, height: el.scrollHeight, windowWidth: el.scrollWidth, windowHeight: el.scrollHeight }).then(canvas => {
        const link = document.createElement("a");
        link.download = `inscription-amsp-${adminRecapInsc.nom ?? "recap"}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setAdminRecapInsc(null);
      });
    });
  }, [adminRecapInsc]);
  const isSuperAdmin = currentUserRole === "admin";
  const [confirmAdminDiscipline, setConfirmAdminDiscipline] = useState<Membre | null>(null);
  const [confirmAdminDisciplineDiscs, setConfirmAdminDisciplineDiscs] = useState<string[]>([]);

  const disciplineMatch = (inscDiscs: string | null, adminDiscs: string | null): boolean => {
    if (!adminDiscs) return false;
    const admin = adminDiscs.split(",").map(s => s.trim()).filter(Boolean);
    const insc = (inscDiscs || "").split(",").map(s => s.trim()).filter(Boolean);
    return insc.some(d => admin.includes(d));
  };

  const resolveDiscNoms = (ids: string | null): string[] => {
    if (!ids) return [];
    return ids.split(",").map(s => s.trim()).filter(Boolean)
      .map(id => disciplinesSanity.find(d => d._id === id)?.nom ?? id);
  };

  const defaultSaison = (() => {
    const y = new Date().getFullYear();
    const m = new Date().getMonth() + 1;
    return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  })();
  const [showPapierModal, setShowPapierModal] = useState(false);
  const [editingInscId, setEditingInscId] = useState<string | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [savingPapier, setSavingPapier] = useState(false);
  const papierDirRef = useRef(1);
  const [papierForm, setPapierForm] = useState({
    nom: "", prenom: "", adresse: "", telMobile: "", email: "",
    dateNaissance: "", groupeSanguin: "", allergie: "", niveau: "",
    urgencePrenom: "", urgenceNom: "", urgenceTel: "", disciplines: "", saison: defaultSaison,
    autorisationParentale: false, droitImage: false, passSport: false,
    moyenPaiement: "",
    typeInscription: "adulte" as "adulte" | "mineur",
    parent1Nom: "", parent1Prenom: "", parent1Email: "", parent1Tel: "",
    parent2Nom: "", parent2Prenom: "", parent2Email: "", parent2Tel: "",
  });

  const loadData = async () => {
    setLoading(true);
    const [{ data: profilsData }, { data: inscData }, { data: accesData }, { data: enfantsRes }, { data: liensRes }, { data: logsRes }] = await Promise.all([
      supabase.from("profils").select("id, email, prenom, nom, adresse, telephone, role, disciplines, created_at").order("created_at", { ascending: false }),
      supabase.from("inscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("acces_galerie").select("id, compte_id, discipline_sanity_id, actif, source"),
      supabase.from("enfants").select("id, nom, prenom, date_naissance, groupe_sanguin, allergie"),
      supabase.from("liens_compte_enfant").select("id, compte_id, enfant_id, type_acces, enfant:enfants(id, nom, prenom, date_naissance)"),
      supabase.from("connexions_log").select("id, user_id, email, prenom, created_at").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (profilsData) setMembres(profilsData);
    if (inscData) setInscriptions(inscData);
    if (accesData) setAccesGalerieData(accesData);
    if (enfantsRes) setEnfantsData(enfantsRes);
    if (liensRes) {
      setLiensData(liensRes.map((l) => ({ ...l, enfant: Array.isArray(l.enfant) ? l.enfant[0] : l.enfant })));
    }
    if (logsRes) setConnexionsLog(logsRes);
    setLoading(false);
  };

  useEffect(() => {
    client.fetch(`*[_type == "discipline"] | order(ordre asc) { _id, nom, nomCourt }`)
      .then((data: { _id: string; nom: string; nomCourt?: string }[]) => setDisciplinesSanity(data));
  }, []);

  useEffect(() => {
    if (!user) { navigate("/connexion"); return; }
    if (preventRedirectRef.current) return;
    supabase.from("profils").select("role").eq("id", user.id).single().then(({ data }) => {
      if (preventRedirectRef.current) return;
      if (data?.role !== "admin" && data?.role !== "admin_discipline") { navigate("/"); return; }
      setIsAdmin(true);
      setCheckingRole(false);
      if (!dataLoadedRef.current) {
        dataLoadedRef.current = true;
        loadData();
      }
    });
  }, [user, navigate]);

  const openPapierEdit = (insc: Inscription) => {
    const urgenceParts = (insc.urgence_contact || "").split(" — ");
    const urgenceTel = urgenceParts.length > 1 ? urgenceParts[urgenceParts.length - 1] : "";
    const urgenceNameParts = (urgenceParts.length > 1 ? urgenceParts.slice(0, -1).join(" — ") : insc.urgence_contact || "").split(" ");
    setEditingInscId(insc.id);
    setScanFile(null);
    setPapierForm({
      nom: insc.nom || "",
      prenom: insc.prenom || "",
      adresse: insc.adresse || "",
      telMobile: insc.tel_mobile || "",
      email: insc.email || "",
      dateNaissance: insc.date_naissance || "",
      groupeSanguin: insc.groupe_sanguin || "",
      allergie: insc.allergie || "",
      niveau: insc.niveau || "",
      urgencePrenom: urgenceNameParts[0] || "",
      urgenceNom: urgenceNameParts.slice(1).join(" "),
      urgenceTel,
      disciplines: insc.disciplines || "",
      saison: insc.saison || defaultSaison,
      autorisationParentale: insc.autorisation_parentale || false,
      droitImage: insc.droit_image || false,
      passSport: insc.pass_sport || false,
      moyenPaiement: insc.moyen_paiement || "",
      typeInscription: (insc.type_inscription as "adulte" | "mineur") || "adulte",
      parent1Nom: insc.parent1_nom || "",
      parent1Prenom: insc.parent1_prenom || "",
      parent1Email: insc.parent1_email || "",
      parent1Tel: insc.parent1_tel || "",
      parent2Nom: insc.parent2_nom || "",
      parent2Prenom: insc.parent2_prenom || "",
      parent2Email: insc.parent2_email || "",
      parent2Tel: insc.parent2_tel || "",
    });
    setShowPapierModal(true);
  };

  const handleSaisirPapier = async () => {
    if (!papierForm.nom.trim() || !papierForm.prenom.trim()) {
      toast.error("Le nom et le prénom sont obligatoires.");
      return;
    }
    if (!papierForm.disciplines.trim()) {
      toast.error("Veuillez indiquer au moins une discipline.");
      return;
    }
    if (!papierForm.moyenPaiement) {
      toast.error("Veuillez sélectionner un moyen de paiement.");
      return;
    }
    if (!papierForm.dateNaissance) {
      toast.error("La date de naissance est obligatoire.");
      return;
    }
    if (!papierForm.urgenceTel.trim() && !papierForm.urgenceNom.trim() && !papierForm.urgencePrenom.trim()) {
      toast.error("La personne à contacter en cas d'urgence est obligatoire.");
      return;
    }
    if (papierForm.typeInscription === "mineur" && (!papierForm.parent1Nom.trim() || !papierForm.parent1Prenom.trim())) {
      toast.error("Le nom et le prénom du parent / tuteur 1 sont obligatoires.");
      return;
    }
    if (papierForm.typeInscription === "mineur" && !papierForm.autorisationParentale) {
      toast.error("L'autorisation parentale est obligatoire pour un mineur.");
      return;
    }
    setSavingPapier(true);
    const urgenceNomComplet = [papierForm.urgencePrenom, papierForm.urgenceNom].filter(Boolean).join(" ");
    const urgenceContact = [urgenceNomComplet, papierForm.urgenceTel].filter(Boolean).join(" — ");
    const inscData = {
      nom: papierForm.nom.trim(),
      prenom: papierForm.prenom.trim(),
      adresse: papierForm.adresse.trim() || null,
      date_naissance: papierForm.dateNaissance || null,
      groupe_sanguin: papierForm.groupeSanguin.trim() || null,
      allergie: papierForm.allergie.trim() || null,
      tel_mobile: papierForm.typeInscription === "mineur" ? '' : papierForm.telMobile.trim() || null,
      email: papierForm.typeInscription === "mineur" ? '' : papierForm.email.trim() || null,
      urgence_contact: urgenceContact || null,
      disciplines: papierForm.disciplines.trim(),
      niveau: papierForm.niveau.trim() || null,
      autorisation_parentale: papierForm.autorisationParentale,
      droit_image: papierForm.droitImage,
      pass_sport: papierForm.passSport,
      moyen_paiement: papierForm.moyenPaiement || null,
      saison: papierForm.saison.trim() || null,
      type_inscription: papierForm.typeInscription,
      parent1_nom: papierForm.typeInscription === "mineur" ? papierForm.parent1Nom.trim() || null : null,
      parent1_prenom: papierForm.typeInscription === "mineur" ? papierForm.parent1Prenom.trim() || null : null,
      parent1_email: papierForm.typeInscription === "mineur" ? papierForm.parent1Email.trim() || null : null,
      parent1_tel: papierForm.typeInscription === "mineur" ? papierForm.parent1Tel.trim() || null : null,
      parent2_nom: papierForm.typeInscription === "mineur" && papierForm.parent2Nom.trim() ? papierForm.parent2Nom.trim() : null,
      parent2_prenom: papierForm.typeInscription === "mineur" && papierForm.parent2Prenom.trim() ? papierForm.parent2Prenom.trim() : null,
      parent2_email: papierForm.typeInscription === "mineur" && papierForm.parent2Email.trim() ? papierForm.parent2Email.trim() : null,
      parent2_tel: papierForm.typeInscription === "mineur" && papierForm.parent2Tel.trim() ? papierForm.parent2Tel.trim() : null,
    };

    let savedId: string | null = editingInscId;
    let saveError: string | null = null;

    if (editingInscId) {
      const { error } = await supabase.from("inscriptions").update(inscData).eq("id", editingInscId);
      if (error) saveError = error.message;
    } else {
      const { data: inserted, error } = await supabase.from("inscriptions").insert({
        ...inscData, statut: "en_attente", source: "papier", user_id: null,
      }).select("id").single();
      if (error) saveError = error.message;
      else savedId = inserted?.id ?? null;
    }

    if (saveError) {
      toast.error("Erreur : " + saveError);
    } else {
      if (scanFile && savedId) {
        const ext = scanFile.name.split(".").pop();
        const path = `${savedId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("inscriptions-scans").upload(path, scanFile, { upsert: true });
        if (uploadError) {
          toast.warning("Inscription enregistrée, mais l'upload du scan a échoué : " + uploadError.message);
        } else {
          const { data: { publicUrl } } = supabase.storage.from("inscriptions-scans").getPublicUrl(path);
          await supabase.from("inscriptions").update({ document_scan_url: publicUrl }).eq("id", savedId);
        }
      }
      toast.success(editingInscId ? "Inscription modifiée." : "Inscription papier enregistrée.");
      setShowPapierModal(false);
      setEditingInscId(null);
      setScanFile(null);
      setPapierForm({
        nom: "", prenom: "", adresse: "", telMobile: "", email: "",
        dateNaissance: "", groupeSanguin: "", allergie: "", niveau: "",
        urgencePrenom: "", urgenceNom: "", urgenceTel: "", disciplines: "", saison: defaultSaison,
        autorisationParentale: false, droitImage: false, passSport: false,
        moyenPaiement: "",
        typeInscription: "adulte",
        parent1Nom: "", parent1Prenom: "", parent1Email: "", parent1Tel: "",
        parent2Nom: "", parent2Prenom: "", parent2Email: "", parent2Tel: "",
      });
      await loadData();
    }
    setSavingPapier(false);
  };


  const handleToggleProfilDiscipline = async (profilId: string, disc: string, _currentDiscs: string | null, checked: boolean) => {
    const existing = accesGalerieData.find(a => a.compte_id === profilId && a.discipline_sanity_id === disc);
    if (checked) {
      if (existing) {
        // Mise à jour optimiste
        setAccesGalerieData(prev => prev.map(a => a.id === existing.id ? { ...a, actif: true, source: "admin_manuel" } : a));
        const { error } = await supabase.from("acces_galerie").update({ actif: true, source: "admin_manuel" }).eq("id", existing.id);
        if (error) {
          setAccesGalerieData(prev => prev.map(a => a.id === existing.id ? { ...a, actif: false } : a));
          toast.error("Erreur activation galerie : " + error.message);
        }
      } else {
        const tempId = `tmp-${profilId}-${disc}`;
        setAccesGalerieData(prev => [...prev, { id: tempId, compte_id: profilId, discipline_sanity_id: disc, actif: true, source: "admin_manuel" }]);
        const { data, error } = await supabase.from("acces_galerie").insert({ compte_id: profilId, discipline_sanity_id: disc, actif: true, source: "admin_manuel" }).select().single();
        if (error) {
          setAccesGalerieData(prev => prev.filter(a => a.id !== tempId));
          toast.error("Erreur activation galerie : " + error.message);
        } else if (data) {
          setAccesGalerieData(prev => prev.map(a => a.id === tempId ? data : a));
        }
      }
    } else {
      if (existing) {
        setAccesGalerieData(prev => prev.map(a => a.id === existing.id ? { ...a, actif: false } : a));
        const { error } = await supabase.from("acces_galerie").update({ actif: false }).eq("id", existing.id);
        if (error) {
          setAccesGalerieData(prev => prev.map(a => a.id === existing.id ? { ...a, actif: true } : a));
          toast.error("Erreur désactivation galerie : " + error.message);
        }
      }
    }
  };

  const handleToggleInscDiscipline = async (inscId: string, disc: string, currentDiscs: string | null, checked: boolean) => {
    const current = (currentDiscs || "").split(",").map(s => s.trim()).filter(Boolean);
    const updated = checked ? [...new Set([...current, disc])] : current.filter(d => d !== disc);
    const newValue = updated.join(",") || null;
    setInscriptions((prev) => prev.map((i) => i.id === inscId ? { ...i, disciplines: newValue } : i));
    const { error } = await supabase.from("inscriptions").update({ disciplines: newValue }).eq("id", inscId);
    if (error) {
      setInscriptions((prev) => prev.map((i) => i.id === inscId ? { ...i, disciplines: currentDiscs } : i));
      toast.error("Erreur : " + error.message);
    }
  };

  const handleLierInscription = async (inscId: string, profilId: string, inscDisciplines: string | null) => {
    const { error } = await supabase.from("inscriptions").update({ user_id: profilId }).eq("id", inscId);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setInscriptions((prev) => prev.map((i) => i.id === inscId ? { ...i, user_id: profilId } : i));
    // Créer des suggestions d'accès galerie (admin devra les valider)
    if (inscDisciplines) {
      const discIds = inscDisciplines.split(",").map(s => s.trim()).filter(Boolean);
      for (const discId of discIds) {
        const { data } = await supabase.from("acces_galerie").upsert({ compte_id: profilId, discipline_sanity_id: discId, actif: false, source: "suggestion_auto" }, { onConflict: "compte_id,discipline_sanity_id", ignoreDuplicates: true }).select().single();
        if (data) setAccesGalerieData(prev => prev.some(a => a.id === data.id) ? prev : [...prev, data]);
      }
    }
    toast.success("Inscription liée au compte.");
  };

  const handleApprouverCompte = async (id: string) => {
    setProcessing(id);
    const { error } = await supabase.from("profils").update({ role: "membre" }).eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Compte approuvé.");
      setMembres((prev) => prev.map((m) => m.id === id ? { ...m, role: "membre" } : m));
      const profil = membres.find((m) => m.id === id);
      const linkedInsc = inscriptions.filter((i) =>
        i.user_id === id ||
        (!i.user_id && i.email && profil?.email && i.email.toLowerCase() === profil.email.toLowerCase())
      );
      // Créer des suggestions d'accès galerie pour les disciplines inscrites
      const allDiscIds = [...new Set(
        linkedInsc.flatMap(i => (i.disciplines || "").split(",").map(s => s.trim()).filter(Boolean))
      )];
      for (const discId of allDiscIds) {
        const { data } = await supabase.from("acces_galerie").upsert({ compte_id: id, discipline_sanity_id: discId, actif: false, source: "suggestion_auto" }, { onConflict: "compte_id,discipline_sanity_id", ignoreDuplicates: true }).select().single();
        if (data) setAccesGalerieData(prev => prev.some(a => a.id === data.id) ? prev : [...prev, data]);
      }
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

  const handleChangerRole = async (id: string, nouveauRole: "admin" | "admin_discipline" | "membre") => {
    setProcessing(id);
    const { error } = await supabase.from("profils").update({ role: nouveauRole }).eq("id", id);
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success(
        nouveauRole === "admin" ? "Membre promu administrateur." :
        nouveauRole === "admin_discipline" ? "Membre promu administrateur de discipline." :
        "Droits admin retirés."
      );
      setMembres((prev) => prev.map((m) => m.id === id ? { ...m, role: nouveauRole } : m));
    }
    setProcessing(null);
  };

  const handlePromouvoirAdminDiscipline = async () => {
    if (!confirmAdminDiscipline) return;
    setProcessing(confirmAdminDiscipline.id);
    const discsStr = confirmAdminDisciplineDiscs.join(",");
    const { error } = await supabase.from("profils")
      .update({ role: "admin_discipline", disciplines: discsStr || null })
      .eq("id", confirmAdminDiscipline.id);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Membre promu administrateur de discipline.");
      setMembres(prev => prev.map(m =>
        m.id === confirmAdminDiscipline.id ? { ...m, role: "admin_discipline", disciplines: discsStr || null } : m
      ));
    }
    setProcessing(null);
    setConfirmAdminDiscipline(null);
    setConfirmAdminDisciplineDiscs([]);
  };

  const handleCreerCompteDepuisInscription = async (insc: Inscription): Promise<Membre | null> => {
    if (!insc.email) return null;

    // Sauvegarder la session admin — signUp() connecte automatiquement le nouvel utilisateur
    preventRedirectRef.current = true;
    const { data: { session: adminSession } } = await supabase.auth.getSession();

    const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map(b => b.toString(36)).join('').slice(0, 20);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: insc.email,
      password: tempPassword,
    });

    if (signUpError || !signUpData.user) {
      if (adminSession) await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
      preventRedirectRef.current = false;
      toast.warning(signUpError ? `Impossible de créer le compte : ${signUpError.message}` : "Impossible de créer le compte (email déjà utilisé ?).");
      return null;
    }

    const newUserId = signUpData.user.id;

    // Upsert (pas insert) : un trigger Supabase crée peut-être déjà une ligne en_attente
    await supabase.from("profils").upsert({
      id: newUserId,
      email: insc.email,
      nom: insc.nom,
      prenom: insc.prenom,
      adresse: insc.adresse,
      telephone: insc.tel_mobile,
      role: "membre",
    }, { onConflict: "id" });

    // Restaurer la session admin avant les opérations suivantes
    if (adminSession) await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
    preventRedirectRef.current = false;

    await supabase.from("inscriptions").update({ user_id: newUserId }).eq("id", insc.id);
    await supabase.auth.resetPasswordForEmail(insc.email, {
      redirectTo: `${window.location.origin}/amsp-website/reinitialisation-mot-de-passe`,
    });

    const newMembre: Membre = {
      id: newUserId,
      email: insc.email,
      prenom: insc.prenom,
      nom: insc.nom,
      adresse: insc.adresse,
      telephone: insc.tel_mobile,
      role: "membre",
      disciplines: null,
      created_at: new Date().toISOString(),
    };
    setMembres(prev => [...prev, newMembre]);
    setInscriptions(prev => prev.map(i => i.id === insc.id ? { ...i, user_id: newUserId } : i));
    return newMembre;
  };

  const handleRenvoyerInvitation = async (email: string) => {
    setProcessing(`invitation-${email}`);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/amsp-website/reinitialisation-mot-de-passe`,
    });
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Email d'invitation renvoyé.");
    }
    setProcessing(null);
  };

  const handleValiderInscription = async (id: string) => {
    setProcessing(`insc-${id}`);
    const { error } = await supabase.from("inscriptions").update({ statut: "validee" }).eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
      setProcessing(null);
      return;
    }

    const insc = inscriptions.find((i) => i.id === id);
    let matchedProfil = insc ? membres.find((m) =>
      m.id === insc.user_id ||
      (!insc.user_id && insc.email && insc.email.toLowerCase() === m.email.toLowerCase())
    ) : null;

    let accountCreated = false;
    if (!matchedProfil && insc?.email) {
      const newMembre = await handleCreerCompteDepuisInscription(insc);
      if (newMembre) { matchedProfil = newMembre; accountCreated = true; }
    } else if (matchedProfil && !insc?.user_id) {
      // Email match to existing profil — link the inscription
      await supabase.from("inscriptions").update({ user_id: matchedProfil.id }).eq("id", id);
    }

    setInscriptions(prev => prev.map(i => i.id === id
      ? { ...i, statut: "validee", user_id: matchedProfil ? matchedProfil.id : i.user_id }
      : i
    ));

    // Activer l'accès galerie pour les disciplines de l'inscription validée
    if (matchedProfil && insc?.disciplines) {
      const discIds = insc.disciplines.split(",").map(s => s.trim()).filter(Boolean);
      for (const discId of discIds) {
        const { data, error: upsertErr } = await supabase.from("acces_galerie").upsert(
          { compte_id: matchedProfil.id, discipline_sanity_id: discId, actif: true, source: "suggestion_auto", inscription_id: id },
          { onConflict: "compte_id,discipline_sanity_id", ignoreDuplicates: false }
        ).select().single();
        if (upsertErr) {
          toast.warning("Inscription validée mais erreur galerie : " + upsertErr.message);
        } else if (data) {
          setAccesGalerieData(prev => {
            const exists = prev.some(a => a.id === data.id);
            return exists ? prev.map(a => a.id === data.id ? data : a) : [...prev, data];
          });
        }
      }
    }

    toast.success(accountCreated ? "Inscription validée — compte créé, email envoyé." : "Inscription validée.");

    const destEmail = insc?.email || insc?.parent1_email;
    if (destEmail) {
      try {
        await sendBrevoEmail(TEMPLATES.VALIDATION, { email: destEmail, name: [insc.prenom, insc.nom].filter(Boolean).join(" ") || destEmail }, {
          nom: insc.nom || "",
          prenom: insc.prenom || "",
          adresse: insc.adresse || "",
          tel_mobile: insc.tel_mobile || "",
          email: destEmail,
          date_naissance: insc.date_naissance || "",
          groupe_sanguin: insc.groupe_sanguin || "",
          allergie: insc.allergie || "Aucune",
          niveau: insc.niveau || "Non précisé",
          urgence_contact: insc.urgence_contact || "",
          disciplines: resolveDiscNoms(insc.disciplines).join(", "),
          autorisation_parentale: insc.autorisation_parentale ? "Oui" : "Non / Non concerné",
          droit_image: insc.droit_image ? "Oui" : "Non",
          saison: insc.saison || "",
        });
      } catch {
        toast.warning("Inscription validée, mais l'email de confirmation n'a pas pu être envoyé.");
      }
    }

    setProcessing(null);
  };

  const handleRefuserInscription = async (id: string) => {
    setProcessing(`insc-${id}`);
    const { error } = await supabase.from("inscriptions").update({ statut: "refusee" }).eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Inscription refusée.");
      setInscriptions((prev) => prev.map((i) => i.id === id ? { ...i, statut: "refusee" } : i));
      const insc = inscriptions.find((i) => i.id === id);
      if (insc?.email) {
        try {
          await sendBrevoEmail(TEMPLATES.REFUS, { email: insc.email, name: [insc.prenom, insc.nom].filter(Boolean).join(" ") || insc.email }, {
            prenom: insc.prenom || "",
            nom: insc.nom || "",
            disciplines: resolveDiscNoms(insc.disciplines).join(", "),
            saison: insc.saison || "",
          });
        } catch {
          // Non-bloquant
        }
      }
    }
    setProcessing(null);
  };

  const handleSupprimerInscription = async (id: string) => {
    setProcessing(`insc-${id}`);
    const { error } = await supabase.from("inscriptions").update({ statut: "supprimee" }).eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Inscription supprimée.");
      setInscriptions((prev) => prev.map((i) => i.id === id ? { ...i, statut: "supprimee" } : i));
    }
    setProcessing(null);
    setConfirmSupprimer(null);
  };

  const handleExportCSV = async () => {
    try {
    const { data: rawData, error } = await supabase.from('inscriptions').select('*').order('created_at', { ascending: false });
    if (error || !rawData) { toast.error("Erreur lors de l'export."); return; }
    const data = isSuperAdmin ? rawData : rawData.filter(i => disciplineMatch(i.disciplines, currentUserDisciplines));

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AMSP';
    const sheet = workbook.addWorksheet('Inscriptions AMSP', { views: [{ state: 'frozen', ySplit: 4 }] });

    const BLEU = 'FF1a3c5e';
    const ROUGE = 'FFe63946';
    const BLANC = 'FFFFFFFF';
    const GRIS_CLAIR = 'FFf6f8fa';
    const VERT_BG = 'FFe8f5e9';
    const VERT_FG = 'FF2d6a4f';
    const ROUGE_BG = 'FFfce4e4';
    const ROUGE_FG = 'FFb91c1c';
    const AMBRE_BG = 'FFfff8e1';
    const AMBRE_FG = 'FF92400e';
    const GRIS_BG = 'FFf3f4f6';
    const GRIS_FG = 'FF6b7280';
    const NB_COLS = 25;

    sheet.mergeCells(1, 1, 1, NB_COLS);
    const titreCell = sheet.getCell(1, 1);
    titreCell.value = 'AMSP — Liste des inscriptions';
    titreCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: BLANC } };
    titreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLEU } };
    titreCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 30;

    sheet.mergeCells(2, 1, 2, NB_COLS);
    const sousTitreCell = sheet.getCell(2, 1);
    sousTitreCell.value = `Exporté le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — ${data.length} inscription(s)`;
    sousTitreCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: BLANC } };
    sousTitreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLEU } };
    sousTitreCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 18;

    sheet.addRow([]);

    const headers = [
      'Numéro', 'Nom', 'Prénom', 'Date naissance', 'Type',
      'Adresse', 'Téléphone', 'Email', 'Discipline(s)', 'Niveau',
      'Groupe sanguin', 'Allergie(s)', 'Urgence', 'Paiement', 'Pass Sport',
      'Droit image', 'Autorisation parentale', 'Parent 1', 'Parent 1 email', 'Parent 1 tél',
      'Parent 2', 'Saison', 'Statut', 'Source', 'Reçue le',
    ];
    const headerRow = sheet.addRow(headers);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BLANC } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROUGE } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { bottom: { style: 'thin', color: { argb: BLANC } } };
    });

    const statutColors: Record<string, { bg: string; fg: string }> = {
      validee: { bg: VERT_BG, fg: VERT_FG },
      refusee: { bg: ROUGE_BG, fg: ROUGE_FG },
      en_attente: { bg: AMBRE_BG, fg: AMBRE_FG },
      supprimee: { bg: GRIS_BG, fg: GRIS_FG },
    };

    data.forEach((i, idx) => {
      const isEven = idx % 2 === 0;
      const rowBg = isEven ? GRIS_CLAIR : BLANC;
      const statut = i.statut || 'en_attente';
      const row = sheet.addRow([
        idx + 1,
        i.nom || '',
        i.prenom || '',
        i.date_naissance ? new Date(i.date_naissance).toLocaleDateString('fr-FR') : '',
        i.type_inscription === 'mineur' ? 'Mineur' : 'Adulte',
        i.adresse || '',
        i.tel_mobile || '',
        i.email || '',
        resolveDiscNoms(i.disciplines).join(", ") || '',
        i.niveau || '',
        i.groupe_sanguin || '',
        i.allergie || '',
        i.urgence_contact || '',
        PAIEMENT_LABELS[i.moyen_paiement || ''] ?? (i.moyen_paiement || ''),
        i.pass_sport ? 'Oui' : '',
        i.droit_image ? 'Oui' : 'Non',
        i.autorisation_parentale ? 'Oui' : 'Non / NC',
        [i.parent1_prenom, i.parent1_nom].filter(Boolean).join(' ') || '',
        i.parent1_email || '',
        i.parent1_tel || '',
        [i.parent2_prenom, i.parent2_nom].filter(Boolean).join(' ') || '',
        i.saison || '',
        { validee: 'Validée', refusee: 'Refusée', en_attente: 'En attente', supprimee: 'Supprimée' }[statut] ?? statut,
        i.source === 'papier' ? 'Papier' : 'En ligne',
        new Date(i.created_at).toLocaleDateString('fr-FR'),
      ]);
      row.height = 18;
      const sc = statutColors[statut] || { bg: rowBg, fg: '00000000' };
      row.eachCell((cell, colNum) => {
        if (colNum === 23) {
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: sc.fg } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sc.bg } };
        } else {
          cell.font = { name: 'Calibri', size: 9 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        }
        cell.alignment = { vertical: 'middle', wrapText: false };
      });
    });

    //               N°   Nom  Prén  DdN  Type  Adr  Tel  Email  Disc  Niv  GS   Allerg  Urg  Paiem  PS   DI   AP   P1   P1mail P1tel P2   Sais  Stat  Src  Reçu
    const colWidths = [7,  16,  14,   13,  10,   30,  14,  28,   20,   12,  12,  18,     24,  14,    9,   9,   14,  22,  24,    13,   22,  12,   12,   9,   12];
    colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `AMSP_inscriptions_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.error("Erreur lors de l'export : " + (e instanceof Error ? e.message : String(e)));
    }
  };

  // --- Calcul des lignes ---
  const enAttenteCompte = membres.filter(m => m.role === "en_attente");
  const enAttenteInscription = inscriptions.filter(
    (i) => i.statut === "en_attente" && (isSuperAdmin || disciplineMatch(i.disciplines, currentUserDisciplines))
  );

  const matchInscToProfil = (i: Inscription, profil: Membre) => i.user_id === profil.id;

  const inscSuggereesEmail = (profil: Membre) =>
    inscriptions.filter(i =>
      !i.user_id &&
      i.source !== "papier" &&
      i.email &&
      i.email.toLowerCase() === profil.email.toLowerCase()
    );

  const matchInscToProfilFull = (i: Inscription, profil: Membre) => {
    const sameNom = (i.nom || "").trim().toLowerCase() === (profil.nom || "").trim().toLowerCase();
    const samePrenom = (i.prenom || "").trim().toLowerCase() === (profil.prenom || "").trim().toLowerCase();
    // user_id match : seulement si c'est la même personne (même nom+prénom)
    // → les inscriptions d'enfants/tiers liées au compte d'un parent restent en ligne séparée
    return (matchInscToProfil(i, profil) && sameNom && samePrenom) ||
      // Email-match uniquement pour les inscriptions non en_attente (sinon elles disparaissent du tableau)
      (!i.user_id && i.source !== "papier" && !!i.email && i.statut !== "en_attente" && i.email.toLowerCase() === profil.email.toLowerCase());
  };

  const lignes: Ligne[] = [];
  if (isSuperAdmin) {
    membres.forEach((profil) => {
      const profilInsc = inscriptions.filter((i) => matchInscToProfilFull(i, profil));
      lignes.push({ type: "profil", profil, inscriptions: profilInsc });
    });
  } else {
    const adminDiscs = (currentUserDisciplines || "").split(",").map(s => s.trim()).filter(Boolean);
    membres.forEach((profil) => {
      const profilDiscs = (profil.disciplines || "").split(",").map(s => s.trim()).filter(Boolean);
      const profilInsc = inscriptions.filter((i) => matchInscToProfilFull(i, profil) && disciplineMatch(i.disciplines, currentUserDisciplines));
      if (profilDiscs.some(d => adminDiscs.includes(d)) || profilInsc.length > 0) {
        lignes.push({ type: "profil", profil, inscriptions: profilInsc });
      }
    });
  }

  const linkedInscIds = new Set(
    membres.flatMap((profil) =>
      inscriptions.filter(i => matchInscToProfilFull(i, profil)).map(i => i.id)
    )
  );
  inscriptions.forEach((insc) => {
    if (!linkedInscIds.has(insc.id) && (isSuperAdmin || disciplineMatch(insc.disciplines, currentUserDisciplines))) {
      lignes.push({ type: "inscription_seule", inscription: insc });
    }
  });

  lignes.sort((a, b) => {
    const nomA = a.type === "profil" ? (a.profil.nom || a.inscriptions[0]?.nom || "") : (a.inscription.nom || "");
    const nomB = b.type === "profil" ? (b.profil.nom || b.inscriptions[0]?.nom || "") : (b.inscription.nom || "");
    const prenomA = (a.type === "profil" ? a.profil.prenom : a.inscription.prenom) || "";
    const prenomB = (b.type === "profil" ? b.profil.prenom : b.inscription.prenom) || "";
    const keyA = nomA || prenomA;
    const keyB = nomB || prenomB;
    const cmp = keyA.localeCompare(keyB, "fr", { sensitivity: "base" });
    return cmp !== 0 ? cmp : prenomA.localeCompare(prenomB, "fr", { sensitivity: "base" });
  });

  // --- Compteurs d'onglets ---
  const countEnAttente = lignes.filter(l =>
    (l.type === "profil" && (l.profil.role === "en_attente" || l.inscriptions.some(i => i.statut === "en_attente"))) ||
    (l.type === "inscription_seule" && l.inscription.statut === "en_attente")
  ).length;
  const countActifs = lignes.filter(l => l.type === "profil" && ["membre", "admin", "admin_discipline"].includes(l.profil.role)).length;
  const countSansCompte = lignes.filter(l => l.type === "inscription_seule").length;

  // --- Filtrage ---
  const lignesFiltrees = lignes.filter(ligne => {
    if (activeTab === "en_attente") {
      const isEnAttenteCompte = ligne.type === "profil" && ligne.profil.role === "en_attente";
      const hasInscEnAttente = ligne.type === "profil" && ligne.inscriptions.some(i => i.statut === "en_attente");
      const isInscEnAttente = ligne.type === "inscription_seule" && ligne.inscription.statut === "en_attente";
      if (!isEnAttenteCompte && !hasInscEnAttente && !isInscEnAttente) return false;
    }
    if (activeTab === "actifs") {
      if (ligne.type !== "profil") return false;
      if (!["membre", "admin", "admin_discipline"].includes(ligne.profil.role)) return false;
    }
    if (activeTab === "sans_compte") {
      if (ligne.type !== "inscription_seule") return false;
    }
    if (filterDiscipline) {
      if (ligne.type === "profil") {
        const profilIds = (ligne.profil.disciplines || "").split(",").map(s => s.trim()).filter(Boolean);
        const inscHas = ligne.inscriptions.some(i =>
          (i.disciplines || "").split(",").map(s => s.trim()).filter(Boolean).includes(filterDiscipline)
        );
        if (!profilIds.includes(filterDiscipline) && !inscHas) return false;
      } else {
        const inscIds = (ligne.inscription.disciplines || "").split(",").map(s => s.trim()).filter(Boolean);
        if (!inscIds.includes(filterDiscipline)) return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (ligne.type === "profil") {
        const mp = (ligne.profil.nom || "").toLowerCase().includes(q) ||
          (ligne.profil.prenom || "").toLowerCase().includes(q) ||
          ligne.profil.email.toLowerCase().includes(q);
        const mi = ligne.inscriptions.some(i =>
          (i.nom || "").toLowerCase().includes(q) ||
          (i.prenom || "").toLowerCase().includes(q) ||
          (i.email || "").toLowerCase().includes(q)
        );
        if (!mp && !mi) return false;
      } else {
        const i = ligne.inscription;
        if (!(i.nom || "").toLowerCase().includes(q) &&
            !(i.prenom || "").toLowerCase().includes(q) &&
            !(i.email || "").toLowerCase().includes(q)) return false;
      }
    }
    return true;
  });

  const selectedLigne = selectedKey
    ? lignes.find(l => (l.type === "profil" ? `p-${l.profil.id}` : `i-${l.inscription.id}`) === selectedKey) ?? null
    : null;

  const allDisciplinesForTable = useMemo(() => disciplinesSanity, [disciplinesSanity]);

  if (checkingRole) return (
    <Layout><section className="py-20"><p className="text-center text-muted-foreground">Vérification des droits…</p></section></Layout>
  );
  if (!isAdmin) return null;

  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

            {/* En-tête */}
            <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <h1 className="font-serif text-4xl font-black md:text-5xl">
                  <span className="text-primary">Gestion</span> des membres
                </h1>
                {!isSuperAdmin && currentUserDisciplines && (
                  <p className="mt-1 text-sm text-muted-foreground">Discipline(s) : {resolveDiscNoms(currentUserDisciplines).join(", ")}</p>
                )}
              </div>
              {!loading && adminSection === "membres" && (
                <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
                  <Button size="sm" onClick={() => setShowPapierModal(true)} className="gap-2 shrink-0">
                    <Plus size={14} /> Saisir inscription papier
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 shrink-0">
                    <Download size={14} /> Exporter
                  </Button>
                </div>
              )}
            </div>

            {/* Navigation sections */}
            {isSuperAdmin && (
              <div className="mb-8 flex flex-wrap gap-2 border-b border-border pb-3">
                {([
                  { id: "membres",  label: "Membres & inscriptions" },
                  { id: "familles", label: "Familles & enfants" },
                  { id: "galeries", label: "Accès galeries" },
                  { id: "tiers",    label: "Comptes tiers" },
                ] as { id: typeof adminSection; label: string }[]).map(s => (
                  <button
                    key={s.id}
                    onClick={() => setAdminSection(s.id)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      adminSection === s.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {loading && <p className="text-center text-muted-foreground">Chargement…</p>}

            {/* ====== SECTION MEMBRES ====== */}
            {!loading && adminSection === "membres" && (
              <div className="space-y-6">


                {/* Bloc En attente — Inscriptions */}
                {enAttenteInscription.length > 0 && (
                  <div className="rounded-lg border border-border/50 bg-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <ClipboardList size={16} className="text-primary" />
                      <h2 className="font-serif font-bold text-sm">
                        Inscriptions aux disciplines en attente
                        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{enAttenteInscription.length}</span>
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {enAttenteInscription.map((insc) => (
                        <div key={insc.id} className="flex flex-col gap-3 rounded-md border border-border/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{insc.nom || ""} {insc.prenom || ""}{!insc.prenom && !insc.nom && <span className="text-muted-foreground italic">Sans nom</span>}</p>
                              {insc.source === "papier" && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-700"><FileText size={9} /> Papier</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {insc.disciplines
                                ? insc.disciplines.split(",").map(id => disciplinesSanity.find(d => d._id === id.trim())?.nom ?? id.trim()).join(", ")
                                : "—"
                              } · {insc.saison || "—"} · reçue le {new Date(insc.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => openPapierEdit(insc)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-muted-foreground"><Pencil size={13} /> Modifier</Button>
                            <Button size="sm" onClick={() => handleValiderInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="gap-1"><CheckCircle size={13} /> Valider</Button>
                            <Button size="sm" variant="outline" onClick={() => handleRefuserInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-destructive hover:text-destructive"><XCircle size={13} /> Refuser</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tableau unifié — cartes */}
                <div className="rounded-lg border border-border/50 bg-card p-5">
                  <h2 className="font-serif font-bold mb-4">
                    {isSuperAdmin ? `Tous les inscrits & membres (${lignes.length})` : `Inscrits & membres — votre discipline (${lignes.length})`}
                  </h2>

                  {/* Barre recherche + filtre */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par nom, prénom, email…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-8 h-9 text-sm"
                        autoComplete="new-password"
                      />
                    </div>
                    {disciplinesSanity.length > 0 && (
                      <select
                        value={filterDiscipline}
                        onChange={e => setFilterDiscipline(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
                      >
                        <option value="">Toutes les disciplines</option>
                        {disciplinesSanity.map(d => <option key={d._id} value={d._id}>{d.nom}</option>)}
                      </select>
                    )}
                  </div>

                  {/* Onglets */}
                  <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ActiveTab)} className="mb-4">
                    <TabsList className="h-8 text-xs">
                      <TabsTrigger value="tous" className="text-xs px-3 h-7">Tous ({lignes.length})</TabsTrigger>
                      <TabsTrigger value="en_attente" className="text-xs px-3 h-7">
                        En attente {countEnAttente > 0 && <span className="ml-1.5 rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-0.5 leading-none">{countEnAttente}</span>}
                      </TabsTrigger>
                      <TabsTrigger value="actifs" className="text-xs px-3 h-7">Membres actifs ({countActifs})</TabsTrigger>
                      <TabsTrigger value="sans_compte" className="text-xs px-3 h-7">Sans compte ({countSansCompte})</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Tableau liste */}
                  {lignesFiltrees.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Aucun résultat.</p>
                  ) : (
                    <div className="overflow-x-auto -mx-5 px-5">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-border/60">
                            <th className="text-left pb-3 pr-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[200px]">Membre</th>
                            <th className="text-left pb-3 pr-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[140px]">Statut</th>
                            <th className="text-left pb-3 pr-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap w-24">Âge</th>
                            <th className="text-left pb-3 pr-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">Disciplines actives</th>
                            <th className="text-right pb-3 pl-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap w-36">Accès Web</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {lignesFiltrees.map((ligne, idx) => {
                            const key = ligne.type === "profil" ? `p-${ligne.profil.id}` : `i-${ligne.inscription.id}`;
                            const isEven = idx % 2 === 0;

                            if (ligne.type === "profil") {
                              const { profil, inscriptions: pInsc } = ligne;
                              const nom = profil.nom || pInsc[0]?.nom || "";
                              const prenom = profil.prenom || "";
                              const initials = getInitials(prenom, nom);
                              const roleBdg = roleBadge(profil.role);
                              const pendingCount = pInsc.filter(i => i.statut === "en_attente").length;
                              const profilDiscs = (profil.disciplines || "").split(",").map(s => s.trim()).filter(Boolean);
                              const dateNaissance = pInsc.find(i => i.date_naissance)?.date_naissance ?? null;

                              return (
                                <tr key={key} className={`group transition-colors hover:bg-primary/[0.03] cursor-pointer ${isEven ? "bg-transparent" : "bg-secondary/20"}`} onClick={() => { setModalTab("adhesions"); setSelectedKey(key); }}>
                                  <td className="py-3 pr-4">
                                    <div className="flex items-center gap-3">
                                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ageBadgeCls(dateNaissance)}`}>{idx + 1}</div>
                                      <div className="min-w-0">
                                        <p className="font-semibold text-sm leading-tight truncate max-w-[180px]">{[nom, prenom].filter(Boolean).join(" ") || <span className="italic text-muted-foreground font-normal text-xs">Sans nom</span>}</p>
                                        <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{profil.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 pr-4">
                                    <div className="flex flex-col gap-1">
                                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium w-fit ${roleBdg.cls}`}>{roleBdg.label}</span>
                                      {pendingCount > 0 && <span className="text-[10px] text-amber-600 font-medium">{pendingCount} inscription(s) en attente</span>}
                                    </div>
                                  </td>
                                  <td className="py-3 pr-4">
                                    {calcAge(dateNaissance) !== null
                                      ? <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium w-fit ${ageBadgeCls(dateNaissance)}`}>{calcAge(dateNaissance)! < 18 ? "Mineur" : "Adulte"}</span>
                                      : <span className="text-xs text-muted-foreground italic">—</span>}
                                  </td>
                                  <td className="py-3 pr-4">
                                    <div className="flex flex-wrap gap-1">
                                      {pInsc.filter(i => i.statut === "validee").length === 0
                                        ? <span className="text-xs text-muted-foreground italic">—</span>
                                        : [...new Set(pInsc.filter(i => i.statut === "validee").flatMap(i => (i.disciplines || "").split(",").map(s => s.trim()).filter(Boolean)))].map(id => (
                                          <span key={id} className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                            {disciplinesSanity.find(d => d._id === id)?.nomCourt || disciplinesSanity.find(d => d._id === id)?.nom || id}
                                          </span>
                                        ))
                                      }
                                    </div>
                                  </td>
                                  <td className="py-3 pl-4 text-right" onClick={e => e.stopPropagation()}>
                                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1.5 font-medium" onClick={() => { setModalTab("adhesions"); setSelectedKey(key); }}>
                                      <ChevronDown size={12} className="-rotate-90" /> Paramètres
                                    </Button>
                                  </td>
                                </tr>
                              );
                            }

                            // inscription_seule
                            const { inscription: insc } = ligne;
                            const nom = insc.nom || "";
                            const prenom = insc.prenom || "";
                            const initials = getInitials(prenom, nom);
                            const iBdg = inscBadge(insc.statut);

                            return (
                              <tr key={key} className={`group transition-colors hover:bg-primary/[0.03] cursor-pointer ${isEven ? "bg-transparent" : "bg-secondary/20"}`} onClick={() => { setModalTab("inscription"); setSelectedKey(key); }}>
                                <td className="py-3 pr-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ageBadgeCls(insc.date_naissance)}`}>{idx + 1}</div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-sm leading-tight truncate max-w-[180px]">{[nom, prenom].filter(Boolean).join(" ") || <span className="italic text-muted-foreground font-normal text-xs">Sans nom</span>}</p>
                                      <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{insc.email || "—"}{insc.source === "papier" && <span className="ml-1 text-blue-600">· papier</span>}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 pr-4">
                                  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium w-fit ${iBdg.cls}`}>{iBdg.label}</span>
                                </td>
                                <td className="py-3 pr-4">
                                  {calcAge(insc.date_naissance) !== null
                                    ? <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium w-fit ${ageBadgeCls(insc.date_naissance)}`}>{calcAge(insc.date_naissance)! < 18 ? "Mineur" : "Adulte"}</span>
                                    : <span className="text-xs text-muted-foreground italic">—</span>}
                                </td>
                                <td className="py-3 pr-4">
                                  <div className="flex flex-wrap gap-1">
                                    {resolveDiscNoms(insc.disciplines).length === 0
                                      ? <span className="text-xs text-muted-foreground italic">—</span>
                                      : resolveDiscNoms(insc.disciplines).map(d => (
                                        <span key={d} className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[11px]">{d}</span>
                                      ))
                                    }
                                  </div>
                                </td>
                                <td className="py-3 pl-4 text-right" onClick={e => e.stopPropagation()}>
                                  {!insc.user_id && insc.email ? (
                                    <Button size="sm" className="h-7 px-3 text-xs gap-1.5 font-medium bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={(e) => { e.stopPropagation(); setModalTab("espace"); setSelectedKey(key); }}>
                                      <Plus size={12} /> Créer espace
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1.5 font-medium" onClick={() => { setModalTab("inscription"); setSelectedKey(key); }}>
                                      <ChevronDown size={12} className="-rotate-90" /> Détails
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ====== SECTION FAMILLES ====== */}
            {!loading && adminSection === "familles" && (
              <SectionFamilles
                enfants={enfantsData}
                liens={liensData}
                membres={membres}
                onReload={loadData}
              />
            )}

            {/* ====== SECTION ACCÈS GALERIES ====== */}
            {!loading && adminSection === "galeries" && (
              <SectionAccesGaleries
                membres={membres}
                accesGalerie={accesGalerieData}
                disciplinesSanity={disciplinesSanity}
                onToggle={handleToggleProfilDiscipline}
              />
            )}

            {/* ====== SECTION TIERS ====== */}
            {!loading && adminSection === "tiers" && (
              <SectionTiers
                membres={membres}
                liens={liensData}
                enfants={enfantsData}
                onReload={loadData}
              />
            )}

          </motion.div>
        </div>
      </section>

      {/* Dialog — détail membre */}
      <Dialog open={!!selectedKey} onOpenChange={(open) => {
        if (!open) {
          setSelectedKey(null);
          setLinkingProfilId(null);
          setLinkingInscId("");
          setLinkingInscToProfilMode(false);
          setLinkingInscToProfilId("");
        }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          {selectedLigne && (
            <>

              {/* ——— DIALOG : PROFIL ——— */}
              {selectedLigne.type === "profil" && (() => {
                const { profil, inscriptions: pInsc } = selectedLigne;
                const nom = profil.nom || pInsc[0]?.nom || "";
                const prenom = profil.prenom || "";
                const initials = getInitials(prenom, nom);
                const roleBdg = roleBadge(profil.role);

                return (
                  <Tabs value={modalTab} onValueChange={setModalTab} className="flex flex-col overflow-hidden" style={{ maxHeight: "90vh" }}>
                    {/* Header */}
                    <div className="px-6 pt-6 pb-0 border-b border-border/50 bg-gradient-to-b from-secondary/30 to-background shrink-0">
                      <div className="flex items-start gap-4 pb-4 pr-8">
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold shadow-sm ${avatarBg(nom || prenom || "?")}`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <DialogTitle className="font-serif text-xl leading-tight">
                            {[prenom, nom].filter(Boolean).join(" ") || <span className="italic text-muted-foreground">Sans nom</span>}
                          </DialogTitle>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBdg.cls}`}>{roleBdg.label}</span>
                            {profil.role === "admin_discipline" && profil.disciplines && (
                              <span className="text-xs text-muted-foreground">· {resolveDiscNoms(profil.disciplines).join(", ")}</span>
                            )}
                            <span className="text-sm text-muted-foreground truncate">{profil.email}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="text-xs text-muted-foreground">Espace web actif · Membre depuis {new Date(profil.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
                          </div>
                        </div>
                      </div>
                      <TabsList className="h-9 mb-0 rounded-none border-0 bg-transparent p-0 gap-0">
                        <TabsTrigger value="adhesions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">
                          Adhésions {pInsc.length > 0 && <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 text-primary text-[10px] font-semibold">{pInsc.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="galeries" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Galeries</TabsTrigger>
                        <TabsTrigger value="parametres" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Paramètres</TabsTrigger>
                        <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Détails</TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto">

                      {/* ——— Adhésions ——— */}
                      <TabsContent value="adhesions" className="m-0 p-6 space-y-5">
                        {pInsc.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">Aucune inscription liée à ce compte.</p>
                        ) : (
                          <>
                            {[
                              { label: "En attente", filter: (i: Inscription) => i.statut === "en_attente", accent: "amber" },
                              { label: "Validées", filter: (i: Inscription) => i.statut === "validee", accent: "green" },
                              { label: "Refusées / supprimées", filter: (i: Inscription) => i.statut === "refusee" || i.statut === "supprimee", accent: "muted" },
                            ].map(({ label, filter, accent }) => {
                              const group = pInsc.filter(filter);
                              if (group.length === 0) return null;
                              return (
                                <div key={label}>
                                  <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${accent === "amber" ? "text-amber-700" : accent === "green" ? "text-emerald-700" : "text-muted-foreground"}`}>{label}</h3>
                                  <div className="space-y-2">
                                    {group.map(insc => {
                                      const iBdg = inscBadge(insc.statut);
                                      const isExpanded = expandedInscIds.has(insc.id);
                                      return (
                                        <div key={insc.id} className="rounded-xl border border-border/40 overflow-hidden">
                                          <button
                                            onClick={() => setExpandedInscIds(prev => {
                                              const next = new Set(prev);
                                              if (next.has(insc.id)) { next.delete(insc.id); } else { next.add(insc.id); }
                                              return next;
                                            })}
                                            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-secondary/30 transition-colors text-left"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="font-medium truncate">{[insc.nom, insc.prenom].filter(Boolean).join(" ") || "Sans nom"}</span>
                                              {insc.source === "papier" && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"><FileText size={9} /> Papier</span>}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <span className="text-xs text-muted-foreground">{resolveDiscNoms(insc.disciplines).join(", ") || "—"}</span>
                                              {insc.saison && <span className="text-xs text-muted-foreground">{insc.saison}</span>}
                                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${iBdg.cls}`}>{iBdg.label}</span>
                                              <ChevronDown size={13} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                            </div>
                                          </button>
                                          {isExpanded && (
                                            <div className="border-t border-border/30 bg-secondary/10 px-4 py-3 space-y-3">
                                              <div className="grid gap-1.5 sm:grid-cols-2 text-xs text-muted-foreground">
                                                {insc.saison && <span><span className="font-medium text-foreground">Saison </span>{insc.saison}</span>}
                                                {insc.adresse && <span><span className="font-medium text-foreground">Adresse </span>{insc.adresse}</span>}
                                                {insc.tel_mobile && <span><span className="font-medium text-foreground">Mobile </span>{insc.tel_mobile}</span>}
                                                {insc.urgence_contact && <span><span className="font-medium text-foreground">Urgence </span>{insc.urgence_contact}</span>}
                                                {insc.date_naissance && <span><span className="font-medium text-foreground">Naissance </span>{new Date(insc.date_naissance).toLocaleDateString("fr-FR")}</span>}
                                                {insc.groupe_sanguin && <span><span className="font-medium text-foreground">Groupe sanguin </span>{insc.groupe_sanguin}</span>}
                                                {insc.allergie && <span><span className="font-medium text-foreground">Allergie </span>{insc.allergie}</span>}
                                                {insc.niveau && <span><span className="font-medium text-foreground">Niveau </span>{insc.niveau}</span>}
                                                {insc.moyen_paiement && <span><span className="font-medium text-foreground">Paiement </span>{PAIEMENT_LABELS[insc.moyen_paiement] ?? insc.moyen_paiement}</span>}
                                                {insc.pass_sport && <span className="text-primary font-medium">Pass Sport</span>}
                                                {insc.type_inscription === "mineur" && (insc.parent1_nom || insc.parent1_prenom) && (
                                                  <span className="sm:col-span-2">
                                                    <span className="font-medium text-foreground">Parent 1 </span>
                                                    {[insc.parent1_prenom, insc.parent1_nom].filter(Boolean).join(" ")}
                                                    {insc.parent1_email ? ` — ${insc.parent1_email}` : ""}
                                                    {insc.parent1_tel ? ` — ${insc.parent1_tel}` : ""}
                                                  </span>
                                                )}
                                                {insc.type_inscription === "mineur" && (insc.parent2_nom || insc.parent2_prenom) && (
                                                  <span className="sm:col-span-2">
                                                    <span className="font-medium text-foreground">Parent 2 </span>
                                                    {[insc.parent2_prenom, insc.parent2_nom].filter(Boolean).join(" ")}
                                                    {insc.parent2_email ? ` — ${insc.parent2_email}` : ""}
                                                    {insc.parent2_tel ? ` — ${insc.parent2_tel}` : ""}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex gap-2 flex-wrap pt-1">
                                                {insc.statut !== "validee" && insc.statut !== "supprimee" && (
                                                  <Button size="sm" onClick={() => handleValiderInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="h-7 px-3 text-xs gap-1"><CheckCircle size={11} /> Valider</Button>
                                                )}
                                                {insc.statut !== "refusee" && insc.statut !== "supprimee" && (
                                                  <Button size="sm" variant="outline" onClick={() => handleRefuserInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="h-7 px-3 text-xs gap-1 text-destructive hover:text-destructive"><XCircle size={11} /> Refuser</Button>
                                                )}
                                                {insc.statut !== "supprimee" && (
                                                  <Button size="sm" variant="outline" onClick={() => setConfirmSupprimer(insc)} disabled={processing === `insc-${insc.id}`} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"><Trash2 size={11} /></Button>
                                                )}
                                                <Button size="sm" variant="outline" onClick={() => setAdminRecapInsc(insc)} className="h-7 px-2 text-xs gap-1 text-muted-foreground"><Download size={11} /></Button>
                                                {insc.source === "papier" && (
                                                  <Button size="sm" variant="outline" onClick={() => openPapierEdit(insc)} className="h-7 px-2 text-xs gap-1 text-muted-foreground"><Pencil size={11} /></Button>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}

                        {isSuperAdmin && (() => {
                          const suggestions = inscSuggereesEmail(profil).filter(i => !pInsc.some(p => p.id === i.id));
                          if (suggestions.length === 0) return null;
                          return (
                            <div>
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">À confirmer — même email</h3>
                              <div className="space-y-2">
                                {suggestions.map(insc => {
                                  const iBdg = inscBadge(insc.statut);
                                  return (
                                    <div key={insc.id} className="rounded-xl border border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/20 px-4 py-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm">
                                          <span className="font-medium">{insc.nom} {insc.prenom}</span>
                                          <span className="text-muted-foreground ml-2 text-xs">{resolveDiscNoms(insc.disciplines).join(", ") || "—"} {insc.saison ? `· ${insc.saison}` : ""}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${iBdg.cls}`}>{iBdg.label}</span>
                                          <Button size="sm" variant="outline" onClick={() => handleLierInscription(insc.id, profil.id, insc.disciplines)} disabled={processing === `insc-${insc.id}`} className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"><Link2 size={10} /> Confirmer</Button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </TabsContent>

                      {/* ——— Galeries ——— */}
                      <TabsContent value="galeries" className="m-0 p-6 space-y-4">
                        {isSuperAdmin ? (
                          <>
                            <p className="text-sm text-muted-foreground">Cochez les disciplines dont ce membre peut voir les galeries privées.</p>
                            <div className="rounded-xl border border-border/40 p-4 space-y-1">
                              {disciplinesSanity.map(disc => {
                                const acces = accesGalerieData.find(a => a.compte_id === profil.id && a.discipline_sanity_id === disc._id);
                                const isSuggestion = acces && !acces.actif && acces.source === "suggestion_auto";
                                const isActive = acces?.actif === true;
                                return (
                                  <div
                                    key={disc._id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary/40 ${isSuggestion ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}`}
                                    onClick={() => handleToggleProfilDiscipline(profil.id, disc._id, null, !isActive)}
                                  >
                                    <Checkbox
                                      checked={isActive}
                                      onCheckedChange={() => {}}
                                    />
                                    <span className="text-sm flex-1 select-none">{disc.nom}</span>
                                    {isSuggestion && <span className="text-[10px] text-amber-600 font-medium bg-amber-100/60 rounded-full px-2 py-0.5">Suggestion auto</span>}
                                    {isActive && <span className="text-[10px] text-emerald-600 font-medium">✓ Actif</span>}
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-[11px] text-muted-foreground">Les suggestions sont générées automatiquement à partir des inscriptions validées.</p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Accès réservé aux administrateurs.</p>
                        )}
                      </TabsContent>

                      {/* ——— Paramètres ——— */}
                      <TabsContent value="parametres" className="m-0 p-6 space-y-5">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Accès web</h3>
                          <div className="rounded-xl border border-border/40 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                              <span className="text-sm font-medium">Espace web actif</span>
                            </div>
                            <Button
                              size="sm" variant="outline"
                              className="gap-1.5 text-xs text-muted-foreground"
                              disabled={processing === `invitation-${profil.email}`}
                              onClick={() => handleRenvoyerInvitation(profil.email)}
                            >
                              <Upload size={12} /> Renvoyer l'invitation / reset mot de passe
                            </Button>
                          </div>
                        </div>

                        {isSuperAdmin && (() => {
                          const dejaliees = new Set(pInsc.map(i => i.id));
                          const disponibles = inscriptions.filter(i => !dejaliees.has(i.id));
                          if (disponibles.length === 0) return null;
                          const isLinking = linkingProfilId === profil.id;
                          return (
                            <div>
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Lier une inscription existante</h3>
                              <div className="rounded-xl border border-border/40 p-4">
                                {isLinking ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <select
                                      className="flex-1 min-w-0 rounded border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                      value={linkingInscId}
                                      onChange={e => setLinkingInscId(e.target.value)}
                                    >
                                      <option value="">— Choisir une inscription —</option>
                                      {disponibles.map(i => (
                                        <option key={i.id} value={i.id}>
                                          {[i.nom, i.prenom].filter(Boolean).join(" ") || i.email || "Sans nom"} — {resolveDiscNoms(i.disciplines).join(", ") || "?"} {i.saison ? `(${i.saison})` : ""}
                                        </option>
                                      ))}
                                    </select>
                                    <Button size="sm" className="h-8 px-3 text-xs gap-1" disabled={!linkingInscId} onClick={async () => {
                                      const insc = inscriptions.find(i => i.id === linkingInscId);
                                      await handleLierInscription(linkingInscId, profil.id, insc?.disciplines || null);
                                      setLinkingProfilId(null);
                                      setLinkingInscId("");
                                    }}><Link2 size={12} /> Lier</Button>
                                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => { setLinkingProfilId(null); setLinkingInscId(""); }}>Annuler</Button>
                                  </div>
                                ) : (
                                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1" onClick={() => { setLinkingProfilId(profil.id); setLinkingInscId(""); }}>
                                    <Link2 size={12} /> Lier une inscription…
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {isSuperAdmin && profil.id !== user?.id && (
                          <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Rôle & permissions</h3>
                            <div className="rounded-xl border border-border/40 p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <Shield size={14} className="text-muted-foreground" />
                                <span className="text-sm">Rôle actuel : <span className={`font-medium ${roleBdg.cls} rounded-full px-2 py-0.5`}>{roleBdg.label}</span>{profil.role === "admin_discipline" && profil.disciplines && <span className="ml-1 text-muted-foreground text-xs">· {resolveDiscNoms(profil.disciplines).join(", ")}</span>}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {profil.role === "refuse" ? (
                                  <Button size="sm" variant="outline" onClick={() => handleApprouverCompte(profil.id)} disabled={processing === profil.id} className="gap-1 text-xs"><CheckCircle size={12} /> Réactiver le compte</Button>
                                ) : profil.role === "admin" ? (
                                  <Button size="sm" variant="outline" onClick={() => handleChangerRole(profil.id, "membre")} disabled={processing === profil.id} className="gap-1 text-xs text-destructive hover:text-destructive"><Shield size={12} /> Retirer les droits admin</Button>
                                ) : profil.role === "admin_discipline" ? (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => setConfirmAdmin(profil)} disabled={processing === profil.id} className="gap-1 text-xs text-primary hover:text-primary"><Shield size={12} /> Promouvoir en admin</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleChangerRole(profil.id, "membre")} disabled={processing === profil.id} className="gap-1 text-xs text-destructive hover:text-destructive"><Shield size={12} /> Retirer les droits discipline</Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => setConfirmAdmin(profil)} disabled={processing === profil.id} className="gap-1 text-xs text-primary hover:text-primary"><Shield size={12} /> Promouvoir en admin</Button>
                                    <Button size="sm" variant="outline" onClick={() => { setConfirmAdminDiscipline(profil); setConfirmAdminDisciplineDiscs(profil.disciplines ? profil.disciplines.split(",").map(s => s.trim()).filter(Boolean) : []); }} disabled={processing === profil.id} className="gap-1 text-xs text-violet-700 hover:text-violet-700 border-violet-300"><Shield size={12} /> Admin discipline</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleRefuserCompte(profil.id)} disabled={processing === profil.id} className="gap-1 text-xs text-destructive hover:text-destructive"><UserX size={12} /> Révoquer le compte</Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      {/* ——— Détails ——— */}
                      <TabsContent value="details" className="m-0 p-6 space-y-5">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Coordonnées</h3>
                          <div className="rounded-xl border border-border/40 bg-secondary/20 divide-y divide-border/30">
                            <div className="px-4 py-3 text-sm flex items-center gap-3">
                              <span className="text-muted-foreground w-24 shrink-0 text-xs">Email</span>
                              <span className="truncate font-medium">{profil.email}</span>
                            </div>
                            {profil.telephone && (
                              <div className="px-4 py-3 text-sm flex items-center gap-3">
                                <span className="text-muted-foreground w-24 shrink-0 text-xs">Téléphone</span>
                                <span>{profil.telephone}</span>
                              </div>
                            )}
                            {profil.adresse && (
                              <div className="px-4 py-3 text-sm flex items-center gap-3">
                                <span className="text-muted-foreground w-24 shrink-0 text-xs">Adresse</span>
                                <span>{profil.adresse}</span>
                              </div>
                            )}
                            <div className="px-4 py-3 text-sm flex items-center gap-3">
                              <span className="text-muted-foreground w-24 shrink-0 text-xs">Membre depuis</span>
                              <span>{new Date(profil.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                            </div>
                          </div>
                        </div>
                        {(() => {
                          const logs = connexionsLog.filter(l => l.user_id === profil.id).slice(0, 8);
                          return (
                            <div>
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Connexions récentes</h3>
                              {logs.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">Aucune connexion enregistrée.</p>
                              ) : (
                                <div className="rounded-xl border border-border/40 bg-secondary/20 divide-y divide-border/30">
                                  {logs.map(log => (
                                    <div key={log.id} className="px-4 py-2.5 text-xs flex items-center gap-3 text-muted-foreground">
                                      <Clock size={12} className="shrink-0" />
                                      {new Date(log.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </TabsContent>

                    </div>
                  </Tabs>
                );
              })()}

              {/* ——— DIALOG : INSCRIPTION SEULE ——— */}
              {selectedLigne.type === "inscription_seule" && (() => {
                const insc = selectedLigne.inscription;
                const iBdg = inscBadge(insc.statut);
                const initials = getInitials(insc.prenom, insc.nom);

                return (
                  <Tabs value={modalTab} onValueChange={setModalTab} className="flex flex-col overflow-hidden" style={{ maxHeight: "90vh" }}>
                    {/* Header */}
                    <div className="px-6 pt-6 pb-0 border-b border-border/50 bg-gradient-to-b from-secondary/30 to-background shrink-0">
                      <div className="flex items-start gap-4 pb-4 pr-8">
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold shadow-sm ${avatarBg(insc.nom || insc.prenom || "?")}`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <DialogTitle className="font-serif text-xl leading-tight">
                            {[insc.nom, insc.prenom].filter(Boolean).join(" ") || <span className="italic text-muted-foreground">Sans nom</span>}
                          </DialogTitle>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${iBdg.cls}`}>{iBdg.label}</span>
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">Sans espace web</span>
                            {insc.source === "papier" && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-700"><FileText size={10} /> Papier</span>}
                          </div>
                          {insc.email && <p className="mt-1 text-sm text-muted-foreground truncate">{insc.email}</p>}
                        </div>
                      </div>
                      <TabsList className="h-9 mb-0 rounded-none border-0 bg-transparent p-0 gap-0">
                        <TabsTrigger value="inscription" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Inscription</TabsTrigger>
                        <TabsTrigger value="espace" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Espace web</TabsTrigger>
                        <TabsTrigger value="actions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Actions</TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {/* ——— Inscription ——— */}
                      <TabsContent value="inscription" className="m-0 p-6">
                        <div className="rounded-xl border border-border/40 bg-secondary/20 divide-y divide-border/30">
                          {insc.disciplines && (
                            <div className="px-4 py-3 text-sm flex items-start gap-3">
                              <span className="text-muted-foreground w-24 shrink-0 text-xs pt-0.5">Discipline(s)</span>
                              <div className="flex flex-wrap gap-1">{resolveDiscNoms(insc.disciplines).map(d => <span key={d} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{d}</span>)}</div>
                            </div>
                          )}
                          {insc.saison && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-24 shrink-0 text-xs">Saison</span><span>{insc.saison}</span></div>}
                          {insc.email && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-24 shrink-0 text-xs">Email</span><span className="truncate">{insc.email}</span></div>}
                          {insc.tel_mobile && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-24 shrink-0 text-xs">Téléphone</span><span>{insc.tel_mobile}</span></div>}
                          {insc.adresse && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-24 shrink-0 text-xs">Adresse</span><span>{insc.adresse}</span></div>}
                          {insc.date_naissance && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-24 shrink-0 text-xs">Naissance</span><span>{new Date(insc.date_naissance).toLocaleDateString("fr-FR")}</span></div>}
                          {insc.groupe_sanguin && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-24 shrink-0 text-xs">Groupe sanguin</span><span>{insc.groupe_sanguin}</span></div>}
                          {insc.allergie && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-24 shrink-0 text-xs">Allergie</span><span>{insc.allergie}</span></div>}
                          {insc.niveau && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-24 shrink-0 text-xs">Niveau</span><span>{insc.niveau}</span></div>}
                          {insc.urgence_contact && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-24 shrink-0 text-xs">Urgence</span><span>{insc.urgence_contact}</span></div>}
                          {insc.moyen_paiement && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-24 shrink-0 text-xs">Paiement</span><span>{PAIEMENT_LABELS[insc.moyen_paiement] ?? insc.moyen_paiement}</span></div>}
                          {(insc.pass_sport || insc.droit_image || insc.autorisation_parentale) && (
                            <div className="px-4 py-3 text-sm flex gap-3">
                              <span className="text-muted-foreground w-24 shrink-0 text-xs">Options</span>
                              <div className="flex flex-wrap gap-1.5 text-xs">
                                {insc.pass_sport && <span className="text-primary font-medium">Pass Sport</span>}
                                {insc.droit_image && <span>Droit image ✓</span>}
                                {insc.autorisation_parentale && <span>Auth. parentale ✓</span>}
                              </div>
                            </div>
                          )}
                          {insc.type_inscription === "mineur" && (insc.parent1_nom || insc.parent1_prenom) && (
                            <div className="px-4 py-3 text-sm flex gap-3">
                              <span className="text-muted-foreground w-24 shrink-0 text-xs">Parent 1</span>
                              <span>{[insc.parent1_prenom, insc.parent1_nom].filter(Boolean).join(" ")}{insc.parent1_email ? ` — ${insc.parent1_email}` : ""}{insc.parent1_tel ? ` — ${insc.parent1_tel}` : ""}</span>
                            </div>
                          )}
                          {insc.type_inscription === "mineur" && (insc.parent2_nom || insc.parent2_prenom) && (
                            <div className="px-4 py-3 text-sm flex gap-3">
                              <span className="text-muted-foreground w-24 shrink-0 text-xs">Parent 2</span>
                              <span>{[insc.parent2_prenom, insc.parent2_nom].filter(Boolean).join(" ")}{insc.parent2_email ? ` — ${insc.parent2_email}` : ""}{insc.parent2_tel ? ` — ${insc.parent2_tel}` : ""}</span>
                            </div>
                          )}
                          <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-24 shrink-0 text-xs">Reçue le</span><span>{new Date(insc.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span></div>
                        </div>
                        {insc.document_scan_url && (
                          <div className="mt-4">
                            <a href={insc.document_scan_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary underline hover:no-underline">
                              <ExternalLink size={12} /> Voir le document scanné
                            </a>
                          </div>
                        )}
                      </TabsContent>

                      {/* ——— Espace web ——— */}
                      <TabsContent value="espace" className="m-0 p-6 space-y-5">
                        {insc.email ? (
                          <>
                            {!insc.user_id ? (
                              <div className="rounded-xl border border-border/40 p-5 space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40"></span>
                                  <span className="text-sm text-muted-foreground">Aucun espace web associé à ce membre.</span>
                                </div>
                                {insc.statut === "validee" ? (
                                  <Button
                                    className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                                    disabled={!!processing}
                                    onClick={async () => {
                                      setProcessing(`insc-${insc.id}`);
                                      await handleCreerCompteDepuisInscription(insc);
                                      toast.success("Compte créé — email d'invitation envoyé.");
                                      setProcessing(null);
                                    }}
                                  >
                                    <Plus size={12} /> Créer l'espace web
                                  </Button>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">L'inscription doit être validée avant de créer un espace web.</p>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-border/40 p-5 space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                                  <span className="text-sm font-medium text-emerald-700">Espace web actif</span>
                                </div>
                                <Button
                                  size="sm" variant="outline"
                                  className="gap-1.5 text-xs text-muted-foreground"
                                  disabled={processing === `invitation-${insc.email}`}
                                  onClick={() => handleRenvoyerInvitation(insc.email!)}
                                >
                                  <Upload size={12} /> Renvoyer l'invitation / reset mot de passe
                                </Button>
                              </div>
                            )}
                            <div>
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Lier à un compte membre existant</h3>
                              {!linkingInscToProfilMode ? (
                                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setLinkingInscToProfilMode(true)}>
                                  <Link2 size={12} /> Lier à un compte existant
                                </Button>
                              ) : (
                                <div className="space-y-2">
                                  <select
                                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                                    value={linkingInscToProfilId}
                                    onChange={(e) => setLinkingInscToProfilId(e.target.value)}
                                  >
                                    <option value="">-- Choisir un membre --</option>
                                    {membres.map(m => (
                                      <option key={m.id} value={m.id}>
                                        {[m.nom, m.prenom].filter(Boolean).join(" ") || m.email}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="text-xs gap-1"
                                      disabled={!linkingInscToProfilId || processing === `insc-${insc.id}`}
                                      onClick={async () => {
                                        await handleLierInscription(insc.id, linkingInscToProfilId, insc.disciplines);
                                        setLinkingInscToProfilMode(false);
                                        setLinkingInscToProfilId("");
                                      }}
                                    >
                                      <Link2 size={12} /> Confirmer le lien
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setLinkingInscToProfilMode(false); setLinkingInscToProfilId(""); }}>
                                      Annuler
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Aucun email renseigné — impossible de créer un espace web.</p>
                        )}
                      </TabsContent>

                      {/* ——— Actions ——— */}
                      <TabsContent value="actions" className="m-0 p-6 space-y-4">
                        <div className="rounded-xl border border-border/40 p-4 space-y-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions sur l'inscription</h3>
                          <div className="flex flex-wrap gap-2">
                            {insc.statut !== "validee" && insc.statut !== "supprimee" && (
                              <Button size="sm" onClick={() => handleValiderInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-xs"><CheckCircle size={12} /> Valider l'inscription</Button>
                            )}
                            {insc.statut !== "refusee" && insc.statut !== "supprimee" && (
                              <Button size="sm" variant="outline" onClick={() => handleRefuserInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-xs text-destructive hover:text-destructive"><XCircle size={12} /> Refuser</Button>
                            )}
                            {insc.statut !== "supprimee" && (
                              <Button size="sm" variant="outline" onClick={() => setConfirmSupprimer(insc)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-xs text-muted-foreground hover:text-destructive"><Trash2 size={12} /> Supprimer</Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => setAdminRecapInsc(insc)} className="gap-1 text-xs text-muted-foreground"><Download size={12} /> Récapitulatif</Button>
                            {insc.source === "papier" && (
                              <Button size="sm" variant="outline" onClick={() => openPapierEdit(insc)} className="gap-1 text-xs text-muted-foreground"><Pencil size={12} /> Modifier</Button>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                );
              })()}

            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modale saisie / modification inscription papier */}
      <Dialog open={showPapierModal} onOpenChange={(open) => { if (!open) { setShowPapierModal(false); setEditingInscId(null); setScanFile(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingInscId ? "Modifier l'inscription papier" : "Saisir une inscription papier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">

            <div>
              <h3 className="mb-3 text-sm font-semibold border-b border-border/50 pb-1.5">Type d'inscription</h3>
              <div className="grid grid-cols-2 gap-3">
                {(["adulte", "mineur"] as const).map((type) => (
                  <button key={type} type="button"
                    onClick={() => {
                      if (type !== papierForm.typeInscription) {
                        papierDirRef.current = type === "mineur" ? 1 : -1;
                        setPapierForm(f => ({ ...f, typeInscription: type }));
                      }
                    }}
                    className={`rounded-md border-2 py-3 text-sm font-semibold capitalize transition-colors ${papierForm.typeInscription === type ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    {type === "adulte" ? "Adulte" : "Mineur"}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait" custom={papierDirRef.current}>
              <motion.div
                key={papierForm.typeInscription}
                custom={papierDirRef.current}
                variants={papierFormVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6 overflow-hidden"
              >
                <div>
                  <h3 className="mb-3 text-sm font-semibold border-b border-border/50 pb-1.5">Identité</h3>
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="p-nom">Nom *</Label>
                        <Input id="p-nom" placeholder="Nom" value={papierForm.nom} onChange={e => setPapierForm(f => ({ ...f, nom: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p-prenom">Prénom *</Label>
                        <Input id="p-prenom" placeholder="Prénom" value={papierForm.prenom} onChange={e => setPapierForm(f => ({ ...f, prenom: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="p-adresse">Adresse</Label>
                      <Input id="p-adresse" placeholder="Adresse complète" value={papierForm.adresse} onChange={e => setPapierForm(f => ({ ...f, adresse: e.target.value }))} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="p-ddn">Date de naissance *</Label>
                        <Input id="p-ddn" type="date" value={papierForm.dateNaissance} onChange={e => setPapierForm(f => ({ ...f, dateNaissance: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p-gs">Groupe sanguin</Label>
                        <Input id="p-gs" placeholder="Ex: A+" maxLength={5} value={papierForm.groupeSanguin} onChange={e => setPapierForm(f => ({ ...f, groupeSanguin: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="p-allergie">Allergie(s)</Label>
                      <Input id="p-allergie" placeholder="Précisez si nécessaire" value={papierForm.allergie} onChange={e => setPapierForm(f => ({ ...f, allergie: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {papierForm.typeInscription === "adulte" && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold border-b border-border/50 pb-1.5">Coordonnées</h3>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="p-mobile">Tél. mobile</Label>
                        <Input id="p-mobile" type="tel" placeholder="06 00 00 00 00" value={papierForm.telMobile} onChange={e => setPapierForm(f => ({ ...f, telMobile: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p-email">Email</Label>
                        <Input id="p-email" type="email" placeholder="email@exemple.com" value={papierForm.email} onChange={e => setPapierForm(f => ({ ...f, email: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                )}

                {papierForm.typeInscription === "mineur" && (
                  <>
                    <div>
                      <h3 className="mb-3 text-sm font-semibold border-b border-border/50 pb-1.5">Informations parents / tuteurs légaux</h3>
                      <div className="space-y-4">
                        <div className="rounded-md border border-border/50 p-3 space-y-3">
                          <p className="text-xs font-semibold">Parent / Tuteur 1 *</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5"><Label>Nom *</Label><Input placeholder="Nom" value={papierForm.parent1Nom} onChange={e => setPapierForm(f => ({ ...f, parent1Nom: e.target.value }))} /></div>
                            <div className="space-y-1.5"><Label>Prénom *</Label><Input placeholder="Prénom" value={papierForm.parent1Prenom} onChange={e => setPapierForm(f => ({ ...f, parent1Prenom: e.target.value }))} /></div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="email@exemple.com" value={papierForm.parent1Email} onChange={e => setPapierForm(f => ({ ...f, parent1Email: e.target.value }))} /></div>
                            <div className="space-y-1.5"><Label>Téléphone</Label><Input type="tel" placeholder="06 00 00 00 00" value={papierForm.parent1Tel} onChange={e => setPapierForm(f => ({ ...f, parent1Tel: e.target.value }))} /></div>
                          </div>
                        </div>
                        <div className="rounded-md border border-border/50 p-3 space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground">Parent / Tuteur 2 <span className="font-normal">(facultatif)</span></p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5"><Label>Nom</Label><Input placeholder="Nom" value={papierForm.parent2Nom} onChange={e => setPapierForm(f => ({ ...f, parent2Nom: e.target.value }))} /></div>
                            <div className="space-y-1.5"><Label>Prénom</Label><Input placeholder="Prénom" value={papierForm.parent2Prenom} onChange={e => setPapierForm(f => ({ ...f, parent2Prenom: e.target.value }))} /></div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="email@exemple.com" value={papierForm.parent2Email} onChange={e => setPapierForm(f => ({ ...f, parent2Email: e.target.value }))} /></div>
                            <div className="space-y-1.5"><Label>Téléphone</Label><Input type="tel" placeholder="06 00 00 00 00" value={papierForm.parent2Tel} onChange={e => setPapierForm(f => ({ ...f, parent2Tel: e.target.value }))} /></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <h3 className="mb-3 text-sm font-semibold border-b border-border/50 pb-1.5">Personne à contacter en cas d'urgence *</h3>
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="p-urgprenom">Prénom</Label>
                        <Input id="p-urgprenom" placeholder="Prénom" value={papierForm.urgencePrenom} onChange={e => setPapierForm(f => ({ ...f, urgencePrenom: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p-urgnom">Nom</Label>
                        <Input id="p-urgnom" placeholder="Nom" value={papierForm.urgenceNom} onChange={e => setPapierForm(f => ({ ...f, urgenceNom: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="p-urgtel">Téléphone</Label>
                      <Input id="p-urgtel" type="tel" placeholder="06 00 00 00 00" value={papierForm.urgenceTel} onChange={e => setPapierForm(f => ({ ...f, urgenceTel: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold border-b border-border/50 pb-1.5">Inscription</h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Discipline(s) *</Label>
                      <div className="grid gap-2 sm:grid-cols-2 rounded border border-border/50 p-3">
                        {disciplinesSanity.length === 0 && <p className="text-xs text-muted-foreground col-span-2">Chargement…</p>}
                        {(isSuperAdmin
                          ? disciplinesSanity
                          : disciplinesSanity.filter(d => (currentUserDisciplines || "").split(",").map(s => s.trim()).includes(d._id))
                        ).map(disc => {
                          const checked = papierForm.disciplines.split(",").map(s => s.trim()).filter(Boolean).includes(disc._id);
                          return (
                            <label key={disc._id} className="flex cursor-pointer items-center gap-2">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  setPapierForm(f => {
                                    const current = f.disciplines.split(",").map(s => s.trim()).filter(Boolean);
                                    const updated = v ? [...new Set([...current, disc._id])] : current.filter(d => d !== disc._id);
                                    return { ...f, disciplines: updated.join(",") };
                                  });
                                }}
                              />
                              <span className="text-sm">{disc.nom}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="p-saison">Saison</Label>
                        <Input id="p-saison" placeholder="2025-2026" value={papierForm.saison} onChange={e => setPapierForm(f => ({ ...f, saison: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p-niveau">Niveau</Label>
                        <Input id="p-niveau" placeholder="Ex: Débutant, ceinture jaune…" value={papierForm.niveau} onChange={e => setPapierForm(f => ({ ...f, niveau: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold border-b border-border/50 pb-1.5">Mode de règlement</h3>
                  <div className="space-y-2">
                    {[
                      { value: "cheque_1x", label: "Chèque — en 1 fois" },
                      { value: "cheque_4x", label: "Chèque — en 4 fois", detail: "60 € à l'inscription + solde en 3 échéances" },
                      { value: "especes", label: "Espèces" },
                      { value: "virement", label: "Virement bancaire (en une seule fois)" },
                    ].map(option => (
                      <label key={option.value} className="flex cursor-pointer items-start gap-3">
                        <input
                          type="radio"
                          name="papierMoyenPaiement"
                          value={option.value}
                          checked={papierForm.moyenPaiement === option.value}
                          onChange={() => setPapierForm(f => ({ ...f, moyenPaiement: option.value }))}
                          className="mt-0.5 accent-primary shrink-0"
                        />
                        <div className="text-sm">
                          <span>{option.label}</span>
                          {"detail" in option && <p className="mt-0.5 text-xs text-muted-foreground">{option.detail}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold border-b border-border/50 pb-1.5">Autorisations</h3>
                  <div className="space-y-3">
                    {papierForm.typeInscription === "mineur" && (
                      <label className="flex cursor-pointer items-center gap-3">
                        <Checkbox checked={papierForm.autorisationParentale} onCheckedChange={v => setPapierForm(f => ({ ...f, autorisationParentale: v as boolean }))} />
                        <span className="text-sm">Autorisation parentale signée *</span>
                      </label>
                    )}
                    <label className="flex cursor-pointer items-center gap-3">
                      <Checkbox checked={papierForm.droitImage} onCheckedChange={v => setPapierForm(f => ({ ...f, droitImage: v as boolean }))} />
                      <span className="text-sm">Droit à l'image accordé</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3">
                      <Checkbox checked={papierForm.passSport} onCheckedChange={v => setPapierForm(f => ({ ...f, passSport: v as boolean }))} />
                      <span className="text-sm">Détenteur d'un code Pass Sport 2026-2027</span>
                    </label>
                  </div>
                </div>

              </motion.div>
            </AnimatePresence>

            <div>
              <h3 className="mb-3 text-sm font-semibold border-b border-border/50 pb-1.5">Document scanné <span className="font-normal text-muted-foreground">(facultatif)</span></h3>
              {editingInscId && (() => {
                const existingUrl = inscriptions.find(i => i.id === editingInscId)?.document_scan_url;
                return existingUrl ? (
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <ExternalLink size={12} />
                    <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground truncate max-w-xs">Scan existant</a>
                    <span className="text-muted-foreground/60">(sera remplacé si vous uploadez un nouveau fichier)</span>
                  </div>
                ) : null;
              })()}
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border/70 px-4 py-3 hover:border-primary/50 transition-colors">
                <Upload size={15} className="text-muted-foreground shrink-0" />
                <span className="flex-1 min-w-0 text-sm text-muted-foreground truncate">
                  {scanFile ? scanFile.name : "Ajouter le formulaire scanné (PDF, JPG, PNG)"}
                </span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={e => setScanFile(e.target.files?.[0] ?? null)} />
              </label>
              {scanFile && (
                <button type="button" className="mt-1 text-xs text-muted-foreground hover:text-destructive" onClick={() => setScanFile(null)}>
                  Retirer le fichier
                </button>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button variant="outline" onClick={() => { setShowPapierModal(false); setEditingInscId(null); setScanFile(null); }} disabled={savingPapier}>Annuler</Button>
              <Button onClick={handleSaisirPapier} disabled={savingPapier} className="gap-2">
                {savingPapier ? "Enregistrement…" : editingInscId ? <><Pencil size={14} /> Enregistrer les modifications</> : <><Plus size={14} /> Enregistrer l'inscription</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmSupprimer} onOpenChange={(open) => { if (!open) setConfirmSupprimer(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette inscription ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'inscription de <strong>{confirmSupprimer?.nom} {confirmSupprimer?.prenom}</strong> ({resolveDiscNoms(confirmSupprimer?.disciplines).join(", ") || "—"}) sera marquée comme supprimée.
              <br /><br />
              Elle restera visible dans l'export Excel avec le statut <strong>Supprimée</strong>, mais n'apparaîtra plus dans les actions à traiter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmSupprimer) handleSupprimerInscription(confirmSupprimer.id); }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmAdminDiscipline} onOpenChange={(open) => { if (!open) { setConfirmAdminDiscipline(null); setConfirmAdminDisciplineDiscs([]); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promouvoir en administrateur de discipline ?</AlertDialogTitle>
            <AlertDialogDescription>
              Sélectionnez les disciplines que <strong>{confirmAdminDiscipline?.nom} {confirmAdminDiscipline?.prenom}</strong> pourra administrer (validation des inscriptions, saisie papier).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 sm:grid-cols-2 py-2 px-1">
            {disciplinesSanity.map(disc => (
              <label key={disc._id} className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={confirmAdminDisciplineDiscs.includes(disc._id)}
                  onCheckedChange={(v) => setConfirmAdminDisciplineDiscs(prev =>
                    v ? [...new Set([...prev, disc._id])] : prev.filter(d => d !== disc._id)
                  )}
                />
                <span className="text-sm">{disc.nom}</span>
              </label>
            ))}
          </div>
          {confirmAdminDisciplineDiscs.length === 0 && (
            <p className="text-xs text-amber-600 px-1">Sélectionnez au moins une discipline.</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmAdminDisciplineDiscs.length === 0}
              onClick={handlePromouvoirAdminDiscipline}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmAdmin} onOpenChange={(open) => { if (!open) setConfirmAdmin(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promouvoir en administrateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez donner les droits administrateur à <strong>{confirmAdmin?.nom} {confirmAdmin?.prenom}</strong> ({confirmAdmin?.email}).
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

      {/* Hors-écran : récapitulatif téléchargeable admin */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none" }}>
        {adminRecapInsc && (
          <div ref={adminRecapRef}>
            <PrintableInscription data={{ ...inscriptionToRecapData(adminRecapInsc), disciplines: resolveDiscNoms(adminRecapInsc.disciplines).join(", ") }} />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminMembres;

// ================================================================
// Section : Familles & enfants
// ================================================================
const SectionFamilles = ({
  enfants, liens, membres, onReload,
}: {
  enfants: { id: string; nom: string; prenom: string; date_naissance: string | null; groupe_sanguin: string | null; allergie: string | null }[];
  liens: { id: string; compte_id: string; enfant_id: string; type_acces: string; enfant?: { id: string; nom: string; prenom: string; date_naissance: string | null } }[];
  membres: Membre[];
  onReload: () => void;
}) => {
  const [showAddEnfant, setShowAddEnfant] = useState(false);
  const [addEnfantForm, setAddEnfantForm] = useState({ nom: "", prenom: "", date_naissance: "", groupe_sanguin: "", allergie: "" });
  const [addLien, setAddLien] = useState<{ enfantId: string; compteId: string; typeAcces: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreateEnfant = async () => {
    if (!addEnfantForm.nom.trim() || !addEnfantForm.prenom.trim()) { toast.error("Nom et prénom obligatoires."); return; }
    setSaving(true);
    const { error } = await supabase.from("enfants").insert({
      nom: addEnfantForm.nom.trim(), prenom: addEnfantForm.prenom.trim(),
      date_naissance: addEnfantForm.date_naissance || null,
      groupe_sanguin: addEnfantForm.groupe_sanguin || null,
      allergie: addEnfantForm.allergie || null,
    });
    if (error) { toast.error("Erreur : " + error.message); }
    else { toast.success("Profil enfant créé."); setShowAddEnfant(false); setAddEnfantForm({ nom: "", prenom: "", date_naissance: "", groupe_sanguin: "", allergie: "" }); onReload(); }
    setSaving(false);
  };

  const handleAddLien = async () => {
    if (!addLien?.enfantId || !addLien?.compteId) { toast.error("Sélectionnez un compte."); return; }
    setSaving(true);
    const { error } = await supabase.from("liens_compte_enfant").insert({ compte_id: addLien.compteId, enfant_id: addLien.enfantId, type_acces: addLien.typeAcces });
    if (error) { toast.error("Erreur : " + error.message); }
    else { toast.success("Lien créé."); setAddLien(null); onReload(); }
    setSaving(false);
  };

  const handleDeleteLien = async (lienId: string) => {
    const { error } = await supabase.from("liens_compte_enfant").delete().eq("id", lienId);
    if (error) { toast.error("Erreur : " + error.message); }
    else { toast.success("Lien supprimé."); onReload(); }
  };

  const liensParEnfant = enfants.map(e => ({
    enfant: e,
    liens: liens.filter(l => l.enfant_id === e.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{enfants.length} profil(s) enfant enregistré(s)</p>
        <Button size="sm" className="gap-1" onClick={() => setShowAddEnfant(true)}><Plus size={13} /> Nouveau profil enfant</Button>
      </div>

      {showAddEnfant && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
          <h3 className="font-serif font-bold text-sm">Nouveau profil enfant</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Prénom *</Label><Input value={addEnfantForm.prenom} onChange={e => setAddEnfantForm(f => ({ ...f, prenom: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Nom *</Label><Input value={addEnfantForm.nom} onChange={e => setAddEnfantForm(f => ({ ...f, nom: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Date de naissance</Label><Input type="date" value={addEnfantForm.date_naissance} onChange={e => setAddEnfantForm(f => ({ ...f, date_naissance: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Groupe sanguin</Label><Input placeholder="A+, O-…" value={addEnfantForm.groupe_sanguin} onChange={e => setAddEnfantForm(f => ({ ...f, groupe_sanguin: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Allergie / Remarque médicale</Label><Input value={addEnfantForm.allergie} onChange={e => setAddEnfantForm(f => ({ ...f, allergie: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreateEnfant} disabled={saving}>Créer</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddEnfant(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {liensParEnfant.length === 0 && <p className="text-sm text-muted-foreground italic">Aucun profil enfant.</p>}

      {liensParEnfant.map(({ enfant, liens: eLiens }) => (
        <div key={enfant.id} className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/50 bg-secondary/30 px-5 py-3">
            <div>
              <span className="font-semibold">{enfant.prenom} {enfant.nom}</span>
              {enfant.date_naissance && <span className="ml-2 text-xs text-muted-foreground">· né(e) le {new Date(enfant.date_naissance).toLocaleDateString("fr-FR")}</span>}
              {enfant.groupe_sanguin && <span className="ml-2 text-xs text-muted-foreground">· {enfant.groupe_sanguin}</span>}
            </div>
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setAddLien({ enfantId: enfant.id, compteId: "", typeAcces: "parent" })}>
              <Plus size={11} /> Ajouter un lien
            </Button>
          </div>
          <div className="p-5 space-y-3">
            {eLiens.length === 0 && <p className="text-xs text-muted-foreground italic">Aucun compte lié.</p>}
            {eLiens.map(lien => {
              const m = membres.find(mb => mb.id === lien.compte_id);
              return (
                <div key={lien.id} className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{m ? `${m.nom || ""} ${m.prenom || ""}`.trim() || m.email : lien.compte_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {lien.type_acces === "parent" ? "Parent / tuteur" : "Tiers — galerie uniquement"} · {m?.email}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteLien(lien.id)} className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button>
                </div>
              );
            })}
            {addLien?.enfantId === enfant.id && (
              <div className="flex flex-wrap gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <select className="flex-1 min-w-[200px] rounded border border-border bg-card px-2 py-1.5 text-sm"
                  value={addLien.compteId} onChange={e => setAddLien(a => a ? { ...a, compteId: e.target.value } : a)}>
                  <option value="">— Choisir un compte —</option>
                  {membres.filter(m => !eLiens.some(l => l.compte_id === m.id)).map(m => (
                    <option key={m.id} value={m.id}>{m.nom || ""} {m.prenom || ""} — {m.email}</option>
                  ))}
                </select>
                <select className="rounded border border-border bg-card px-2 py-1.5 text-sm"
                  value={addLien.typeAcces} onChange={e => setAddLien(a => a ? { ...a, typeAcces: e.target.value } : a)}>
                  <option value="parent">Parent / tuteur</option>
                  <option value="tiers_galerie">Tiers — galerie seule</option>
                </select>
                <Button size="sm" className="h-9" onClick={handleAddLien} disabled={saving || !addLien.compteId}>Lier</Button>
                <Button size="sm" variant="outline" className="h-9" onClick={() => setAddLien(null)}>Annuler</Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ================================================================
// Section : Accès galeries
// ================================================================
const SectionAccesGaleries = ({
  membres, accesGalerie, disciplinesSanity, onToggle,
}: {
  membres: Membre[];
  accesGalerie: { id: string; compte_id: string; discipline_sanity_id: string; actif: boolean; source: string }[];
  disciplinesSanity: { _id: string; nom: string; nomCourt?: string }[];
  onToggle: (profilId: string, disc: string, current: string | null, checked: boolean) => void;
}) => {
  const [search, setSearch] = useState("");
  const actifs = membres.filter(m => ["membre", "tiers", "admin", "admin_discipline"].includes(m.role));
  const filtered = search
    ? actifs.filter(m => `${m.nom} ${m.prenom} ${m.email}`.toLowerCase().includes(search.toLowerCase()))
    : actifs;

  const pendingCount = accesGalerie.filter(a => !a.actif && a.source === "suggestion_auto").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{actifs.length} compte(s) avec accès potentiel aux galeries</p>
          {pendingCount > 0 && (
            <p className="text-xs text-amber-600 font-medium mt-0.5">{pendingCount} suggestion(s) en attente de validation</p>
          )}
        </div>
        <div className="relative w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder="Filtrer…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="px-4 py-2.5 text-left font-semibold text-xs">Membre</th>
                {disciplinesSanity.map(d => (
                  <th key={d._id} className="px-2 py-2.5 text-center font-semibold text-xs whitespace-nowrap">{d.nomCourt || d.nom}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-sm">{m.nom || ""} {m.prenom || ""}</p>
                    <p className="text-[11px] text-muted-foreground">{m.email}</p>
                  </td>
                  {disciplinesSanity.map(d => {
                    const acces = accesGalerie.find(a => a.compte_id === m.id && a.discipline_sanity_id === d._id);
                    const isSuggestion = acces && !acces.actif && acces.source === "suggestion_auto";
                    return (
                      <td key={d._id} className={`px-2 py-2.5 text-center ${isSuggestion ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}`}>
                        <Checkbox
                          checked={acces?.actif === true}
                          onCheckedChange={v => onToggle(m.id, d._id, null, !!v)}
                          className={isSuggestion ? "border-amber-400" : ""}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={disciplinesSanity.length + 1} className="px-4 py-8 text-center text-muted-foreground text-sm">Aucun résultat.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Les cases en jaune sont des suggestions automatiques générées lors de la validation d'une inscription — cochez pour activer l'accès.</p>
    </div>
  );
};

// ================================================================
// Section : Comptes tiers
// ================================================================
const SectionTiers = ({
  membres, liens, enfants, onReload,
}: {
  membres: Membre[];
  liens: { id: string; compte_id: string; enfant_id: string; type_acces: string }[];
  enfants: { id: string; nom: string; prenom: string }[];
  onReload: () => void;
}) => {
  const [processing, setProcessing] = useState<string | null>(null);

  const tiersMembres = membres.filter(m => m.role === "tiers");
  const membresActifs = membres.filter(m => ["membre", "admin_discipline"].includes(m.role));

  const handleSetTiers = async (id: string) => {
    setProcessing(id);
    const { error } = await supabase.from("profils").update({ role: "tiers" }).eq("id", id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Rôle mis à jour."); onReload(); }
    setProcessing(null);
  };

  const handleRestoreMembre = async (id: string) => {
    setProcessing(id);
    const { error } = await supabase.from("profils").update({ role: "membre" }).eq("id", id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Rôle rétabli en Membre."); onReload(); }
    setProcessing(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 font-serif font-bold">Comptes tiers existants ({tiersMembres.length})</h3>
        <p className="text-xs text-muted-foreground">Un compte tiers a uniquement accès aux galeries privées des disciplines des enfants qui lui sont liés.</p>
      </div>

      {tiersMembres.length === 0 && <p className="text-sm text-muted-foreground italic">Aucun compte tiers.</p>}

      {tiersMembres.map(m => {
        const liensEnfants = liens.filter(l => l.compte_id === m.id);
        return (
          <div key={m.id} className="rounded-xl border border-sky-200/60 bg-sky-50/30 dark:bg-sky-950/10 p-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold">{m.nom || ""} {m.prenom || ""}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleRestoreMembre(m.id)} disabled={processing === m.id}>
                Rétablir en Membre
              </Button>
            </div>
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Enfants liés :</p>
              {liensEnfants.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Aucun enfant lié — gérez les liens dans l'onglet Familles.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {liensEnfants.map(l => {
                    const e = enfants.find(en => en.id === l.enfant_id);
                    return e ? (
                      <span key={l.id} className="rounded-full bg-sky-100 dark:bg-sky-900/30 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
                        {e.prenom} {e.nom}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <h3 className="mb-3 font-serif font-bold text-sm">Convertir un membre existant en compte tiers</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Un membre sans adhésion peut être converti en compte tiers (accès galerie uniquement). Utilisez ensuite l'onglet <strong>Familles</strong> pour lui associer des enfants.
        </p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {membresActifs.map(m => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-2">
              <div>
                <p className="text-sm font-medium">{m.nom || ""} {m.prenom || ""}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleSetTiers(m.id)} disabled={processing === m.id}>
                Passer en tiers
              </Button>
            </div>
          ))}
          {membresActifs.length === 0 && <p className="text-sm text-muted-foreground italic">Aucun membre actif.</p>}
        </div>
      </div>
    </div>
  );
};
