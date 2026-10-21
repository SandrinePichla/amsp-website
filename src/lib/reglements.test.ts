import { describe, it, expect } from "vitest";
import {
  getFoyerIds, repartirMontant, trancheKarateParAge, repartirFoyerParActivite, bilanFoyer, calculerSoldeFoyer, type OperationSolde,
  moisRestantsSaison, prixActiviteSeule, suggererAjustement, calculerMontantsFoyer, sommeAjustementsParInscription,
  disciplinesApresAnnulation, conflitAnnulation, type AjustementActivite,
} from "./reglements";
import type { GrilleTarifs } from "./tarifs";

// Grille réelle de la saison (Sanity, octobre 2026)
const grille: GrilleTarifs = {
  disciplinesAuChoix: [{ _id: "taichi", nom: "Tai Chi" }, { _id: "wutao", nom: "Wutao" }, { _id: "qigong", nom: "Qi Gong" }],
  tarifsAuChoix: [
    { nombreActivites: 1, total: 230, cheque1: null, cheque3x: null },
    { nombreActivites: 2, total: 437, cheque1: null, cheque3x: null },
    { nombreActivites: 3, total: 620, cheque1: null, cheque3x: null },
  ],
  disciplineKarate: { _id: "karate", nom: "Karaté" },
  tarifsKarate: [
    { label: "6-8 ans", total: 210, cheque1: null, cheque3x: null },
    { label: "9-17 ans", total: 310, cheque1: null, cheque3x: null },
    { label: "+ de 18 ans", total: 370, cheque1: null, cheque3x: null },
  ],
  remiseFamille2: 10,
  remiseFamille3: 20,
};
const somme = (xs: (number | null)[]) => Math.round(xs.reduce((s, x) => s + (x ?? 0), 0) * 100) / 100;

describe("repartirMontant", () => {
  it("retombe exactement sur le total, au centime près", () => {
    const parts = repartirMontant(100, [1, 1, 1]);
    expect(somme(parts)).toBe(100);
    expect(parts.sort()).toEqual([33.33, 33.33, 33.34]);
  });
  it("répartit à parts égales si tous les poids sont nuls", () => {
    expect(repartirMontant(10, [0, 0])).toEqual([5, 5]);
  });
});

describe("trancheKarateParAge", () => {
  it("lit les libellés de la grille", () => {
    expect(trancheKarateParAge(grille, 7)?.total).toBe(210);
    expect(trancheKarateParAge(grille, 12)?.total).toBe(310);
    expect(trancheKarateParAge(grille, 65)?.total).toBe(370);
    expect(trancheKarateParAge(grille, null)).toBeNull();
  });
});

describe("repartirFoyerParActivite", () => {
  it("ventile sans double comptage : les totaux par activité retombent sur ceux du foyer", () => {
    // Foyer de 2 : un adulte Tai Chi + Wutao + Karaté, une adulte Karaté + Qi Gong
    const membres = [
      { id: "pascal", disciplines: "taichi,wutao,karate", age: 65 },
      { id: "sandrine", disciplines: "karate,qigong", age: 58 },
    ];
    const theoriques = new Map<string, number | null>([["pascal", 711.9], ["sandrine", 486]]);
    const lignes = repartirFoyerParActivite(grille, membres, theoriques, 470, 100);
    expect(lignes).toHaveLength(5);
    expect(somme(lignes.map((l) => l.theorique))).toBe(1197.9);
    expect(somme(lignes.map((l) => l.encaisse))).toBe(470);
    expect(somme(lignes.map((l) => l.depose))).toBe(100);
    // Karaté (370 seul) pèse plus que Qi Gong (230 seul) dans la part de Sandrine
    const karateS = lignes.find((l) => l.inscriptionId === "sandrine" && l.disciplineId === "karate")!;
    const qigongS = lignes.find((l) => l.inscriptionId === "sandrine" && l.disciplineId === "qigong")!;
    expect(karateS.theorique!).toBeGreaterThan(qigongS.theorique!);
    expect(somme([karateS.theorique, qigongS.theorique])).toBe(486);
  });

  it("garde un théorique vide (Karaté sans tranche) mais ventile quand même l'encaissé", () => {
    const lignes = repartirFoyerParActivite(grille, [{ id: "x", disciplines: "karate", age: null }], new Map([["x", null]]), 50, 0);
    expect(lignes[0].theorique).toBeNull();
    expect(lignes[0].encaisse).toBe(50);
  });
});

