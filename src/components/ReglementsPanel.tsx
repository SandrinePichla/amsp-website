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

export const ReglementsPanel = ({
  inscriptionId,
  initialEcheance,
  inscriptions,
  cheques,
  chequeEcheances,
  setCheques,
  setChequeEcheances,
  setInscriptions,
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
  const [formStatut, setFormStatut] = useState<"attendu" | "recu">("recu");
  const [formPartages, setFormPartages] = useState<string[]>([]);

  useEffect(() => { fetchGrilleTarifs().then(setGrille); }, []);
  const premierRenduRef = useRef(true);
  useEffect(() => {
    if (premierRenduRef.current) { premierRenduRef.current = false; return; }
    setActiveEcheance(1);
  }, [currentId]);

  const insc = inscriptions.find((i) => i.id === currentId);

  const foyerIds = useMemo(
    () => (insc ? getFoyerIds(insc.id, insc.saison, cheques, chequeEcheances) : [insc]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [insc?.id, insc?.saison, cheques, chequeEcheances]
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
  const bilan = bilanFoyer(theoriqueFoyer, encaisseFoyer);

  const echeances = insc ? echeancesDuMoyenPaiement(insc.moyen_paiement, insc.created_at) : [];

  const candidatsSwitch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return foyerMembres.filter((m) => m.id !== currentId);
    return inscriptions.filter(
      (i) => i.id !== currentId && `${i.nom} ${i.prenom}`.toLowerCase().includes(q)
    );
  }, [search, foyerMembres, inscriptions, currentId]);

  const resetForm = () => {
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

  const handleToggleStatut = async (cheque: ChequeLite) => {
    const nouveau = (cheque.statut ?? "recu") === "recu" ? "attendu" : "recu";
    const { error } = await supabase.from("cheques").update({ statut: nouveau }).eq("id", cheque.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setCheques((prev) => prev.map((c) => (c.id === cheque.id ? { ...c, statut: nouveau } : c)));
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
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setShowSwitch((v) => !v)} className="h-8 gap-1.5 text-xs">
              <Search size={13} /> Changer d'adhérent
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0"><X size={15} /></Button>
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
          </div>
          <div className={`rounded-md border px-3 py-2 ${bilan.resteDu == null ? "bg-card border-border/40" : bilan.tropPercu ? "bg-sky-500/10 border-sky-200" : bilan.resteDu > 0 ? "bg-amber-500/10 border-amber-200" : "bg-emerald-500/10 border-emerald-200"}`}>
            <p className="text-[11px] text-muted-foreground">{bilan.tropPercu ? "Trop-perçu" : "Reste dû"}</p>
            <p className={`text-sm font-semibold ${bilan.resteDu == null ? "" : bilan.tropPercu ? "text-sky-700" : bilan.resteDu > 0 ? "text-amber-700" : "text-emerald-700"}`}>
              {formatMontant(bilan.resteDu)}
            </p>
          </div>
        </div>
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

              {regls.map(({ link, cheque }) => (
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
                      onClick={() => handleToggleStatut(cheque)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${(cheque.statut ?? "recu") === "recu" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}
                    >
                      {(cheque.statut ?? "recu") === "recu" ? "Reçu" : "En attente"}
                    </button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleSupprimer(link)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              ))}

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
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox checked={formStatut === "attendu"} onCheckedChange={(v) => setFormStatut(v ? "attendu" : "recu")} />
                    Annoncé mais pas encore reçu (« en attente »)
                  </label>
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
