import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import {
  tarifPourActivites,
  remiseFamille as calcRemiseFamille,
  REMISE_KARATE_COMBO,
  type GrilleTarifs,
} from "@/lib/tarifs";

interface Membre {
  id: string;
  karate: boolean;
  disciplinesChoix: string[]; // noms, parmi grille.disciplinesAuChoix
}

const nouveauMembre = (): Membre => ({
  id: crypto.randomUUID(),
  karate: false,
  disciplinesChoix: [],
});

interface PrixMembre {
  montant: number;
  cheque1: number | null;
  cheque3x: number | null;
  cas: "vide" | "ok";
  detail: string;
}

// Le Karaté n'a qu'une seule tranche possible par personne — on demande l'âge
// via un choix explicite de tranche (pas de champ "âge" libre, pour rester
// fidèle aux bornes de la grille).
const prixMembre = (m: Membre, grille: GrilleTarifs, trancheKarateLabel: string | null): PrixMembre => {
  const hasChoix = m.disciplinesChoix.length > 0;

  if (m.karate && hasChoix) {
    const tKarate = grille.tarifsKarate.find((t) => t.label === trancheKarateLabel);
    const n = m.disciplinesChoix.length;
    const tChoix = tarifPourActivites(grille, n);
    if (!tKarate || !tChoix) return { montant: 0, cheque1: null, cheque3x: null, cas: "vide", detail: "" };
    const montant = Math.round((tKarate.total + tChoix.total) * (1 - REMISE_KARATE_COMBO));
    return {
      montant,
      cheque1: null,
      cheque3x: null,
      cas: "ok",
      detail: `${grille.disciplineKarate?.nom || "Karaté"} + ${n} activité${n > 1 ? "s" : ""} au choix (−${Math.round(REMISE_KARATE_COMBO * 100)}%)`,
    };
  }
  if (m.karate) {
    const t = grille.tarifsKarate.find((t) => t.label === trancheKarateLabel);
    if (!t) return { montant: 0, cheque1: null, cheque3x: null, cas: "vide", detail: "" };
    return { montant: t.total, cheque1: t.cheque1, cheque3x: t.cheque3x, cas: "ok", detail: `Karaté — ${t.label}` };
  }
  if (hasChoix) {
    const n = m.disciplinesChoix.length;
    const t = tarifPourActivites(grille, n);
    if (!t) return { montant: 0, cheque1: null, cheque3x: null, cas: "vide", detail: "" };
    return { montant: t.total, cheque1: t.cheque1, cheque3x: t.cheque3x, cas: "ok", detail: `${n} activité${n > 1 ? "s" : ""} au choix` };
  }
  return { montant: 0, cheque1: null, cheque3x: null, cas: "vide", detail: "" };
};

const TrancheAgeButtons = ({
  grille,
  value,
  onChange,
}: {
  grille: GrilleTarifs;
  value: string | null;
  onChange: (v: string) => void;
}) => (
  <div className="flex flex-wrap gap-1.5">
    {grille.tarifsKarate.map((t) => (
      <button
        key={t.label}
        type="button"
        onClick={() => onChange(t.label)}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          value === t.label
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
        }`}
      >
        {t.label}
      </button>
    ))}
  </div>
);

const MembreCard = ({
  grille,
  membre,
  trancheKarate,
  index,
  peutSupprimer,
  onChange,
  onChangeTranche,
  onRemove,
}: {
  grille: GrilleTarifs;
  membre: Membre;
  trancheKarate: string | null;
  index: number;
  peutSupprimer: boolean;
  onChange: (m: Membre) => void;
  onChangeTranche: (label: string) => void;
  onRemove: () => void;
}) => {
  const prix = prixMembre(membre, grille, trancheKarate);
  const maxActivites = grille.tarifsAuChoix.length > 0 ? Math.max(...grille.tarifsAuChoix.map((t) => t.nombreActivites)) : 0;
  const choixPlein = membre.disciplinesChoix.length >= maxActivites;

  const toggleDiscipline = (d: string) => {
    const has = membre.disciplinesChoix.includes(d);
    if (!has && choixPlein) return;
    onChange({
      ...membre,
      disciplinesChoix: has ? membre.disciplinesChoix.filter((x) => x !== d) : [...membre.disciplinesChoix, d],
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-xl border border-border/40 bg-card p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-serif text-sm font-bold">Personne {index + 1}</p>
        <div className="flex items-center gap-3">
          {prix.cas === "ok" && <span className="text-sm font-bold text-primary">{prix.montant}&nbsp;€</span>}
          {peutSupprimer && (
            <button type="button" onClick={onRemove} aria-label="Retirer cette personne" className="text-muted-foreground hover:text-destructive">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {grille.disciplineKarate && grille.tarifsKarate.length > 0 && (
        <>
          <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={membre.karate}
              onChange={(e) => onChange({ ...membre, karate: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            <span className="font-medium">{grille.disciplineKarate.nom}</span>
          </label>
          {membre.karate && (
            <div className="mb-3 pl-6">
              <TrancheAgeButtons grille={grille} value={trancheKarate} onChange={onChangeTranche} />
            </div>
          )}
        </>
      )}

      {grille.disciplinesAuChoix.length > 0 && (
        <>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Autres disciplines — au choix {membre.disciplinesChoix.length > 0 && `(${membre.disciplinesChoix.length}/${maxActivites})`}
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {grille.disciplinesAuChoix.map((d) => {
              const checked = membre.disciplinesChoix.includes(d.nom);
              const disabled = !checked && choixPlein;
              return (
                <label
                  key={d._id}
                  className={`flex items-center gap-2 text-sm ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleDiscipline(d.nom)}
                    className="h-4 w-4 accent-primary"
                  />
                  {d.nom}
                </label>
              );
            })}
          </div>
        </>
      )}

      {prix.cas === "ok" && (
        <p className="mt-3 text-xs text-muted-foreground">
          {prix.detail}
          {(prix.cheque1 != null || prix.cheque3x != null) && (
            <> — réglable en 4 fois : 1 chèque de {prix.cheque1}&nbsp;€ puis 3 chèques de {prix.cheque3x}&nbsp;€.</>
          )}
        </p>
      )}
    </motion.div>
  );
};

