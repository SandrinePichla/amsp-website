import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil, Check, X, Search, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GrilleTarifs,
  fetchGrilleTarifs,
  estDisciplineKarate,
} from "@/lib/tarifs";
import {
  formatMontant,
  getFoyerIds,
  calculerMontantsFoyer,
  calculerEncaisseFoyer,
  bilanFoyer,
  echeancesDuMoyenPaiement,
  prixBrutPersonne,
  calculerSoldeFoyer,
  SEUIL_ECART_ACCEPTE,
  type OperationSoldeDetail,
} from "@/lib/reglements";

interface InscriptionLite {
  id: string;
  nom: string | null;
  prenom: string | null;
  disciplines: string | null;
  saison: string | null;
  moyen_paiement: string | null;
  created_at: string;
  montant_attendu: number | null;
  statut?: string | null;
  foyer_id?: string | null;
}

/** Une ligne pour le journal des modifications (voir journaliserModifications dans AdminMembres). */
interface EntreeJournal {
  table_cible: "inscriptions" | "profils";
  ligne_id: string;
  personne: string;
  champ: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
}

interface ChequeLite {
  id: string;
  type: "cheque" | "especes" | "virement";
  numero: string | null;
  montant: number | null;
  saison: string | null;
  statut?: string;
  created_at: string;
}

interface ChequeEcheanceLite {
  id: string;
  cheque_id: string;
  inscription_id: string;
  echeance: number;
  label: string;
}

const TYPE_LABELS: Record<string, string> = { cheque: "Chèque", especes: "Espèces", virement: "Virement" };

/** Les 3 états d'un règlement, dans l'ordre de progression réelle : annoncé → en main → porté à la banque. */
const STATUT_ORDRE: ("attendu" | "recu" | "depose")[] = ["attendu", "recu", "depose"];
const STATUT_LABELS: Record<string, string> = { attendu: "En attente", recu: "Reçu", depose: "Remis en banque" };
const STATUT_CLS: Record<string, string> = {
  attendu: "bg-amber-500/10 text-amber-700",
  recu: "bg-emerald-500/10 text-emerald-700",
  depose: "bg-sky-500/10 text-sky-700",
};

