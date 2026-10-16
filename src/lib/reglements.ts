import {
  GrilleTarifs,
  tarifPourActivites,
  remiseFamille,
  REMISE_KARATE_COMBO,
  estDisciplineKarate,
  estDisciplineAuChoix,
} from "@/lib/tarifs";

/** Formate un montant en euros, toujours avec 2 décimales (ex: "45,00 €"). */
export const formatMontant = (n: number | null | undefined): string =>
  n == null ? "—" : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/**
 * Regroupe les inscriptions d'un même foyer : celles qui partagent au moins un
 * règlement (cheque_id) en commun pour la saison donnée, de proche en proche
 * (si A partage avec B, et B avec C, les trois forment un seul foyer).
 * Réutilise le mécanisme existant de "chèque partagé" plutôt que d'inventer un
 * nouveau système de liens familiaux — voir cheque_echeances/cheques.
 */
export const getFoyerIds = (
  inscriptionId: string,
  saison: string | null,
  cheques: { id: string; saison: string | null }[],
  chequeEcheances: { cheque_id: string; inscription_id: string }[]
): string[] => {
  const chequeIdsSaison = new Set(cheques.filter((c) => c.saison === saison).map((c) => c.id));
  const linksSaison = chequeEcheances.filter((l) => chequeIdsSaison.has(l.cheque_id));

  const inscToCheques = new Map<string, Set<string>>();
  const chequeToInscs = new Map<string, Set<string>>();
  for (const l of linksSaison) {
    if (!inscToCheques.has(l.inscription_id)) inscToCheques.set(l.inscription_id, new Set());
    inscToCheques.get(l.inscription_id)!.add(l.cheque_id);
    if (!chequeToInscs.has(l.cheque_id)) chequeToInscs.set(l.cheque_id, new Set());
    chequeToInscs.get(l.cheque_id)!.add(l.inscription_id);
  }

  const visited = new Set<string>([inscriptionId]);
  const queue = [inscriptionId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const chequeId of inscToCheques.get(current) || []) {
      for (const other of chequeToInscs.get(chequeId) || []) {
        if (!visited.has(other)) {
          visited.add(other);
          queue.push(other);
        }
      }
    }
  }
  return [...visited];
};

export interface PrixBrut {
  montant: number;
  detail: string;
  /** true si le calcul est possible ; false si Karaté est présent sans tranche d'âge choisie. */
  calculable: boolean;
}

/**
 * Tarif brut d'une personne (avant remise famille), à partir de ses disciplines
 * et, si elle fait du Karaté, de la tranche d'âge choisie par l'admin (le Karaté
 * n'a pas de calcul automatique depuis la date de naissance — même choix
 * manuel que sur le simulateur public, voir TarifSimulator.tsx).
 */
export const prixBrutPersonne = (
  grille: GrilleTarifs,
  disciplinesCsv: string | null,
  trancheKarateLabel: string | null
): PrixBrut => {
  const ids = (disciplinesCsv || "").split(",").map((s) => s.trim()).filter(Boolean);
  const karate = ids.some((id) => estDisciplineKarate(grille, id));
  const nChoix = ids.filter((id) => estDisciplineAuChoix(grille, id)).length;

  if (karate && nChoix > 0) {
    const tKarate = grille.tarifsKarate.find((t) => t.label === trancheKarateLabel);
    const tChoix = tarifPourActivites(grille, nChoix);
    if (!tKarate || !tChoix) return { montant: 0, detail: "Tranche d'âge Karaté à préciser", calculable: false };
    const montant = Math.round((tKarate.total + tChoix.total) * (1 - REMISE_KARATE_COMBO));
    return {
      montant,
      detail: `${grille.disciplineKarate?.nom || "Karaté"} + ${nChoix} activité${nChoix > 1 ? "s" : ""} au choix (−${Math.round(REMISE_KARATE_COMBO * 100)}%)`,
      calculable: true,
    };
  }
  if (karate) {
    const t = grille.tarifsKarate.find((t) => t.label === trancheKarateLabel);
    if (!t) return { montant: 0, detail: "Tranche d'âge Karaté à préciser", calculable: false };
    return { montant: t.total, detail: `Karaté — ${t.label}`, calculable: true };
  }
  if (nChoix > 0) {
    const t = tarifPourActivites(grille, nChoix);
    if (!t) return { montant: 0, detail: "Tarif indisponible", calculable: false };
    return { montant: t.total, detail: `${nChoix} activité${nChoix > 1 ? "s" : ""} au choix`, calculable: true };
  }
  return { montant: 0, detail: "Aucune discipline tarifée", calculable: false };
};

