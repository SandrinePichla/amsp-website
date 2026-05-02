import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle, XCircle, Shield, Download, ChevronDown, UserX, ClipboardList, Link2, Plus, FileText, Trash2 } from "lucide-react";
import { sendBrevoEmail, TEMPLATES } from "@/lib/brevo";
import { client } from "@/sanityClient";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

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
}

type Ligne =
  | { type: "profil"; profil: Membre; inscriptions: Inscription[] }
  | { type: "inscription_seule"; inscription: Inscription };

const mergeDisciplines = (existing: string | null, added: string | null): string => {
  const a = (existing || "").split(",").map(s => s.trim()).filter(Boolean);
  const b = (added || "").split(",").map(s => s.trim()).filter(Boolean);
  return [...new Set([...a, ...b])].join(", ");
};

const roleBadge = (role: string) => {
  if (role === "admin")      return { label: "Admin",      cls: "bg-primary/10 text-primary" };
  if (role === "membre")     return { label: "Membre",     cls: "bg-green-500/10 text-green-700" };
  if (role === "refuse")     return { label: "Refusé",     cls: "bg-red-500/10 text-red-600" };
  if (role === "en_attente") return { label: "En attente", cls: "bg-amber-500/10 text-amber-700" };
  return                            { label: "—",          cls: "bg-muted text-muted-foreground" };
};