describe("solde d'un foyer : remboursements et écarts acceptés", () => {
  const op = (o: Partial<OperationSolde>): OperationSolde =>
    ({ id: "o", inscription_id: "A", saison: "2026-2027", type: "ecart_accepte", montant: 0, statut: null, ...o });

  it("un petit reste dû accepté ramène le foyer à zéro sans toucher l'encaissé", () => {
    // Cas réel : théorique 612,00 €, encaissé 608,98 € → reste dû 3,02 €
    const solde = calculerSoldeFoyer(["A"], "2026-2027", [op({ montant: 3.02 })]);
    const b = bilanFoyer(612, 608.98, solde);
    expect(b.resteDu).toBe(0);
    expect(b.encaisse).toBe(608.98);
    expect(b.ecarts).toBe(3.02);
  });

  it("un petit trop-perçu conservé par le club (écart négatif) ramène aussi à zéro", () => {
    const b = bilanFoyer(230, 230.4, calculerSoldeFoyer(["A"], "2026-2027", [op({ montant: -0.4 })]));
    expect(b.resteDu).toBe(0);
  });

  it("seul un remboursement FAIT diminue l'encaissé net ; à rembourser reste une information", () => {
    const aFaire = calculerSoldeFoyer(["A"], "2026-2027", [op({ type: "remboursement", montant: 20, statut: "a_rembourser" })]);
    expect(bilanFoyer(230, 250, aFaire)).toMatchObject({ resteDu: 20, tropPercu: true, aRembourser: 20 });
    const fait = calculerSoldeFoyer(["A"], "2026-2027", [op({ type: "remboursement", montant: 20, statut: "rembourse" })]);
    expect(bilanFoyer(230, 250, fait)).toMatchObject({ resteDu: 0, rembourse: 20 });
  });

  it("ignore les opérations d'un autre foyer ou d'une autre saison", () => {
    const solde = calculerSoldeFoyer(["A"], "2026-2027", [op({ inscription_id: "Z", montant: 3 }), op({ saison: "2025-2026", montant: 3 })]);
    expect(solde).toEqual({ rembourse: 0, aRembourser: 0, ecarts: 0 });
  });

  it("la répartition par activité ventile aussi remboursements et écarts, au centime près", () => {
    const lignes = repartirFoyerParActivite(grille, [{ id: "p", disciplines: "karate,qigong", age: 40 }], new Map([["p", 600]]), 610, 0, 7, -3);
    expect(somme(lignes.map((l) => l.rembourse))).toBe(7);
    expect(somme(lignes.map((l) => l.ecart))).toBe(-3);
  });
});

