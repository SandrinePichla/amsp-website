import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Sparkles, Download, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { client } from "@/sanityClient";
import {
  DAYS, PALETTE, timeToMinutes, buildColorMap,
  PrintableCalendar, PrintableTarifs,
} from "@/components/PrintablePlanning";
import type { Cours, Tarif, TarifSpecial } from "@/components/PrintablePlanning";

// ─── Calendrier hebdomadaire ──────────────────────────────────────────────────

interface CalendarProps {
  cours: Cours[];
  filtered: Cours[];
  colorMap: Record<string, (typeof PALETTE)[number]>;
}

const WeeklyCalendar = ({ cours, filtered, colorMap }: CalendarProps) => {
  const activeDays = DAYS.filter((day) =>
    cours.some((c) => c.jour?.toLowerCase() === day.toLowerCase())
  );

  if (activeDays.length === 0) return null;

  return (
    <div className="mb-10">
      {/* Grille des jours — 1 col mobile, 2 col sm, 3 col lg */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activeDays.map((day, di) => {
          const daysCours = filtered
            .filter((c) => c.jour?.toLowerCase() === day.toLowerCase())
            .sort((a, b) => timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut));

          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: di * 0.04 }}
              className="rounded-xl border border-border/40 bg-card overflow-hidden"
            >
              {/* En-tête du jour */}
              <div className="border-b border-border/30 bg-secondary/30 px-3 py-2">
                <p className="font-serif text-sm font-bold tracking-wide">{day}</p>
              </div>

              {/* Cours du jour */}
              <div className="p-2 space-y-1.5">
                {daysCours.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground/50">—</p>
                ) : (
                  daysCours.map((c) => {
                    const color = colorMap[c.discipline?.nom] || PALETTE[0];
                    return (
                      <div
                        key={c._id}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                        style={{
                          backgroundColor: `${color.bg}18`,
                          borderLeft: `2.5px solid ${color.bg}`,
                        }}
                      >
                        {/* Horaire */}
                        <div className="shrink-0 text-right" style={{ minWidth: 44 }}>
                          <p className="text-[11px] font-bold leading-none" style={{ color: color.bg }}>
                            {c.heureDebut}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                            {c.heureFin}
                          </p>
                        </div>
                        {/* Séparateur */}
                        <div className="h-7 w-px shrink-0 bg-border/40" />
                        {/* Infos */}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-tight truncate">
                            {c.discipline?.nom}
                          </p>
                          {(c.niveau || c.ages?.length > 0) && (
                            <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">
                              {[c.niveau, c.ages?.join(", ")].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {Object.entries(colorMap).map(([name, color]) => (
          <div key={name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: color.bg }} />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Page Planning ────────────────────────────────────────────────────────────

const Planning = () => {
  const [cours, setCours] = useState<Cours[]>([]);
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [tarifsSpeciaux, setTarifsSpeciaux] = useState<TarifSpecial[]>([]);
  const [filter, setFilter] = useState("Toutes");
  const [loading, setLoading] = useState(true);
const [downloading, setDownloading] = useState(false);
  const [downloadingTarifs, setDownloadingTarifs] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const tarifsRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = printRef.current;
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });
      const link = document.createElement("a");
      link.download = "planning-amsp.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadTarifs = async () => {
    if (!tarifsRef.current) return;
    setDownloadingTarifs(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = tarifsRef.current;
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        width: 900,
        height: el.scrollHeight,
        windowWidth: 900,
        windowHeight: el.scrollHeight,
      });
      const link = document.createElement("a");
      link.download = "tarifs-amsp.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloadingTarifs(false);
    }
  };

  useEffect(() => {
    client
      .fetch(`*[_type == "cours"] | order(jour asc, heureDebut asc) {
        _id, jour, heureDebut, heureFin, lieu, niveau, ages,
        discipline-> { nom, nomCourt }
      }`)
      .then((data) => {
        setCours(data);
        setLoading(false);
        if (window.location.hash === "#tarifs") {
          setTimeout(() => {
            document.getElementById("tarifs")?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      });

    client
      .fetch(`*[_type == "tarif"] | order(ordre asc) {
        _id, categorie, jours, prixAnnuel, echeancier, ordre,
        discipline-> { nom }
      }`)
      .then((data) => setTarifs(data));

    client
      .fetch(`*[_type == "tarifSpecial"] | order(ordre asc)`)
      .then((data) => setTarifsSpeciaux(data));
  }, []);

  const disciplinesFiltres = [
    "Toutes",
    ...Array.from(
      new Set(
        cours
          .map((c) => c.discipline?.nomCourt || c.discipline?.nom)
          .filter(Boolean)
      )
    ),
  ];

  const filtered =
    filter === "Toutes"
      ? cours
      : cours.filter(
          (c) => (c.discipline?.nomCourt || c.discipline?.nom) === filter
        );

  const colorMap = useMemo(() => buildColorMap(cours), [cours]);

  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="mb-4 text-center font-serif text-4xl font-black md:text-5xl">
              <span className="text-primary">Planning</span> des cours
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
              Retrouvez l'ensemble des horaires par discipline et par jour.
            </p>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Filtres */}
              <div className="mb-8 flex flex-wrap justify-center gap-2">
                {disciplinesFiltres.map((d) => (
                  <button
                    key={d}
                    onClick={() => setFilter(d)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      filter === d
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Calendrier graphique */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                {/* Bouton téléchargement */}
                <div className="mb-3 flex justify-end">
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                  >
                    {downloading
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Download className="h-3.5 w-3.5" />
                    }
                    {downloading ? "Génération…" : "Télécharger le planning"}
                  </button>
                </div>

                <WeeklyCalendar
                  cours={cours}
                  filtered={filtered}
                  colorMap={colorMap}
                />

                {/* Avertissement horaires */}
                <p className="mb-8 text-center text-xs text-muted-foreground/60 italic max-w-2xl mx-auto">
                  Les horaires sont donnés à titre indicatif, ils peuvent être modifiés en fonction des inscriptions et suivant le planning des manifestations prévues et non déplaçables.
                </p>
              </motion.div>

              {filtered.length === 0 && (
                <p className="mt-8 text-center text-muted-foreground">
                  Aucun cours pour cette discipline.
                </p>
              )}


              {/* Tarifs */}
              {tarifs.length > 0 && (
                <motion.div
                  id="tarifs"
                  className="mt-8 scroll-mt-20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <div className="mb-4 flex justify-end">
                    <button
                      onClick={handleDownloadTarifs}
                      disabled={downloadingTarifs}
                      className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                    >
                      {downloadingTarifs
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Download className="h-3.5 w-3.5" />
                      }
                      {downloadingTarifs ? "Génération…" : "Télécharger les tarifs"}
                    </button>
                  </div>
                  <h2 className="mb-2 text-center font-serif text-3xl font-bold">
                    <span className="text-primary">Tarifs</span> saison
                  </h2>
                  <p className="mb-4 text-center text-sm text-muted-foreground">
                    Cotisations annuelles — adhésion à la Fédération incluse
                  </p>
                  <p className="mb-10 text-center">
                    <span className="inline-block rounded-lg border border-primary/30 bg-primary/8 px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary">
                      2 séances gratuites avant inscription définitive
                    </span>
                  </p>

                  {/* Cartes tarifs groupées par discipline */}
                  {(() => {
                    const disciplines = Array.from(
                      new Set(tarifs.map((t) => t.discipline?.nom).filter(Boolean))
                    );
                    return disciplines.map((disc) => {
                      const tarifsDisc = tarifs.filter((t) => t.discipline?.nom === disc);
                      const color = colorMap[disc] || PALETTE[0];
                      return (
                        <div key={disc} className="mb-8">
                          {/* En-tête discipline */}
                          <div className="mb-4 flex items-center gap-3">
                            <div
                              className="h-0.5 w-8 rounded-full"
                              style={{ backgroundColor: color.bg }}
                            />
                            <h3 className="font-serif text-lg font-bold" style={{ color: color.bg }}>
                              {disc}
                            </h3>
                            <div className="h-0.5 flex-1 rounded-full bg-border/30" />
                          </div>

                          {/* Lignes tarifs compactes */}
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {tarifsDisc.map((t, i) => (
                              <motion.div
                                key={t._id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: i * 0.05 }}
                                className="flex overflow-hidden rounded-lg border border-border/30 bg-card"
                              >
                                {/* Barre colorée gauche */}
                                <div className="w-1 shrink-0" style={{ backgroundColor: color.bg }} />

                                {/* Contenu */}
                                <div className="flex flex-1 items-start justify-between gap-3 px-3 py-2.5">
                                  <div className="min-w-0 flex-1">
                                    {t.categorie && (
                                      <p className="text-sm font-bold leading-tight text-foreground">
                                        {t.categorie}
                                      </p>
                                    )}
                                    {t.jours?.length > 0 && (
                                      <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <CalendarDays className="h-3 w-3 shrink-0" />
                                        {t.jours.join(", ")}
                                      </span>
                                    )}
                                    {t.echeancier && (
                                      <p className="mt-1.5 text-[11px] text-muted-foreground/70 leading-snug">
                                        <span className="font-medium">Règlement par chèques :</span>{" "}
                                        {t.echeancier}
                                      </p>
                                    )}
                                  </div>

                                  {/* Prix */}
                                  <div className="shrink-0 text-right">
                                    <div className="flex items-end gap-0.5 justify-end">
                                      <span
                                        className="font-serif text-2xl font-black leading-none"
                                        style={{ color: color.bg }}
                                      >
                                        {t.prixAnnuel ?? "—"}
                                      </span>
                                      {t.prixAnnuel && (
                                        <span className="mb-0.5 text-sm font-semibold text-muted-foreground">€</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground/50">/an</p>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {/* Réductions */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    className="mt-6 rounded-xl border border-border/30 bg-card overflow-hidden"
                  >
                    <div className="border-b border-border/20 bg-secondary/20 px-5 py-3">
                      <h3 className="font-serif text-base font-bold">Réductions</h3>
                    </div>
                    <div className="grid gap-0 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/20">
                      {/* Multi-cours */}
                      <div className="px-5 py-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Multi-cours
                        </p>
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="text-sm text-foreground/80">Pour 2 cours au choix</p>
                          <p className="shrink-0 font-serif text-lg font-black text-primary">−10%</p>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground/60">du tarif total</p>
                      </div>

                      {/* Famille */}
                      <div className="px-5 py-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Tarifs famille
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between gap-4">
                            <p className="text-sm text-foreground/80">Pour 2 personnes</p>
                            <p className="shrink-0 font-serif text-lg font-black text-primary">−10%</p>
                          </div>
                          <div className="flex items-baseline justify-between gap-4">
                            <p className="text-sm text-foreground/80">Pour 3 personnes</p>
                            <p className="shrink-0 font-serif text-lg font-black text-primary">−20€</p>
                          </div>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground/60">du tarif total</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Tarifs spéciaux */}
                  {tarifsSpeciaux.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="mt-6 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card p-6"
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-accent" />
                        <h3 className="font-serif font-bold text-accent">Tarifs spéciaux</h3>
                      </div>
                      <div className="grid gap-6 sm:grid-cols-2">
                        {tarifsSpeciaux.map((ts) => (
                          <div key={ts._id}>
                            <p className="mb-2 text-sm font-semibold text-foreground">{ts.titre}</p>
                            <ul className="space-y-1.5">
                              {ts.lignes?.map((ligne, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-muted-foreground"
                                >
                                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                                  {ligne}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Composant imprimable hors-écran — capturé par html2canvas */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none" }}>
        <div ref={printRef}>
          <PrintableCalendar cours={cours} colorMap={colorMap} />
        </div>
        <div ref={tarifsRef}>
          <PrintableTarifs tarifs={tarifs} tarifsSpeciaux={tarifsSpeciaux} colorMap={colorMap} />
        </div>
      </div>
    </Layout>
  );
};

export default Planning;
