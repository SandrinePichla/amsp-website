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
  Clock, CheckCircle, XCircle, Shield, Download, ChevronDown, ChevronUp, ChevronsUpDown,
  UserX, UserPlus, ClipboardList, Link2, Plus, FileText, Trash2, Search, Pencil, Upload, ExternalLink,
  List, Users,
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
  attestation_url: string | null;
}

type Ligne =
  | { type: "profil"; profil: Membre; inscriptions: Inscription[] }
  | { type: "inscription_seule"; inscription: Inscription; profil: Membre | null };

type ActiveTab = "tous" | "en_attente" | "reglement" | "reglements" | "refusees";

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


const REGEX_TEL_FR = /^(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const papierFormVariants = {
  enter: (dir: number) => ({ x: dir * 80, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
  exit: (dir: number) => ({ x: dir * -80, opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as [number, number, number, number] } }),
};

const roleBadge = (role: string) => {
  if (role === "admin")            return { label: "Admin",            cls: "bg-primary/10 text-primary" };
  if (role === "admin_discipline") return { label: "Admin discipline", cls: "bg-violet-500/10 text-violet-700" };
  if (role === "membre")           return { label: "Inscrit",          cls: "bg-green-500/10 text-green-700" };
  if (role === "tiers")            return { label: "Tiers (galerie)",  cls: "bg-sky-500/10 text-sky-700" };
  if (role === "refuse")           return { label: "Refusé",           cls: "bg-red-500/10 text-red-600" };
  if (role === "en_attente")       return { label: "En attente",       cls: "bg-amber-500/10 text-amber-700" };
  return                                  { label: "—",                cls: "bg-muted text-muted-foreground" };
};

const inscBadge = (statut: string | null) => {
  if (statut === "validee")   return { label: "Validée",                cls: "bg-green-500/10 text-green-700" };
  if (statut === "acceptee")  return { label: "En attente de paiement", cls: "bg-violet-500/10 text-violet-700" };
  if (statut === "refusee")   return { label: "Refusée",                cls: "bg-red-500/10 text-red-600" };
  if (statut === "supprimee") return { label: "Supprimée",              cls: "bg-muted text-muted-foreground line-through" };
  return                             { label: "En cours d'examen",      cls: "bg-amber-500/10 text-amber-700" };
};

const PAIEMENT_LABELS: Record<string, string> = {
  cheque_1x: "Chèque 1 fois",
  cheque_4x: "Chèque 4 fois",
  especes: "Espèces",
  virement: "Virement",
};

const PAIEMENT_BADGE_CLS: Record<string, string> = {
  cheque_1x: "bg-blue-500/10 text-blue-700",
  cheque_4x: "bg-orange-500/10 text-orange-700",
  especes:   "bg-green-500/10 text-green-700",
  virement:  "bg-violet-500/10 text-violet-700",
};

const STATUT_ORDER: Record<string, number> = { validee: 0, acceptee: 1, en_attente: 2, refusee: 3, supprimee: 4 };

type SortCol = "nom" | "statut" | "age" | "disciplines" | "urgence" | "pass_sport" | "droit_image";


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
  const [confirmAccepter, setConfirmAccepter] = useState<Inscription | null>(null);
  const [confirmRefuser, setConfirmRefuser] = useState<Inscription | null>(null);
  const [confirmValider, setConfirmValider] = useState<Inscription | null>(null);
  const [disciplinesSanity, setDisciplinesSanity] = useState<{ _id: string; nom: string; nomCourt?: string }[]>([]);
  const [accesGalerieData, setAccesGalerieData] = useState<{ id: string; compte_id: string; discipline_sanity_id: string; actif: boolean; source: string; saison: string }[]>([]);
  const [enfantsData, setEnfantsData] = useState<{ id: string; nom: string; prenom: string; date_naissance: string | null; groupe_sanguin: string | null; allergie: string | null }[]>([]);
  const [liensData, setLiensData] = useState<{ id: string; compte_id: string; enfant_id: string; type_acces: string; enfant?: { id: string; nom: string; prenom: string; date_naissance: string | null } }[]>([]);
  const [connexionsLog, setConnexionsLog] = useState<ConnexionLog[]>([]);
  const [modalTab, setModalTab] = useState("adhesions");
  const [uploadingAttestationId, setUploadingAttestationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"liste" | "famille">("liste");
  const [sortCol, setSortCol] = useState<SortCol>("nom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: SortCol) => {
    if (sortCol === col) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortCol(col); setSortDir("asc"); }
  };
  const [reglementMode, setReglementMode] = useState<"cheque_1x" | "especes" | "virement" | "cheque_4x">("cheque_4x");
  const [reglementFilter, setReglementFilter] = useState<"inscription" | "dec" | "mars" | "juin">(() => {
    const m = new Date().getMonth();
    if (m === 11) return "dec";
    if (m === 2)  return "mars";
    if (m === 5)  return "juin";
    return "inscription";
  });
  const [adminSection, setAdminSection] = useState<"membres" | "familles" | "galeries" | "tiers" | "administration">("membres");
  const [promouvoirSelectedId, setPromouvoirSelectedId] = useState<string>("");
  const [creerMembreForm, setCreerMembreForm] = useState({ nom: "", prenom: "", email: "" });
  const [creerMembreError, setCreerMembreError] = useState<string | null>(null);
  const [creerMembreLoading, setCreerMembreLoading] = useState(false);
  const [expandedInscIds, setExpandedInscIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ActiveTab>("tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("");
  const [linkingInscToProfilMode, setLinkingInscToProfilMode] = useState(false);
  const [linkingInscToProfilId, setLinkingInscToProfilId] = useState("");
  const [adminRecapInsc, setAdminRecapInsc] = useState<Inscription | null>(null);
  const [saisonCourante, setSaisonCourante] = useState<string | null>(null);
  const [saisonFilter, setSaisonFilter] = useState<string>("");
  const [confirmNouvelleSaison, setConfirmNouvelleSaison] = useState(false);
  const [viewInscReadOnly, setViewInscReadOnly] = useState<Inscription | null>(null);
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
  const [papierErrors, setPapierErrors] = useState<Record<string, string>>({});
  const [editingInscId, setEditingInscId] = useState<string | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [savingPapier, setSavingPapier] = useState(false);
  const papierDirRef = useRef(1);
  const [papierForm, setPapierForm] = useState({
    nom: "", prenom: "", adresse: "", telMobile: "", email: "",
    dateNaissance: "", groupeSanguin: "", allergie: "", niveau: "",
    urgencePrenom: "", urgenceNom: "", urgenceTel: "", disciplines: "", saison: saisonCourante || defaultSaison,
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
      supabase.from("acces_galerie").select("id, compte_id, discipline_sanity_id, actif, source, saison"),
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
    client.fetch(`*[_type == "inscription"][0]{ saison }`)
      .then((data: { saison?: string } | null) => {
        if (data?.saison) {
          setSaisonCourante(data.saison);
          setSaisonFilter(data.saison);
          setPapierForm(f => ({ ...f, saison: data.saison! }));
        }
      })
      .catch(() => {});
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
      saison: insc.saison || saisonCourante || defaultSaison,
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

  const setPapierFieldError = (key: string, msg: string) => setPapierErrors(e => ({ ...e, [key]: msg }));
  const clearPapierFieldError = (key: string) => setPapierErrors(e => { const n = { ...e }; delete n[key]; return n; });

  const validatePapierTel = (key: string, val: string, required = false) => {
    if (!val.trim()) { required ? setPapierFieldError(key, 'Numéro de téléphone obligatoire') : clearPapierFieldError(key); return; }
    if (!REGEX_TEL_FR.test(val.trim())) setPapierFieldError(key, 'Format invalide — ex : 06 00 00 00 00');
    else clearPapierFieldError(key);
  };

  const validatePapierEmail = (key: string, val: string, required = false) => {
    if (!val.trim()) { required ? setPapierFieldError(key, 'Email obligatoire') : clearPapierFieldError(key); return; }
    if (!REGEX_EMAIL.test(val.trim())) setPapierFieldError(key, 'Format invalide — ex : nom@domaine.fr');
    else clearPapierFieldError(key);
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

    // Validation format téléphone & email
    const newPapierErrors: Record<string, string> = {};
    if (papierForm.typeInscription === "adulte") {
      if (papierForm.telMobile.trim() && !REGEX_TEL_FR.test(papierForm.telMobile.trim())) newPapierErrors.telMobile = 'Format invalide — ex : 06 00 00 00 00';
      if (papierForm.email.trim() && !REGEX_EMAIL.test(papierForm.email.trim())) newPapierErrors.email = 'Format invalide — ex : nom@domaine.fr';
    }
    if (papierForm.urgenceTel.trim() && !REGEX_TEL_FR.test(papierForm.urgenceTel.trim())) newPapierErrors.urgenceTel = 'Format invalide — ex : 06 00 00 00 00';
    if (papierForm.typeInscription === "mineur") {
      if (papierForm.parent1Tel.trim() && !REGEX_TEL_FR.test(papierForm.parent1Tel.trim())) newPapierErrors.parent1Tel = 'Format invalide — ex : 06 00 00 00 00';
      if (papierForm.parent1Email.trim() && !REGEX_EMAIL.test(papierForm.parent1Email.trim())) newPapierErrors.parent1Email = 'Format invalide — ex : nom@domaine.fr';
      if (papierForm.parent2Tel.trim() && !REGEX_TEL_FR.test(papierForm.parent2Tel.trim())) newPapierErrors.parent2Tel = 'Format invalide — ex : 06 00 00 00 00';
      if (papierForm.parent2Email.trim() && !REGEX_EMAIL.test(papierForm.parent2Email.trim())) newPapierErrors.parent2Email = 'Format invalide — ex : nom@domaine.fr';
    }
    if (Object.keys(newPapierErrors).length > 0) {
      setPapierErrors(newPapierErrors);
      toast.error("Veuillez corriger les champs en erreur.");
      return;
    }

    // Vérification doublon (uniquement pour les nouvelles inscriptions)
    if (!editingInscId) {
      try {
        const { data: isDoublon, error: doublonError } = await supabase.rpc("check_inscription_doublon", {
          p_nom:            papierForm.nom.trim(),
          p_prenom:         papierForm.prenom.trim(),
          p_saison:         papierForm.saison.trim(),
          p_user_id:        null,
          p_date_naissance: papierForm.dateNaissance || null,
        });
        if (!doublonError && isDoublon) {
          toast.error(`${papierForm.prenom} ${papierForm.nom} est déjà inscrit(e) pour la saison ${papierForm.saison}.`);
          return;
        }
      } catch {
        // Erreur réseau : on laisse passer
      }
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
        urgencePrenom: "", urgenceNom: "", urgenceTel: "", disciplines: "", saison: saisonCourante || defaultSaison,
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
    const profilRole = membres.find(m => m.id === profilId)?.role ?? "";
    const isAdmin = profilRole === "admin" || profilRole === "admin_discipline";
    const saison = isAdmin ? "" : (saisonCourante || "");
    const existing = accesGalerieData.find(a => a.compte_id === profilId && a.discipline_sanity_id === disc && a.saison === saison);
    if (checked) {
      if (existing) {
        setAccesGalerieData(prev => prev.map(a => a.id === existing.id ? { ...a, actif: true, source: "admin_manuel" } : a));
        const { error } = await supabase.from("acces_galerie").update({ actif: true, source: "admin_manuel" }).eq("id", existing.id);
        if (error) {
          setAccesGalerieData(prev => prev.map(a => a.id === existing.id ? { ...a, actif: false } : a));
          toast.error("Erreur activation galerie : " + error.message);
        }
      } else {
        const tempId = `tmp-${profilId}-${disc}`;
        setAccesGalerieData(prev => [...prev, { id: tempId, compte_id: profilId, discipline_sanity_id: disc, actif: true, source: "admin_manuel", saison }]);
        const { data, error } = await supabase.from("acces_galerie").insert({ compte_id: profilId, discipline_sanity_id: disc, actif: true, source: "admin_manuel", saison }).select().single();
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
        const { data } = await supabase.from("acces_galerie").upsert({ compte_id: profilId, discipline_sanity_id: discId, actif: false, source: "suggestion_auto", saison: saisonCourante || "" }, { onConflict: "compte_id,discipline_sanity_id,saison", ignoreDuplicates: true }).select().single();
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
        const { data } = await supabase.from("acces_galerie").upsert({ compte_id: id, discipline_sanity_id: discId, actif: false, source: "suggestion_auto", saison: saisonCourante || "" }, { onConflict: "compte_id,discipline_sanity_id,saison", ignoreDuplicates: true }).select().single();
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

  const handleCreerCompteDepuisInscription = async (
    insc: Inscription,
    opts?: { email?: string; nom?: string | null; prenom?: string | null; lierInscription?: boolean }
  ): Promise<Membre | null> => {
    const email = opts?.email ?? insc.email;
    if (!email) return null;
    const nom = opts?.nom !== undefined ? opts.nom : insc.nom;
    const prenom = opts?.prenom !== undefined ? opts.prenom : insc.prenom;
    const lierInscription = opts?.lierInscription !== false;

    // Sauvegarder la session admin — signUp() connecte automatiquement le nouvel utilisateur
    preventRedirectRef.current = true;
    const { data: { session: adminSession } } = await supabase.auth.getSession();

    const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map(b => b.toString(36)).join('').slice(0, 20);
    const fullName = [prenom, nom].filter(Boolean).join(" ") || null;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: { data: { full_name: fullName } },
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
      email,
      nom,
      prenom,
      adresse: insc.adresse,
      telephone: insc.tel_mobile,
      role: "membre",
    }, { onConflict: "id" });

    // Restaurer la session admin avant les opérations suivantes
    if (adminSession) await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
    preventRedirectRef.current = false;

    if (lierInscription) {
      await supabase.from("inscriptions").update({ user_id: newUserId }).eq("id", insc.id);
      setInscriptions(prev => prev.map(i => i.id === insc.id ? { ...i, user_id: newUserId } : i));
    }
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/amsp-website/reinitialisation-mot-de-passe`,
    });

    const newMembre: Membre = {
      id: newUserId, email, prenom, nom,
      adresse: insc.adresse, telephone: insc.tel_mobile,
      role: "membre", disciplines: null, created_at: new Date().toISOString(),
    };
    setMembres(prev => [...prev, newMembre]);
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

  const handleCreerMembreSansInscription = async () => {
    const { nom, prenom, email } = creerMembreForm;
    if (!email) { setCreerMembreError("L'email est obligatoire."); return; }
    setCreerMembreLoading(true);
    setCreerMembreError(null);

    preventRedirectRef.current = true;
    const { data: { session: adminSession } } = await supabase.auth.getSession();

    const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map(b => b.toString(36)).join("").slice(0, 20);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password: tempPassword });

    if (signUpError || !signUpData.user) {
      if (adminSession) await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
      preventRedirectRef.current = false;
      setCreerMembreError(signUpError?.message || "Email déjà utilisé ou invalide.");
      setCreerMembreLoading(false);
      return;
    }

    const newUserId = signUpData.user.id;
    await supabase.from("profils").upsert({
      id: newUserId, email, nom: nom || null, prenom: prenom || null, role: "membre",
    }, { onConflict: "id" });

    if (adminSession) await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
    preventRedirectRef.current = false;

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/amsp-website/reinitialisation-mot-de-passe`,
    });

    const newMembre: Membre = {
      id: newUserId, email, prenom: prenom || null, nom: nom || null,
      adresse: null, telephone: null, role: "membre", disciplines: null, created_at: new Date().toISOString(),
    };
    setMembres(prev => [...prev, newMembre]);
    setCreerMembreForm({ nom: "", prenom: "", email: "" });
    toast.success("Compte créé — email d'invitation envoyé.");
    setCreerMembreLoading(false);
  };

  const handleAccepterInscription = async (id: string) => {
    setProcessing(`insc-${id}`);
    const { error } = await supabase.from("inscriptions").update({ statut: "acceptee" }).eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
      setProcessing(null);
      return;
    }
    setInscriptions(prev => prev.map(i => i.id === id ? { ...i, statut: "acceptee" } : i));
    const insc = inscriptions.find(i => i.id === id);
    const inscNomA = [insc?.prenom, insc?.nom].filter(Boolean).join(" ") || "Dossier";
    toast.success("Dossier accepté", {
      description: `${inscNomA} — en attente de paiement.`,
      duration: 7000,
    });
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
    const isMineur = insc?.type_inscription === "mineur";
    // Pour les mineurs : utiliser l'email du parent 1 pour créer/trouver le compte famille
    const emailCompte = isMineur ? (insc?.parent1_email || insc?.email) : insc?.email;

    let matchedProfil = insc ? membres.find((m) =>
      m.id === insc.user_id ||
      (!insc.user_id && emailCompte && emailCompte.toLowerCase() === m.email.toLowerCase())
    ) : null;

    let accountCreated = false;
    if (!matchedProfil && emailCompte) {
      const newMembre = await handleCreerCompteDepuisInscription(insc!, {
        email: emailCompte,
        nom: isMineur ? (insc?.parent1_nom || null) : (insc?.nom || null),
        prenom: isMineur ? (insc?.parent1_prenom || null) : (insc?.prenom || null),
      });
      if (newMembre) { matchedProfil = newMembre; accountCreated = true; }
    } else if (matchedProfil && !insc?.user_id) {
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
          { compte_id: matchedProfil.id, discipline_sanity_id: discId, actif: true, source: "suggestion_auto", inscription_id: id, saison: insc?.saison || saisonCourante || "" },
          { onConflict: "compte_id,discipline_sanity_id,saison", ignoreDuplicates: false }
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

    const inscNomV = [insc?.prenom, insc?.nom].filter(Boolean).join(" ") || "Inscription";
    toast.success("Inscription validée", {
      description: accountCreated
        ? `${inscNomV} — compte créé, email d'invitation envoyé.`
        : `${inscNomV} — dossier définitivement validé.`,
      duration: 7000,
    });

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
      setInscriptions((prev) => prev.map((i) => i.id === id ? { ...i, statut: "refusee" } : i));
      const insc = inscriptions.find((i) => i.id === id);
      const inscNomR = [insc?.prenom, insc?.nom].filter(Boolean).join(" ") || "Dossier";
      toast.warning("Dossier refusé", {
        description: `${inscNomR} — le dossier a été refusé et la personne notifiée.`,
        duration: 7000,
      });
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
    let data = isSuperAdmin ? rawData : rawData.filter(i => disciplineMatch(i.disciplines, currentUserDisciplines));
    if (saisonFilter) data = data.filter(i => i.saison === saisonFilter);

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
    const VIOLET_BG = 'FFede9fe';
    const VIOLET_FG = 'FF5b21b6';
    const GRIS_BG = 'FFf3f4f6';
    const GRIS_FG = 'FF6b7280';
    const NB_COLS = 26;

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
      'Numéro', 'Nom', 'Prénom', 'Date naissance', 'Âge', 'Type',
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
      validee:    { bg: VERT_BG,    fg: VERT_FG },
      acceptee:   { bg: VIOLET_BG,  fg: VIOLET_FG },
      refusee:    { bg: ROUGE_BG,   fg: ROUGE_FG },
      en_attente: { bg: AMBRE_BG,   fg: AMBRE_FG },
      supprimee:  { bg: GRIS_BG,    fg: GRIS_FG },
    };

    data.forEach((i, idx) => {
      const isEven = idx % 2 === 0;
      const rowBg = isEven ? GRIS_CLAIR : BLANC;
      const statut = i.statut || 'en_attente';
      const age = calcAge(i.date_naissance);
      const row = sheet.addRow([
        idx + 1,
        i.nom || '',
        i.prenom || '',
        i.date_naissance ? new Date(i.date_naissance).toLocaleDateString('fr-FR') : '',
        age !== null ? age : '',
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
        { validee: 'Validée', refusee: 'Refusée', en_attente: "En cours d'examen", acceptee: 'En attente de paiement', supprimee: 'Supprimée' }[statut] ?? statut,
        i.source === 'papier' ? 'Papier' : 'En ligne',
        new Date(i.created_at).toLocaleDateString('fr-FR'),
      ]);
      row.height = 18;
      const sc = statutColors[statut] || { bg: rowBg, fg: '00000000' };
      row.eachCell((cell, colNum) => {
        if (colNum === 24) {
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: sc.fg } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sc.bg } };
        } else {
          cell.font = { name: 'Calibri', size: 9 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        }
        cell.alignment = { vertical: 'middle', wrapText: false };
      });
    });

    //               N°   Nom  Prén  DdN  Âge  Type  Adr  Tel  Email  Disc  Niv  GS   Allerg  Urg  Paiem  PS   DI   AP   P1   P1mail P1tel P2   Sais  Stat  Src  Reçu
    const colWidths = [7,  16,  14,   13,  7,   10,   30,  14,  28,   20,   12,  12,  18,     24,  14,    9,   9,   14,  22,  24,    13,   22,  12,   12,   9,   12];
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

  const handleNouvelleSaison = async () => {
    setProcessing("nouvelle-saison");
    const { error } = await supabase.from("profils").update({ role: "en_attente" }).eq("role", "membre");
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Tous les membres ont été remis en attente. Ils devront se réinscrire pour la nouvelle saison.");
      await loadData();
    }
    setProcessing(null);
    setConfirmNouvelleSaison(false);
  };

  // --- Calcul des lignes ---
  const enAttenteInscription = inscriptions.filter(
    (i) => i.statut === "en_attente" &&
      (isSuperAdmin || disciplineMatch(i.disciplines, currentUserDisciplines)) &&
      (!saisonFilter || i.saison === saisonFilter)
  );
  const accepteeInscription = inscriptions.filter(
    (i) => i.statut === "acceptee" &&
      (isSuperAdmin || disciplineMatch(i.disciplines, currentUserDisciplines)) &&
      (!saisonFilter || i.saison === saisonFilter)
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
    if (matchInscToProfil(i, profil)) return true;
    if (!i.user_id && i.source !== "papier" && !!i.email && i.statut !== "en_attente" && i.email.toLowerCase() === profil.email.toLowerCase()) return true;
    if (i.source === "papier" && !!i.email && i.email.toLowerCase() === profil.email.toLowerCase()) return true;
    if (i.source === "papier" && !i.email && sameNom && samePrenom && !!profil.nom && !!profil.prenom) return true;
    return false;
  };

  const lignes: Ligne[] = [];

  // Une entrée par inscription (vue inscription-centrique)
  inscriptions.forEach((insc) => {
    if (!isSuperAdmin && !disciplineMatch(insc.disciplines, currentUserDisciplines)) return;
    if (saisonFilter && insc.saison !== saisonFilter) return;
    const linkedProfil = membres.find(m => matchInscToProfilFull(insc, m)) ?? null;
    lignes.push({ type: "inscription_seule", inscription: insc, profil: linkedProfil });
  });

  lignes.sort((a, b) => {
    const nomA = a.type === "profil" ? (a.profil.nom || "") : (a.inscription.nom || "");
    const nomB = b.type === "profil" ? (b.profil.nom || "") : (b.inscription.nom || "");
    const prenomA = (a.type === "profil" ? a.profil.prenom : a.inscription.prenom) || "";
    const prenomB = (b.type === "profil" ? b.profil.prenom : b.inscription.prenom) || "";
    const keyA = nomA || prenomA;
    const keyB = nomB || prenomB;
    const cmp = keyA.localeCompare(keyB, "fr", { sensitivity: "base" });
    return cmp !== 0 ? cmp : prenomA.localeCompare(prenomB, "fr", { sensitivity: "base" });
  });

  // --- Compteurs d'onglets ---
  const countEnAttente = lignes.filter(l =>
    l.type === "inscription_seule" && l.inscription.statut === "en_attente"
  ).length;

  const countReglement = inscriptions.filter(i =>
    i.statut === "acceptee" &&
    (isSuperAdmin || disciplineMatch(i.disciplines, currentUserDisciplines)) &&
    (!saisonFilter || i.saison === saisonFilter)
  ).length;
  const countRefusees = inscriptions.filter(i =>
    (i.statut === "refusee" || i.statut === "supprimee") &&
    (isSuperAdmin || disciplineMatch(i.disciplines, currentUserDisciplines)) &&
    (!saisonFilter || i.saison === saisonFilter)
  ).length;

  // Lignes visibles dans le tableau principal (excl. en_attente, refusée, supprimée)
  const lignesTableau = lignes.filter(l => {
    if (l.type === "inscription_seule") {
      return l.inscription.statut !== "en_attente" && l.inscription.statut !== "refusee" && l.inscription.statut !== "supprimee";
    }
    // profil (compte admin sans inscription) — toujours visible
    return true;
  });

  const countValidés = lignesTableau.filter(l =>
    l.type === "inscription_seule" && l.inscription.statut === "validee"
  ).length;

  // --- Filtrage ---
  // Le tab en_attente utilise `lignes` pour inclure les inscriptions en attente
  const lignesFiltreesSource = activeTab === "en_attente" ? lignes : lignesTableau;
  const lignesFiltrees = lignesFiltreesSource.filter(ligne => {

    // Onglet "Validés"
    if (activeTab === "tous") {
      if (ligne.type === "profil") {
        const isAdminRole = ligne.profil.role === "admin" || ligne.profil.role === "admin_discipline";
        if (!isAdminRole) return false;
      }
      if (ligne.type === "inscription_seule" && ligne.inscription.statut !== "validee") return false;
    }

    // Onglet "Dossiers à examiner"
    if (activeTab === "en_attente") {
      if (ligne.type === "profil") return false;
      if (ligne.type === "inscription_seule" && ligne.inscription.statut !== "en_attente") return false;
    }

    // Onglet "En attente de paiement"
    if (activeTab === "reglement") {
      if (ligne.type === "profil") return false;
      if (ligne.type === "inscription_seule" && ligne.inscription.statut !== "acceptee") return false;
    }

    if (filterDiscipline) {
      if (ligne.type === "profil") {
        const profilDiscs = (ligne.profil.disciplines || "").split(",").map(s => s.trim()).filter(Boolean);
        if (!profilDiscs.includes(filterDiscipline)) return false;
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
        if (!mp) return false;
      } else {
        const i = ligne.inscription;
        const p = ligne.profil;
        const matchInsc = (i.nom || "").toLowerCase().includes(q) ||
          (i.prenom || "").toLowerCase().includes(q) ||
          (i.email || "").toLowerCase().includes(q) ||
          (i.parent1_email || "").toLowerCase().includes(q);
        const matchProfil = p ? (
          (p.nom || "").toLowerCase().includes(q) ||
          (p.prenom || "").toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
        ) : false;
        if (!matchInsc && !matchProfil) return false;
      }
    }
    return true;
  });

  const lignesSorted = (() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...lignesFiltrees].sort((a, b) => {
      switch (sortCol) {
        case "nom": {
          const nA = (a.type === "inscription_seule" ? a.inscription.nom : a.profil.nom) || "";
          const nB = (b.type === "inscription_seule" ? b.inscription.nom : b.profil.nom) || "";
          const pA = (a.type === "inscription_seule" ? a.inscription.prenom : a.profil.prenom) || "";
          const pB = (b.type === "inscription_seule" ? b.inscription.prenom : b.profil.prenom) || "";
          const c = (nA || pA).localeCompare(nB || pB, "fr", { sensitivity: "base" });
          return c !== 0 ? c * dir : pA.localeCompare(pB, "fr", { sensitivity: "base" }) * dir;
        }
        case "statut": {
          const sA = a.type === "inscription_seule" ? (STATUT_ORDER[a.inscription.statut] ?? 5) : -1;
          const sB = b.type === "inscription_seule" ? (STATUT_ORDER[b.inscription.statut] ?? 5) : -1;
          return (sA - sB) * dir;
        }
        case "age": {
          const dA = a.type === "inscription_seule" ? a.inscription.date_naissance : null;
          const dB = b.type === "inscription_seule" ? b.inscription.date_naissance : null;
          if (!dA && !dB) return 0;
          if (!dA) return dir; if (!dB) return -dir;
          return (new Date(dA).getTime() - new Date(dB).getTime()) * dir;
        }
        case "disciplines": {
          const dA = a.type === "inscription_seule" ? resolveDiscNoms(a.inscription.disciplines).join(", ") : "";
          const dB = b.type === "inscription_seule" ? resolveDiscNoms(b.inscription.disciplines).join(", ") : "";
          return dA.localeCompare(dB, "fr", { sensitivity: "base" }) * dir;
        }
        case "urgence": {
          const uA = a.type === "inscription_seule" ? (a.inscription.urgence_contact || "") : "";
          const uB = b.type === "inscription_seule" ? (b.inscription.urgence_contact || "") : "";
          return uA.localeCompare(uB, "fr", { sensitivity: "base" }) * dir;
        }
        case "pass_sport": {
          const pA = a.type === "inscription_seule" ? (a.inscription.pass_sport ? 1 : 0) : 0;
          const pB = b.type === "inscription_seule" ? (b.inscription.pass_sport ? 1 : 0) : 0;
          return (pA - pB) * dir;
        }
        case "droit_image": {
          const iA = a.type === "inscription_seule" ? (a.inscription.droit_image ? 1 : 0) : 0;
          const iB = b.type === "inscription_seule" ? (b.inscription.droit_image ? 1 : 0) : 0;
          return (iA - iB) * dir;
        }
        default: return 0;
      }
    });
  })();

  type FamilleGroupe = { key: string; profil: Membre | null; lignes: Ligne[] };
  const familleGroupes: FamilleGroupe[] = viewMode === "famille" ? (() => {
    const map = new Map<string, FamilleGroupe>();
    lignesSorted.forEach(ligne => {
      const profil = ligne.type === "profil" ? ligne.profil : ligne.profil;
      const key = profil ? profil.id : `i-${ligne.type === "inscription_seule" ? ligne.inscription.id : ligne.profil.id}`;
      if (!map.has(key)) map.set(key, { key, profil: profil ?? null, lignes: [] });
      map.get(key)!.lignes.push(ligne);
    });
    return Array.from(map.values()).sort((a, b) => {
      const nA = a.profil ? (a.profil.nom || a.profil.prenom || a.profil.email || "") : (a.lignes[0]?.type === "inscription_seule" ? (a.lignes[0].inscription.nom || "") : "");
      const nB = b.profil ? (b.profil.nom || b.profil.prenom || b.profil.email || "") : (b.lignes[0]?.type === "inscription_seule" ? (b.lignes[0].inscription.nom || "") : "");
      return nA.localeCompare(nB, "fr", { sensitivity: "base" });
    });
  })() : [];

  const reglementItems = activeTab === "reglement"
    ? inscriptions.filter(i => {
        if (i.statut !== "acceptee") return false;
        if (!isSuperAdmin && !disciplineMatch(i.disciplines, currentUserDisciplines)) return false;
        if (saisonFilter && i.saison !== saisonFilter) return false;
        if (filterDiscipline && !(i.disciplines || "").split(",").map(s => s.trim()).includes(filterDiscipline)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (i.nom || "").toLowerCase().includes(q) ||
                 (i.prenom || "").toLowerCase().includes(q) ||
                 (i.email || "").toLowerCase().includes(q);
        }
        return true;
      }).sort((a, b) => {
        if ((b.saison || "") !== (a.saison || "")) return (b.saison || "").localeCompare(a.saison || "");
        const ord: Record<string, number> = { cheque_4x: 0, cheque_1x: 1, virement: 2, especes: 3 };
        const pa = ord[a.moyen_paiement ?? ""] ?? 4;
        const pb = ord[b.moyen_paiement ?? ""] ?? 4;
        if (pa !== pb) return pa - pb;
        return (a.nom || "").localeCompare(b.nom || "", "fr", { sensitivity: "base" });
      })
    : [];

  const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  type PaymentEvent = {
    insc: Inscription;
    installment: number;
    total: number;
    dueMonth: number;
    dueYear: number;
    dueDateLabel: string;
    isFirstCheck: boolean;
  };

  const allPaymentEvents: PaymentEvent[] = (() => {
    const evts: PaymentEvent[] = [];
    const relevant = inscriptions.filter(i =>
      (i.statut === "validee" || i.statut === "acceptee") &&
      i.moyen_paiement &&
      (isSuperAdmin || disciplineMatch(i.disciplines, currentUserDisciplines)) &&
      (!saisonFilter || i.saison === saisonFilter)
    );
    for (const insc of relevant) {
      const created = new Date(insc.created_at);
      if (insc.moyen_paiement === "cheque_4x" && insc.saison) {
        const years = (insc.saison.match(/\d{4}/g) || []).map(Number);
        const y1 = years[0], y2 = years[1];
        if (!y1 || !y2) continue;
        evts.push({ insc, installment: 1, total: 4, dueMonth: created.getMonth(), dueYear: created.getFullYear(), dueDateLabel: "À l'inscription", isFirstCheck: true });
        evts.push({ insc, installment: 2, total: 4, dueMonth: 11, dueYear: y1, dueDateLabel: `Décembre ${y1}`, isFirstCheck: false });
        evts.push({ insc, installment: 3, total: 4, dueMonth: 2,  dueYear: y2, dueDateLabel: `Mars ${y2}`,     isFirstCheck: false });
        evts.push({ insc, installment: 4, total: 4, dueMonth: 5,  dueYear: y2, dueDateLabel: `Juin ${y2}`,     isFirstCheck: false });
      } else {
        evts.push({ insc, installment: 1, total: 1, dueMonth: created.getMonth(), dueYear: created.getFullYear(), dueDateLabel: "À l'inscription", isFirstCheck: true });
      }
    }
    return evts;
  })();

  const reglementEvents = (() => {
    let evts = allPaymentEvents.filter(e => e.insc.moyen_paiement === reglementMode);
    if (reglementMode === "cheque_4x") {
      if (reglementFilter === "inscription") evts = evts.filter(e => e.installment === 1);
      else if (reglementFilter === "dec")    evts = evts.filter(e => e.installment === 2);
      else if (reglementFilter === "mars")   evts = evts.filter(e => e.installment === 3);
      else if (reglementFilter === "juin")   evts = evts.filter(e => e.installment === 4);
    }
    if (filterDiscipline) evts = evts.filter(e => (e.insc.disciplines || "").split(",").map(s => s.trim()).includes(filterDiscipline));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      evts = evts.filter(e =>
        (e.insc.nom || "").toLowerCase().includes(q) ||
        (e.insc.prenom || "").toLowerCase().includes(q) ||
        (e.insc.email || "").toLowerCase().includes(q)
      );
    }
    return evts.sort((a, b) => {
      if (a.dueYear !== b.dueYear) return a.dueYear - b.dueYear;
      if (a.dueMonth !== b.dueMonth) return a.dueMonth - b.dueMonth;
      return (a.insc.nom || "").localeCompare(b.insc.nom || "", "fr", { sensitivity: "base" });
    });
  })();

  const currentMonth = new Date().getMonth();
  const currentYear  = new Date().getFullYear();
  const isCurrentFilterMonth = (filter: "dec" | "mars" | "juin") => {
    if (filter === "dec"  && currentMonth === 11) return true;
    if (filter === "mars" && currentMonth === 2)  return true;
    if (filter === "juin" && currentMonth === 5)  return true;
    return false;
  };
  const countReglementsMois = allPaymentEvents.filter(e => e.dueMonth === currentMonth && e.dueYear === currentYear && e.insc.moyen_paiement === "cheque_4x" && e.installment > 1).length;

  const refuseesItems = activeTab === "refusees"
    ? inscriptions.filter(i => {
        if (i.statut !== "refusee" && i.statut !== "supprimee") return false;
        if (!isSuperAdmin && !disciplineMatch(i.disciplines, currentUserDisciplines)) return false;
        if (saisonFilter && i.saison !== saisonFilter) return false;
        if (filterDiscipline && !(i.disciplines || "").split(",").map(s => s.trim()).includes(filterDiscipline)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (i.nom || "").toLowerCase().includes(q) ||
                 (i.prenom || "").toLowerCase().includes(q) ||
                 (i.email || "").toLowerCase().includes(q);
        }
        return true;
      }).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    : [];

  const selectedLigne = selectedKey
    ? lignes.find(l => (l.type === "profil" ? `p-${l.profil.id}` : `i-${l.inscription.id}`) === selectedKey) ?? null
    : null;

  const allDisciplinesForTable = useMemo(() => disciplinesSanity, [disciplinesSanity]);

  const saisonsDisponibles = useMemo(() => {
    const s = new Set(inscriptions.map(i => i.saison).filter(Boolean) as string[]);
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [inscriptions]);

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
                <div className="flex flex-col items-end gap-2">
                  {saisonsDisponibles.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Saison :</span>
                      <select
                        value={saisonFilter}
                        onChange={e => setSaisonFilter(e.target.value)}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">Toutes les saisons</option>
                        {saisonsDisponibles.map(s => (
                          <option key={s} value={s}>{s}{s === saisonCourante ? " (en cours)" : ""}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button size="sm" onClick={() => setShowPapierModal(true)} className="gap-2 shrink-0">
                      <Plus size={14} /> Saisir inscription papier
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 shrink-0">
                      <Download size={14} /> Exporter{saisonFilter ? ` (${saisonFilter})` : ""}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation sections */}
            {isSuperAdmin && (
              <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-border pb-3">
                {([
                  { id: "membres",  label: "Inscriptions", primary: true },
                  { id: "administration", label: "Administration", primary: false },
                  { id: "galeries", label: "Accès galeries", primary: false },
                ] as { id: typeof adminSection; label: string; primary: boolean }[]).map(s => (
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


                {/* Bloc 1 — Dossiers à examiner */}
                {enAttenteInscription.length > 0 && (
                  <div className="rounded-lg border border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <ClipboardList size={16} className="text-amber-600" />
                      <h2 className="font-serif font-bold text-sm text-amber-800 dark:text-amber-400">
                        Dossiers à examiner
                        <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">{enAttenteInscription.length}</span>
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {enAttenteInscription.map((insc) => (
                        <div key={insc.id} className="flex flex-col gap-3 rounded-md border border-amber-200/50 bg-white/60 dark:bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                            {insc.source === "papier" ? (
                              <Button size="sm" variant="outline" onClick={() => openPapierEdit(insc)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-muted-foreground"><Pencil size={13} /> Modifier</Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => setViewInscReadOnly(insc)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-muted-foreground"><ClipboardList size={13} /> Étudier le dossier</Button>
                            )}
                            <Button size="sm" onClick={() => setConfirmAccepter(insc)} disabled={processing === `insc-${insc.id}`} className="gap-1"><CheckCircle size={13} /> Accepter</Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirmRefuser(insc)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-destructive hover:text-destructive"><XCircle size={13} /> Refuser</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bloc 2 — En attente de paiement */}
                {accepteeInscription.length > 0 && (
                  <div className="rounded-lg border border-violet-200/60 bg-violet-50/30 dark:bg-violet-950/10 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <ClipboardList size={16} className="text-violet-600" />
                      <h2 className="font-serif font-bold text-sm text-violet-800 dark:text-violet-400">
                        En attente de paiement
                        <span className="ml-2 rounded-full bg-violet-500 px-2 py-0.5 text-xs text-white">{accepteeInscription.length}</span>
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {accepteeInscription.map((insc) => (
                        <div key={insc.id} className="flex flex-col gap-3 rounded-md border border-violet-200/50 bg-white/60 dark:bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{insc.nom || ""} {insc.prenom || ""}{!insc.prenom && !insc.nom && <span className="text-muted-foreground italic">Sans nom</span>}</p>
                              {insc.source === "papier" && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-700"><FileText size={9} /> Papier</span>}
                              {insc.moyen_paiement && <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${PAIEMENT_BADGE_CLS[insc.moyen_paiement] ?? "bg-secondary text-muted-foreground"}`}>{PAIEMENT_LABELS[insc.moyen_paiement] ?? insc.moyen_paiement}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {insc.disciplines
                                ? insc.disciplines.split(",").map(id => disciplinesSanity.find(d => d._id === id.trim())?.nom ?? id.trim()).join(", ")
                                : "—"
                              } · {insc.saison || "—"}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" onClick={() => setConfirmValider(insc)} disabled={processing === `insc-${insc.id}`} className="gap-1 bg-green-600 hover:bg-green-700 text-white border-0"><CheckCircle size={13} /> Valider</Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirmRefuser(insc)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-destructive hover:text-destructive"><XCircle size={13} /> Refuser</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tableau unifié — cartes */}
                <div className="rounded-lg border border-border/50 bg-card p-5">
                  <h2 className="font-serif font-bold mb-4">
                    {isSuperAdmin ? `Validés (${countValidés})` : `Validés — votre discipline (${countValidés})`}
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
                        {disciplinesSanity.filter(d => !d.nom.toLowerCase().includes("stage")).map(d => <option key={d._id} value={d._id}>{d.nom}</option>)}
                      </select>
                    )}
                    {activeTab !== "reglements" && activeTab !== "refusees" && (
                      <button
                        onClick={() => setViewMode(v => v === "liste" ? "famille" : "liste")}
                        title={viewMode === "famille" ? "Vue liste" : "Vue famille"}
                        className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-md border transition-colors ${viewMode === "famille" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                      >
                        {viewMode === "famille" ? <List size={15} /> : <Users size={15} />}
                      </button>
                    )}
                  </div>

                  {/* Onglets */}
                  <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ActiveTab)} className="mb-4">
                    <TabsList className="h-8 text-xs">
                      <TabsTrigger value="tous" className="text-xs px-3 h-7">Validés ({countValidés})</TabsTrigger>
                      <TabsTrigger value="en_attente" className="text-xs px-3 h-7">
                        Dossiers à examiner {countEnAttente > 0 && <span className="ml-1.5 rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-0.5 leading-none">{countEnAttente}</span>}
                      </TabsTrigger>
                      <TabsTrigger value="reglement" className="text-xs px-3 h-7">
                        En attente de paiement {countReglement > 0 && <span className="ml-1.5 rounded-full bg-violet-500 text-white text-[10px] px-1.5 py-0.5 leading-none">{countReglement}</span>}
                      </TabsTrigger>
                      <TabsTrigger value="reglements" className="text-xs px-3 h-7">
                        Règlements {countReglementsMois > 0 && <span className="ml-1.5 rounded-full bg-blue-500 text-white text-[10px] px-1.5 py-0.5 leading-none">{countReglementsMois}</span>}
                      </TabsTrigger>
                      <TabsTrigger value="refusees" className="text-xs px-3 h-7">
                        Refusées {countRefusees > 0 && <span className="ml-1.5 rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5 leading-none">{countRefusees}</span>}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Tableau liste */}
                  {activeTab === "reglements" ? (
                    <div className="space-y-4">
                      {/* Onglets mode de paiement */}
                      <div className="flex border-b border-border/50 overflow-x-auto -mx-1 px-1">
                        {([
                          { id: "cheque_1x", label: "Chèque 1 fois", cls: "bg-blue-500/10 text-blue-700" },
                          { id: "especes",   label: "Espèces",        cls: "bg-green-500/10 text-green-700" },
                          { id: "virement",  label: "Virement",       cls: "bg-violet-500/10 text-violet-700" },
                          { id: "cheque_4x", label: "Chèque 4 fois",  cls: "bg-orange-500/10 text-orange-700" },
                        ] as const).map(({ id, label, cls }) => {
                          const cnt = allPaymentEvents.filter(e =>
                            e.insc.moyen_paiement === id &&
                            (!saisonFilter || e.insc.saison === saisonFilter) &&
                            (isSuperAdmin || disciplineMatch(e.insc.disciplines, currentUserDisciplines))
                          ).length;
                          const isActive = reglementMode === id;
                          return (
                            <button key={id} onClick={() => setReglementMode(id)}
                              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                              {label}
                              {cnt > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold ${isActive ? cls : "bg-secondary text-muted-foreground"}`}>{cnt}</span>}
                            </button>
                          );
                        })}
                      </div>

                      {/* Sous-onglets échéances — uniquement pour Chèque 4 fois */}
                      {reglementMode === "cheque_4x" && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {([
                            { id: "inscription", label: "À l'inscription" },
                            { id: "dec",  label: "Décembre" },
                            { id: "mars", label: "Mars" },
                            { id: "juin", label: "Juin" },
                          ] as const).map(({ id, label }) => {
                            const isCurrent = id !== "inscription" && isCurrentFilterMonth(id as "dec" | "mars" | "juin");
                            const isActive = reglementFilter === id;
                            return (
                              <button key={id} onClick={() => setReglementFilter(id)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1.5 ${isActive ? "bg-primary text-primary-foreground" : isCurrent ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
                                {label}
                                {isCurrent && <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${isActive ? "bg-white/20 text-white" : "bg-primary/20 text-primary"}`}>Ce mois</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {reglementEvents.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">Aucun règlement pour ce filtre.</p>
                      ) : (
                        <div className="overflow-x-auto -mx-5 px-5">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b border-border/60">
                                <th className="text-left pb-3 pr-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[160px]">Inscrit(e)</th>
                                <th className="text-left pb-3 pr-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">Discipline(s)</th>
                                {reglementMode === "cheque_4x" && (
                                  <th className="text-left pb-3 pr-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">Chèque</th>
                                )}
                                {reglementMode === "cheque_4x" && (
                                  <th className="text-left pb-3 pr-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">Échéance</th>
                                )}
                                <th className="text-left pb-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">Saison</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {reglementEvents.map((evt, idx) => {
                                const isCurrentMonth = reglementMode === "cheque_4x" && evt.dueMonth === new Date().getMonth() && evt.dueYear === new Date().getFullYear();
                                const discs = resolveDiscNoms(evt.insc.disciplines);
                                return (
                                  <tr key={`${evt.insc.id}-${evt.installment}`}
                                    className={`cursor-pointer transition-colors ${isCurrentMonth ? "bg-blue-50/60 hover:bg-blue-100/60" : idx % 2 === 0 ? "hover:bg-primary/[0.03]" : "bg-secondary/20 hover:bg-secondary/40"}`}
                                    onClick={() => { setModalTab("adhesions"); setSelectedKey(`i-${evt.insc.id}`); }}>
                                    <td className="py-3 pr-4">
                                      <p className="font-semibold text-sm leading-tight">{[evt.insc.nom, evt.insc.prenom].filter(Boolean).join(" ") || <span className="italic text-muted-foreground font-normal text-xs">Sans nom</span>}</p>
                                      {evt.insc.email && <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{evt.insc.email}</p>}
                                    </td>
                                    <td className="py-3 pr-4">
                                      <div className="flex flex-wrap gap-1">
                                        {discs.length === 0
                                          ? <span className="text-xs text-muted-foreground">—</span>
                                          : discs.map(d => <span key={d} className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{d}</span>)
                                        }
                                      </div>
                                    </td>
                                    {reglementMode === "cheque_4x" && (
                                      <td className="py-3 pr-4">
                                        <span className="text-xs font-semibold text-orange-700">{evt.installment}/{evt.total}</span>
                                      </td>
                                    )}
                                    {reglementMode === "cheque_4x" && (
                                      <td className="py-3 pr-4">
                                        <span className={`text-xs font-medium ${isCurrentMonth ? "text-blue-700" : "text-foreground"}`}>{evt.dueDateLabel}</span>
                                        {isCurrentMonth && <span className="ml-1.5 inline-block rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Ce mois</span>}
                                      </td>
                                    )}
                                    <td className="py-3 text-xs text-muted-foreground">{evt.insc.saison || "—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : activeTab === "refusees" ? (
                    refuseesItems.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">Aucune inscription refusée.</p>
                    ) : (
                      <div className="overflow-x-auto -mx-5 px-5">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-border/60">
                              <th className="text-left pb-3 pr-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[160px]">Inscrit(e)</th>
                              <th className="text-left pb-3 pr-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">Discipline(s)</th>
                              <th className="text-left pb-3 pr-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap w-24">Saison</th>
                              <th className="text-left pb-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {refuseesItems.map((insc, idx) => {
                              const iBdg = inscBadge(insc.statut);
                              const discs = resolveDiscNoms(insc.disciplines);
                              return (
                                <tr key={insc.id} className={`hover:bg-primary/[0.03] cursor-pointer ${idx % 2 === 0 ? "" : "bg-secondary/20"}`}
                                  onClick={() => { setModalTab("adhesions"); setSelectedKey(`i-${insc.id}`); }}>
                                  <td className="py-3 pr-4">
                                    <p className="font-semibold text-sm leading-tight">{[insc.nom, insc.prenom].filter(Boolean).join(" ") || <span className="italic text-muted-foreground font-normal text-xs">Sans nom</span>}</p>
                                    {insc.email && <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{insc.email}</p>}
                                  </td>
                                  <td className="py-3 pr-4">
                                    <div className="flex flex-wrap gap-1">
                                      {discs.length === 0
                                        ? <span className="text-xs text-muted-foreground">—</span>
                                        : discs.map(d => <span key={d} className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{d}</span>)
                                      }
                                    </div>
                                  </td>
                                  <td className="py-3 pr-4 text-xs text-muted-foreground">{insc.saison || "—"}</td>
                                  <td className="py-3">
                                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${iBdg.cls}`}>{iBdg.label}</span>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(insc.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</p>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : lignesSorted.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Aucun résultat.</p>
                  ) : viewMode === "famille" ? (
                    <div className="space-y-3">
                      {familleGroupes.map(groupe => {
                        const { profil: gProfil } = groupe;
                        const lignesSorted = groupe.lignes.slice().sort((a, b) => {
                          const ageA = a.type === "inscription_seule" ? calcAge(a.inscription.date_naissance) : null;
                          const ageB = b.type === "inscription_seule" ? calcAge(b.inscription.date_naissance) : null;
                          if (ageA === null && ageB === null) return 0;
                          if (ageA === null) return 1;
                          if (ageB === null) return -1;
                          return ageB - ageA;
                        });
                        return (
                          <div key={groupe.key} className="rounded-lg border border-border/50 overflow-hidden">
                            {gProfil && (
                              <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/30 border-b border-border/30">
                                <Users size={13} className="shrink-0 text-muted-foreground" />
                                {(gProfil.nom || gProfil.prenom) ? (
                                  <>
                                    <span className="text-xs font-semibold text-foreground truncate">{[gProfil.nom, gProfil.prenom].filter(Boolean).join(" ")}</span>
                                    <span className="text-xs text-muted-foreground truncate">— {gProfil.email}</span>
                                  </>
                                ) : (
                                  <span className="text-xs font-semibold text-foreground truncate">{gProfil.email}</span>
                                )}
                                <span className={`ml-auto shrink-0 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${roleBadge(gProfil.role).cls}`}>{roleBadge(gProfil.role).label}</span>
                              </div>
                            )}
                            {lignesSorted.map(ligne => {
                              const lkey = ligne.type === "profil" ? `p-${ligne.profil.id}` : `i-${ligne.inscription.id}`;
                              if (ligne.type === "profil") {
                                const { profil: p } = ligne;
                                const roleBdg = roleBadge(p.role);
                                return (
                                  <div key={lkey} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-primary/[0.03] transition-colors border-b border-border/20 last:border-0" onClick={() => { setModalTab("adhesions"); setSelectedKey(lkey); }}>
                                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ageBadgeCls(null)}`}><Shield size={12} /></div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">{[p.nom, p.prenom].filter(Boolean).join(" ") || p.email}</p>
                                    </div>
                                    <span className={`shrink-0 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${roleBdg.cls}`}>{roleBdg.label}</span>
                                  </div>
                                );
                              }
                              const { inscription: insc } = ligne;
                              const fNom = insc.nom || "";
                              const fPrenom = insc.prenom || "";
                              const discs = resolveDiscNoms(insc.disciplines);
                              const age = calcAge(insc.date_naissance);
                              return (
                                <div key={lkey} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-primary/[0.03] transition-colors border-b border-border/20 last:border-0" onClick={() => { setModalTab("adhesions"); setSelectedKey(lkey); }}>
                                  <div className="flex flex-col items-center shrink-0 w-9">
                                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${ageBadgeCls(insc.date_naissance)}`}>{age !== null ? age : "—"}</div>
                                    {age !== null && <span className="text-[9px] text-muted-foreground leading-none mt-0.5">ans</span>}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{[fNom, fPrenom].filter(Boolean).join(" ") || <span className="italic text-muted-foreground text-xs font-normal">Sans nom</span>}</p>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {discs.map(d => <span key={d} className="inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{d}</span>)}
                                      {insc.source === "papier" && <span className="inline-block rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">papier</span>}
                                    </div>
                                  </div>
                                  {insc.pass_sport && (
                                    <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium"><CheckCircle size={9} /> Pass Sport</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-5 px-5">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          {(() => {
                            const thCls = "text-left pb-3 pr-4 font-semibold text-xs uppercase tracking-wide whitespace-nowrap cursor-pointer select-none group";
                            const ico = (col: SortCol) => sortCol === col
                              ? sortDir === "asc" ? <ChevronUp size={10} className="ml-0.5 shrink-0 text-primary" /> : <ChevronDown size={10} className="ml-0.5 shrink-0 text-primary" />
                              : <ChevronsUpDown size={10} className="ml-0.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70" />;
                            const thLabel = (col: SortCol, label: string, extra = "") =>
                              <th className={`${thCls} ${sortCol === col ? "text-primary" : "text-muted-foreground hover:text-foreground"} ${extra}`} onClick={() => handleSort(col)}>
                                <span className="inline-flex items-center">{label}{ico(col)}</span>
                              </th>;
                            return (
                              <tr className="border-b border-border/60">
                                {thLabel("nom", "Membre", "min-w-[200px]")}
                                {thLabel("statut", "Statut", "min-w-[140px]")}
                                {thLabel("age", "Âge", "w-24")}
                                {thLabel("disciplines", "Disciplines")}
                                {thLabel("urgence", "Urgence")}
                                {thLabel("pass_sport", "Pass Sport")}
                                <th className={`${thCls} pb-3 pr-0 ${sortCol === "droit_image" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`} onClick={() => handleSort("droit_image")}>
                                  <span className="inline-flex items-center">Droit image{ico("droit_image")}</span>
                                </th>
                              </tr>
                            );
                          })()}
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {lignesSorted.map((ligne, idx) => {
                            const key = ligne.type === "profil" ? `p-${ligne.profil.id}` : `i-${ligne.inscription.id}`;
                            const isEven = idx % 2 === 0;

                            if (ligne.type === "profil") {
                              const { profil, inscriptions: pInsc } = ligne;
                              const nom = profil.nom || pInsc[0]?.nom || "";
                              const prenom = profil.prenom || "";
                              const initials = getInitials(prenom, nom);
                              const roleBdg = roleBadge(profil.role);
                              const pendingCount = pInsc.filter(i => i.statut === "en_attente").length;
                              // Priorité au statut le plus urgent (action requise) plutôt qu'au "meilleur"
                              const bestInscStatut = pInsc.some(i => i.statut === "en_attente") ? "en_attente"
                                : pInsc.some(i => i.statut === "acceptee") ? "acceptee"
                                : pInsc.some(i => i.statut === "validee") ? "validee"
                                : null;
                              // Le rôle du compte prime quand il est en attente ou refusé ; sinon on montre le statut de l'inscription
                              const statusBdg = (profil.role === "en_attente" || profil.role === "refuse")
                                ? roleBdg
                                : bestInscStatut ? inscBadge(bestInscStatut) : roleBdg;
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
                                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium w-fit ${statusBdg.cls}`}>{statusBdg.label}</span>
                                      {pendingCount > 0 && <span className="text-[10px] text-amber-600 font-medium">{pendingCount} en attente</span>}
                                    </div>
                                  </td>
                                  <td className="py-3 pr-4">
                                    {calcAge(dateNaissance) !== null ? (
                                      <div>
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium w-fit ${ageBadgeCls(dateNaissance)}`}>{calcAge(dateNaissance)} ans</span>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(dateNaissance!).toLocaleDateString("fr-FR")}</p>
                                      </div>
                                    ) : <span className="text-xs text-muted-foreground italic">—</span>}
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
                                  {(() => {
                                    const inscRef = pInsc.find(i => i.statut === "validee") ?? pInsc[0] ?? null;
                                    return (
                                      <>
                                        <td className="py-3 pr-4">
                                          {inscRef?.urgence_contact ? (() => {
                                            const parts = inscRef.urgence_contact.split(" — ");
                                            const tel = parts.length > 1 ? parts[parts.length - 1] : null;
                                            const nom = parts.length > 1 ? parts.slice(0, -1).join(" — ") : inscRef.urgence_contact;
                                            return <div><p className="text-xs font-medium leading-tight">{nom}</p>{tel && <p className="text-[11px] text-muted-foreground">{tel}</p>}</div>;
                                          })() : <span className="text-xs text-muted-foreground italic">—</span>}
                                        </td>
                                        <td className="py-3 pr-4">
                                          {inscRef?.pass_sport
                                            ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><CheckCircle size={10} /> Oui</span>
                                            : <span className="text-xs text-muted-foreground italic">—</span>}
                                        </td>
                                        <td className="py-3">
                                          {inscRef?.droit_image
                                            ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><CheckCircle size={10} /> Oui</span>
                                            : <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground"><XCircle size={10} /> Non</span>}
                                        </td>
                                      </>
                                    );
                                  })()}
                                </tr>
                              );
                            }

                            // inscription_seule
                            const { inscription: insc, profil: linkedProfil } = ligne;
                            const nom = insc.nom || "";
                            const prenom = insc.prenom || "";
                            const initials = getInitials(prenom, nom);
                            const iBdg = inscBadge(insc.statut);
                            const emailAffiche = insc.email || (insc.type_inscription === "mineur" ? insc.parent1_email : null) || null;

                            return (
                              <tr key={key} className={`group transition-colors hover:bg-primary/[0.03] cursor-pointer ${isEven ? "bg-transparent" : "bg-secondary/20"}`} onClick={() => { setModalTab("adhesions"); setSelectedKey(key); }}>
                                <td className="py-3 pr-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ageBadgeCls(insc.date_naissance)}`}>{idx + 1}</div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-sm leading-tight truncate max-w-[180px]">{[nom, prenom].filter(Boolean).join(" ") || <span className="italic text-muted-foreground font-normal text-xs">Sans nom</span>}</p>
                                      <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                        {emailAffiche || "—"}
                                        {insc.source === "papier" && <span className="ml-1 text-blue-600">· papier</span>}
                                        {linkedProfil && <span className={`ml-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none align-middle ${roleBadge(linkedProfil.role).cls}`}>{roleBadge(linkedProfil.role).label}</span>}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 pr-4">
                                  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium w-fit ${iBdg.cls}`}>{iBdg.label}</span>
                                </td>
                                <td className="py-3 pr-4">
                                  {calcAge(insc.date_naissance) !== null ? (
                                    <div>
                                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium w-fit ${ageBadgeCls(insc.date_naissance)}`}>{calcAge(insc.date_naissance)} ans</span>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(insc.date_naissance!).toLocaleDateString("fr-FR")}</p>
                                    </div>
                                  ) : <span className="text-xs text-muted-foreground italic">—</span>}
                                </td>
                                <td className="py-3 pr-4">
                                  <div className="flex flex-wrap gap-1">
                                    {resolveDiscNoms(insc.disciplines).length === 0
                                      ? <span className="text-xs text-muted-foreground italic">—</span>
                                      : resolveDiscNoms(insc.disciplines).map(d => (
                                        <span key={d} className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{d}</span>
                                      ))
                                    }
                                  </div>
                                </td>
                                <td className="py-3 pr-4">
                                  {insc.urgence_contact ? (() => {
                                    const parts = insc.urgence_contact.split(" — ");
                                    const tel = parts.length > 1 ? parts[parts.length - 1] : null;
                                    const nom = parts.length > 1 ? parts.slice(0, -1).join(" — ") : insc.urgence_contact;
                                    return <div><p className="text-xs font-medium leading-tight">{nom}</p>{tel && <p className="text-[11px] text-muted-foreground">{tel}</p>}</div>;
                                  })() : <span className="text-xs text-muted-foreground italic">—</span>}
                                </td>
                                <td className="py-3 pr-4">
                                  {insc.pass_sport
                                    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><CheckCircle size={10} /> Oui</span>
                                    : <span className="text-xs text-muted-foreground italic">—</span>}
                                </td>
                                <td className="py-3">
                                  {insc.droit_image
                                    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><CheckCircle size={10} /> Oui</span>
                                    : <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground"><XCircle size={10} /> Non</span>}
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
                inscriptions={inscriptions.filter(i => !saisonFilter || i.saison === saisonFilter)}
                saisonFilter={saisonFilter || saisonCourante || ""}
                onToggle={handleToggleProfilDiscipline}
              />
            )}

            {/* ====== SECTION ADMINISTRATION ====== */}
            {!loading && adminSection === "administration" && (() => {
              const admins = membres.filter(m => m.role === "admin");
              const adminsDisc = membres.filter(m => m.role === "admin_discipline");
              const promouvables = membres
                .filter(m => !["admin", "admin_discipline", "en_attente", "refuse"].includes(m.role) && m.id !== user?.id)
                .sort((a, b) => {
                  const ka = `${a.nom || ""}${a.prenom || ""}`.toLowerCase();
                  const kb = `${b.nom || ""}${b.prenom || ""}`.toLowerCase();
                  return ka.localeCompare(kb, "fr");
                });
              const selectedMembre = promouvables.find(m => m.id === promouvoirSelectedId) ?? null;
              return (
                <div className="space-y-6 max-w-2xl">

                  {/* Admins actuels */}
                  <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
                    <h2 className="font-serif text-base font-semibold">Administrateurs actuels</h2>

                    {admins.length === 0 && adminsDisc.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Aucun administrateur défini.</p>
                    )}

                    {admins.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin</p>
                        {admins.map(m => (
                          <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border/40 px-4 py-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarBg(m.nom || m.prenom || "?")}`}>
                              {getInitials(m.prenom || "", m.nom || "")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{[m.nom, m.prenom].filter(Boolean).join(" ") || <span className="italic text-muted-foreground">Sans nom</span>}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                            </div>
                            {m.id !== user?.id && (
                              <Button size="sm" variant="outline" onClick={() => handleChangerRole(m.id, "membre")} disabled={processing === m.id} className="gap-1 text-xs text-destructive hover:text-destructive shrink-0">
                                <UserX size={12} /> Révoquer
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {adminsDisc.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin discipline</p>
                        {adminsDisc.map(m => (
                          <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border/40 px-4 py-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarBg(m.nom || m.prenom || "?")}`}>
                              {getInitials(m.prenom || "", m.nom || "")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{[m.nom, m.prenom].filter(Boolean).join(" ") || <span className="italic text-muted-foreground">Sans nom</span>}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                              {m.disciplines && <p className="text-xs text-violet-600 mt-0.5">{resolveDiscNoms(m.disciplines).join(", ")}</p>}
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleChangerRole(m.id, "membre")} disabled={processing === m.id} className="gap-1 text-xs text-destructive hover:text-destructive shrink-0">
                              <UserX size={12} /> Révoquer
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Promouvoir */}
                  <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
                    <h2 className="font-serif text-base font-semibold">Promouvoir un membre</h2>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Sélectionner un membre</label>
                        <select
                          value={promouvoirSelectedId}
                          onChange={e => setPromouvoirSelectedId(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">— Choisir un membre —</option>
                          {promouvables.map(m => (
                            <option key={m.id} value={m.id}>
                              {[m.nom, m.prenom].filter(Boolean).join(" ") || m.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          disabled={!selectedMembre}
                          onClick={() => selectedMembre && setConfirmAdmin(selectedMembre)}
                          className="gap-1.5 text-xs"
                        >
                          <Shield size={12} /> Promouvoir en admin
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!selectedMembre}
                          onClick={() => {
                            if (!selectedMembre) return;
                            setConfirmAdminDiscipline(selectedMembre);
                            setConfirmAdminDisciplineDiscs(selectedMembre.disciplines ? selectedMembre.disciplines.split(",").map(s => s.trim()).filter(Boolean) : []);
                          }}
                          className="gap-1.5 text-xs text-violet-700 hover:text-violet-700 border-violet-300"
                        >
                          <Shield size={12} /> Admin discipline
                        </Button>
                      </div>
                      {selectedMembre && (
                        <p className="text-xs text-muted-foreground">
                          Rôle actuel de <span className="font-medium">{[selectedMembre.nom, selectedMembre.prenom].filter(Boolean).join(" ")}</span> : <span className={`font-medium ${roleBadge(selectedMembre.role).cls} rounded-full px-1.5 py-0.5`}>{roleBadge(selectedMembre.role).label}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Créer un compte membre */}
                  <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
                    <div>
                      <h2 className="font-serif text-base font-semibold">Créer un compte membre</h2>
                      <p className="text-sm text-muted-foreground mt-1">Crée un espace web sans inscription liée — pour un parent, un bénévole, ou toute personne devant accéder au site sans être inscrite à une discipline.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Nom</Label>
                        <Input placeholder="Nom" value={creerMembreForm.nom} onChange={e => setCreerMembreForm(f => ({ ...f, nom: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Prénom</Label>
                        <Input placeholder="Prénom" value={creerMembreForm.prenom} onChange={e => setCreerMembreForm(f => ({ ...f, prenom: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email *</Label>
                      <Input type="email" placeholder="email@exemple.com" value={creerMembreForm.email} onChange={e => { setCreerMembreForm(f => ({ ...f, email: e.target.value })); setCreerMembreError(null); }} />
                    </div>
                    {creerMembreError && <p className="text-xs text-destructive">{creerMembreError}</p>}
                    <Button
                      disabled={!creerMembreForm.email || creerMembreLoading}
                      onClick={handleCreerMembreSansInscription}
                      className="gap-1.5"
                    >
                      <UserPlus size={14} /> {creerMembreLoading ? "Création en cours…" : "Créer et envoyer l'invitation"}
                    </Button>
                  </div>

                  {/* Changement de saison */}
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
                    <div>
                      <h2 className="font-serif text-base font-semibold text-destructive">Démarrer la nouvelle saison</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Remet tous les membres (rôle "Inscrit") en attente de réinscription. Les admins ne sont pas affectés.
                        À effectuer après avoir mis à jour la saison dans Sanity Studio.
                      </p>
                    </div>
                    {saisonCourante && (
                      <p className="text-xs text-muted-foreground">
                        Saison courante dans Sanity : <span className="font-medium text-foreground">{saisonCourante}</span>
                      </p>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmNouvelleSaison(true)}
                      disabled={processing === "nouvelle-saison"}
                      className="gap-1.5"
                    >
                      <UserX size={14} /> Remettre tous les membres en attente
                    </Button>
                  </div>

                </div>
              );
            })()}

            {/* ====== SECTION TIERS ====== */}
            {!loading && adminSection === "tiers" && (
              <SectionTiers
                membres={membres}
                inscriptions={inscriptions}
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
                        <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Coordonnées</TabsTrigger>
                        <TabsTrigger value="sante" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Santé</TabsTrigger>
                        <TabsTrigger value="parametres" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Accès web</TabsTrigger>
                        <TabsTrigger value="logs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Connexions</TabsTrigger>
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
                                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                              {resolveDiscNoms(insc.disciplines).length > 0
                                                ? resolveDiscNoms(insc.disciplines).map(d => (
                                                    <span key={d} className="font-semibold text-sm">{d}</span>
                                                  ))
                                                : <span className="font-medium text-sm text-muted-foreground italic">—</span>
                                              }
                                              {insc.source === "papier" && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"><FileText size={9} /> Papier</span>}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              {insc.saison && <span className="text-xs text-muted-foreground">{insc.saison}</span>}
                                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${iBdg.cls}`}>{iBdg.label}</span>
                                              <ChevronDown size={13} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                            </div>
                                          </button>
                                          {isExpanded && (
                                            <div className="border-t border-border/30 bg-secondary/10 px-4 py-3 space-y-3">
                                              <div className="grid gap-1.5 sm:grid-cols-2 text-xs text-muted-foreground">
                                                {insc.saison && <span>{insc.saison}</span>}
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
                                                {insc.statut === "en_attente" && (
                                                  <Button size="sm" onClick={() => setConfirmAccepter(insc)} disabled={processing === `insc-${insc.id}`} className="h-7 px-3 text-xs gap-1"><CheckCircle size={11} /> Accepter</Button>
                                                )}
                                                {insc.statut === "acceptee" && (
                                                  <Button size="sm" onClick={() => setConfirmValider(insc)} disabled={processing === `insc-${insc.id}`} className="h-7 px-3 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white border-0"><CheckCircle size={11} /> Valider</Button>
                                                )}
                                                {insc.statut !== "refusee" && insc.statut !== "supprimee" && (
                                                  <Button size="sm" variant="outline" onClick={() => setConfirmRefuser(insc)} disabled={processing === `insc-${insc.id}`} className="h-7 px-3 text-xs gap-1 text-destructive hover:text-destructive"><XCircle size={11} /> Refuser</Button>
                                                )}
                                                {insc.statut !== "supprimee" && (
                                                  <Button size="sm" variant="outline" onClick={() => setConfirmSupprimer(insc)} disabled={processing === `insc-${insc.id}`} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"><Trash2 size={11} /></Button>
                                                )}
                                                <Button size="sm" variant="outline" onClick={() => setAdminRecapInsc(insc)} className="h-7 px-2 text-xs gap-1 text-muted-foreground"><Download size={11} /></Button>
                                                {insc.source === "papier" ? (
                                                  <Button size="sm" variant="outline" onClick={() => openPapierEdit(insc)} className="h-7 px-2 text-xs gap-1 text-muted-foreground"><Pencil size={11} /></Button>
                                                ) : (
                                                  <Button size="sm" variant="outline" onClick={() => setViewInscReadOnly(insc)} className="h-7 px-2 text-xs gap-1 text-muted-foreground"><ClipboardList size={11} /></Button>
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

                      </TabsContent>

                      {/* ——— Santé ——— */}
                      <TabsContent value="sante" className="m-0 p-6 space-y-5">
                        {(() => {
                          const inscRef = pInsc.find(i => i.statut === "validee") ?? pInsc[0] ?? null;
                          const isMineur = inscRef?.type_inscription === "mineur";
                          if (!inscRef) return (
                            <p className="text-sm text-muted-foreground italic">Aucune inscription liée à ce compte.</p>
                          );
                          return (
                            <>
                              <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Informations médicales</h3>
                                <div className="rounded-xl border border-border/40 bg-secondary/20 divide-y divide-border/30">
                                  <div className="px-4 py-3 text-sm flex items-start gap-3">
                                    <span className="text-muted-foreground w-32 shrink-0 text-xs pt-0.5">Groupe sanguin</span>
                                    <span className={inscRef.groupe_sanguin ? "" : "italic text-muted-foreground"}>{inscRef.groupe_sanguin || "Non renseigné"}</span>
                                  </div>
                                  <div className="px-4 py-3 text-sm flex items-start gap-3">
                                    <span className="text-muted-foreground w-32 shrink-0 text-xs pt-0.5">Allergies</span>
                                    <span className={inscRef.allergie ? "" : "italic text-muted-foreground"}>{inscRef.allergie || "Aucune renseignée"}</span>
                                  </div>
                                </div>
                              </div>

                              {isMineur && (
                                <div>
                                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Attestation sur l'honneur</h3>
                                  <div className="rounded-xl border border-border/40 p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                      {inscRef.attestation_url ? (
                                        <>
                                          <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                                          <span className="text-sm text-emerald-700 font-medium">Attestation déposée</span>
                                          <a href={inscRef.attestation_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-primary underline hover:no-underline flex items-center gap-1">
                                            <ExternalLink size={11} /> Voir
                                          </a>
                                        </>
                                      ) : (
                                        <>
                                          <XCircle size={14} className="text-amber-500 shrink-0" />
                                          <span className="text-sm text-amber-700">Attestation non déposée</span>
                                        </>
                                      )}
                                    </div>
                                    <label className="cursor-pointer inline-flex">
                                      <input
                                        type="file"
                                        className="sr-only"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        disabled={uploadingAttestationId === inscRef.id}
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          setUploadingAttestationId(inscRef.id);
                                          const ext = file.name.split(".").pop();
                                          const path = `${inscRef.id}/attestation.${ext}`;
                                          const { error: uploadError } = await supabase.storage
                                            .from("inscriptions-scans")
                                            .upload(path, file, { upsert: true });
                                          if (uploadError) {
                                            toast.error("Erreur upload : " + uploadError.message);
                                          } else {
                                            const { data: { publicUrl } } = supabase.storage.from("inscriptions-scans").getPublicUrl(path);
                                            const { error } = await supabase.from("inscriptions").update({ attestation_url: publicUrl }).eq("id", inscRef.id);
                                            if (error) {
                                              toast.error("Erreur mise à jour : " + error.message);
                                            } else {
                                              setInscriptions(prev => prev.map(i => i.id === inscRef.id ? { ...i, attestation_url: publicUrl } : i));
                                              toast.success("Attestation déposée.");
                                            }
                                          }
                                          setUploadingAttestationId(null);
                                          e.target.value = "";
                                        }}
                                      />
                                      <span className={`inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary/50 transition-colors ${uploadingAttestationId === inscRef.id ? "opacity-50 pointer-events-none" : ""}`}>
                                        <Upload size={12} />
                                        {uploadingAttestationId === inscRef.id
                                          ? "Envoi en cours…"
                                          : inscRef.attestation_url ? "Remplacer l'attestation" : "Déposer l'attestation"}
                                      </span>
                                    </label>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </TabsContent>

                      {/* ——— Accès web ——— */}
                      <TabsContent value="parametres" className="m-0 p-6 space-y-5">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Rôle & permissions</h3>
                          <div className="rounded-xl border border-border/40 p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <Shield size={14} className="text-muted-foreground" />
                              <span className="text-sm">Rôle actuel : <span className={`font-medium ${roleBdg.cls} rounded-full px-2 py-0.5`}>{roleBdg.label}</span>{profil.role === "admin_discipline" && profil.disciplines && <span className="ml-1 text-muted-foreground text-xs">· {resolveDiscNoms(profil.disciplines).join(", ")}</span>}</span>
                            </div>
                            {profil.role === "refuse" && (
                              <Button size="sm" variant="outline" onClick={() => handleApprouverCompte(profil.id)} disabled={processing === profil.id} className="gap-1 text-xs mt-2"><CheckCircle size={12} /> Réactiver le compte</Button>
                            )}
                            {isSuperAdmin && !["refuse", "admin", "admin_discipline"].includes(profil.role) && profil.id !== user?.id && (
                              <p className="text-xs text-muted-foreground pt-1">Pour modifier le rôle, utilisez l'onglet <button onClick={() => { setSelectedLigne(null); setAdminSection("administration"); }} className="underline hover:text-foreground">Administration</button>.</p>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      {/* ——— Coordonnées ——— */}
                      <TabsContent value="details" className="m-0 p-6 space-y-5">
                        {(() => {
                          const Row = ({ label, value }: { label: string; value: string }) => (
                            <div className="px-4 py-3 text-sm flex items-start gap-3">
                              <span className="text-muted-foreground w-32 shrink-0 text-xs pt-0.5">{label}</span>
                              <span className="break-words">{value}</span>
                            </div>
                          );
                          // Trouver l'inscription de référence (validée en priorité, sinon la plus récente)
                          const inscRef = pInsc.find(i => i.statut === "validee") ?? pInsc[0] ?? null;
                          const isMineur = inscRef?.type_inscription === "mineur";
                          const hasParents = isMineur && (inscRef?.parent1_nom || inscRef?.parent1_prenom || inscRef?.parent1_email);
                          return (
                            <>
                              <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Coordonnées</h3>
                                <div className="rounded-xl border border-border/40 bg-secondary/20 divide-y divide-border/30">
                                  <Row label="Email" value={profil.email} />
                                  {profil.telephone && <Row label="Téléphone" value={profil.telephone} />}
                                  {profil.adresse && <Row label="Adresse" value={profil.adresse} />}
                                  <Row label="Membre depuis" value={new Date(profil.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} />
                                </div>
                              </div>

                              {inscRef?.urgence_contact && (
                                <div>
                                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Urgence</h3>
                                  <div className="rounded-xl border border-border/40 bg-secondary/20 divide-y divide-border/30">
                                    <Row label="À contacter" value={inscRef.urgence_contact} />
                                  </div>
                                </div>
                              )}

                              {hasParents && (
                                <div>
                                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Parents / tuteurs légaux</h3>
                                  <div className="space-y-3">
                                    {(inscRef.parent1_nom || inscRef.parent1_prenom || inscRef.parent1_email) && (
                                      <div className="rounded-xl border border-border/40 bg-secondary/20 divide-y divide-border/30">
                                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parent 1</div>
                                        {(inscRef.parent1_prenom || inscRef.parent1_nom) && <Row label="Nom / Prénom" value={[inscRef.parent1_prenom, inscRef.parent1_nom].filter(Boolean).join(" ")} />}
                                        {inscRef.parent1_email && <Row label="Email" value={inscRef.parent1_email} />}
                                        {inscRef.parent1_tel && <Row label="Téléphone" value={inscRef.parent1_tel} />}
                                      </div>
                                    )}
                                    {(inscRef.parent2_nom || inscRef.parent2_prenom || inscRef.parent2_email) && (
                                      <div className="rounded-xl border border-border/40 bg-secondary/20 divide-y divide-border/30">
                                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parent 2</div>
                                        {(inscRef.parent2_prenom || inscRef.parent2_nom) && <Row label="Nom / Prénom" value={[inscRef.parent2_prenom, inscRef.parent2_nom].filter(Boolean).join(" ")} />}
                                        {inscRef.parent2_email && <Row label="Email" value={inscRef.parent2_email} />}
                                        {inscRef.parent2_tel && <Row label="Téléphone" value={inscRef.parent2_tel} />}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </TabsContent>

                      {/* ——— Connexions ——— */}
                      <TabsContent value="logs" className="m-0 p-6">
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
                const isMineur = insc.type_inscription === "mineur" || !!insc.parent1_email;
                const p1Email = insc.email || insc.parent1_email || null;
                const p1Nom = insc.parent1_nom || (isMineur ? null : insc.nom);
                const p1Prenom = insc.parent1_prenom || (isMineur ? null : insc.prenom);
                const p1Profil = p1Email ? membres.find(m => m.email?.toLowerCase() === p1Email.toLowerCase()) : null;
                const p2Email = insc.parent2_email || null;
                const p2Nom = insc.parent2_nom || null;
                const p2Prenom = insc.parent2_prenom || null;
                const p2Profil = p2Email ? membres.find(m => m.email?.toLowerCase() === p2Email.toLowerCase()) : null;

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
                        <TabsTrigger value="adhesions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Adhésions <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 text-primary text-[10px] font-semibold">1</span></TabsTrigger>
                        <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Coordonnées</TabsTrigger>
                        <TabsTrigger value="sante" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Santé</TabsTrigger>
                        <TabsTrigger value="espace" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Accès web</TabsTrigger>
                        <TabsTrigger value="logs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 h-9">Connexions</TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {/* ——— Adhésions ——— */}
                      <TabsContent value="adhesions" className="m-0 p-6 space-y-5">
                        {(() => {
                          const sectionLabel = insc.statut === "validee" ? "Validées" : insc.statut === "en_attente" ? "En attente" : insc.statut === "acceptee" ? "En attente de paiement" : "Refusées / supprimées";
                          const sectionCls = insc.statut === "validee" ? "text-emerald-700" : insc.statut === "en_attente" || insc.statut === "acceptee" ? "text-amber-700" : "text-muted-foreground";
                          const isExpanded = expandedInscIds.has(insc.id);
                          return (
                            <div>
                              <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${sectionCls}`}>{sectionLabel}</h3>
                              <div className="space-y-2">
                                <div className="rounded-xl border border-border/40 overflow-hidden">
                                  <button
                                    onClick={() => setExpandedInscIds(prev => { const next = new Set(prev); if (next.has(insc.id)) { next.delete(insc.id); } else { next.add(insc.id); } return next; })}
                                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-secondary/30 transition-colors text-left"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                      {resolveDiscNoms(insc.disciplines).length > 0
                                        ? resolveDiscNoms(insc.disciplines).map(d => <span key={d} className="font-semibold text-sm">{d}</span>)
                                        : <span className="font-medium text-sm text-muted-foreground italic">—</span>}
                                      {insc.source === "papier" && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"><FileText size={9} /> Papier</span>}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {insc.saison && <span className="text-xs text-muted-foreground">{insc.saison}</span>}
                                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${iBdg.cls}`}>{iBdg.label}</span>
                                      <ChevronDown size={13} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                    </div>
                                  </button>
                                  {isExpanded && (
                                    <div className="border-t border-border/30 bg-secondary/10 px-4 py-3 space-y-3">
                                      <div className="grid gap-1.5 sm:grid-cols-2 text-xs text-muted-foreground">
                                        {insc.moyen_paiement && <span><span className="font-medium text-foreground">Paiement </span>{PAIEMENT_LABELS[insc.moyen_paiement] ?? insc.moyen_paiement}</span>}
                                        {insc.pass_sport && <span className="text-primary font-medium">Pass Sport ✓</span>}
                                        {insc.droit_image && <span><span className="font-medium text-foreground">Droit image </span>✓</span>}
                                        {insc.autorisation_parentale && <span><span className="font-medium text-foreground">Auth. parentale </span>✓</span>}
                                        {insc.niveau && <span><span className="font-medium text-foreground">Niveau </span>{insc.niveau}</span>}
                                        <span><span className="font-medium text-foreground">Reçue le </span>{new Date(insc.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                                      </div>
                                      {insc.document_scan_url && (
                                        <a href={insc.document_scan_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary underline hover:no-underline">
                                          <ExternalLink size={12} /> Voir le document scanné
                                        </a>
                                      )}
                                      <div className="flex gap-2 flex-wrap pt-1">
                                        {insc.statut === "en_attente" && (
                                          <Button size="sm" onClick={() => setConfirmAccepter(insc)} disabled={processing === `insc-${insc.id}`} className="h-7 px-3 text-xs gap-1"><CheckCircle size={11} /> Accepter</Button>
                                        )}
                                        {insc.statut === "acceptee" && (
                                          <Button size="sm" onClick={() => setConfirmValider(insc)} disabled={processing === `insc-${insc.id}`} className="h-7 px-3 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white border-0"><CheckCircle size={11} /> Valider</Button>
                                        )}
                                        {insc.statut !== "refusee" && insc.statut !== "supprimee" && (
                                          <Button size="sm" variant="outline" onClick={() => setConfirmRefuser(insc)} disabled={processing === `insc-${insc.id}`} className="h-7 px-3 text-xs gap-1 text-destructive hover:text-destructive"><XCircle size={11} /> Refuser</Button>
                                        )}
                                        {insc.statut !== "supprimee" && (
                                          <Button size="sm" variant="outline" onClick={() => setConfirmSupprimer(insc)} disabled={processing === `insc-${insc.id}`} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"><Trash2 size={11} /></Button>
                                        )}
                                        <Button size="sm" variant="outline" onClick={() => setAdminRecapInsc(insc)} className="h-7 px-2 text-xs gap-1 text-muted-foreground"><Download size={11} /></Button>
                                        {insc.source === "papier" ? (
                                          <Button size="sm" variant="outline" onClick={() => openPapierEdit(insc)} className="h-7 px-2 text-xs gap-1 text-muted-foreground"><Pencil size={11} /></Button>
                                        ) : (
                                          <Button size="sm" variant="outline" onClick={() => setViewInscReadOnly(insc)} className="h-7 px-2 text-xs gap-1 text-muted-foreground"><ClipboardList size={11} /></Button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </TabsContent>

                      {/* ——— Coordonnées ——— */}
                      <TabsContent value="details" className="m-0 p-6 space-y-5">
                        <div className="rounded-xl border border-border/40 bg-secondary/20 divide-y divide-border/30">
                          {insc.email && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-28 shrink-0 text-xs pt-0.5">Email</span><span className="truncate">{insc.email}</span></div>}
                          {insc.tel_mobile && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-28 shrink-0 text-xs pt-0.5">Téléphone</span><span>{insc.tel_mobile}</span></div>}
                          {insc.adresse && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-28 shrink-0 text-xs pt-0.5">Adresse</span><span>{insc.adresse}</span></div>}
                          {insc.date_naissance && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-28 shrink-0 text-xs pt-0.5">Naissance</span><span>{new Date(insc.date_naissance).toLocaleDateString("fr-FR")}</span></div>}
                          {insc.urgence_contact && <div className="px-4 py-3 text-sm flex gap-3"><span className="text-muted-foreground w-28 shrink-0 text-xs pt-0.5">Urgence</span><span>{insc.urgence_contact}</span></div>}
                          {isMineur && (insc.parent1_nom || insc.parent1_prenom) && (
                            <div className="px-4 py-3 text-sm flex gap-3">
                              <span className="text-muted-foreground w-28 shrink-0 text-xs pt-0.5">Parent 1</span>
                              <span>{[insc.parent1_prenom, insc.parent1_nom].filter(Boolean).join(" ")}{insc.parent1_email ? ` — ${insc.parent1_email}` : ""}{insc.parent1_tel ? ` — ${insc.parent1_tel}` : ""}</span>
                            </div>
                          )}
                          {isMineur && (insc.parent2_nom || insc.parent2_prenom) && (
                            <div className="px-4 py-3 text-sm flex gap-3">
                              <span className="text-muted-foreground w-28 shrink-0 text-xs pt-0.5">Parent 2</span>
                              <span>{[insc.parent2_prenom, insc.parent2_nom].filter(Boolean).join(" ")}{insc.parent2_email ? ` — ${insc.parent2_email}` : ""}{insc.parent2_tel ? ` — ${insc.parent2_tel}` : ""}</span>
                            </div>
                          )}
                          {!insc.email && !insc.tel_mobile && !insc.adresse && !insc.date_naissance && (
                            <div className="px-4 py-3"><p className="text-sm text-muted-foreground italic">Aucune coordonnée renseignée.</p></div>
                          )}
                        </div>
                      </TabsContent>

                      {/* ——— Santé ——— */}
                      <TabsContent value="sante" className="m-0 p-6 space-y-5">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Informations médicales</h3>
                          <div className="rounded-xl border border-border/40 bg-secondary/20 divide-y divide-border/30">
                            <div className="px-4 py-3 text-sm flex items-start gap-3">
                              <span className="text-muted-foreground w-32 shrink-0 text-xs pt-0.5">Groupe sanguin</span>
                              <span className={insc.groupe_sanguin ? "" : "italic text-muted-foreground"}>{insc.groupe_sanguin || "Non renseigné"}</span>
                            </div>
                            <div className="px-4 py-3 text-sm flex items-start gap-3">
                              <span className="text-muted-foreground w-32 shrink-0 text-xs pt-0.5">Allergies</span>
                              <span className={insc.allergie ? "" : "italic text-muted-foreground"}>{insc.allergie || "Aucune renseignée"}</span>
                            </div>
                          </div>
                        </div>
                        {isMineur && (
                          <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Attestation sur l'honneur</h3>
                            <div className="rounded-xl border border-border/40 p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                {insc.attestation_url ? (
                                  <>
                                    <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                                    <span className="text-sm text-emerald-700 font-medium">Attestation déposée</span>
                                    <a href={insc.attestation_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-primary underline hover:no-underline flex items-center gap-1">
                                      <ExternalLink size={11} /> Voir
                                    </a>
                                  </>
                                ) : (
                                  <>
                                    <XCircle size={14} className="text-amber-500 shrink-0" />
                                    <span className="text-sm text-amber-700">Attestation non déposée</span>
                                  </>
                                )}
                              </div>
                              <label className="cursor-pointer inline-flex">
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  disabled={uploadingAttestationId === insc.id}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingAttestationId(insc.id);
                                    const ext = file.name.split(".").pop();
                                    const path = `${insc.id}/attestation.${ext}`;
                                    const { error: uploadError } = await supabase.storage.from("inscriptions-scans").upload(path, file, { upsert: true });
                                    if (uploadError) {
                                      toast.error("Erreur upload : " + uploadError.message);
                                    } else {
                                      const { data: { publicUrl } } = supabase.storage.from("inscriptions-scans").getPublicUrl(path);
                                      const { error } = await supabase.from("inscriptions").update({ attestation_url: publicUrl }).eq("id", insc.id);
                                      if (error) {
                                        toast.error("Erreur mise à jour : " + error.message);
                                      } else {
                                        setInscriptions(prev => prev.map(i => i.id === insc.id ? { ...i, attestation_url: publicUrl } : i));
                                        toast.success("Attestation déposée.");
                                      }
                                    }
                                    setUploadingAttestationId(null);
                                    e.target.value = "";
                                  }}
                                />
                                <span className={`inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary/50 transition-colors ${uploadingAttestationId === insc.id ? "opacity-50 pointer-events-none" : ""}`}>
                                  <Upload size={12} />
                                  {uploadingAttestationId === insc.id ? "Envoi en cours…" : insc.attestation_url ? "Remplacer l'attestation" : "Déposer l'attestation"}
                                </span>
                              </label>
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      {/* ——— Accès web ——— */}
                      <TabsContent value="espace" className="m-0 p-6 space-y-4">
                        {(() => {
                          const linked = [
                            p1Profil ? { label: isMineur ? "Parent / tuteur 1" : "Titulaire", profil: p1Profil } : null,
                            p2Profil ? { label: "Parent / tuteur 2", profil: p2Profil } : null,
                          ].filter(Boolean) as { label: string; profil: Membre }[];
                          if (linked.length === 0) return <p className="text-sm text-muted-foreground italic">Aucun compte web associé.</p>;
                          return linked.map(({ label, profil: pf }) => {
                            const pfRoleBdg = roleBadge(pf.role);
                            return (
                              <div key={pf.id} className="rounded-xl border border-border/40 p-4 space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-2 w-2 rounded-full shrink-0 bg-emerald-500"></span>
                                  <span className="text-sm font-medium">{[pf.nom, pf.prenom].filter(Boolean).join(" ") || <span className="italic text-muted-foreground">Sans nom</span>}</span>
                                  <span className="text-xs text-muted-foreground truncate">{pf.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Shield size={12} className="text-muted-foreground" />
                                  <span className="text-xs">Rôle actuel : <span className={`font-medium ${pfRoleBdg.cls} rounded-full px-1.5 py-0.5`}>{pfRoleBdg.label}</span>{pf.role === "admin_discipline" && pf.disciplines && <span className="ml-1 text-muted-foreground text-xs">· {resolveDiscNoms(pf.disciplines).join(", ")}</span>}</span>
                                </div>
                                {pf.role === "refuse" && (
                                  <Button size="sm" variant="outline" onClick={() => handleApprouverCompte(pf.id)} disabled={processing === pf.id} className="gap-1 text-xs"><CheckCircle size={12} /> Réactiver le compte</Button>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </TabsContent>

                      {/* ——— Connexions ——— */}
                      <TabsContent value="logs" className="m-0 p-6 space-y-5">
                        {(() => {
                          const linked = [
                            p1Profil ? { label: isMineur ? "Parent / tuteur 1" : "Titulaire", profil: p1Profil } : null,
                            p2Profil ? { label: "Parent / tuteur 2", profil: p2Profil } : null,
                          ].filter(Boolean) as { label: string; profil: Membre }[];
                          if (linked.length === 0) return <p className="text-sm text-muted-foreground italic">Aucun compte web associé — pas de logs disponibles.</p>;
                          return linked.map(({ label, profil: pf }) => {
                            const logs = connexionsLog.filter(l => l.user_id === pf.id).slice(0, 8);
                            return (
                              <div key={pf.id}>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{label} · Connexions récentes</h3>
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
                          });
                        })()}
                      </TabsContent>
                    </div>
                  </Tabs>
                );
              })()}

            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modale lecture seule — inscription en ligne */}
      <Dialog open={!!viewInscReadOnly} onOpenChange={(open) => { if (!open) setViewInscReadOnly(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <ClipboardList size={16} className="text-muted-foreground" />
              Dossier d'inscription en ligne
            </DialogTitle>
          </DialogHeader>
          {viewInscReadOnly && (() => {
            const insc = viewInscReadOnly;
            const isMineur = insc.type_inscription === "mineur";
            const ReadField = ({ label, value }: { label: string; value: string | null | undefined }) => (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <div className="flex min-h-10 w-full items-center rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
                  {value || <span className="text-muted-foreground italic">—</span>}
                </div>
              </div>
            );
            return (
              <div className="space-y-8 rounded-lg border border-border/50 bg-card p-6 mt-2">

                {/* Type d'inscription */}
                <div>
                  <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Type d'inscription</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {(["adulte", "mineur"] as const).map((type) => (
                      <div key={type} className={`rounded-md border-2 py-4 text-sm font-semibold text-center transition-colors ${(type === "mineur") === isMineur ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground opacity-40"}`}>
                        {type === "adulte" ? "Adulte" : "Mineur"}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Identité */}
                <div>
                  <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Identité</h2>
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ReadField label="Nom" value={insc.nom} />
                      <ReadField label="Prénom" value={insc.prenom} />
                    </div>
                    <ReadField label="Adresse" value={insc.adresse} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ReadField label="Date de naissance" value={insc.date_naissance ? new Date(insc.date_naissance).toLocaleDateString("fr-FR") : null} />
                      <ReadField label="Groupe sanguin" value={insc.groupe_sanguin} />
                    </div>
                    <ReadField label="Allergie(s)" value={insc.allergie} />
                  </div>
                </div>

                {/* Coordonnées (adulte) */}
                {!isMineur && (
                  <div>
                    <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Coordonnées</h2>
                    <div className="space-y-4">
                      <ReadField label="Téléphone mobile" value={insc.tel_mobile} />
                      <ReadField label="Email" value={insc.email} />
                    </div>
                  </div>
                )}

                {/* Informations parents (mineur) */}
                {isMineur && (
                  <div>
                    <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Informations parents légaux</h2>
                    <div className="space-y-6">
                      <div className="rounded-md border border-border/50 p-4 space-y-4">
                        <p className="text-sm font-semibold">Parent 1 <span className="font-normal text-muted-foreground">(contact principal)</span></p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <ReadField label="Nom" value={insc.parent1_nom} />
                          <ReadField label="Prénom" value={insc.parent1_prenom} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <ReadField label="Email" value={insc.parent1_email} />
                          <ReadField label="Téléphone" value={insc.parent1_tel} />
                        </div>
                      </div>
                      {(insc.parent2_nom || insc.parent2_prenom || insc.parent2_email) && (
                        <div className="rounded-md border border-border/50 p-4 space-y-4">
                          <p className="text-sm font-semibold">Parent 2 <span className="font-normal text-muted-foreground">(facultatif)</span></p>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <ReadField label="Nom" value={insc.parent2_nom} />
                            <ReadField label="Prénom" value={insc.parent2_prenom} />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <ReadField label="Email" value={insc.parent2_email} />
                            <ReadField label="Téléphone" value={insc.parent2_tel} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Urgence */}
                <div>
                  <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Personne à contacter en cas d'urgence</h2>
                  <ReadField label="Contact" value={insc.urgence_contact} />
                </div>

                {/* Discipline(s) */}
                <div>
                  <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Discipline(s) souhaitée(s)</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {disciplinesSanity.map((d) => {
                      const selected = (insc.disciplines || "").split(",").map(s => s.trim()).includes(d._id);
                      return (
                        <div key={d._id} className={`flex items-center gap-3 rounded-md border p-3 ${selected ? "border-primary/40 bg-primary/5" : "border-border/50 opacity-40"}`}>
                          <Checkbox checked={selected} disabled className="pointer-events-none" />
                          <span className="text-sm">{d.nom}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Niveau */}
                <div>
                  <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Niveau</h2>
                  <ReadField label="Niveau actuel" value={insc.niveau} />
                </div>

                {/* Règlement intérieur */}
                <div>
                  <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Règlement intérieur</h2>
                  <label className="flex items-start gap-3 opacity-70 cursor-default">
                    <Checkbox checked={true} disabled className="mt-0.5 pointer-events-none" />
                    <span className="text-sm">Je reconnais avoir lu et j'accepte le règlement intérieur de l'association</span>
                  </label>
                  <label className={`flex items-start gap-3 mt-4 ${!insc.pass_sport ? "opacity-40" : ""} cursor-default`}>
                    <Checkbox checked={insc.pass_sport} disabled className="mt-0.5 pointer-events-none" />
                    <span className="text-sm">Détenteur d'un code Pass Sport 2026-2027</span>
                  </label>
                </div>

                {/* Mode de règlement */}
                <div>
                  <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Mode de règlement</h2>
                  <div className="space-y-3">
                    {([
                      { value: "cheque_1x", label: "Chèque — en 1 fois" },
                      { value: "cheque_4x", label: "Chèque — en 4 fois", detail: "60 € à l'inscription (non remboursable) + solde en 3 échéances (décembre, mars, juin)" },
                      { value: "especes", label: "Espèces" },
                      { value: "virement", label: "Virement bancaire (en une seule fois)" },
                    ] as const).map(option => (
                      <label key={option.value} className={`flex items-start gap-3 cursor-default ${insc.moyen_paiement !== option.value ? "opacity-40" : ""}`}>
                        <input type="radio" readOnly checked={insc.moyen_paiement === option.value} className="mt-0.5 accent-primary shrink-0 pointer-events-none" />
                        <div className="text-sm">
                          <span>{option.label}</span>
                          {"detail" in option && option.detail && <p className="mt-0.5 text-xs text-muted-foreground">{option.detail}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Autorisation parentale (mineur) */}
                {isMineur && (
                  <div>
                    <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">
                      Autorisation parentale <span className="text-sm font-normal text-muted-foreground">(obligatoire)</span>
                    </h2>
                    <label className={`flex items-start gap-3 cursor-default ${!insc.autorisation_parentale ? "opacity-40" : ""}`}>
                      <Checkbox checked={insc.autorisation_parentale} disabled className="mt-0.5 pointer-events-none" />
                      <span className="text-sm">Je soussigné(e) accepte les termes de l'autorisation parentale</span>
                    </label>
                  </div>
                )}

                {/* Droit à l'image */}
                <div>
                  <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Droit à l'image</h2>
                  <label className={`flex items-start gap-3 cursor-default ${!insc.droit_image ? "opacity-40" : ""}`}>
                    <Checkbox checked={insc.droit_image} disabled className="mt-0.5 pointer-events-none" />
                    <span className="text-sm">J'autorise l'association Arts Martiaux St Pierrois à utiliser mon image ou celle de mes enfants pour les besoins du club</span>
                  </label>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Formulaire reçu le {new Date(insc.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · Lecture seule
                </p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Modale saisie / modification inscription papier */}
      <Dialog open={showPapierModal} onOpenChange={(open) => { if (!open) { setShowPapierModal(false); setEditingInscId(null); setScanFile(null); setPapierErrors({}); } }}>
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
                        <Input id="p-ddn" type="date" value={papierForm.dateNaissance} onChange={e => {
                          const ddn = e.target.value;
                          const age = calcAge(ddn);
                          if (age !== null) {
                            const newType = age < 18 ? "mineur" : "adulte";
                            if (newType !== papierForm.typeInscription) {
                              papierDirRef.current = newType === "mineur" ? 1 : -1;
                              setPapierForm(f => ({ ...f, dateNaissance: ddn, typeInscription: newType }));
                              return;
                            }
                          }
                          setPapierForm(f => ({ ...f, dateNaissance: ddn }));
                        }} />
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
                        <Input id="p-mobile" type="tel" placeholder="06 00 00 00 00" value={papierForm.telMobile} onChange={e => { setPapierForm(f => ({ ...f, telMobile: e.target.value })); clearPapierFieldError('telMobile'); }} onBlur={() => validatePapierTel('telMobile', papierForm.telMobile)} className={papierErrors.telMobile ? 'border-destructive' : ''} />
                        {papierErrors.telMobile && <p className="text-xs text-destructive">{papierErrors.telMobile}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p-email">Email</Label>
                        <Input id="p-email" type="email" placeholder="email@exemple.com" value={papierForm.email} onChange={e => { setPapierForm(f => ({ ...f, email: e.target.value })); clearPapierFieldError('email'); }} onBlur={() => validatePapierEmail('email', papierForm.email)} className={papierErrors.email ? 'border-destructive' : ''} />
                        {papierErrors.email && <p className="text-xs text-destructive">{papierErrors.email}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {papierForm.typeInscription === "mineur" && (
                  <>
                    <div>
                      <h3 className="mb-3 text-sm font-semibold border-b border-border/50 pb-1.5">Informations parents légaux</h3>
                      <div className="space-y-4">
                        <div className="rounded-md border border-border/50 p-3 space-y-3">
                          <p className="text-xs font-semibold">Parent 1 <span className="font-normal text-muted-foreground">(contact principal)</span> *</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5"><Label>Nom *</Label><Input placeholder="Nom" value={papierForm.parent1Nom} onChange={e => setPapierForm(f => ({ ...f, parent1Nom: e.target.value }))} /></div>
                            <div className="space-y-1.5"><Label>Prénom *</Label><Input placeholder="Prénom" value={papierForm.parent1Prenom} onChange={e => setPapierForm(f => ({ ...f, parent1Prenom: e.target.value }))} /></div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="email@exemple.com" value={papierForm.parent1Email} onChange={e => { setPapierForm(f => ({ ...f, parent1Email: e.target.value })); clearPapierFieldError('parent1Email'); }} onBlur={() => validatePapierEmail('parent1Email', papierForm.parent1Email)} className={papierErrors.parent1Email ? 'border-destructive' : ''} />{papierErrors.parent1Email && <p className="text-xs text-destructive">{papierErrors.parent1Email}</p>}</div>
                            <div className="space-y-1.5"><Label>Téléphone</Label><Input type="tel" placeholder="06 00 00 00 00" value={papierForm.parent1Tel} onChange={e => { setPapierForm(f => ({ ...f, parent1Tel: e.target.value })); clearPapierFieldError('parent1Tel'); }} onBlur={() => validatePapierTel('parent1Tel', papierForm.parent1Tel)} className={papierErrors.parent1Tel ? 'border-destructive' : ''} />{papierErrors.parent1Tel && <p className="text-xs text-destructive">{papierErrors.parent1Tel}</p>}</div>
                          </div>
                        </div>
                        <div className="rounded-md border border-border/50 p-3 space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground">Parent 2 <span className="font-normal">(facultatif, si vous souhaitez être contacté)</span></p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5"><Label>Nom</Label><Input placeholder="Nom" value={papierForm.parent2Nom} onChange={e => setPapierForm(f => ({ ...f, parent2Nom: e.target.value }))} /></div>
                            <div className="space-y-1.5"><Label>Prénom</Label><Input placeholder="Prénom" value={papierForm.parent2Prenom} onChange={e => setPapierForm(f => ({ ...f, parent2Prenom: e.target.value }))} /></div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="email@exemple.com" value={papierForm.parent2Email} onChange={e => { setPapierForm(f => ({ ...f, parent2Email: e.target.value })); clearPapierFieldError('parent2Email'); }} onBlur={() => validatePapierEmail('parent2Email', papierForm.parent2Email)} className={papierErrors.parent2Email ? 'border-destructive' : ''} />{papierErrors.parent2Email && <p className="text-xs text-destructive">{papierErrors.parent2Email}</p>}</div>
                            <div className="space-y-1.5"><Label>Téléphone</Label><Input type="tel" placeholder="06 00 00 00 00" value={papierForm.parent2Tel} onChange={e => { setPapierForm(f => ({ ...f, parent2Tel: e.target.value })); clearPapierFieldError('parent2Tel'); }} onBlur={() => validatePapierTel('parent2Tel', papierForm.parent2Tel)} className={papierErrors.parent2Tel ? 'border-destructive' : ''} />{papierErrors.parent2Tel && <p className="text-xs text-destructive">{papierErrors.parent2Tel}</p>}</div>
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
                      <Input id="p-urgtel" type="tel" placeholder="06 00 00 00 00" value={papierForm.urgenceTel} onChange={e => { setPapierForm(f => ({ ...f, urgenceTel: e.target.value })); clearPapierFieldError('urgenceTel'); }} onBlur={() => validatePapierTel('urgenceTel', papierForm.urgenceTel)} className={papierErrors.urgenceTel ? 'border-destructive' : ''} />
                      {papierErrors.urgenceTel && <p className="text-xs text-destructive">{papierErrors.urgenceTel}</p>}
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
                          ? disciplinesSanity.filter(d => !d.nom.toLowerCase().includes("stage"))
                          : disciplinesSanity.filter(d => !d.nom.toLowerCase().includes("stage") && (currentUserDisciplines || "").split(",").map(s => s.trim()).includes(d._id))
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
                        <select
                          id="p-saison"
                          value={papierForm.saison}
                          onChange={e => setPapierForm(f => ({ ...f, saison: e.target.value }))}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {saisonsDisponibles.map(s => (
                            <option key={s} value={s}>{s}{s === saisonCourante ? " (en cours)" : ""}</option>
                          ))}
                        </select>
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
                    <p className="mt-2 text-xs text-muted-foreground">Le code Pass Sport est obligatoire et devra être communiqué au club dès sa réception.</p>
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

      <AlertDialog open={!!confirmAccepter} onOpenChange={(open) => { if (!open) setConfirmAccepter(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accepter ce dossier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le dossier de <strong>{confirmAccepter?.nom} {confirmAccepter?.prenom}</strong> ({resolveDiscNoms(confirmAccepter?.disciplines).join(", ") || "—"}) sera accepté.
              <br /><br />
              Un email sera envoyé pour l'informer que son inscription est retenue et qu'il doit procéder au règlement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmAccepter) { handleAccepterInscription(confirmAccepter.id); setConfirmAccepter(null); } }}>
              Accepter le dossier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmValider} onOpenChange={(open) => { if (!open) setConfirmValider(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider cette inscription ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'inscription de <strong>{confirmValider?.nom} {confirmValider?.prenom}</strong> ({resolveDiscNoms(confirmValider?.disciplines).join(", ") || "—"}) sera définitivement validée.
              <br /><br />
              Le paiement sera considéré comme reçu. Le compte membre sera créé si nécessaire et une confirmation par email sera envoyée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => { if (confirmValider) { handleValiderInscription(confirmValider.id); setConfirmValider(null); } }}
            >
              Valider l'inscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmRefuser} onOpenChange={(open) => { if (!open) setConfirmRefuser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refuser ce dossier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le dossier de <strong>{confirmRefuser?.nom} {confirmRefuser?.prenom}</strong> ({resolveDiscNoms(confirmRefuser?.disciplines).join(", ") || "—"}) sera refusé.
              <br /><br />
              Un email de refus sera envoyé au demandeur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmRefuser) { handleRefuserInscription(confirmRefuser.id); setConfirmRefuser(null); } }}
            >
              Refuser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmNouvelleSaison} onOpenChange={setConfirmNouvelleSaison}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Démarrer la nouvelle saison ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les membres avec le rôle "Inscrit" seront remis en attente de réinscription.
              Ils devront se réinscrire et être validés pour retrouver leur accès membre.
              Les administrateurs ne sont pas affectés.
              {saisonCourante && <><br /><br />Saison courante dans Sanity : <strong>{saisonCourante}</strong>.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleNouvelleSaison}
              disabled={processing === "nouvelle-saison"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing === "nouvelle-saison" ? "En cours…" : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
  membres, accesGalerie, disciplinesSanity, inscriptions, saisonFilter, onToggle,
}: {
  membres: Membre[];
  accesGalerie: { id: string; compte_id: string; discipline_sanity_id: string; actif: boolean; source: string; saison: string }[];
  disciplinesSanity: { _id: string; nom: string; nomCourt?: string }[];
  inscriptions: Inscription[];
  saisonFilter: string;
  onToggle: (profilId: string, disc: string, current: string | null, checked: boolean) => void;
}) => {
  const [search, setSearch] = useState("");
  const [pendingToggle, setPendingToggle] = useState<{
    membreId: string; membreLabel: string; discId: string; discNom: string; checked: boolean;
  } | null>(null);

  const discs = disciplinesSanity.filter(d => !d.nom.toLowerCase().includes("stage"));
  const membresAvecInscSaison = new Set(
    inscriptions.filter(i => i.statut === "validee").map(i => i.user_id).filter(Boolean)
  );
  const actifs = membres
    .filter(m => {
      if (["admin", "admin_discipline"].includes(m.role)) return true;
      if (!["membre", "tiers"].includes(m.role)) return false;
      return membresAvecInscSaison.has(m.id);
    })
    .sort((a, b) => `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`, "fr"));
  const filtered = search
    ? actifs.filter(m => `${m.nom} ${m.prenom} ${m.email}`.toLowerCase().includes(search.toLowerCase()))
    : actifs;

  const pendingCount = accesGalerie.filter(a => !a.actif && a.source === "suggestion_auto" && a.saison === saisonFilter).length;

  const resolveDiscs = (disciplines: string | null) =>
    (disciplines || "").split(",").map(s => s.trim()).filter(Boolean)
      .map(id => disciplinesSanity.find(d => d._id === id)?.nom || id);

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
                <th className="px-4 py-2.5 text-left font-semibold text-xs">Compte</th>
                {discs.map(d => (
                  <th key={d._id} className="px-2 py-2.5 text-center font-semibold text-xs whitespace-nowrap">{d.nomCourt || d.nom}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const linkedInscs = inscriptions.filter(i =>
                  (i.user_id === m.id || i.email?.toLowerCase() === m.email?.toLowerCase()) &&
                  i.statut === "validee"
                );
                return (
                  <React.Fragment key={m.id}>
                    {/* Ligne compte */}
                    <tr className="border-t border-border/40 bg-secondary/10 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-xs text-primary truncate">{m.email}</p>
                        {(m.nom || m.prenom) && (
                          <p className="text-sm font-medium mt-0.5">{[m.nom, m.prenom].filter(Boolean).join(" ")}</p>
                        )}
                      </td>
                      {discs.map(d => {
                        const isAdminRole = m.role === "admin" || m.role === "admin_discipline";
                        const acces = accesGalerie.find(a => a.compte_id === m.id && a.discipline_sanity_id === d._id && a.saison === (isAdminRole ? "" : saisonFilter));
                        const isSuggestion = acces && !acces.actif && acces.source === "suggestion_auto";
                        const isChecked = acces?.actif === true;
                        return (
                          <td key={d._id} className={`px-2 py-2.5 text-center ${isSuggestion ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}`}>
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={v => setPendingToggle({
                                membreId: m.id,
                                membreLabel: [m.nom, m.prenom].filter(Boolean).join(" ") || m.email,
                                discId: d._id,
                                discNom: d.nom,
                                checked: !!v,
                              })}
                              className={isSuggestion ? "border-amber-400" : ""}
                            />
                          </td>
                        );
                      })}
                    </tr>
                    {/* Sous-lignes : inscriptions liées */}
                    {linkedInscs.map(i => {
                      const discNoms = resolveDiscs(i.disciplines);
                      return (
                        <tr key={i.id} className="border-t border-border/20 bg-background">
                          <td className="px-4 py-1.5 pl-8">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-px bg-border/60 shrink-0" />
                              <div>
                                <span className="text-xs text-muted-foreground font-medium">
                                  {[i.nom, i.prenom].filter(Boolean).join(" ") || <span className="italic">Sans nom</span>}
                                </span>
                                {discNoms.length > 0 && (
                                  <span className="ml-2 text-[11px] text-muted-foreground/70">— {discNoms.join(", ")}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          {discs.map(d => <td key={d._id} />)}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={discs.length + 1} className="px-4 py-8 text-center text-muted-foreground text-sm">Aucun résultat.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Les cases en jaune sont des suggestions automatiques générées lors de la validation d'une inscription — cochez pour activer l'accès.</p>

      <AlertDialog open={!!pendingToggle} onOpenChange={open => { if (!open) setPendingToggle(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle?.checked ? "Activer l'accès galerie ?" : "Retirer l'accès galerie ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle?.checked
                ? <>Autoriser <span className="font-medium text-foreground">{pendingToggle.membreLabel}</span> à accéder aux photos privées de <span className="font-medium text-foreground">{pendingToggle.discNom}</span> ?</>
                : <>Retirer à <span className="font-medium text-foreground">{pendingToggle?.membreLabel}</span> l'accès aux photos privées de <span className="font-medium text-foreground">{pendingToggle?.discNom}</span> ?</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingToggle(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingToggle) onToggle(pendingToggle.membreId, pendingToggle.discId, null, pendingToggle.checked);
                setPendingToggle(null);
              }}
              className={pendingToggle?.checked ? "" : "bg-destructive hover:bg-destructive/90"}
            >
              {pendingToggle?.checked ? "Activer" : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ================================================================
// Section : Comptes tiers
// ================================================================
const SectionTiers = ({
  membres, inscriptions, liens, enfants, onReload,
}: {
  membres: Membre[];
  inscriptions: Inscription[];
  liens: { id: string; compte_id: string; enfant_id: string; type_acces: string }[];
  enfants: { id: string; nom: string; prenom: string }[];
  onReload: () => void;
}) => {
  const [processing, setProcessing] = useState<string | null>(null);

  const idsAvecValidee = new Set(
    inscriptions.filter(i => i.statut === "validee" && i.user_id).map(i => i.user_id!)
  );
  const emailsAvecValidee = new Set(
    inscriptions.filter(i => i.statut === "validee" && i.email).map(i => i.email!.toLowerCase())
  );

  const tiersMembres = membres.filter(m => m.role === "tiers");
  const membresActifs = membres.filter(m =>
    ["membre", "admin_discipline"].includes(m.role) &&
    !idsAvecValidee.has(m.id) &&
    !emailsAvecValidee.has(m.email.toLowerCase())
  );

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
