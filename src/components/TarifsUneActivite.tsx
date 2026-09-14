import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { REMISE_KARATE_COMBO, type GrilleTarifs } from "@/lib/tarifs";

/**
 * Tarifs pour une personne : disciplines "au choix" (1 à n activités) et
 * Karaté par tranche d'âge. Pour la remise famille (plusieurs personnes du
 * foyer) et la combinaison Karaté + au choix, voir le simulateur juste en
 * dessous. Données lues depuis Sanity (grilleTarifs), fournies par la page
 * parente pour rester en phase avec l'image téléchargeable.
 */
const TarifsUneActivite = ({ grille }: { grille: GrilleTarifs | null }) => {
  const disciplinesAuChoixNoms = grille?.disciplinesAuChoix?.map((d) => d.nom) || [];
  const tarifsAuChoixTries = [...(grille?.tarifsAuChoix || [])].sort((a, b) => a.nombreActivites - b.nombreActivites);
  const remise2 = grille?.remiseFamille2 || 0;
  const remise3 = grille?.remiseFamille3 || 0;
  const aReductionKarateChoix = !!grille?.disciplineKarate && tarifsAuChoixTries.length > 0;

  if (!grille || (tarifsAuChoixTries.length === 0 && (grille.tarifsKarate?.length || 0) === 0)) {
    return (
      <div className="mb-8 rounded-xl border border-border/30 bg-card p-5 text-center text-sm text-muted-foreground">
        Grille tarifaire en cours de mise à jour — contactez le club pour connaître les tarifs.
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="mb-1 text-center font-serif text-xl font-bold">Une personne, ses activités</h3>
      <p className="mb-5 text-center text-sm text-muted-foreground">
        Le tarif dépend du nombre d'activités choisies par cette personne.
      </p>

      {tarifsAuChoixTries.length > 0 && (
        <div className="mb-5">
          {disciplinesAuChoixNoms.length > 0 && (
            <div className="mb-2">
              <p className="text-sm font-bold leading-tight">{disciplinesAuChoixNoms.join(", ")}</p>
              <p className="mt-1 text-xs text-muted-foreground">Même tarif quelle que soit la discipline choisie</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tarifsAuChoixTries.map((t) => (
              <div key={t.nombreActivites} className="flex flex-col justify-between overflow-hidden rounded-xl border border-border/30 bg-card p-4">
                <div>
                  <p className="text-sm font-bold leading-tight">
                    {t.nombreActivites} activité{t.nombreActivites > 1 ? "s" : ""} au choix
                  </p>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  {(t.cheque1 != null || t.cheque3x != null) && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                      <CalendarClock className="h-3 w-3" /> 1×{t.cheque1}€ + 3×{t.cheque3x}€
                    </span>
                  )}
                  <span className="ml-auto font-serif text-2xl font-black text-primary">{t.total}&nbsp;€</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground/60">
            Disciplines « au choix » : {disciplinesAuChoixNoms.join(" · ")}. Règlement en 1 ou 4 fois par chèque.
          </p>
        </div>
      )}

      {(grille.tarifsKarate?.length || 0) > 0 && (
        <div>
          <p className="mb-2 text-sm font-bold leading-tight">
            {grille.disciplineKarate?.nom || "Karaté"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grille.tarifsKarate.map((t) => (
              <div key={t.label} className="flex flex-col justify-between overflow-hidden rounded-xl border border-border/30 bg-card p-4">
                <div>
                  <p className="text-sm font-bold leading-tight">{grille.disciplineKarate?.nom || "Karaté"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.label}</p>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  {(t.cheque1 != null || t.cheque3x != null) && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                      <CalendarClock className="h-3 w-3" /> 1×{t.cheque1}€ + 3×{t.cheque3x}€
                    </span>
                  )}
                  <span className="ml-auto font-serif text-2xl font-black text-primary">{t.total}&nbsp;€</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground/60">
            Licence fédérale incluse. Règlement en 1 ou 4 fois par chèque.
          </p>
        </div>
      )}

      {(remise2 > 0 || remise3 > 0 || aReductionKarateChoix) && (
        <div className="mt-10">
          <h3 className="mb-1 text-center font-serif text-xl font-bold">Plusieurs personnes de la même famille</h3>
          <p className="mb-5 text-center text-sm text-muted-foreground">
            Le simulateur ci-dessous applique automatiquement la remise famille. Pour plus d'explications sur les réductions, n'hésitez pas à{" "}
            <Link to="/contact" className="font-medium text-primary underline-offset-2 hover:underline">
              nous contacter
            </Link>
            .
          </p>

          <div className="overflow-hidden rounded-xl border border-border/30 bg-card">
            <div className="border-b border-border/20 bg-secondary/20 px-5 py-3">
              <h3 className="font-serif text-base font-bold">Réductions</h3>
            </div>

            {(remise2 > 0 || remise3 > 0) && (
              <div className="grid divide-y divide-border/20 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
                <div className="flex items-baseline justify-between gap-4 px-5 py-4">
                  <p className="text-sm text-foreground/80">Pour 2 personnes de la famille</p>
                  <p className="shrink-0 font-serif text-lg font-black text-primary">−{remise2}%</p>
                </div>
                <div className="flex items-baseline justify-between gap-4 px-5 py-4">
                  <p className="text-sm text-foreground/80">Pour 3 personnes et plus</p>
                  <p className="shrink-0 font-serif text-lg font-black text-primary">−{remise3}%</p>
                </div>
              </div>
            )}
            {(remise2 > 0 || remise3 > 0) && (
              <p className="px-5 pb-3 text-xs text-muted-foreground/60">
                Remise sur la somme des tarifs individuels de la famille, pas sur le nombre d'activités.
              </p>
            )}

            {aReductionKarateChoix && (
              <div className={`px-5 py-4 ${(remise2 > 0 || remise3 > 0) ? "border-t border-border/20" : ""}`}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm text-foreground/80">
                    {grille!.disciplineKarate!.nom} + une ou plusieurs activités au choix (même personne)
                  </p>
                  <p className="shrink-0 font-serif text-lg font-black text-primary">−{Math.round(REMISE_KARATE_COMBO * 100)}%</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/60">Remise sur la somme des deux tarifs pour cette même personne.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TarifsUneActivite;