export const ReglementsPanel = ({
  inscriptionId,
  initialEcheance,
  inscriptions,
  cheques,
  chequeEcheances,
  setCheques,
  setChequeEcheances,
  setInscriptions,
  journaliser,
  operations = [],
  setOperations,
  auteur,
  onClose,
}: {
  inscriptionId: string;
  initialEcheance?: number;
  inscriptions: InscriptionLite[];
  cheques: ChequeLite[];
  chequeEcheances: ChequeEcheanceLite[];
  setCheques: (updater: (prev: ChequeLite[]) => ChequeLite[]) => void;
  setChequeEcheances: (updater: (prev: ChequeEcheanceLite[]) => ChequeEcheanceLite[]) => void;
  setInscriptions: (updater: (prev: InscriptionLite[]) => InscriptionLite[]) => void;
  journaliser?: (entrees: EntreeJournal[]) => Promise<void>;
  /** Remboursements et écarts acceptés (table operations_solde). */
  operations?: OperationSoldeDetail[];
  setOperations?: (updater: (prev: OperationSoldeDetail[]) => OperationSoldeDetail[]) => void;
  /** Admin connecté, enregistré sur chaque opération de solde. */
  auteur?: { id: string; nom: string | null };
  onClose: () => void;
}) => {
  const [currentId, setCurrentId] = useState(inscriptionId);
  const [grille, setGrille] = useState<GrilleTarifs | null>(null);
  const [tranchesKarate, setTranchesKarate] = useState<Record<string, string | null>>({});
  const [activeEcheance, setActiveEcheance] = useState(initialEcheance ?? 1);
  const [search, setSearch] = useState("");
  const [showSwitch, setShowSwitch] = useState(false);
  const [editingMontant, setEditingMontant] = useState(false);
  const [montantInput, setMontantInput] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<"cheque" | "especes" | "virement">("cheque");
  const [formNumero, setFormNumero] = useState("");
  const [formMontant, setFormMontant] = useState("");
  const [formStatut, setFormStatut] = useState<"attendu" | "recu" | "depose">("recu");
  const [formPartages, setFormPartages] = useState<string[]>([]);

  const [editingChequeId, setEditingChequeId] = useState<string | null>(null);
  const [editType, setEditType] = useState<"cheque" | "especes" | "virement">("cheque");
  const [editNumero, setEditNumero] = useState("");
  const [editMontant, setEditMontant] = useState("");
  const [editStatut, setEditStatut] = useState<"attendu" | "recu" | "depose">("recu");

  useEffect(() => { fetchGrilleTarifs().then(setGrille); }, []);
  const premierRenduRef = useRef(true);
  useEffect(() => {
    if (premierRenduRef.current) { premierRenduRef.current = false; return; }
    setActiveEcheance(1);
  }, [currentId]);

  const insc = inscriptions.find((i) => i.id === currentId);

  const foyerIds = useMemo(
    (): string[] => (insc ? getFoyerIds(insc.id, insc.saison, cheques, chequeEcheances, inscriptions) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [insc?.id, insc?.saison, cheques, chequeEcheances, inscriptions]
  );
  const foyerMembres = useMemo(
    () => inscriptions.filter((i) => foyerIds.includes(i.id)),
    [inscriptions, foyerIds]
  );

  const calculs = useMemo(
    () => (grille ? calculerMontantsFoyer(grille, foyerMembres, tranchesKarate) : []),
    [grille, foyerMembres, tranchesKarate]
  );
  const theoriqueFoyer = calculs.some((c) => c.montant == null) ? null : calculs.reduce((s, c) => s + (c.montant || 0), 0);
  const encaisseFoyer = insc ? calculerEncaisseFoyer(foyerIds, insc.saison, cheques, chequeEcheances) : 0;
  const bilan = bilanFoyer(theoriqueFoyer, encaisseFoyer, calculerSoldeFoyer(foyerIds, insc?.saison ?? null, operations));
  const operationsFoyer = operations.filter((o) => foyerIds.includes(o.inscription_id) && o.saison === (insc?.saison ?? null));

  // ── Solder le foyer : accepter un écart (aucun argent ne bouge) ou rembourser un trop-perçu ──
  const [showSolder, setShowSolder] = useState(false);
  const [motifEcart, setMotifEcart] = useState("Arrondi des chèques");
  const [confirmeGrosEcart, setConfirmeGrosEcart] = useState(false);
  const [rembMontant, setRembMontant] = useState("");
  const [rembMode, setRembMode] = useState<"cheque" | "virement" | "especes">("virement");
  const [rembNumero, setRembNumero] = useState("");
  const [rembStatut, setRembStatut] = useState<"a_rembourser" | "rembourse">("a_rembourser");
  const [soldeEnCours, setSoldeEnCours] = useState(false);
  const [confirmAnnulerOp, setConfirmAnnulerOp] = useState<string | null>(null);
  // Écart signé : + reste dû abandonné par le club, − trop-perçu conservé par le club
  const ecartSigne = bilan.resteDu == null ? null : (bilan.tropPercu ? -bilan.resteDu : bilan.resteDu);
  const grosEcart = ecartSigne != null && Math.abs(ecartSigne) > SEUIL_ECART_ACCEPTE;
  useEffect(() => {
    setShowSolder(false); setConfirmeGrosEcart(false); setConfirmAnnulerOp(null);
    setRembMontant(""); setRembNumero(""); setRembStatut("a_rembourser"); setMotifEcart("Arrondi des chèques");
  }, [currentId]);

  const libelleOperation = (o: Pick<OperationSoldeDetail, "type" | "montant" | "statut" | "mode" | "numero">) =>
    o.type === "ecart_accepte"
      ? (o.montant >= 0 ? `Écart accepté : ${formatMontant(o.montant)} non réclamé` : `Écart accepté : trop-perçu de ${formatMontant(-o.montant)} conservé par le club`)
      : `Remboursement de ${formatMontant(o.montant)} (${TYPE_LABELS[o.mode || ""] || "mode non précisé"}${o.numero ? ` n° ${o.numero}` : ""}) — ${o.statut === "rembourse" ? "remboursé" : "à rembourser"}`;

  const enregistrerOperation = async (ligne: Partial<OperationSoldeDetail>) => {
    if (!insc) return false;
    setSoldeEnCours(true);
    const { data, error } = await supabase.from("operations_solde").insert({
      inscription_id: insc.id, saison: insc.saison, admin_id: auteur?.id ?? null, admin_nom: auteur?.nom ?? null, ...ligne,
    }).select().single();
    setSoldeEnCours(false);
    if (error || !data) { toast.error("Erreur : " + (error?.message || "inconnue")); return false; }
    setOperations?.((prev) => [...prev, data as OperationSoldeDetail]);
    await journaliser?.([{
      table_cible: "inscriptions", ligne_id: insc.id, personne: [insc.prenom, insc.nom].filter(Boolean).join(" "),
      champ: ligne.type === "ecart_accepte" ? "Écart accepté" : "Remboursement",
      ancienne_valeur: null, nouvelle_valeur: `${libelleOperation(data as OperationSoldeDetail)}${ligne.motif ? ` — ${ligne.motif}` : ""}`,
    }]);
    return true;
  };

  const handleAccepterEcart = async () => {
    if (ecartSigne == null || ecartSigne === 0) return;
    if (grosEcart && !confirmeGrosEcart) { toast.error(`Écart supérieur à ${SEUIL_ECART_ACCEPTE} € : cochez la case de confirmation.`); return; }
    if (await enregistrerOperation({ type: "ecart_accepte", montant: ecartSigne, statut: null, motif: motifEcart.trim() || null })) {
      toast.success("Écart accepté : le foyer est soldé.");
      setShowSolder(false); setConfirmeGrosEcart(false);
    }
  };

  const handleRembourser = async () => {
    const montant = Number((rembMontant.trim() || String(bilan.resteDu ?? "")).replace(",", "."));
    if (!montant || montant <= 0) { toast.error("Montant du remboursement invalide."); return; }
    if (await enregistrerOperation({
      type: "remboursement", montant, statut: rembStatut, mode: rembMode,
      numero: rembMode === "cheque" ? rembNumero.trim() || null : null,
      date_operation: rembStatut === "rembourse" ? new Date().toISOString().slice(0, 10) : null,
    })) {
      toast.success(rembStatut === "rembourse" ? "Remboursement enregistré." : "Remboursement noté « à rembourser ».");
      setShowSolder(false); setRembMontant(""); setRembNumero("");
    }
  };

  const handleMarquerRembourse = async (o: OperationSoldeDetail) => {
    const date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("operations_solde").update({ statut: "rembourse", date_operation: date }).eq("id", o.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setOperations?.((prev) => prev.map((x) => (x.id === o.id ? { ...x, statut: "rembourse", date_operation: date } : x)));
    const concerne = inscriptions.find((i) => i.id === o.inscription_id);
    await journaliser?.([{
      table_cible: "inscriptions", ligne_id: o.inscription_id, personne: concerne ? [concerne.prenom, concerne.nom].filter(Boolean).join(" ") : "",
      champ: "Remboursement", ancienne_valeur: "à rembourser", nouvelle_valeur: `remboursé (${formatMontant(o.montant)})`,
    }]);
    toast.success("Remboursement marqué comme fait.");
  };

  const handleAnnulerOperation = async (o: OperationSoldeDetail) => {
    const { error } = await supabase.from("operations_solde").delete().eq("id", o.id);
    setConfirmAnnulerOp(null);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setOperations?.((prev) => prev.filter((x) => x.id !== o.id));
    const concerne = inscriptions.find((i) => i.id === o.inscription_id);
    await journaliser?.([{
      table_cible: "inscriptions", ligne_id: o.inscription_id, personne: concerne ? [concerne.prenom, concerne.nom].filter(Boolean).join(" ") : "",
      champ: o.type === "ecart_accepte" ? "Écart accepté" : "Remboursement",
      ancienne_valeur: libelleOperation(o), nouvelle_valeur: "Annulé",
    }]);
    toast.success("Opération annulée.");
  };

  const echeances = insc ? echeancesDuMoyenPaiement(insc.moyen_paiement, insc.created_at) : [];

  const candidatsSwitch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return foyerMembres.filter((m) => m.id !== currentId);
    return inscriptions.filter(
      (i) => i.id !== currentId && `${i.nom} ${i.prenom}`.toLowerCase().includes(q)
    );
  }, [search, foyerMembres, inscriptions, currentId]);

  // ── Rattachement explicite à un foyer ──────────────────────────────────────
  // La personne affichée (et son foyer actuel éventuel) rejoint le foyer d'un autre adhérent.
  // Avant de confirmer, l'admin voit l'effet sur les montants théoriques et peut figer ceux des
  // personnes déjà dans le foyer d'accueil (la remise famille ne profite alors qu'aux arrivants).
  const [showRattacher, setShowRattacher] = useState(false);
  const [rattachSearch, setRattachSearch] = useState("");
  const [rattachCibleId, setRattachCibleId] = useState<string | null>(null);
  const [figerMontants, setFigerMontants] = useState(true);
  const [rattachEnCours, setRattachEnCours] = useState(false);
  const [confirmDetacher, setConfirmDetacher] = useState(false);

  const nomComplet = (i: InscriptionLite) => [i.prenom, i.nom].filter(Boolean).join(" ");

  // Changer d'adhérent referme un rattachement ou un détachement en cours
  useEffect(() => {
    setShowRattacher(false); setRattachSearch(""); setRattachCibleId(null); setFigerMontants(true); setConfirmDetacher(false);
  }, [currentId]);

  const candidatsRattachement = useMemo(() => {
    const q = rattachSearch.trim().toLowerCase();
    if (!insc || !q) return [];
    return inscriptions.filter((i) =>
      i.saison === insc.saison && !foyerIds.includes(i.id) &&
      i.statut !== "refusee" && i.statut !== "supprimee" &&
      `${i.nom} ${i.prenom}`.toLowerCase().includes(q)
    );
  }, [rattachSearch, inscriptions, insc, foyerIds]);

  /** Aperçu du rattachement : membres du foyer d'accueil et des arrivants, montants avant / après. */
  const apercuRattachement = useMemo(() => {
    const cible = rattachCibleId ? inscriptions.find((i) => i.id === rattachCibleId) : null;
    if (!insc || !cible || !grille) return null;
    const idsAccueil = getFoyerIds(cible.id, cible.saison, cheques, chequeEcheances, inscriptions);
    const accueil = inscriptions.filter((i) => idsAccueil.includes(i.id));
    const arrivants = foyerMembres;
    const avantAccueil = calculerMontantsFoyer(grille, accueil, tranchesKarate);
    const avantArrivants = calculerMontantsFoyer(grille, arrivants, tranchesKarate);
    const avant = new Map([...avantAccueil, ...avantArrivants].map((c) => [c.inscriptionId, c.montant]));
    // Si on fige, chaque membre du foyer d'accueil garde son montant actuel (surcharge manuelle)
    const accueilApres = accueil.map((m) =>
      figerMontants && m.montant_attendu == null && avant.get(m.id) != null ? { ...m, montant_attendu: avant.get(m.id)! } : m
    );
    const apres = new Map(calculerMontantsFoyer(grille, [...accueilApres, ...arrivants], tranchesKarate).map((c) => [c.inscriptionId, c.montant]));
    const lignes = [...accueil.map((m) => ({ m, role: "accueil" as const })), ...arrivants.map((m) => ({ m, role: "arrivant" as const }))]
      .map(({ m, role }) => ({ m, role, avant: avant.get(m.id) ?? null, apres: apres.get(m.id) ?? null }));
    // Karaté sans tranche : montant non calculable, donc impossible à figer automatiquement
    const nonFigeables = figerMontants ? accueil.filter((m) => m.montant_attendu == null && avant.get(m.id) == null) : [];
    return { cible, accueil, arrivants, lignes, nonFigeables };
  }, [rattachCibleId, inscriptions, insc, grille, cheques, chequeEcheances, foyerMembres, tranchesKarate, figerMontants]);

  const fermerRattachement = () => { setShowRattacher(false); setRattachSearch(""); setRattachCibleId(null); setFigerMontants(true); };

  const handleRattacher = async () => {
    if (!apercuRattachement) return;
    const { accueil, arrivants, lignes } = apercuRattachement;
    const tous = [...accueil, ...arrivants];
    const foyerId = tous.find((m) => m.foyer_id)?.foyer_id ?? crypto.randomUUID();
    const aMettreAJour = tous.filter((m) => m.foyer_id !== foyerId);
    setRattachEnCours(true);

    if (aMettreAJour.length > 0) {
      const { error } = await supabase.from("inscriptions").update({ foyer_id: foyerId }).in("id", aMettreAJour.map((m) => m.id));
      if (error) { setRattachEnCours(false); toast.error("Erreur : " + error.message); return; }
    }
    const montantsFiges: { m: InscriptionLite; montant: number }[] = [];
    if (figerMontants) {
      for (const m of accueil) {
        const montant = lignes.find((l) => l.m.id === m.id)?.avant;
        if (m.montant_attendu != null || montant == null) continue;
        const { error } = await supabase.from("inscriptions").update({ montant_attendu: montant }).eq("id", m.id);
        if (error) toast.warning(`Montant de ${nomComplet(m)} non figé : ${error.message}`);
        else montantsFiges.push({ m, montant });
      }
    }

    setInscriptions((prev) => prev.map((i) => {
      const fige = montantsFiges.find((f) => f.m.id === i.id);
      const rattache = tous.some((m) => m.id === i.id);
      return rattache || fige ? { ...i, ...(rattache ? { foyer_id: foyerId } : {}), ...(fige ? { montant_attendu: fige.montant } : {}) } : i;
    }));

    const avecQui = (m: InscriptionLite) => tous.filter((o) => o.id !== m.id).map(nomComplet).join(", ");
    const ancienFoyer = (m: InscriptionLite) => {
      const groupe = accueil.some((a) => a.id === m.id) ? accueil : arrivants;
      const autres = groupe.filter((o) => o.id !== m.id).map(nomComplet);
      return autres.length ? `Foyer avec ${autres.join(", ")}` : "Seul(e)";
    };
    await journaliser?.([
      ...tous.map((m) => ({
        table_cible: "inscriptions" as const, ligne_id: m.id, personne: nomComplet(m), champ: "Foyer",
        ancienne_valeur: ancienFoyer(m), nouvelle_valeur: `Foyer avec ${avecQui(m)}`,
      })),
      ...montantsFiges.map(({ m, montant }) => ({
        table_cible: "inscriptions" as const, ligne_id: m.id, personne: nomComplet(m), champ: "Montant théorique",
        ancienne_valeur: "Calcul automatique", nouvelle_valeur: `${formatMontant(montant)} (figé lors d'un rattachement au foyer)`,
      })),
    ]);

    setRattachEnCours(false);
    toast.success(`${arrivants.map(nomComplet).join(", ")} rattaché(e) au foyer de ${nomComplet(apercuRattachement.cible)}.`);
    fermerRattachement();
  };

  const handleDetacher = async () => {
    if (!insc) return;
    const autresAvant = foyerMembres.filter((m) => m.id !== insc.id).map(nomComplet);
    const { error } = await supabase.from("inscriptions").update({ foyer_id: null }).eq("id", insc.id);
    setConfirmDetacher(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    const inscriptionsApres = inscriptions.map((i) => (i.id === insc.id ? { ...i, foyer_id: null } : i));
    setInscriptions((prev) => prev.map((i) => (i.id === insc.id ? { ...i, foyer_id: null } : i)));
    // Un règlement encore partagé maintient le lien : on le signale plutôt que de le cacher
    const resteApres = getFoyerIds(insc.id, insc.saison, cheques, chequeEcheances, inscriptionsApres).filter((id) => id !== insc.id);
    const resteNoms = inscriptions.filter((i) => resteApres.includes(i.id)).map(nomComplet);
    await journaliser?.([{
      table_cible: "inscriptions", ligne_id: insc.id, personne: nomComplet(insc), champ: "Foyer",
      ancienne_valeur: autresAvant.length ? `Foyer avec ${autresAvant.join(", ")}` : "Seul(e)",
      nouvelle_valeur: resteNoms.length ? `Foyer avec ${resteNoms.join(", ")} (règlements partagés)` : "Seul(e)",
    }]);
    if (resteNoms.length) {
      toast.warning(`${nomComplet(insc)} partage encore des règlements avec ${resteNoms.join(", ")} : le lien reste tant que ces règlements sont partagés.`, { duration: 8000 });
    } else {
      toast.success(`${nomComplet(insc)} a été détaché(e) du foyer.`);
    }
  };

  const resetForm = () => {
    setFormType("cheque");
    setFormNumero("");
    setFormMontant("");
    setFormStatut("recu");
    setFormPartages([]);
  };

  const reglementsEcheance = (echeance: number) =>
    chequeEcheances
      .filter((l) => l.inscription_id === currentId && l.echeance === echeance)
      .map((l) => ({ link: l, cheque: cheques.find((c) => c.id === l.cheque_id) }))
      .filter((r): r is { link: ChequeEcheanceLite; cheque: ChequeLite } => !!r.cheque);

  const handleAjouter = async () => {
    if (!insc) return;
    const montant = formMontant.trim() ? Number(formMontant.replace(",", ".")) : null;
    if (formType === "cheque" && !formNumero.trim()) { toast.error("Le numéro de chèque est obligatoire."); return; }
    const label = echeances.find((e) => e.echeance === activeEcheance)?.label || `Échéance ${activeEcheance}`;

    const { data: cheque, error } = await supabase
      .from("cheques")
      .insert({
        type: formType,
        numero: formType === "cheque" ? formNumero.trim() : null,
        montant,
        saison: insc.saison,
        statut: formStatut,
      })
      .select()
      .single();
    if (error || !cheque) { toast.error("Erreur : " + (error?.message || "inconnue")); return; }

    const cibles = [currentId, ...formPartages];
    const { data: links, error: linkErr } = await supabase
      .from("cheque_echeances")
      .insert(cibles.map((id) => ({ cheque_id: cheque.id, inscription_id: id, echeance: activeEcheance, label })))
      .select();
    if (linkErr || !links) { toast.error("Erreur : " + (linkErr?.message || "inconnue")); return; }

    setCheques((prev) => [...prev, cheque]);
    setChequeEcheances((prev) => [...prev, ...links]);
    toast.success("Règlement enregistré.");
    resetForm();
    // Formulaire reste ouvert pour enchaîner une nouvelle saisie sur la même échéance.
  };

  const handleSupprimer = async (link: ChequeEcheanceLite) => {
    const { error } = await supabase.from("cheque_echeances").delete().eq("id", link.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    const autresLiens = chequeEcheances.filter((l) => l.cheque_id === link.cheque_id && l.id !== link.id);
    setChequeEcheances((prev) => prev.filter((l) => l.id !== link.id));
    if (autresLiens.length === 0) {
      await supabase.from("cheques").delete().eq("id", link.cheque_id);
      setCheques((prev) => prev.filter((c) => c.id !== link.cheque_id));
    }
    toast.success("Règlement retiré.");
  };

  const handleCycleStatut = async (cheque: ChequeLite) => {
    const actuel = cheque.statut ?? "recu";
    const nouveau = STATUT_ORDRE[(STATUT_ORDRE.indexOf(actuel as "attendu" | "recu" | "depose") + 1) % STATUT_ORDRE.length];
    const { error } = await supabase.from("cheques").update({ statut: nouveau }).eq("id", cheque.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setCheques((prev) => prev.map((c) => (c.id === cheque.id ? { ...c, statut: nouveau } : c)));
  };

  const startEdit = (cheque: ChequeLite) => {
    setEditingChequeId(cheque.id);
    setEditType(cheque.type);
    setEditNumero(cheque.numero || "");
    setEditMontant(cheque.montant != null ? String(cheque.montant) : "");
    setEditStatut((cheque.statut ?? "recu") as "attendu" | "recu" | "depose");
  };

  const handleSaveEdit = async () => {
    if (!editingChequeId) return;
    if (editType === "cheque" && !editNumero.trim()) { toast.error("Le numéro de chèque est obligatoire."); return; }
    const montant = editMontant.trim() ? Number(editMontant.replace(",", ".")) : null;
    const { error } = await supabase
      .from("cheques")
      .update({ type: editType, numero: editType === "cheque" ? editNumero.trim() : null, montant, statut: editStatut })
      .eq("id", editingChequeId);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setCheques((prev) => prev.map((c) => (c.id === editingChequeId ? { ...c, type: editType, numero: editType === "cheque" ? editNumero.trim() : null, montant, statut: editStatut } : c)));
    toast.success("Règlement modifié.");
    setEditingChequeId(null);
  };

  const saveMontantAttendu = async (valeur: number | null) => {
    if (!insc) return;
    const { error } = await supabase.from("inscriptions").update({ montant_attendu: valeur }).eq("id", insc.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setInscriptions((prev) => prev.map((i) => (i.id === insc.id ? { ...i, montant_attendu: valeur } : i)));
    setEditingMontant(false);
    toast.success(valeur == null ? "Retour au calcul automatique." : "Montant attendu mis à jour.");
  };
  const handleSaveMontantAttendu = () => saveMontantAttendu(montantInput.trim() ? Number(montantInput.replace(",", ".")) : null);
  const handleResetMontantAttendu = () => saveMontantAttendu(null);

  const suggestionAuto = insc && grille
    ? prixBrutPersonne(grille, insc.disciplines, tranchesKarate[insc.id] ?? null)
    : null;
  const aKarate = !!insc && !!grille && (insc.disciplines || "").split(",").map((s) => s.trim()).some((id) => estDisciplineKarate(grille, id));

  if (!insc) return null;

  const aujourdHui = new Date();

  return (
    <div className="flex h-full flex-col">
      {/* En-tête persistant */}
      <div className="shrink-0 border-b border-border/50 bg-gradient-to-b from-secondary/40 to-background px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-bold">{insc.prenom} {insc.nom}</h2>
              {foyerMembres.length > 1 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                  <Users size={10} /> Foyer de {foyerMembres.length}
                </span>
              )}
            </div>
            {foyerMembres.length > 1 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Avec {foyerMembres.filter((m) => m.id !== currentId).map((m) => `${m.prenom} ${m.nom}`).join(", ")}
              </p>
            )}
            <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
              <button onClick={() => { setShowRattacher((v) => !v); setShowSwitch(false); }} className="text-primary underline hover:no-underline">
                Rattacher à un foyer…
              </button>
              {insc.foyer_id && !confirmDetacher && (
                <button onClick={() => setConfirmDetacher(true)} className="text-muted-foreground underline hover:text-destructive">
                  Détacher du foyer
                </button>
              )}
              {confirmDetacher && (
                <span className="text-muted-foreground">
                  Détacher {insc.prenom} {insc.nom} ?{" "}
                  <button onClick={handleDetacher} className="font-medium text-destructive underline">Oui</button>{" "}
                  <button onClick={() => setConfirmDetacher(false)} className="underline">Non</button>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setShowSwitch((v) => !v)} className="h-8 gap-1.5 text-xs mr-6">
              <Search size={13} /> Changer d'adhérent
            </Button>
          </div>
        </div>

        {showSwitch && (
          <div className="mt-3 rounded-md border border-border/50 bg-card p-2">
            <Input autoFocus placeholder="Rechercher un adhérent…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-sm" />
            <div className="mt-1.5 max-h-40 overflow-y-auto">
              {candidatsSwitch.slice(0, 20).map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setCurrentId(m.id); setShowSwitch(false); setSearch(""); }}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-secondary/50"
                >
                  <span>{m.prenom} {m.nom}</span>
                  {foyerIds.includes(m.id) && <span className="text-[10px] text-violet-600">foyer</span>}
                </button>
              ))}
              {candidatsSwitch.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground italic">Aucun résultat</p>}
            </div>
          </div>
        )}

        {showRattacher && (
          <div className="mt-3 space-y-2 rounded-md border border-violet-200 bg-card p-3 text-xs">
            {!apercuRattachement ? (
              <>
                <p className="font-medium">
                  Rattacher {foyerMembres.map(nomComplet).join(", ")} au foyer de :
                </p>
                <Input autoFocus placeholder="Rechercher un adhérent de la même saison…" value={rattachSearch} onChange={(e) => setRattachSearch(e.target.value)} className="h-8 text-sm" />
                <div className="max-h-40 overflow-y-auto">
                  {candidatsRattachement.slice(0, 20).map((m) => (
                    <button key={m.id} onClick={() => setRattachCibleId(m.id)} className="flex w-full rounded px-2 py-1.5 text-left text-sm hover:bg-secondary/50">
                      {m.prenom} {m.nom}
                    </button>
                  ))}
                  {rattachSearch.trim() && candidatsRattachement.length === 0 && (
                    <p className="px-2 py-1.5 italic text-muted-foreground">Aucun résultat</p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={fermerRattachement} className="h-7 text-xs">Annuler</Button>
                </div>
              </>
            ) : (
              <>
                <p className="font-medium">Effet sur les montants théoriques</p>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-1 font-normal">Personne</th>
                      <th className="py-1 text-right font-normal">Avant</th>
                      <th className="py-1 text-right font-normal">Après</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apercuRattachement.lignes.map(({ m, role, avant, apres }) => (
                      <tr key={m.id} className="border-t border-border/40">
                        <td className="py-1">
                          {nomComplet(m)}{" "}
                          <span className="text-[10px] text-muted-foreground">{role === "accueil" ? "(déjà dans le foyer)" : "(arrive)"}</span>
                        </td>
                        <td className="py-1 text-right">{formatMontant(avant)}</td>
                        <td className={`py-1 text-right font-medium ${avant != null && apres != null && apres !== avant ? "text-violet-700" : ""}`}>{formatMontant(apres)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <label className="flex items-start gap-2">
                  <Checkbox checked={figerMontants} onCheckedChange={(v) => setFigerMontants(!!v)} className="mt-0.5" />
                  <span>
                    Garder les montants actuels des personnes déjà dans le foyer
                    <span className="block text-[10px] text-muted-foreground">
                      Décoché : la remise famille est recalculée pour tout le foyer (un trop-perçu peut apparaître). Coché : seul l'arrivant en profite. Le crayon du montant théorique reste disponible pour ajuster ensuite.
                    </span>
                  </span>
                </label>
                {apercuRattachement.nonFigeables.length > 0 && (
                  <p className="rounded bg-amber-500/10 px-2 py-1 text-amber-700">
                    Montant non calculable, donc non figé : {apercuRattachement.nonFigeables.map(nomComplet).join(", ")} (tranche d'âge Karaté à choisir).
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">Les montants « — » ne sont pas calculables (tranche Karaté manquante) : ils restent à compléter.</p>
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setRattachCibleId(null)} className="h-7 text-xs" disabled={rattachEnCours}>Retour</Button>
                  <Button size="sm" onClick={handleRattacher} className="h-7 gap-1 text-xs" disabled={rattachEnCours}>
                    <Users size={12} /> {rattachEnCours ? "Rattachement…" : "Confirmer le rattachement"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Théorique / Encaissé / Reste dû */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-md bg-card border border-border/40 px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Théorique (foyer)</p>
              <button onClick={() => { setMontantInput(insc.montant_attendu != null ? String(insc.montant_attendu) : ""); setEditingMontant(true); }} className="text-muted-foreground hover:text-foreground">
                <Pencil size={11} />
              </button>
            </div>
            {editingMontant ? (
              <div className="mt-1 flex items-center gap-1">
                <Input autoFocus type="number" step="0.01" value={montantInput} onChange={(e) => setMontantInput(e.target.value)} placeholder="auto" className="h-7 text-sm" />
                <Button size="sm" className="h-7 w-7 p-0" onClick={handleSaveMontantAttendu}><Check size={13} /></Button>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setEditingMontant(false)}><X size={13} /></Button>
              </div>
            ) : (
              <p className="text-sm font-semibold">{formatMontant(theoriqueFoyer)}</p>
            )}
            {insc.montant_attendu != null && !editingMontant && (
              <p className="text-[10px] text-muted-foreground">saisi à la main — <button onClick={handleResetMontantAttendu} className="underline hover:text-foreground">revenir au calcul auto</button></p>
            )}
            {insc.montant_attendu == null && suggestionAuto && !suggestionAuto.calculable && !editingMontant && (
              <p className="mt-1 text-[10px] text-amber-600">{suggestionAuto.detail}</p>
            )}

            {/* Aide au choix de la tranche d'âge Karaté : toujours visible pour un karatéka, avec le tarif de
                chaque tranche affiché à côté (utile quand l'âge est à la limite entre deux tranches) et un moyen
                de réinitialiser le choix en cas d'erreur de sélection. */}
            {!editingMontant && aKarate && grille && grille.tarifsKarate.length > 0 && (
              <div className="mt-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Tranche d'âge Karaté :</p>
                  {tranchesKarate[insc.id] && (
                    <button onClick={() => setTranchesKarate((prev) => ({ ...prev, [insc.id]: null }))} className="text-[10px] text-muted-foreground hover:text-destructive underline">
                      réinitialiser
                    </button>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {grille.tarifsKarate.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => setTranchesKarate((prev) => ({ ...prev, [insc.id]: t.label }))}
                      className={`flex flex-col items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${tranchesKarate[insc.id] === t.label ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                    >
                      <span>{t.label}</span>
                      <span className="opacity-80">{formatMontant(t.total)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {insc.montant_attendu == null && tranchesKarate[insc.id] && suggestionAuto?.calculable && !editingMontant && (
              <button
                onClick={() => saveMontantAttendu(calculs.find((c) => c.inscriptionId === insc.id)?.montant ?? null)}
                className="mt-1 text-[10px] text-primary underline"
              >
                Enregistrer le montant suggéré pour ce foyer ({formatMontant(calculs.find((c) => c.inscriptionId === insc.id)?.montant)})
              </button>
            )}
          </div>
          <div className="rounded-md bg-card border border-border/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Encaissé</p>
            <p className="text-sm font-semibold text-emerald-700">{formatMontant(bilan.encaisse)}</p>
            {bilan.rembourse > 0 && <p className="text-[10px] text-muted-foreground">dont {formatMontant(bilan.rembourse)} remboursé</p>}
          </div>
          <div className={`rounded-md border px-3 py-2 ${bilan.resteDu == null ? "bg-card border-border/40" : bilan.tropPercu ? "bg-sky-500/10 border-sky-200" : bilan.resteDu > 0 ? "bg-amber-500/10 border-amber-200" : "bg-emerald-500/10 border-emerald-200"}`}>
            <p className="text-[11px] text-muted-foreground">{bilan.tropPercu ? "Trop-perçu" : "Reste dû"}</p>
            <p className={`text-sm font-semibold ${bilan.resteDu == null ? "" : bilan.tropPercu ? "text-sky-700" : bilan.resteDu > 0 ? "text-amber-700" : "text-emerald-700"}`}>
              {formatMontant(bilan.resteDu)}
            </p>
            {bilan.ecarts !== 0 && bilan.resteDu === 0 && <p className="text-[10px] text-emerald-700">soldé (écart accepté)</p>}
            {bilan.aRembourser > 0 && <p className="text-[10px] text-sky-700">{formatMontant(bilan.aRembourser)} à rembourser</p>}
          </div>
        </div>

        {/* Solder le foyer : écart accepté (aucun argent ne bouge) ou remboursement d'un trop-perçu */}
        {ecartSigne != null && ecartSigne !== 0 && !showSolder && (
          <button onClick={() => setShowSolder(true)} className="mt-2 text-xs text-primary underline hover:no-underline">
            Solder…
          </button>
        )}
        {showSolder && ecartSigne != null && ecartSigne !== 0 && (
          <div className="mt-2 space-y-3 rounded-md border border-border/50 bg-card p-3 text-xs">
            <div className="space-y-1.5">
              <p className="font-medium">
                {ecartSigne > 0
                  ? `Accepter l'écart : le club ne réclame pas les ${formatMontant(ecartSigne)} restants`
                  : `Accepter l'écart : le club conserve le trop-perçu de ${formatMontant(-ecartSigne)}`}
              </p>
              <p className="text-[10px] text-muted-foreground">Aucun argent ne bouge : l'encaissé et le remis en banque ne changent pas, le foyer est simplement soldé.</p>
              <Input value={motifEcart} onChange={(e) => setMotifEcart(e.target.value)} placeholder="Motif (ex : arrondi des chèques)" className="h-7 text-xs" />
              {grosEcart && (
                <label className="flex items-start gap-2 rounded bg-amber-500/10 px-2 py-1.5 text-amber-800">
                  <Checkbox checked={confirmeGrosEcart} onCheckedChange={(v) => setConfirmeGrosEcart(!!v)} className="mt-0.5" />
                  <span>Cet écart dépasse {SEUIL_ECART_ACCEPTE} € : je confirme qu'il ne sera ni réclamé ni remboursé.</span>
                </label>
              )}
              <div className="flex justify-end">
                <Button size="sm" onClick={handleAccepterEcart} disabled={soldeEnCours || (grosEcart && !confirmeGrosEcart)} className="h-7 text-xs">
                  Accepter l'écart
                </Button>
              </div>
            </div>

            {ecartSigne < 0 && (
              <div className="space-y-1.5 border-t border-border/50 pt-3">
                <p className="font-medium">Ou rembourser le trop-perçu</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Input value={rembMontant} onChange={(e) => setRembMontant(e.target.value)} placeholder={String(bilan.resteDu ?? "")} className="h-7 w-24 text-xs" />
                  <span>€ par</span>
                  {(["virement", "cheque", "especes"] as const).map((m) => (
                    <button key={m} onClick={() => setRembMode(m)}
                      className={`rounded-full px-2 py-0.5 text-[11px] ${rembMode === m ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {TYPE_LABELS[m]}
                    </button>
                  ))}
                  {rembMode === "cheque" && (
                    <Input value={rembNumero} onChange={(e) => setRembNumero(e.target.value)} placeholder="N° de chèque" className="h-7 w-28 text-xs" />
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(["a_rembourser", "rembourse"] as const).map((s) => (
                    <button key={s} onClick={() => setRembStatut(s)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${rembStatut === s ? "bg-sky-500/15 text-sky-700 ring-1 ring-inset ring-current" : "bg-secondary text-muted-foreground"}`}>
                      {s === "a_rembourser" ? "À rembourser" : "Remboursé"}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleRembourser} disabled={soldeEnCours} className="h-7 text-xs">Enregistrer le remboursement</Button>
                </div>
              </div>
            )}

            <div className="flex justify-end border-t border-border/50 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowSolder(false)} className="h-7 text-xs">Fermer</Button>
            </div>
          </div>
        )}

        {operationsFoyer.length > 0 && (
          <div className="mt-2 space-y-1">
            {operationsFoyer.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded bg-secondary/40 px-2 py-1 text-[11px]">
                <span className="font-medium">{libelleOperation(o)}</span>
                {o.motif && <span className="text-muted-foreground">— {o.motif}</span>}
                <span className="text-muted-foreground">
                  · {new Date(o.created_at).toLocaleDateString("fr-FR")}{o.admin_nom ? ` par ${o.admin_nom}` : ""}
                </span>
                <span className="ml-auto flex gap-2">
                  {o.type === "remboursement" && o.statut === "a_rembourser" && (
                    <button onClick={() => handleMarquerRembourse(o)} className="text-sky-700 underline">Marquer remboursé</button>
                  )}
                  {confirmAnnulerOp === o.id ? (
                    <span>Annuler ? <button onClick={() => handleAnnulerOperation(o)} className="font-medium text-destructive underline">Oui</button>{" "}
                      <button onClick={() => setConfirmAnnulerOp(null)} className="underline">Non</button></span>
                  ) : (
                    <button onClick={() => setConfirmAnnulerOp(o.id)} className="text-muted-foreground underline hover:text-destructive">Annuler</button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Onglets trimestre */}
      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border/50 px-5 py-2.5">
        {echeances.map((e) => {
          const regls = reglementsEcheance(e.echeance);
          const estPassee = e.dueDate < aujourdHui;
          const vide = regls.length === 0;
          const oubli = estPassee && vide;
          return (
            <button
              key={e.echeance}
              onClick={() => setActiveEcheance(e.echeance)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeEcheance === e.echeance ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              T{e.echeance} <span className="hidden sm:inline">· {e.label}</span>
              {oubli ? (
                <AlertTriangle size={11} className="text-amber-500 animate-pulse" />
              ) : vide ? (
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              ) : (
                <Check size={11} className="text-emerald-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Contenu de l'échéance active */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {(() => {
          const e = echeances.find((e) => e.echeance === activeEcheance);
          const estPassee = e ? e.dueDate < aujourdHui : false;
          const regls = reglementsEcheance(activeEcheance);
          return (
            <>
              {estPassee && regls.length === 0 && (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle size={14} className="shrink-0" />
                  Cette échéance est passée et aucun règlement n'est encore saisi — vérifier qu'il n'a pas été oublié.
                </div>
              )}

              {regls.map(({ link, cheque }) =>
                editingChequeId === cheque.id ? (
                  <div key={link.id} className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2.5">
                    <div className="flex gap-1.5">
                      {(["cheque", "especes", "virement"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setEditType(t)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium ${editType === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                        >
                          {TYPE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {editType === "cheque" && (
                        <Input placeholder="N° de chèque" value={editNumero} onChange={(e) => setEditNumero(e.target.value)} className="h-8 text-sm" />
                      )}
                      <Input type="number" step="0.01" placeholder="Montant (€)" value={editMontant} onChange={(e) => setEditMontant(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="flex gap-1.5">
                      {STATUT_ORDRE.map((s) => (
                        <button
                          key={s}
                          onClick={() => setEditStatut(s)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${editStatut === s ? STATUT_CLS[s] + " ring-1 ring-inset ring-current" : "bg-secondary text-muted-foreground"}`}
                        >
                          {STATUT_LABELS[s]}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <Button size="sm" variant="outline" onClick={() => setEditingChequeId(null)} className="h-7 text-xs">Annuler</Button>
                      <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs gap-1"><Check size={12} /> Enregistrer</Button>
                    </div>
                  </div>
                ) : (
                  <div key={link.id} className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2">
                    <div className="text-sm">
                      <span className="font-medium">{TYPE_LABELS[cheque.type]}</span>
                      {cheque.numero && <span className="text-muted-foreground"> — N° {cheque.numero}</span>}
                      <span className="ml-2 font-semibold">{formatMontant(cheque.montant)}</span>
                      {(chequeEcheances.filter((l) => l.cheque_id === cheque.id).length > 1) && (
                        <span className="ml-2 text-[10px] text-violet-600">partagé</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCycleStatut(cheque)}
                        title="Cliquer pour passer à l'état suivant"
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUT_CLS[cheque.statut ?? "recu"]}`}
                      >
                        {STATUT_LABELS[cheque.statut ?? "recu"]}
                      </button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => startEdit(cheque)}>
                        <Pencil size={13} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleSupprimer(link)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                )
              )}

              {!formOpen ? (
                <Button size="sm" variant="outline" onClick={() => setFormOpen(true)} className="gap-1.5 text-xs">
                  <Plus size={13} /> Ajouter un règlement
                </Button>
              ) : (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2.5">
                  <div className="flex gap-1.5">
                    {(["cheque", "especes", "virement"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFormType(t)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${formType === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                      >
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {formType === "cheque" && (
                      <Input placeholder="N° de chèque" value={formNumero} onChange={(e) => setFormNumero(e.target.value)} className="h-8 text-sm" />
                    )}
                    <Input type="number" step="0.01" placeholder="Montant (€)" value={formMontant} onChange={(e) => setFormMontant(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="flex gap-1.5">
                    {STATUT_ORDRE.map((s) => (
                      <button
                        key={s}
                        onClick={() => setFormStatut(s)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${formStatut === s ? STATUT_CLS[s] + " ring-1 ring-inset ring-current" : "bg-secondary text-muted-foreground"}`}
                      >
                        {STATUT_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  {foyerMembres.length > 1 && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Partagé avec :</p>
                      <div className="flex flex-wrap gap-2">
                        {foyerMembres.filter((m) => m.id !== currentId).map((m) => (
                          <label key={m.id} className="flex items-center gap-1.5 text-xs">
                            <Checkbox
                              checked={formPartages.includes(m.id)}
                              onCheckedChange={(v) => setFormPartages((prev) => (v ? [...prev, m.id] : prev.filter((id) => id !== m.id)))}
                            />
                            {m.prenom} {m.nom}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button size="sm" variant="outline" onClick={() => { setFormOpen(false); resetForm(); }} className="h-7 text-xs">Fermer</Button>
                    <Button size="sm" onClick={handleAjouter} className="h-7 text-xs gap-1"><Plus size={12} /> Enregistrer</Button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
};
