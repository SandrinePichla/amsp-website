import {
  GrilleTarifs,
  TarifKarateTranche,
  tarifPourActivites,
  remiseFamille,
  REMISE_KARATE_COMBO,
  estDisciplineKarate,
  estDisciplineAuChoix,
} from "@/lib/tarifs";

/** Formate un montant en euros, toujours avec 2 décimales (ex: "45,00 €"). */
export const formatMontant = (n: number | null | undefined): string =>
  n == null ? "—" : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** Inscription vue par le calcul du foyer : seul le rattachement explicite (foyer_id) compte ici. */
export interface InscriptionFoyer {
  id: string;
  saison: string | null;
  statut?: string | null;
  foyer_id?: string | null;
}

/**
 * Regroupe les inscriptions d'un même foyer pour la saison donnée, de proche en proche
 * (si A est lié à B, et B à C, les trois forment un seul foyer). Deux sortes de liens :
 *  - un règlement partagé (même cheque_id dans cheque_echeances) — le mécanisme historique ;
 *  - un rattachement explicite (même inscriptions.foyer_id), posé par l'admin, indispensable
 *    pour une personne qui rejoint sa famille en payant ses propres règlements.
 * Les inscriptions refusées ou supprimées ne sont jamais rattachées par foyer_id.
 */