const TarifSimulator = ({ grille }: { grille: GrilleTarifs | null }) => {
  const [membres, setMembres] = useState<Membre[]>([nouveauMembre()]);
  const [tranches, setTranches] = useState<Record<string, string | null>>({});

  useEffect(() => {
    setMembres([nouveauMembre()]);
    setTranches({});
  }, [grille]);

  if (!grille || (grille.tarifsAuChoix.length === 0 && grille.tarifsKarate.length === 0)) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-card p-5 text-center text-sm text-muted-foreground">
        Simulateur momentanément indisponible — grille tarifaire en cours de mise à jour. Contactez le club pour un tarif précis.
      </div>
    );
  }

  const updateMembre = (id: string, m: Membre) => setMembres((prev) => prev.map((x) => (x.id === id ? m : x)));
  const removeMembre = (id: string) => {
    setMembres((prev) => prev.filter((x) => x.id !== id));
    setTranches((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };
  const addMembre = () => setMembres((prev) => [...prev, nouveauMembre()]);

  const prix = membres.map((m) => prixMembre(m, grille, tranches[m.id] ?? null));
  const nbPersonnes = membres.length;
  const remise = calcRemiseFamille(grille, nbPersonnes);
  const sousTotal = prix.reduce((s, p) => s + (p.cas === "ok" ? p.montant : 0), 0);
  const total = Math.round(sousTotal * (1 - remise));
  const aUnCasIncomplet = prix.some((p) => p.cas === "vide");

  return (
    <div className="rounded-2xl border border-primary/20 bg-card overflow-hidden">
      <div className="border-b border-border/20 bg-primary/5 px-5 py-4">
        <h3 className="font-serif text-lg font-bold">Simulateur de tarif</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          La remise dépend du <strong className="text-foreground">nombre de personnes de la même famille</strong> inscrites, ainsi que du nombre d'activités de chacune. Ajoutez chaque membre pour estimer le tarif total.
        </p>
      </div>

      <div className="space-y-3 p-5">
        <AnimatePresence initial={false}>
          {membres.map((m, i) => (
            <MembreCard
              key={m.id}
              grille={grille}
              membre={m}
              trancheKarate={tranches[m.id] ?? null}
              index={i}
              peutSupprimer={membres.length > 1}
              onChange={(next) => updateMembre(m.id, next)}
              onChangeTranche={(label) => setTranches((prev) => ({ ...prev, [m.id]: label }))}
              onRemove={() => removeMembre(m.id)}
            />
          ))}
        </AnimatePresence>

        <button
          type="button"
          onClick={addMembre}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/25 transition-colors hover:bg-primary/90"
        >
          <Plus size={15} /> Ajouter un membre de la famille
        </button>

        {/* Résultat */}
        <div className="mt-4 rounded-xl bg-secondary/40 p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{nbPersonnes} personne{nbPersonnes > 1 ? "s" : ""} de la famille</span>
            <span>Remise famille : <strong className="text-foreground">{remise > 0 ? `−${Math.round(remise * 100)}%` : "—"}</strong></span>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <span className="font-serif text-base font-bold">Total estimé</span>
            <span className="font-serif text-3xl font-black text-primary">{sousTotal > 0 ? `${total} €` : "—"}</span>
          </div>
          {aUnCasIncomplet && (
            <p className="mt-2 text-xs text-muted-foreground/70">Complétez le choix de chaque personne pour affiner l'estimation.</p>
          )}
          <p className="mt-2 text-xs font-medium text-primary">
            Estimation indicative, à confirmer avec le club au moment de l'inscription. Règlement possible en 1 ou 4 fois par chèque.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TarifSimulator;