const inscBadge = (statut: string | null) => {
  if (statut === "validee")   return { label: "Validée",    cls: "bg-green-500/10 text-green-700" };
  if (statut === "refusee")   return { label: "Refusée",    cls: "bg-red-500/10 text-red-600" };
  if (statut === "supprimee") return { label: "Supprimée",  cls: "bg-muted text-muted-foreground line-through" };
  return                             { label: "En attente", cls: "bg-amber-500/10 text-amber-700" };
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
  const [editingDisciplines, setEditingDisciplines] = useState<{ id: string; value: string } | null>(null);
  const [linkingProfilId, setLinkingProfilId] = useState<string | null>(null);
  const [linkingInscId, setLinkingInscId] = useState<string>("");
  const [confirmSupprimer, setConfirmSupprimer] = useState<Inscription | null>(null);
  const [disciplinesSanity, setDisciplinesSanity] = useState<string[]>([]);
  const dataLoadedRef = useRef(false);

  const defaultSaison = (() => {
    const y = new Date().getFullYear();
    const m = new Date().getMonth() + 1;
    return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  })();
  const [showPapierModal, setShowPapierModal] = useState(false);
  const [savingPapier, setSavingPapier] = useState(false);
  const [papierForm, setPapierForm] = useState({
    nom: "", prenom: "", adresse: "", telMobile: "", email: "",
    dateNaissance: "", groupeSanguin: "", allergie: "", niveau: "",
    urgenceContact: "", urgenceTel: "", disciplines: "", saison: defaultSaison,
    autorisationParentale: false, droitImage: false,
  });

  const loadData = async () => {
    setLoading(true);
    const [{ data: profilsData }, { data: inscData }] = await Promise.all([
      supabase.from("profils").select("id, email, prenom, nom, adresse, telephone, role, disciplines, created_at").order("created_at", { ascending: false }),
      supabase.from("inscriptions").select("*").order("created_at", { ascending: false }),
    ]);
    if (profilsData) setMembres(profilsData);
    if (inscData) setInscriptions(inscData);
    setLoading(false);
  };

  useEffect(() => {
    client.fetch(`*[_type == "discipline"] | order(ordre asc) { nom }`)
      .then((data: { nom: string }[]) => setDisciplinesSanity(data.map(d => d.nom)));
  }, []);

  useEffect(() => {
    if (!user) { navigate("/connexion"); return; }
    supabase.from("profils").select("role").eq("id", user.id).single().then(({ data }) => {
      if (data?.role !== "admin") { navigate("/"); return; }
      setIsAdmin(true);
      setCheckingRole(false);
      if (!dataLoadedRef.current) {
        dataLoadedRef.current = true;
        loadData();
      }
    });
  }, [user, navigate]);

  const handleSaisirPapier = async () => {
    if (!papierForm.nom.trim() || !papierForm.prenom.trim()) {
      toast.error("Le nom et le prénom sont obligatoires.");
      return;
    }
    if (!papierForm.disciplines.trim()) {
      toast.error("Veuillez indiquer au moins une discipline.");
      return;
    }
    setSavingPapier(true);
    const urgenceContact = [papierForm.urgenceContact, papierForm.urgenceTel].filter(Boolean).join(" — ");
    const { error } = await supabase.from("inscriptions").insert({
      nom: papierForm.nom.trim(),
      prenom: papierForm.prenom.trim(),
      adresse: papierForm.adresse.trim() || null,
      date_naissance: papierForm.dateNaissance || null,
      groupe_sanguin: papierForm.groupeSanguin.trim() || null,
      allergie: papierForm.allergie.trim() || null,
      tel_mobile: papierForm.telMobile.trim() || null,
      email: papierForm.email.trim() || null,
      urgence_contact: urgenceContact || null,
      disciplines: papierForm.disciplines.trim(),
      niveau: papierForm.niveau.trim() || null,
      autorisation_parentale: papierForm.autorisationParentale,
      droit_image: papierForm.droitImage,
      saison: papierForm.saison.trim() || null,
      statut: "en_attente",
      source: "papier",
      user_id: null,
    });
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Inscription papier enregistrée.");
      setShowPapierModal(false);
      setPapierForm({
        nom: "", prenom: "", adresse: "", telMobile: "", email: "",
        dateNaissance: "", groupeSanguin: "", allergie: "", niveau: "",
        urgenceContact: "", urgenceTel: "", disciplines: "", saison: defaultSaison,
        autorisationParentale: false, droitImage: false,
      });
      await loadData();
    }
    setSavingPapier(false);
  };

  const handleSaveDisciplines = async (id: string, value: string) => {
    const { error } = await supabase.from("profils").update({ disciplines: value || null }).eq("id", id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setMembres((prev) => prev.map((m) => m.id === id ? { ...m, disciplines: value || null } : m));
    setEditingDisciplines(null);
    toast.success("Disciplines mises à jour.");
  };

  const handleLierInscription = async (inscId: string, profilId: string, inscDisciplines: string | null) => {
    const { error } = await supabase.from("inscriptions").update({ user_id: profilId }).eq("id", inscId);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setInscriptions((prev) => prev.map((i) => i.id === inscId ? { ...i, user_id: profilId } : i));
    if (inscDisciplines) {
      const profil = membres.find(m => m.id === profilId);
      const newDiscs = mergeDisciplines(profil?.disciplines || null, inscDisciplines);
      await supabase.from("profils").update({ disciplines: newDiscs }).eq("id", profilId);
      setMembres((prev) => prev.map((m) => m.id === profilId ? { ...m, disciplines: newDiscs } : m));
    }
    toast.success("Inscription liée au compte.");
  };

  const offrirAjoutDisciplines = (profil: Membre, inscDisciplines: string | null) => {
    if (!inscDisciplines) return;
    const newDiscs = mergeDisciplines(profil.disciplines, inscDisciplines);
    if (newDiscs === profil.disciplines) return; // déjà à jour
    toast("Mettre à jour les accès galerie ?", {
      description: `Ajouter "${inscDisciplines}" au profil de ${profil.prenom || profil.email}.`,
      duration: 10000,
      action: {
        label: "Ajouter",
        onClick: async () => {
          await supabase.from("profils").update({ disciplines: newDiscs }).eq("id", profil.id);
          setMembres((prev) => prev.map((m) => m.id === profil.id ? { ...m, disciplines: newDiscs } : m));
          toast.success("Accès galerie mis à jour.");
        },
      },
    });
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
      setInscriptions((prev) => prev.map((i) => i.id === id ? { ...i, statut: "validee" } : i));

      // Proposer de mettre à jour les disciplines du profil lié
      const insc = inscriptions.find((i) => i.id === id);
      const matchedProfil = insc ? membres.find((m) =>
        m.id === insc.user_id ||
        (!insc.user_id && insc.source !== "papier" && insc.email && insc.email.toLowerCase() === m.email.toLowerCase())
      ) : null;
      if (matchedProfil) {
        offrirAjoutDisciplines(matchedProfil, insc?.disciplines || null);
      } else {
        toast.success("Inscription validée.");
      }

      // Envoyer un email de confirmation au membre
      if (insc?.email) {
        try {
          await sendBrevoEmail(TEMPLATES.VALIDATION, { email: insc.email, name: [insc.prenom, insc.nom].filter(Boolean).join(" ") || insc.email }, {
            nom: insc.nom || "",
            prenom: insc.prenom || "",
            adresse: insc.adresse || "",
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
            disciplines: insc.disciplines || "",
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

  // --- Export Excel ---
  const handleExportCSV = async () => {
    const { data, error } = await supabase.from('inscriptions').select('*').order('created_at', { ascending: false });
    if (error || !data) { toast.error("Erreur lors de l'export."); return; }

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
    const NB_COLS = 24;

    sheet.mergeCells(1, 1, 1, NB_COLS);
    const titreCell = sheet.getCell(1, 1);
    titreCell.value = 'AMSP — Liste des inscriptions';
    titreCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: BLANC } };
    titreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLEU } };
    titreCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 30;

    sheet.mergeCells(2, 1, 2, NB_COLS);
    const dateCell = sheet.getCell(2, 1);
    dateCell.value = 'Exporté le ' + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + ' — ' + data.length + ' inscription(s)';
    dateCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: BLANC } };
    dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLEU } };
    dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 18;
    sheet.getRow(3).height = 6;

    const headers = [
      'Date', 'Saison', 'Statut', 'Nom', 'Prénom', 'Date de naissance',
      'Groupe sanguin', 'Allergie(s)', 'Adresse', 'Tél. mobile',
      'Email', 'Contact urgence', 'Discipline(s)', 'Niveau',
      'Autorisation parentale', "Droit à l'image", 'Compte membre', 'Source',
      'Type', 'Pass Sport', 'Paiement', 'Parent 1', 'Parent 2',
    ];
    const headerRow = sheet.getRow(4);
    headerRow.height = 22;
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BLANC } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROUGE } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = { bottom: { style: 'thin', color: { argb: BLANC } } };
    });

    data.forEach((i, rowIdx) => {
      const profil = membres.find((m) => m.id === i.user_id);
      const compte = profil?.role === 'admin' ? 'Admin' : profil?.role === 'membre' ? 'Oui' : profil?.role === 'en_attente' ? 'En attente' : 'Non';
      const statutInsc = i.statut === 'validee' ? 'Validée' : i.statut === 'refusee' ? 'Refusée' : i.statut === 'supprimee' ? 'Supprimée' : 'En attente';
      const rowBg = rowIdx % 2 === 0 ? BLANC : GRIS_CLAIR;
      const values = [
        new Date(i.created_at).toLocaleDateString('fr-FR'),
        i.saison || '',
        statutInsc,
        i.nom || '',
        i.prenom || '',
        i.date_naissance ? new Date(i.date_naissance).toLocaleDateString('fr-FR') : '',
        i.groupe_sanguin || '',
        i.allergie || '',
        i.adresse || '',
        i.tel_mobile || '',
        i.email || '',
        i.urgence_contact || '',
        i.disciplines || '',
        i.niveau || '',
        i.autorisation_parentale ? 'Oui' : 'Non',
        i.droit_image ? 'Oui' : 'Non',
        compte,
        i.source === 'papier' ? 'Papier' : 'En ligne',
        i.type_inscription === 'mineur' ? 'Mineur' : 'Adulte',
        i.pass_sport ? 'Oui' : 'Non',
        ({cheque_1x:'Chèque 1 fois', cheque_4x:'Chèque 4 fois', especes:'Espèces', virement:'Virement'} as Record<string,string>)[i.moyen_paiement || ''] || (i.moyen_paiement || ''),
        [i.parent1_prenom, i.parent1_nom].filter(Boolean).join(' ') + (i.parent1_email ? ` — ${i.parent1_email}` : '') + (i.parent1_tel ? ` — ${i.parent1_tel}` : ''),
        [i.parent2_prenom, i.parent2_nom].filter(Boolean).join(' ') + (i.parent2_email ? ` — ${i.parent2_email}` : '') + (i.parent2_tel ? ` — ${i.parent2_tel}` : ''),
      ];
      const dataRow = sheet.getRow(4 + rowIdx + 1);
      dataRow.height = 18;
      values.forEach((val, colIdx) => {
        const cell = dataRow.getCell(colIdx + 1);
        cell.value = val;
        cell.font = { name: 'Calibri', size: 10 };
        cell.alignment = { vertical: 'middle' };
        if (colIdx === 2) {
          if (val === 'Validée') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_BG } };
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: VERT_FG } };
          } else if (val === 'Refusée') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROUGE_BG } };
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: ROUGE_FG } };
          } else if (val === 'Supprimée') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_BG } };
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: GRIS_FG } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBRE_BG } };
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: AMBRE_FG } };
          }
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        }
      });
    });

    [12, 16, 12, 16, 14, 16, 13, 16, 30, 13, 13, 26, 26, 34, 14, 20, 15, 14, 12, 10, 12, 18, 36, 36]
      .forEach((w, idx) => { sheet.getColumn(idx + 1).width = w; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inscriptions_amsp_' + new Date().toISOString().slice(0, 10) + '.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Données dérivées ---
  const enAttenteCompte = membres.filter((m) => m.role === "en_attente");
  const enAttenteInscription = inscriptions.filter((i) => i.statut === "en_attente");

  // Liaison confirmée : user_id uniquement (jamais par email automatiquement)
  const matchInscToProfil = (i: Inscription, profil: Membre) => i.user_id === profil.id;

  // Suggestion par email : uniquement pour les inscriptions en ligne, jamais papier
  const inscSuggereesEmail = (profil: Membre) =>
    inscriptions.filter(i =>
      !i.user_id &&
      i.source !== "papier" &&
      i.email &&
      i.email.toLowerCase() === profil.email.toLowerCase()
    );

  const lignes: Ligne[] = [];
  membres.forEach((profil) => {
    const profilInsc = inscriptions.filter((i) => matchInscToProfil(i, profil));
    lignes.push({ type: "profil", profil, inscriptions: profilInsc });
  });
  // Une inscription est "réclamée" si confirmée par user_id OU suggérée par email (en ligne) → ne pas afficher en doublon
  const linkedInscIds = new Set(
    membres.flatMap((profil) =>
      inscriptions
        .filter(i => matchInscToProfil(i, profil) || (
          !i.user_id && i.source !== "papier" && i.email && i.email.toLowerCase() === profil.email.toLowerCase()
        ))
        .map(i => i.id)
    )
  );
  inscriptions.forEach((insc) => {
    if (!linkedInscIds.has(insc.id)) {
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
                <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
                  <Button size="sm" onClick={() => setShowPapierModal(true)} className="gap-2 shrink-0">
                    <Plus size={14} /> Saisir inscription papier
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 shrink-0">
                    <Download size={14} /> Exporter les inscriptions
                  </Button>
                </div>
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
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-medium text-sm">{insc.prenom || ""} {insc.nom || ""}{!insc.prenom && !insc.nom && <span className="text-muted-foreground italic">Sans nom</span>}</p>
                              {insc.source === "papier" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-700"><FileText size={9} /> Papier</span>
                              )}
                            </div>
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

                                      {/* Accès galerie — disciplines */}
                                      <div className="mb-4 rounded border border-border/30 bg-background px-3 py-2.5">
                                        <p className="text-xs font-medium text-muted-foreground mb-2">Accès galerie — discipline(s)</p>
                                        {editingDisciplines?.id === profil.id ? (
                                          <div className="space-y-2">
                                            <div className="grid gap-1.5 sm:grid-cols-2">
                                              {disciplinesSanity.map(disc => {
                                                const checked = editingDisciplines.value.split(",").map(s => s.trim()).filter(Boolean).includes(disc);
                                                return (
                                                  <label key={disc} className="flex cursor-pointer items-center gap-2">
                                                    <Checkbox
                                                      checked={checked}
                                                      onCheckedChange={(v) => {
                                                        const current = editingDisciplines.value.split(",").map(s => s.trim()).filter(Boolean);
                                                        const updated = v ? [...new Set([...current, disc])] : current.filter(d => d !== disc);
                                                        setEditingDisciplines({ id: profil.id, value: updated.join(", ") });
                                                      }}
                                                    />
                                                    <span className="text-xs">{disc}</span>
                                                  </label>
                                                );
                                              })}
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                              <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleSaveDisciplines(profil.id, editingDisciplines.value)}>Enregistrer</Button>
                                              <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setEditingDisciplines(null)}>Annuler</Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs text-foreground">{profil.disciplines || <span className="italic text-muted-foreground">Non défini — accès aux albums "toute discipline" uniquement</span>}</p>
                                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs shrink-0" onClick={() => setEditingDisciplines({ id: profil.id, value: profil.disciplines || "" })}>Modifier</Button>
                                          </div>
                                        )}
                                        <p className="mt-1.5 text-[10px] text-muted-foreground/60">Vide = accès albums "toute discipline" seulement.</p>
                                      </div>

                                      {/* Inscriptions confirmées (liées par user_id) */}
                                      {pInsc.length > 0 && (
                                        <div className="mb-4">
                                          <p className="text-xs font-medium text-muted-foreground mb-2">Inscription(s) aux disciplines</p>
                                          <div className="space-y-2">
                                            {pInsc.map((insc) => {
                                              const iBdg = inscBadge(insc.statut);
                                              return (
                                                <div key={insc.id} className="rounded border border-border/30 bg-background px-3 py-2 text-xs">
                                                  {(insc.prenom || insc.nom) && (
                                                    <p className="font-semibold text-sm mb-1.5">
                                                      {[insc.prenom, insc.nom?.toUpperCase()].filter(Boolean).join(" ")}
                                                    </p>
                                                  )}
                                                  <div className="flex items-center justify-between mb-1.5 gap-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                      <span className="font-medium">{insc.disciplines || "—"}</span>
                                                      <span className="text-muted-foreground">{insc.saison || ""}</span>
                                                      <span className="text-muted-foreground">— {new Date(insc.created_at).toLocaleDateString("fr-FR")}</span>
                                                      {insc.source === "papier" && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-700"><FileText size={9} /> Papier</span>}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${iBdg.cls}`}>{iBdg.label}</span>
                                                      {insc.statut !== "validee" && insc.statut !== "supprimee" && (
                                                        <Button size="sm" onClick={() => handleValiderInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="h-6 px-2 text-xs gap-1"><CheckCircle size={10} /> Valider</Button>
                                                      )}
                                                      {insc.statut !== "refusee" && insc.statut !== "supprimee" && (
                                                        <Button size="sm" variant="outline" onClick={() => handleRefuserInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="h-6 px-2 text-xs gap-1 text-destructive hover:text-destructive"><XCircle size={10} /> Refuser</Button>
                                                      )}
                                                      {insc.statut !== "supprimee" && (
                                                        <Button size="sm" variant="outline" onClick={() => setConfirmSupprimer(insc)} disabled={processing === `insc-${insc.id}`} className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"><Trash2 size={10} /></Button>
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
                                                    {insc.moyen_paiement && <span><span className="font-medium text-foreground">Paiement </span>{{cheque_1x:"Chèque 1 fois",cheque_4x:"Chèque 4 fois",especes:"Espèces",virement:"Virement"}[insc.moyen_paiement] ?? insc.moyen_paiement}</span>}
                                                    {insc.pass_sport && <span className="text-primary font-medium">Pass Sport 2026-2027</span>}
                                                    {insc.type_inscription === 'mineur' && (insc.parent1_nom || insc.parent1_prenom) && <span className="sm:col-span-2 lg:col-span-3"><span className="font-medium text-foreground">Parent 1 </span>{[insc.parent1_prenom, insc.parent1_nom].filter(Boolean).join(" ")}{insc.parent1_email ? ` — ${insc.parent1_email}` : ""}{insc.parent1_tel ? ` — ${insc.parent1_tel}` : ""}</span>}
                                                    {insc.type_inscription === 'mineur' && (insc.parent2_nom || insc.parent2_prenom) && <span className="sm:col-span-2 lg:col-span-3"><span className="font-medium text-foreground">Parent 2 </span>{[insc.parent2_prenom, insc.parent2_nom].filter(Boolean).join(" ")}{insc.parent2_email ? ` — ${insc.parent2_email}` : ""}{insc.parent2_tel ? ` — ${insc.parent2_tel}` : ""}</span>}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* Suggestions par email (en ligne uniquement, à confirmer) */}
                                      {(() => {
                                        const suggestions = inscSuggereesEmail(profil).filter(i => !pInsc.some(p => p.id === i.id));
                                        if (suggestions.length === 0) return null;
                                        return (
                                          <div className="mb-4">
                                            <p className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1.5">
                                              <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5">Email</span>
                                              Inscription(s) en ligne avec le même email — à confirmer
                                            </p>
                                            <div className="space-y-2">
                                              {suggestions.map(insc => {
                                                const iBdg = inscBadge(insc.statut);
                                                return (
                                                  <div key={insc.id} className="rounded border border-amber-400/40 bg-background px-3 py-2 text-xs">
                                                    <div className="flex items-center justify-between gap-2">
                                                      <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium">{insc.prenom} {insc.nom}</span>
                                                        <span className="text-muted-foreground">{insc.disciplines || "—"}</span>
                                                        <span className="text-muted-foreground">{insc.saison || ""}</span>
                                                      </div>
                                                      <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${iBdg.cls}`}>{iBdg.label}</span>
                                                        <Button size="sm" variant="outline" onClick={() => handleLierInscription(insc.id, profil.id, insc.disciplines)} disabled={processing === `insc-${insc.id}`} className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary"><Link2 size={10} /> Confirmer le lien</Button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })()}

                                      {/* Lier une inscription existante */}
                                      {(() => {
                                        const dejaliees = new Set(pInsc.map(i => i.id));
                                        const disponibles = inscriptions.filter(i => !dejaliees.has(i.id));
                                        if (disponibles.length === 0) return null;
                                        const isLinking = linkingProfilId === profil.id;
                                        return (
                                          <div className="mb-4 rounded border border-border/30 bg-background px-3 py-2.5">
                                            <p className="text-xs font-medium text-muted-foreground mb-2">Lier une inscription existante</p>
                                            {isLinking ? (
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <select
                                                  className="flex-1 min-w-0 rounded border border-border bg-card px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                                  value={linkingInscId}
                                                  onChange={e => setLinkingInscId(e.target.value)}
                                                >
                                                  <option value="">— Choisir une inscription —</option>
                                                  {disponibles.map(i => (
                                                    <option key={i.id} value={i.id}>
                                                      {[i.prenom, i.nom].filter(Boolean).join(" ") || i.email || "Sans nom"} — {i.disciplines || "?"} {i.saison ? `(${i.saison})` : ""}
                                                    </option>
                                                  ))}
                                                </select>
                                                <Button
                                                  size="sm"
                                                  className="h-7 px-3 text-xs gap-1"
                                                  disabled={!linkingInscId}
                                                  onClick={async () => {
                                                    const insc = inscriptions.find(i => i.id === linkingInscId);
                                                    await handleLierInscription(linkingInscId, profil.id, insc?.disciplines || null);
                                                    setLinkingProfilId(null);
                                                    setLinkingInscId("");
                                                  }}
                                                >
                                                  <Link2 size={11} /> Lier
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setLinkingProfilId(null); setLinkingInscId(""); }}>Annuler</Button>
                                              </div>
                                            ) : (
                                              <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1" onClick={() => { setLinkingProfilId(profil.id); setLinkingInscId(""); }}>
                                                <Link2 size={11} /> Lier une inscription…
                                              </Button>
                                            )}
                                          </div>
                                        );
                                      })()}

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
{insc.adresse && <div><span className="text-muted-foreground">Adresse </span>{insc.adresse}</div>}
                                      {insc.date_naissance && <div><span className="text-muted-foreground">Naissance </span>{new Date(insc.date_naissance).toLocaleDateString("fr-FR")}</div>}
                                      {insc.groupe_sanguin && <div><span className="text-muted-foreground">Groupe sanguin </span>{insc.groupe_sanguin}</div>}
                                      {insc.allergie && <div><span className="text-muted-foreground">Allergie </span>{insc.allergie}</div>}
                                      {insc.urgence_contact && <div><span className="text-muted-foreground">Urgence </span>{insc.urgence_contact}</div>}
                                      {insc.niveau && <div><span className="text-muted-foreground">Niveau </span>{insc.niveau}</div>}
                                      {insc.moyen_paiement && <div><span className="text-muted-foreground">Paiement </span>{{cheque_1x:"Chèque 1 fois",cheque_4x:"Chèque 4 fois",especes:"Espèces",virement:"Virement"}[insc.moyen_paiement] ?? insc.moyen_paiement}</div>}
                                      {insc.pass_sport && <div className="text-primary font-medium">Pass Sport 2026-2027</div>}
                                      {insc.type_inscription === 'mineur' && (insc.parent1_nom || insc.parent1_prenom) && <div className="sm:col-span-2 lg:col-span-3"><span className="text-muted-foreground">Parent 1 </span>{[insc.parent1_prenom, insc.parent1_nom].filter(Boolean).join(" ")}{insc.parent1_email ? ` — ${insc.parent1_email}` : ""}{insc.parent1_tel ? ` — ${insc.parent1_tel}` : ""}</div>}
                                      {insc.type_inscription === 'mineur' && (insc.parent2_nom || insc.parent2_prenom) && <div className="sm:col-span-2 lg:col-span-3"><span className="text-muted-foreground">Parent 2 </span>{[insc.parent2_prenom, insc.parent2_nom].filter(Boolean).join(" ")}{insc.parent2_email ? ` — ${insc.parent2_email}` : ""}{insc.parent2_tel ? ` — ${insc.parent2_tel}` : ""}</div>}
                                      <div><span className="text-muted-foreground">Envoyée le </span>{new Date(insc.created_at).toLocaleDateString("fr-FR")}</div>
                                    </div>
                                    <div className="flex justify-end pt-2 border-t border-border/30 gap-2">
                                      {insc.statut !== "validee" && insc.statut !== "supprimee" && (
                                        <Button size="sm" onClick={() => handleValiderInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-xs"><CheckCircle size={12} /> Valider l'inscription</Button>
                                      )}
                                      {insc.statut !== "refusee" && insc.statut !== "supprimee" && (
                                        <Button size="sm" variant="outline" onClick={() => handleRefuserInscription(insc.id)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-xs text-destructive hover:text-destructive"><XCircle size={12} /> Refuser l'inscription</Button>
                                      )}
                                      {insc.statut !== "supprimee" && (
                                        <Button size="sm" variant="outline" onClick={() => setConfirmSupprimer(insc)} disabled={processing === `insc-${insc.id}`} className="gap-1 text-xs text-muted-foreground hover:text-destructive"><Trash2 size={12} /> Supprimer</Button>
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

      {/* Modale saisie inscription papier */}
      <Dialog open={showPapierModal} onOpenChange={(open) => { if (!open) setShowPapierModal(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Saisir une inscription papier</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">

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
                    <Label htmlFor="p-ddn">Date de naissance</Label>
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="p-urgnom">Contact urgence — nom</Label>
                    <Input id="p-urgnom" placeholder="Nom, prénom" value={papierForm.urgenceContact} onChange={e => setPapierForm(f => ({ ...f, urgenceContact: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-urgtel">Contact urgence — tél.</Label>
                    <Input id="p-urgtel" type="tel" placeholder="06 00 00 00 00" value={papierForm.urgenceTel} onChange={e => setPapierForm(f => ({ ...f, urgenceTel: e.target.value }))} />
                  </div>
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
                    {disciplinesSanity.map(disc => {
                      const checked = papierForm.disciplines.split(",").map(s => s.trim()).filter(Boolean).includes(disc);
                      return (
                        <label key={disc} className="flex cursor-pointer items-center gap-2">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setPapierForm(f => {
                                const current = f.disciplines.split(",").map(s => s.trim()).filter(Boolean);
                                const updated = v ? [...new Set([...current, disc])] : current.filter(d => d !== disc);
                                return { ...f, disciplines: updated.join(", ") };
                              });
                            }}
                          />
                          <span className="text-sm">{disc}</span>
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
              <h3 className="mb-3 text-sm font-semibold border-b border-border/50 pb-1.5">Autorisations</h3>
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <Checkbox checked={papierForm.autorisationParentale} onCheckedChange={v => setPapierForm(f => ({ ...f, autorisationParentale: v as boolean }))} />
                  <span className="text-sm">Autorisation parentale signée (pour les mineurs)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3">
                  <Checkbox checked={papierForm.droitImage} onCheckedChange={v => setPapierForm(f => ({ ...f, droitImage: v as boolean }))} />
                  <span className="text-sm">Droit à l'image accordé</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button variant="outline" onClick={() => setShowPapierModal(false)} disabled={savingPapier}>Annuler</Button>
              <Button onClick={handleSaisirPapier} disabled={savingPapier} className="gap-2">
                {savingPapier ? "Enregistrement…" : <><Plus size={14} /> Enregistrer l'inscription</>}
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
              L'inscription de <strong>{confirmSupprimer?.prenom} {confirmSupprimer?.nom}</strong> ({confirmSupprimer?.disciplines || "—"}) sera marquée comme supprimée.
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