export const getFoyerIds = (
  inscriptionId: string,
  saison: string | null,
  cheques: { id: string; saison: string | null }[],
  chequeEcheances: { cheque_id: string; inscription_id: string }[],
  inscriptions: InscriptionFoyer[] = []
): string[] => {
  const chequeIdsSaison = new Set(cheques.filter((c) => c.saison === saison).map((c) => c.id));
  const linksSaison = chequeEcheances.filter((l) => chequeIdsSaison.has(l.cheque_id));

  // Graphe biparti inscription ↔ "groupe" (un chèque, ou un foyer explicite)
  const inscToGroupes = new Map<string, Set<string>>();
  const groupeToInscs = new Map<string, Set<string>>();
  const lier = (inscId: string, groupe: string) => {
    if (!inscToGroupes.has(inscId)) inscToGroupes.set(inscId, new Set());
    inscToGroupes.get(inscId)!.add(groupe);
    if (!groupeToInscs.has(groupe)) groupeToInscs.set(groupe, new Set());
    groupeToInscs.get(groupe)!.add(inscId);
  };
  for (const l of linksSaison) lier(l.inscription_id, `cheque:${l.cheque_id}`);
  for (const i of inscriptions) {
    if (i.foyer_id && i.saison === saison && i.statut !== "refusee" && i.statut !== "supprimee") {
      lier(i.id, `foyer:${i.foyer_id}`);
    }
  }

  const visited = new Set<string>([inscriptionId]);
  const queue = [inscriptionId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const groupe of inscToGroupes.get(current) || []) {
      for (const other of groupeToInscs.get(groupe) || []) {
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
  tranchesKarate: Record<string, string | null>,
  /** Somme des ajustements en cours d'année par inscription (voir ajustements_activite). */
  ajustements: Map<string, number> = new Map()
): MembreFoyerCalcul[] => {
  const remise = grille ? remiseFamille(grille, membres.length) : 0;
  const avecAjustements = (c: MembreFoyerCalcul): MembreFoyerCalcul => {
    const aj = ajustements.get(c.inscriptionId) ?? 0;
    if (aj === 0 || c.montant == null) return c;
    return { ...c, montant: Math.round((c.montant + aj) * 100) / 100, detail: `${c.detail}, changements en cours d'année compris` };
  };
  return membres.map((m) => {
    if (m.montant_attendu != null) {
      return avecAjustements({ inscriptionId: m.id, montant: m.montant_attendu, manuel: true, detail: "Saisi à la main" });
    }
    if (!grille) return { inscriptionId: m.id, montant: null, manuel: false, detail: "Grille tarifaire indisponible" };
    const brut = prixBrutPersonne(grille, m.disciplines, tranchesKarate[m.id] ?? null);
    if (!brut.calculable) return { inscriptionId: m.id, montant: null, manuel: false, detail: brut.detail };
    const montant = Math.round(brut.montant * (1 - remise));
    const suffixeRemise = remise > 0 ? ` (dont −${Math.round(remise * 100)}% remise famille)` : "";
    return avecAjustements({ inscriptionId: m.id, montant, manuel: false, detail: `${brut.detail}${suffixeRemise}` });
  });
};

// ─── Changements d'activité en cours d'année ──────────────────────────────────────────────────
// Règles de l'association : toujours au prorata, au mois, sur 10 mois (septembre → juin), le mois
// commencé étant dû ; pas de réduction pour un ajout en cours d'année (prix de l'activité seule) ;
// le site suggère, l'admin corrige. Voir la migration 20261026_ajustements_activite.sql.

export type TypeAjustement = "ajout" | "changement" | "arret" | "inscription_tardive";

export interface AjustementActivite {
  id: string;
  created_at: string;
  inscription_id: string;
  saison: string | null;
  type: TypeAjustement;
  discipline_retiree: string | null;
  discipline_ajoutee: string | null;
  date_effet: string;
  mois_restants: number;
  montant_suggere: number | null;
  montant: number;
  part_retiree: number | null;
  tranche_karate: string | null;
  motif: string | null;
  disciplines_avant: string | null;
  montant_attendu_avant: number | null;
  admin_nom: string | null;
}

export const DUREE_SAISON_MOIS = 10;

/**
 * Mois restants dans la saison à partir de la date d'effet, mois commencé compris : sur une saison
 * septembre → juin, le 15 janvier donne 6 (janvier à juin). Avant septembre : 10 ; après juin : 0.
 * La saison ("2026-2027", "Saison 2026-2027"…) fixe l'année de septembre ; à défaut, la date.
 */
export const moisRestantsSaison = (dateEffet: string, saison: string | null): number => {
  const d = new Date(dateEffet);
  if (isNaN(d.getTime())) return DUREE_SAISON_MOIS;
  const annees = (saison || "").match(/(\d{4})\s*[-/]\s*(\d{4})/);
  const anneeSept = annees ? Number(annees[1]) : (d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1);
  // Rang du mois dans la saison : septembre = 0 … juin = 9
  const rang = (d.getFullYear() - anneeSept) * 12 + d.getMonth() - 8;
  if (rang < 0) return DUREE_SAISON_MOIS;
  if (rang >= DUREE_SAISON_MOIS) return 0;
  return DUREE_SAISON_MOIS - rang;
};

/**
 * Prix d'une activité pratiquée seule, sans aucune réduction : tarif Karaté de la tranche (choisie,
 * ou déduite de l'âge), ou tarif "au choix" pour 1 activité. null si le Karaté n'a pas de tranche.
 */
export const prixActiviteSeule = (
  grille: GrilleTarifs,
  disciplineId: string,
  trancheKarate: string | null,
  age: number | null
): number | null => {
  if (estDisciplineKarate(grille, disciplineId)) {
    const t = grille.tarifsKarate.find((x) => x.label === trancheKarate) ?? trancheKarateParAge(grille, age);
    return t ? t.total : null;
  }
  return tarifPourActivites(grille, 1)?.total ?? null;
};

const auCentime = (n: number) => Math.round(n * 100) / 100;

/**
 * Montant suggéré d'un changement (signé : + à payer en plus, − à rendre) :
 *  - ajout : prix seul de l'activité × mois restants / 10 ;
 *  - changement : (prix seul nouvelle − prix seul ancienne) × mois restants / 10 ;
 *  - arrêt : − prix seul × mois restants APRÈS le mois en cours / 10 (le mois commencé est dû) ;
 *  - inscription tardive : − montant annuel × mois écoulés / 10 (ramène au prorata).
 * partRetiree : part attribuée à l'activité retirée (changement), pour l'export par activité.
 */
export const suggererAjustement = (p: {
  type: TypeAjustement;
  moisRestants: number;
  prixAjoutee?: number | null;
  prixRetiree?: number | null;
  montantAnnuel?: number | null;
}): { montant: number | null; partRetiree: number | null; detail: string } => {
  const m = p.moisRestants;
  const fraction = `${m}/${DUREE_SAISON_MOIS}`;
  if (p.type === "ajout") {
    if (p.prixAjoutee == null) return { montant: null, partRetiree: null, detail: "Prix de l'activité à préciser (tranche Karaté)" };
    return { montant: auCentime((p.prixAjoutee * m) / DUREE_SAISON_MOIS), partRetiree: null, detail: `${p.prixAjoutee} € × ${fraction}` };
  }
  if (p.type === "changement") {
    if (p.prixAjoutee == null || p.prixRetiree == null) return { montant: null, partRetiree: null, detail: "Prix à préciser (tranche Karaté)" };
    const partRetiree = auCentime((-p.prixRetiree * m) / DUREE_SAISON_MOIS);
    const montant = auCentime(((p.prixAjoutee - p.prixRetiree) * m) / DUREE_SAISON_MOIS);
    return { montant, partRetiree, detail: `(${p.prixAjoutee} € − ${p.prixRetiree} €) × ${fraction}` };
  }
  if (p.type === "arret") {
    if (p.prixRetiree == null) return { montant: null, partRetiree: null, detail: "Prix de l'activité à préciser (tranche Karaté)" };
    const apres = Math.max(m - 1, 0);
    return { montant: auCentime((-p.prixRetiree * apres) / DUREE_SAISON_MOIS), partRetiree: null, detail: `− ${p.prixRetiree} € × ${apres}/${DUREE_SAISON_MOIS} (mois commencé dû)` };
  }
  if (p.montantAnnuel == null) return { montant: null, partRetiree: null, detail: "Montant annuel à préciser" };
  const ecoules = DUREE_SAISON_MOIS - m;
  return { montant: auCentime((-p.montantAnnuel * ecoules) / DUREE_SAISON_MOIS), partRetiree: null, detail: `${p.montantAnnuel} € × ${fraction} = ${auCentime((p.montantAnnuel * m) / DUREE_SAISON_MOIS)} €` };
};

/**
 * Pour l'export par activité : activités de départ (avant le 1er changement) et ajustements de la
 * personne attribués à leur activité. Un changement se partage entre l'activité retirée (part_retiree)
 * et l'ajoutée (le reste) ; une inscription tardive porte sur les activités de départ (null).
 */
export const ajustementsPourRepartition = (
  inscriptionId: string,
  ajustements: AjustementActivite[]
): { disciplinesBase: string | null | undefined; ajustements: { disciplineId: string | null; montant: number }[] } => {
  const siens = ajustements.filter((a) => a.inscription_id === inscriptionId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const lignes: { disciplineId: string | null; montant: number }[] = [];
  for (const a of siens) {
    const montant = Number(a.montant);
    if (a.type === "ajout") lignes.push({ disciplineId: a.discipline_ajoutee, montant });
    else if (a.type === "arret") lignes.push({ disciplineId: a.discipline_retiree, montant });
    else if (a.type === "changement") {
      const partRetiree = a.part_retiree == null ? 0 : Number(a.part_retiree);
      if (partRetiree !== 0) lignes.push({ disciplineId: a.discipline_retiree, montant: partRetiree });
      lignes.push({ disciplineId: a.discipline_ajoutee, montant: auCentime(montant - partRetiree) });
    } else lignes.push({ disciplineId: null, montant });
  }
  return { disciplinesBase: siens.length ? siens[0].disciplines_avant : undefined, ajustements: lignes };
};

/**
 * Annulation de N'IMPORTE QUEL changement (pas seulement le dernier) : on inverse son effet sur les
 * activités actuelles de la fiche. Ajout de X → X retiré ; changement A → B : B retiré, A remis ;
 * arrêt de A → A remis (s'il avait été retiré ; un arrêt total l'avait laissé sur la fiche).
 */
export const disciplinesApresAnnulation = (disciplinesActuelles: string | null, a: Pick<AjustementActivite, "type" | "discipline_retiree" | "discipline_ajoutee">): string => {
  let ids = (disciplinesActuelles || "").split(",").map((s) => s.trim()).filter(Boolean);
  if ((a.type === "ajout" || a.type === "changement") && a.discipline_ajoutee) ids = ids.filter((d) => d !== a.discipline_ajoutee);
  if ((a.type === "changement" || a.type === "arret") && a.discipline_retiree && !ids.includes(a.discipline_retiree)) ids.push(a.discipline_retiree);
  return ids.join(",");
};

/**
 * Un changement plus RÉCENT qui touche la même activité empêche d'annuler celui-ci en premier
 * (ex : ajout du Wutao puis arrêt du Wutao) : renvoie l'activité en cause, sinon null.
 */
export const conflitAnnulation = (a: AjustementActivite, tous: AjustementActivite[]): string | null => {
  const concernees = [a.discipline_retiree, a.discipline_ajoutee].filter(Boolean) as string[];
  const plusRecents = tous.filter((x) => x.inscription_id === a.inscription_id && x.id !== a.id && x.created_at > a.created_at);
  for (const x of plusRecents) {
    const commun = concernees.find((d) => d === x.discipline_retiree || d === x.discipline_ajoutee);
    if (commun) return commun;
  }
  return null;
};

/** Somme des ajustements par inscription, pour calculerMontantsFoyer. */
export const sommeAjustementsParInscription = (ajustements: Pick<AjustementActivite, "inscription_id" | "montant">[]): Map<string, number> => {
  const m = new Map<string, number>();
  for (const a of ajustements) m.set(a.inscription_id, auCentime((m.get(a.inscription_id) ?? 0) + Number(a.montant)));
  return m;
};

// ─── Répartition par activité (export Excel) ────────────────────────────────────────────────────
// Les montants n'existent que par personne (théorique) et par foyer (encaissé, remis en banque) :
// le tarif "au choix" dépend du nombre d'activités, le Karaté combiné a sa remise, la remise famille
// porte sur le foyer, et un règlement paie un foyer pour un trimestre, pas une activité. Pour totaliser
// par activité, on VENTILE donc ces montants avec une clé de répartition (une estimation comptable) :
//  - théorique d'une personne → réparti entre ses activités au prorata du prix de chacune pratiquée
//    seule (tarif Karaté de sa tranche d'âge, tarif "au choix" pour 1 activité) ;
//  - encaissé / remis en banque du foyer → réparti entre les personnes au prorata de leur théorique,
//    puis entre leurs activités avec la même clé.
// Chaque répartition est faite au centime près (méthode des plus forts restes) : la somme des lignes
// retombe exactement sur le montant de départ, sans double comptage.

/** Répartit un montant (en euros) selon des poids, au centime près : la somme des parts est exacte. */
export const repartirMontant = (total: number, poids: number[]): number[] => {
  if (poids.length === 0) return [];
  const somme = poids.reduce((s, p) => s + Math.max(p, 0), 0);
  const cles = somme > 0 ? poids.map((p) => Math.max(p, 0) / somme) : poids.map(() => 1 / poids.length);
  const centimes = Math.round(total * 100);
  const bruts = cles.map((c) => c * centimes);
  const parts = bruts.map((b) => Math.floor(b));
  let reste = centimes - parts.reduce((s, p) => s + p, 0);
  // Les centimes restants vont aux plus fortes parties décimales
  const ordre = bruts.map((b, i) => ({ i, frac: b - Math.floor(b) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; reste > 0; k = (k + 1) % ordre.length, reste--) parts[ordre[k].i]++;
  return parts.map((p) => p / 100);
};

/**
 * Tranche Karaté déduite de l'âge, en lisant les libellés de la grille ("6-8 ans", "9-17 ans",
 * "+ de 18 ans"). Sert uniquement de clé de répartition : la tranche choisie par l'admin n'est pas
 * enregistrée en base, seul le montant l'est.
 */
export const trancheKarateParAge = (grille: GrilleTarifs, age: number | null): TarifKarateTranche | null => {
  if (age == null) return null;
  for (const t of grille.tarifsKarate) {
    const nombres = (t.label.match(/\d+/g) || []).map(Number);
    if (nombres.length >= 2 && age >= nombres[0] && age <= nombres[1]) return t;
    if (nombres.length === 1 && /\+|plus/i.test(t.label) && age >= nombres[0]) return t;
  }
  return null;
};

export interface LigneActivite {
  inscriptionId: string;
  disciplineId: string;
  /** null si le théorique de la personne n'est pas calculable (tranche Karaté manquante). */
  theorique: number | null;
  encaisse: number;
  depose: number;
  /** Parts des remboursements faits et des écarts acceptés du foyer (voir calculerSoldeFoyer). */
  rembourse: number;
  ecart: number;
}

/**
 * Ventile les montants d'un foyer par personne et par activité (voir l'explication plus haut).
 * membres : les inscriptions du foyer, avec l'âge déjà calculé ; theoriqueParPersonne : le montant
 * théorique de chacune (calculerMontantsFoyer, null si non calculable).
 */
export const repartirFoyerParActivite = (
  grille: GrilleTarifs,
  membres: {
    id: string;
    disciplines: string | null;
    age: number | null;
    /** Activités du montant de départ (avant tout changement en cours d'année) ; défaut : disciplines. */
    disciplinesBase?: string | null;
    /** Ajustements de la personne attribués à une activité (null = réparti sur les activités de départ). */
    ajustements?: { disciplineId: string | null; montant: number }[];
  }[],
  theoriqueParPersonne: Map<string, number | null>,
  encaisseFoyer: number,
  deposeFoyer: number,
  rembourseFoyer = 0,
  ecartFoyer = 0
): LigneActivite[] => {
  const prixSeul = (disciplineId: string, age: number | null): number => {
    const unChoix = tarifPourActivites(grille, 1)?.total ?? 0;
    if (estDisciplineKarate(grille, disciplineId)) {
      // Tranche inconnue (âge manquant) : prix le plus élevé, à défaut d'autre indice
      return trancheKarateParAge(grille, age)?.total ?? Math.max(0, ...grille.tarifsKarate.map((t) => t.total));
    }
    return unChoix;
  };

  // Part de chaque personne dans l'encaissé et le remis en banque du foyer : au prorata du théorique
  // (parts égales si un théorique manque, faute de mieux)
  const theoriques = membres.map((m) => theoriqueParPersonne.get(m.id) ?? null);
  const poidsPersonnes = theoriques.some((t) => t == null) ? membres.map(() => 1) : (theoriques as number[]);
  const encaisseParPersonne = repartirMontant(encaisseFoyer, poidsPersonnes);
  const deposeParPersonne = repartirMontant(deposeFoyer, poidsPersonnes);
  const rembourseParPersonne = repartirMontant(rembourseFoyer, poidsPersonnes);
  const ecartParPersonne = repartirMontant(ecartFoyer, poidsPersonnes);

  const decouper = (csv: string | null | undefined) => (csv || "").split(",").map((s) => s.trim()).filter(Boolean);
  const lignes: LigneActivite[] = [];
  membres.forEach((m, idx) => {
    // Le montant de départ se répartit sur les activités de départ ; chaque ajustement en cours
    // d'année va à son activité (ajoutée, retirée…). Une activité arrêtée garde donc sa part de départ
    // diminuée de l'arrêt, et une activité ajoutée ne reçoit que son ajustement.
    const base = decouper(m.disciplinesBase ?? m.disciplines);
    const attribues = (m.ajustements ?? []).filter((a) => a.disciplineId);
    const ids = [...new Set([...base, ...decouper(m.disciplines), ...attribues.map((a) => a.disciplineId as string)])];
    if (ids.length === 0) return;
    const theo = theoriques[idx];
    let partsTheo: (number | null)[];
    if (theo == null) partsTheo = ids.map(() => null);
    else {
      const sommeAttribuee = attribues.reduce((t, a) => t + a.montant, 0);
      const baseIds = base.length ? base : ids;
      const partsBase = repartirMontant(theo - sommeAttribuee, baseIds.map((id) => prixSeul(id, m.age)));
      partsTheo = ids.map((id) => {
        const k = baseIds.indexOf(id);
        const partBase = k >= 0 ? partsBase[k] : 0;
        const partAjust = attribues.filter((a) => a.disciplineId === id).reduce((t, a) => t + a.montant, 0);
        return Math.round((partBase + partAjust) * 100) / 100;
      });
    }
    // L'argent de la personne se répartit comme son théorique (prix seul si le théorique manque)
    const poids = theo == null ? ids.map((id) => prixSeul(id, m.age)) : partsTheo.map((t) => Math.max(t ?? 0, 0));
    const partsEnc = repartirMontant(encaisseParPersonne[idx], poids);
    const partsDep = repartirMontant(deposeParPersonne[idx], poids);
    const partsRemb = repartirMontant(rembourseParPersonne[idx], poids);
    const partsEcart = repartirMontant(ecartParPersonne[idx], poids);
    ids.forEach((id, k) => lignes.push({
      inscriptionId: m.id, disciplineId: id, theorique: partsTheo[k], encaisse: partsEnc[k], depose: partsDep[k],
      rembourse: partsRemb[k], ecart: partsEcart[k],
    }));
  });
  return lignes;
};

export interface BilanFoyer {
  theorique: number | null;
  /** Encaissé brut : règlements reçus ou remis en banque (l'argent entré). */
  encaisse: number;
  /** Remboursements effectués (argent sorti) — déduits de l'encaissé pour le reste dû. */
  rembourse: number;
  /** Remboursements décidés mais pas encore faits (information : ne change pas le reste dû). */
  aRembourser: number;
  /** Écarts acceptés (aucun argent ne bouge) : + reste dû abandonné, − trop-perçu conservé. */
  ecarts: number;
  resteDu: number | null;
  tropPercu: boolean;
}

// ─── Opérations de solde ──────────────────────────────────────────────────────────────────────
// Deux façons de ramener un foyer à zéro, de nature comptable différente :
//  - "remboursement" : de l'argent SORT (chèque, virement, espèces). Statut "a_rembourser" (décidé)
//    puis "rembourse" (fait) ; seul un remboursement fait diminue l'encaissé net.
//  - "ecart_accepte" : AUCUN argent ne bouge, le club renonce à quelques euros/centimes (montant > 0)
//    ou garde un petit trop-perçu (montant < 0). montant = théorique − encaissé net au moment de
//    la décision, ce qui ramène le reste dû à 0. Ne compte ni dans l'encaissé ni en banque.
// Rattachées à une inscription du foyer, cumulées par foyer comme les règlements.

/** Au-delà de ce montant (en valeur absolue), accepter un écart demande une confirmation explicite. */
export const SEUIL_ECART_ACCEPTE = 5;

export interface OperationSolde {
  id: string;
  inscription_id: string;
  saison: string | null;
  type: "remboursement" | "ecart_accepte";
  montant: number;
  statut: "a_rembourser" | "rembourse" | null;
}

/** Une ligne complète de la table operations_solde (affichage, export, journal). */
export interface OperationSoldeDetail extends OperationSolde {
  created_at: string;
  mode: "cheque" | "virement" | "especes" | null;
  numero: string | null;
  date_operation: string | null;
  motif: string | null;
  admin_nom: string | null;
}

export const calculerSoldeFoyer = (
  foyerIds: string[],
  saison: string | null,
  operations: OperationSolde[]
): { rembourse: number; aRembourser: number; ecarts: number } => {
  const foyerSet = new Set(foyerIds);
  let rembourse = 0, aRembourser = 0, ecarts = 0;
  for (const o of operations) {
    if (!foyerSet.has(o.inscription_id) || o.saison !== saison) continue;
    if (o.type === "ecart_accepte") ecarts += o.montant;
    else if (o.statut === "rembourse") rembourse += o.montant;
    else aRembourser += o.montant;
  }
  const arrondi = (n: number) => Math.round(n * 100) / 100;
  return { rembourse: arrondi(rembourse), aRembourser: arrondi(aRembourser), ecarts: arrondi(ecarts) };
};

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

/**
 * Bilan d'un foyer : reste dû = théorique − (encaissé − remboursé) − écarts acceptés.
 * resteDu est toujours positif ; tropPercu indique le sens.
 */
export const bilanFoyer = (
  theorique: number | null,
  encaisse: number,
  solde: { rembourse: number; aRembourser: number; ecarts: number } = { rembourse: 0, aRembourser: 0, ecarts: 0 }
): BilanFoyer => {
  const base = { encaisse, rembourse: solde.rembourse, aRembourser: solde.aRembourser, ecarts: solde.ecarts };
  if (theorique == null) return { theorique: null, ...base, resteDu: null, tropPercu: false };
  const diff = Math.round((theorique - (encaisse - solde.rembourse) - solde.ecarts) * 100) / 100;
  return { theorique, ...base, resteDu: Math.abs(diff), tropPercu: diff < 0 };
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
