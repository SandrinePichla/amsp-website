import { client } from "@/sanityClient";

// ────────────────────────────────────────────────────────────────────────────
// Grille tarifaire — désormais éditable depuis Sanity (document "grilleTarifs",
// un seul exemplaire). Remise famille au nombre de personnes de la famille
// inscrites, pas au nombre d'activités par personne.
//
// "Au choix" regroupe les disciplines déclarées dans grille.disciplinesAuChoix
// (ex : Qi Gong, Tai Chi Épée, Tai Chi main nue, Tai Chi sabre, Wutao) : même
// tarif quelles que soient les disciplines choisies parmi elles, selon le
// nombre d'activités.
//
// Le Karaté (grille.disciplineKarate) a son propre tarif par tranche d'âge.
// Karaté + une ou plusieurs activités "au choix" pour UNE MÊME personne :
// 10% de remise sur la somme des deux tarifs (REMISE_KARATE_COMBO), avant
// application de la remise famille sur le total du foyer.
//
// Source unique pour la page Planning & Tarifs (tableau "1 activité" +
// simulateur) et pour l'encart tarif de chaque page discipline.
// ────────────────────────────────────────────────────────────────────────────

export interface DisciplineRef {
  _id: string;
  nom: string;
}

export interface TarifActiviteEntry {
  nombreActivites: number;
  total: number;
  cheque1: number | null;
  cheque3x: number | null;
}

export interface TarifKarateTranche {
  label: string;
  total: number;
  cheque1: number | null;
  cheque3x: number | null;
}

export interface GrilleTarifs {
  disciplinesAuChoix: DisciplineRef[];
  tarifsAuChoix: TarifActiviteEntry[];
  disciplineKarate: DisciplineRef | null;
  tarifsKarate: TarifKarateTranche[];
  remiseFamille2: number | null;
  remiseFamille3: number | null;
}

export const GRILLE_TARIFS_QUERY = `*[_type == "grilleTarifs"][0]{
  disciplinesAuChoix[]-> { _id, nom },
  tarifsAuChoix[] { nombreActivites, total, cheque1, cheque3x },
  disciplineKarate-> { _id, nom },
  tarifsKarate[] { label, total, cheque1, cheque3x },
  remiseFamille2,
  remiseFamille3,
}`;

export const fetchGrilleTarifs = (): Promise<GrilleTarifs | null> => client.fetch(GRILLE_TARIFS_QUERY);

/** Remise appliquée à une personne combinant Karaté et une ou plusieurs activités "au choix". */
export const REMISE_KARATE_COMBO = 0.10;

/** Remise famille : au nombre de personnes de la famille inscrites, pas au nombre d'activités. */
export const remiseFamille = (grille: GrilleTarifs | null, nbPersonnes: number): number => {
  if (!grille) return 0;
  if (nbPersonnes >= 3) return (grille.remiseFamille3 || 0) / 100;
  if (nbPersonnes === 2) return (grille.remiseFamille2 || 0) / 100;
  return 0;
};

/** Le tarif "au choix" pour n activités (plafonné au maximum défini dans la grille). */
export const tarifPourActivites = (grille: GrilleTarifs | null, n: number): TarifActiviteEntry | null => {
  if (!grille || grille.tarifsAuChoix.length === 0 || n <= 0) return null;
  const max = Math.max(...grille.tarifsAuChoix.map((t) => t.nombreActivites));
  const capped = Math.min(n, max);
  return grille.tarifsAuChoix.find((t) => t.nombreActivites === capped) || null;
};

export const estDisciplineKarate = (grille: GrilleTarifs | null, disciplineId: string | undefined): boolean =>
  !!grille?.disciplineKarate && grille.disciplineKarate._id === disciplineId;

export const estDisciplineAuChoix = (grille: GrilleTarifs | null, disciplineId: string | undefined): boolean =>
  !!grille?.disciplinesAuChoix?.some((d) => d._id === disciplineId);