export interface MembreFoyerCalcul {
  inscriptionId: string;
  /** Montant effectif : la surcharge manuelle si définie, sinon le calcul automatique (peut être null si non calculable). */
  montant: number | null;
  /** true si c'est une valeur saisie à la main (montant_attendu), false si calculée automatiquement. */
  manuel: boolean;
  detail: string;
}

/**
 * Montant théorique de chaque membre d'un foyer : surcharge manuelle
 * (inscriptions.montant_attendu) si définie, sinon tarif individuel réduit du
 * pourcentage de remise famille du foyer (mathématiquement identique à une
 * remise appliquée sur le total du foyer, mais permet de surcharger une seule
 * personne — ex : nouvel arrivant en cours d'année — sans toucher aux autres).
 */
export const calculerMontantsFoyer = (
  grille: GrilleTarifs | null,
  membres: { id: string; disciplines: string | null; montant_attendu: number | null }[],
  tranchesKarate: Record<string, string | null>
): MembreFoyerCalcul[] => {
  const remise = grille ? remiseFamille(grille, membres.length) : 0;
  return membres.map((m) => {
    if (m.montant_attendu != null) {
      return { inscriptionId: m.id, montant: m.montant_attendu, manuel: true, detail: "Saisi à la main" };
    }
    if (!grille) return { inscriptionId: m.id, montant: null, manuel: false, detail: "Grille tarifaire indisponible" };
    const brut = prixBrutPersonne(grille, m.disciplines, tranchesKarate[m.id] ?? null);
    if (!brut.calculable) return { inscriptionId: m.id, montant: null, manuel: false, detail: brut.detail };
    const montant = Math.round(brut.montant * (1 - remise));
    const suffixeRemise = remise > 0 ? ` (dont −${Math.round(remise * 100)}% remise famille)` : "";
    return { inscriptionId: m.id, montant, manuel: false, detail: `${brut.detail}${suffixeRemise}` };
  });
};

export interface BilanFoyer {
  theorique: number | null;
  encaisse: number;
  resteDu: number | null;
  tropPercu: boolean;
}

/** Encaissé du foyer = somme des règlements "reçu" liés à ses membres pour la saison, un même chèque partagé ne comptant qu'une fois. */
export const calculerEncaisseFoyer = (
  foyerIds: string[],
  saison: string | null,
  cheques: { id: string; montant: number | null; saison: string | null; statut?: string }[],
  chequeEcheances: { cheque_id: string; inscription_id: string }[]
): number => {
  const foyerSet = new Set(foyerIds);
  const chequeIdsLies = new Set(
    chequeEcheances.filter((l) => foyerSet.has(l.inscription_id)).map((l) => l.cheque_id)
  );
  let total = 0;
  const comptes = new Set<string>();
  for (const c of cheques) {
    if (!chequeIdsLies.has(c.id) || c.saison !== saison) continue;
    if ((c.statut ?? "recu") === "attendu") continue;
    if (comptes.has(c.id)) continue;
    comptes.add(c.id);
    total += c.montant || 0;
  }
  return total;
};

export const bilanFoyer = (theorique: number | null, encaisse: number): BilanFoyer => {
  if (theorique == null) return { theorique: null, encaisse, resteDu: null, tropPercu: false };
  const diff = Math.round((theorique - encaisse) * 100) / 100;
  return { theorique, encaisse, resteDu: Math.abs(diff), tropPercu: diff < 0 };
};

/**
 * Les 4 trimestres, toujours proposés quel que soit le mode de règlement choisi sur la fiche
 * d'inscription — dans les faits, le mode de paiement effectif peut différer de celui coché au
 * départ (ex : quelqu'un qui avait coché "1 fois" règle finalement en plusieurs fois). La saisie
 * des règlements est donc volontairement libre, avec la date d'échéance de chaque trimestre pour
 * détecter un trimestre "passé sans rien saisi".
 */
export const echeancesDuMoyenPaiement = (
  _moyenPaiement: string | null,
  dateCreation: string
): { echeance: number; label: string; dueDate: Date }[] => {
  const created = new Date(dateCreation);
  const y1 = created.getMonth() >= 7 ? created.getFullYear() : created.getFullYear() - 1;
  const y2 = y1 + 1;
  return [
    { echeance: 1, label: "À l'inscription", dueDate: created },
    { echeance: 2, label: `Décembre ${y1}`, dueDate: new Date(y1, 11, 1) },
    { echeance: 3, label: `Mars ${y2}`, dueDate: new Date(y2, 2, 1) },
    { echeance: 4, label: `Juin ${y2}`, dueDate: new Date(y2, 5, 1) },
  ];
};
