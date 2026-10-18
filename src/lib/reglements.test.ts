import { describe, it, expect } from "vitest";
import { getFoyerIds } from "./reglements";

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