describe("changements d'activité en cours d'année", () => {
  it("compte les mois restants sur 10 (septembre → juin), mois commencé compris", () => {
    expect(moisRestantsSaison("2026-09-01", "2026-2027")).toBe(10);
    expect(moisRestantsSaison("2027-01-15", "Saison 2026-2027")).toBe(6);
    expect(moisRestantsSaison("2027-06-30", "2026-2027")).toBe(1);
    expect(moisRestantsSaison("2026-08-20", "2026-2027")).toBe(10); // avant la rentrée
    expect(moisRestantsSaison("2027-07-10", "2026-2027")).toBe(0); // saison finie
  });

  it("prix d'une activité seule, sans réduction", () => {
    expect(prixActiviteSeule(grille, "wutao", null, 40)).toBe(230);
    expect(prixActiviteSeule(grille, "karate", null, 12)).toBe(310); // tranche déduite de l'âge
    expect(prixActiviteSeule(grille, "karate", "6-8 ans", 12)).toBe(210); // tranche choisie prioritaire
    expect(prixActiviteSeule(grille, "karate", null, null)).toBeNull();
  });

  it("suggère les montants au prorata selon le cas", () => {
    // Ajout du Wutao le 15 janvier : 230 € × 6/10
    expect(suggererAjustement({ type: "ajout", moisRestants: 6, prixAjoutee: 230 }).montant).toBe(138);
    // Passage du Karaté adulte (370) au Qi Gong (230) en janvier : on rend (370 − 230) × 6/10
    const ch = suggererAjustement({ type: "changement", moisRestants: 6, prixAjoutee: 230, prixRetiree: 370 });
    expect(ch.montant).toBe(-84);
    expect(ch.partRetiree).toBe(-222);
    // Arrêt en janvier : le mois commencé est dû, on rend février → juin (5 mois)
    expect(suggererAjustement({ type: "arret", moisRestants: 6, prixRetiree: 230 }).montant).toBe(-115);
    // Inscription en janvier d'un montant annuel de 437 € : ramené à 6/10, soit −174,80 €
    expect(suggererAjustement({ type: "inscription_tardive", moisRestants: 6, montantAnnuel: 437 }).montant).toBe(-174.8);
    expect(suggererAjustement({ type: "ajout", moisRestants: 6, prixAjoutee: null }).montant).toBeNull();
  });

  it("le théorique d'une personne = montant de départ + ses ajustements", () => {
    const aj = sommeAjustementsParInscription([{ inscription_id: "s", montant: 138 }, { inscription_id: "s", montant: -84 }]);
    const [c] = calculerMontantsFoyer(grille, [{ id: "s", disciplines: "qigong,wutao", montant_attendu: 486 }], {}, aj);
    expect(c.montant).toBe(540);
  });

  it("annuler un changement inverse son effet sur les activités de la fiche", () => {
    expect(disciplinesApresAnnulation("karate,qigong,wutao", { type: "ajout", discipline_retiree: null, discipline_ajoutee: "wutao" })).toBe("karate,qigong");
    expect(disciplinesApresAnnulation("karate,wutao", { type: "changement", discipline_retiree: "qigong", discipline_ajoutee: "wutao" })).toBe("karate,qigong");
    expect(disciplinesApresAnnulation("karate", { type: "arret", discipline_retiree: "qigong", discipline_ajoutee: null })).toBe("karate,qigong");
    // Arrêt total : l'activité était restée sur la fiche, rien à remettre
    expect(disciplinesApresAnnulation("qigong", { type: "arret", discipline_retiree: "qigong", discipline_ajoutee: null })).toBe("qigong");
  });

  it("bloque l'annulation si un changement plus récent touche la même activité", () => {
    const aj = (id: string, quand: string, o: Partial<AjustementActivite>) =>
      ({ id, created_at: quand, inscription_id: "s", type: "ajout", discipline_retiree: null, discipline_ajoutee: null, ...o }) as AjustementActivite;
    const ajoutWutao = aj("1", "2027-01-10", { discipline_ajoutee: "wutao" });
    const arretWutao = aj("2", "2027-03-01", { type: "arret", discipline_retiree: "wutao" });
    const ajoutQiGong = aj("3", "2027-02-01", { discipline_ajoutee: "qigong" });
    expect(conflitAnnulation(ajoutWutao, [ajoutWutao, arretWutao, ajoutQiGong])).toBe("wutao");
    expect(conflitAnnulation(ajoutQiGong, [ajoutWutao, arretWutao, ajoutQiGong])).toBeNull();
    expect(conflitAnnulation(arretWutao, [ajoutWutao, arretWutao, ajoutQiGong])).toBeNull();
  });

  it("la répartition attribue chaque ajustement à son activité, sans changer les totaux", () => {
    // Départ : Karaté + Qi Gong (486 €) ; ajout du Wutao en janvier (+138 €)
    const lignes = repartirFoyerParActivite(
      grille,
      [{ id: "s", disciplines: "karate,qigong,wutao", age: 58, disciplinesBase: "karate,qigong", ajustements: [{ disciplineId: "wutao", montant: 138 }] }],
      new Map([["s", 624]]), 624, 0,
    );
    expect(lignes.find((l) => l.disciplineId === "wutao")!.theorique).toBe(138);
    expect(somme(lignes.map((l) => l.theorique))).toBe(624);
    expect(somme(lignes.map((l) => l.encaisse))).toBe(624);
  });
});

const S = "2026-2027";
const cheques = [{ id: "c1", saison: S }];
// A et B partagent le chèque c1 ; C paie seul
const liens = [
  { cheque_id: "c1", inscription_id: "A" },
  { cheque_id: "c1", inscription_id: "B" },
];
const trie = (ids: string[]) => [...ids].sort();

describe("getFoyerIds", () => {
  it("regroupe par règlement partagé (comportement historique)", () => {
    expect(trie(getFoyerIds("A", S, cheques, liens))).toEqual(["A", "B"]);
    expect(getFoyerIds("C", S, cheques, liens)).toEqual(["C"]);
  });

  it("rattache une personne qui paie seule grâce à foyer_id, de proche en proche", () => {
    const inscriptions = [
      { id: "B", saison: S, statut: "validee", foyer_id: "f1" },
      { id: "C", saison: S, statut: "validee", foyer_id: "f1" },
    ];
    // C rejoint B par foyer_id, et B est lié à A par le chèque partagé
    expect(trie(getFoyerIds("C", S, cheques, liens, inscriptions))).toEqual(["A", "B", "C"]);
  });

  it("ignore foyer_id d'une autre saison et des inscriptions refusées ou supprimées", () => {
    const inscriptions = [
      { id: "C", saison: S, statut: "validee", foyer_id: "f1" },
      { id: "D", saison: "2025-2026", statut: "validee", foyer_id: "f1" },
      { id: "E", saison: S, statut: "refusee", foyer_id: "f1" },
    ];
    expect(getFoyerIds("C", S, cheques, liens, inscriptions)).toEqual(["C"]);
  });
});
