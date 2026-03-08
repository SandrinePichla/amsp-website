import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Sparkles, Download, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { client } from "@/sanityClient";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const PALETTE = [
  { bg: "hsl(0,48%,38%)",    border: "hsl(0,48%,25%)",    text: "#fff" },  // bordeaux
  { bg: "hsl(35,48%,38%)",   border: "hsl(35,48%,25%)",   text: "#fff" },  // ambre chaud
  { bg: "hsl(205,32%,36%)",  border: "hsl(205,32%,23%)",  text: "#fff" },  // ardoise
  { bg: "hsl(18,46%,36%)",   border: "hsl(18,46%,23%)",   text: "#fff" },  // terre cuite
  { bg: "hsl(150,28%,30%)",  border: "hsl(150,28%,18%)",  text: "#fff" },  // sauge sombre
  { bg: "hsl(278,26%,36%)",  border: "hsl(278,26%,23%)",  text: "#fff" },  // mauve sombre
  { bg: "hsl(22,40%,34%)",   border: "hsl(22,40%,21%)",   text: "#fff" },  // cuivre
  { bg: "hsl(188,30%,30%)",  border: "hsl(188,30%,18%)",  text: "#fff" },  // teal sombre
];

const timeToMinutes = (t: string) => {
  if (!t) return 0;
  // Format HH:MM ou HH:MM:SS
  const colonMatch = t.match(/^(\d{1,2}):(\d{2})/);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  // Format français : 19H, 20H30, 9h30…
  const hMatch = t.match(/^(\d{1,2})[Hh](\d{0,2})$/);
  if (hMatch) return parseInt(hMatch[1]) * 60 + (parseInt(hMatch[2] || "0") || 0);
  return 0;
};

interface Cours {
  _id: string;
  jour: string;
  heureDebut: string;
  heureFin: string;
  lieu: string;
  niveau: string;
  ages: string[];
  discipline: { nom: string; nomCourt: string };
}

interface Tarif {
  _id: string;
  discipline: { nom: string };
  categorie: string;
  jours: string[];
  prixAnnuel: number;
  echeancier: string;
  ordre: number;
}

interface TarifSpecial {
  _id: string;
  titre: string;
  lignes: string[];
  ordre: number;
}

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

// ─── Version imprimable (capturée par html2canvas) ───────────────────────────

const PrintableCalendar = ({
  cours,
  colorMap,
}: {
  cours: Cours[];
  colorMap: Record<string, (typeof PALETTE)[number]>;
}) => {
  const activeDays = DAYS.filter((day) =>
    cours.some((c) => c.jour?.toLowerCase() === day.toLowerCase())
  );

  // Regrouper les cours par jour, triés par heure
  const byDay = activeDays.map((day) => ({
    day,
    courses: cours
      .filter((c) => c.jour?.toLowerCase() === day.toLowerCase())
      .sort((a, b) => timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut)),
  }));

  // Répartition en lignes de max 3 colonnes
  const perRow = byDay.length <= 4 ? byDay.length : 3;
  const rows: (typeof byDay)[] = [];
  for (let i = 0; i < byDay.length; i += perRow) {
    rows.push(byDay.slice(i, i + perRow));
  }

  return (
    <div style={{ width: 1060, backgroundColor: "#ffffff", fontFamily: "Arial, 'Helvetica Neue', sans-serif", boxSizing: "border-box" }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#4a1515", padding: "26px 40px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo / branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", border: "1.5px solid rgba(212,160,23,0.55)", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(212,160,23,0.10)" }}>
            <span style={{ fontSize: 17, fontWeight: 900, color: "#d4a017", letterSpacing: -0.5 }}>AM</span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 8.5, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: 3, textTransform: "uppercase" }}>
              Arts Martiaux &amp; Sports de Paix
            </p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#ffffff", letterSpacing: 0.5, lineHeight: 1.15 }}>
              AMSP
            </p>
          </div>
        </div>

        {/* Titre centré */}
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: 0.5 }}>
            Planning des cours
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 9.5, color: "rgba(255,255,255,0.45)", letterSpacing: 2, textTransform: "uppercase" }}>
            Horaires · Saison en cours
          </p>
        </div>

        {/* Espace miroir pour centrage */}
        <div style={{ width: 190 }} />
      </div>

      {/* Ligne or */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #4a1515 0%, #d4a017 25%, #d4a017 75%, #4a1515 100%)" }} />

      {/* ── Grille des jours ────────────────────────────────── */}
      <div style={{ padding: "24px 32px 18px" }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 14, marginBottom: ri < rows.length - 1 ? 14 : 0 }}>
            {row.map(({ day, courses }) => (
              <div key={day} style={{ flex: 1, borderRadius: 10, overflow: "hidden", border: "1px solid #ede5e3", boxShadow: "0 2px 10px rgba(74,21,21,0.08)" }}>

                {/* En-tête jour */}
                <div style={{ backgroundColor: "#4a1515", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#ffffff", letterSpacing: 2.5, textTransform: "uppercase" }}>
                    {day}
                  </p>
                  <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.45)", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "2px 8px", fontWeight: 600 }}>
                    {courses.length} cours
                  </span>
                </div>

                {/* Liste des cours */}
                <div style={{ backgroundColor: "#fdfaf9", padding: "10px 10px 6px" }}>
                  {courses.map((c) => {
                    const color = colorMap[c.discipline?.nom] || PALETTE[0];
                    const meta = [c.niveau, c.ages?.join(", ")].filter(Boolean).join(" · ");
                    return (
                      <div key={c._id} style={{ marginBottom: 7, borderRadius: 7, overflow: "hidden", display: "flex", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", border: "1px solid #ede8e5" }}>
                        {/* Barre colorée */}
                        <div style={{ width: 4, backgroundColor: color.bg, flexShrink: 0 }} />
                        {/* Contenu */}
                        <div style={{ flex: 1, padding: "7px 10px", backgroundColor: "#ffffff", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.25 }}>
                              {c.discipline?.nom}
                            </p>
                            {(meta || c.lieu) && (
                              <p style={{ margin: "3px 0 0", fontSize: 9.5, color: "#7a7068", lineHeight: 1.4 }}>
                                {[meta, c.lieu].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          {/* Horaire */}
                          <div style={{ textAlign: "right", marginLeft: 10, flexShrink: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: color.bg, lineHeight: 1 }}>
                              {c.heureDebut}
                            </p>
                            {c.heureFin && (
                              <p style={{ margin: "2px 0 0", fontSize: 9, color: "#9ca3af", lineHeight: 1 }}>
                                {c.heureFin}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Cellules vides si dernière ligne incomplète */}
            {row.length < perRow &&
              Array.from({ length: perRow - row.length }).map((_, i) => (
                <div key={`empty-${i}`} style={{ flex: 1 }} />
              ))}
          </div>
        ))}
      </div>

      {/* ── Légende ─────────────────────────────────────────── */}
      <div style={{ margin: "4px 32px 0", paddingTop: 14, borderTop: "1px solid #ede5e3", textAlign: "center" }}>
        {Object.entries(colorMap).map(([name, color]) => (
          <span key={name} style={{ display: "inline-block", margin: "0 4px 5px", border: `1px solid ${color.bg}`, borderRadius: 20, overflow: "hidden" }}>
            <table style={{ borderCollapse: "collapse", height: 26 }}><tbody><tr>
              <td style={{ padding: "0 4px 0 11px", verticalAlign: "middle" }}>
                <span style={{ fontSize: 10, color: color.bg, display: "block" }}>●</span>
              </td>
              <td style={{ padding: "0 11px 0 4px", verticalAlign: "middle" }}>
                <span style={{ fontSize: 10, color: "#374151", fontWeight: 600, display: "block" }}>{name}</span>
              </td>
            </tr></tbody></table>
          </span>
        ))}
      </div>

      {/* ── Disclaimer ──────────────────────────────────────── */}
      <p style={{ margin: "14px 32px 0", paddingBottom: 24, fontSize: 8.5, color: "#9ca3af", textAlign: "center", fontStyle: "italic", lineHeight: 1.65 }}>
        Les horaires sont donnés à titre indicatif, ils peuvent être modifiés en fonction des inscriptions
        et suivant le planning des manifestations prévues et non déplaçables.
      </p>
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
  const printRef = useRef<HTMLDivElement>(null);

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

  const colorMap = useMemo(() => {
    const names = Array.from(
      new Set(cours.map((c) => c.discipline?.nom).filter(Boolean))
    );
    return Object.fromEntries(
      names.map((name, i) => [name, PALETTE[i % PALETTE.length]])
    );
  }, [cours]);

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
                  <h2 className="mb-2 text-center font-serif text-3xl font-bold">
                    <span className="text-primary">Tarifs</span> saison
                  </h2>
                  <p className="mb-10 text-center text-sm text-muted-foreground">
                    Cotisations annuelles — adhésion à la Fédération incluse
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
      </div>
    </Layout>
  );
};

export default Planning;
