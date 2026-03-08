import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin, Users, X, ChevronDown, CalendarDays, Sparkles, Tag } from "lucide-react";
import Layout from "@/components/Layout";
import { client } from "@/sanityClient";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];
const HOUR_HEIGHT = 64; // px par heure

const PALETTE = [
  { bg: "hsl(0,72%,45%)",   border: "hsl(0,72%,30%)",   text: "#fff" },
  { bg: "hsl(43,75%,44%)",  border: "hsl(43,75%,30%)",  text: "#fff" },
  { bg: "hsl(215,65%,52%)", border: "hsl(215,65%,37%)", text: "#fff" },
  { bg: "hsl(145,52%,38%)", border: "hsl(145,52%,25%)", text: "#fff" },
  { bg: "hsl(270,52%,52%)", border: "hsl(270,52%,38%)", text: "#fff" },
  { bg: "hsl(25,80%,50%)",  border: "hsl(25,80%,35%)",  text: "#fff" },
  { bg: "hsl(180,52%,38%)", border: "hsl(180,52%,25%)", text: "#fff" },
  { bg: "hsl(330,62%,48%)", border: "hsl(330,62%,33%)", text: "#fff" },
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
  const [selected, setSelected] = useState<Cours | null>(null);

  const activeDays = DAYS.filter((day) =>
    cours.some((c) => c.jour?.toLowerCase() === day.toLowerCase())
  );

  const { minHour, maxHour, hours } = useMemo(() => {
    const starts = cours.map((c) => timeToMinutes(c.heureDebut)).filter(Boolean);
    const ends = cours.map((c) => timeToMinutes(c.heureFin)).filter(Boolean);
    const minH = starts.length ? Math.floor(Math.min(...starts) / 60) : 8;
    const maxH = ends.length ? Math.ceil(Math.max(...ends) / 60) : 22;
    return {
      minHour: minH,
      maxHour: maxH,
      hours: Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i),
    };
  }, [cours]);

  const calendarHeight = (maxHour - minHour) * HOUR_HEIGHT;

  const handleClick = (c: Cours) =>
    setSelected((prev) => (prev?._id === c._id ? null : c));

  if (activeDays.length === 0) return null;

  return (
    <div className="mb-14">
      {/* Calendrier */}
      <div className="overflow-x-auto rounded-2xl border border-border/40 bg-card shadow-xl">
        <div style={{ minWidth: `${activeDays.length * 110 + 52}px` }}>

          {/* En-tête jours */}
          <div className="flex border-b border-border/40 bg-secondary/40">
            <div className="shrink-0" style={{ width: 52 }} />
            {activeDays.map((day) => (
              <div
                key={day}
                className="flex-1 py-3 text-center font-serif text-sm font-bold tracking-wide"
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{DAYS_SHORT[DAYS.indexOf(day)]}</span>
              </div>
            ))}
          </div>

          {/* Corps */}
          <div className="flex" style={{ height: calendarHeight }}>

            {/* Colonne horaires */}
            <div className="relative shrink-0" style={{ width: 52, height: calendarHeight }}>
              {hours.slice(0, -1).map((h) => (
                <div
                  key={h}
                  className="absolute right-2 select-none text-xs text-muted-foreground/60"
                  style={{ top: (h - minHour) * HOUR_HEIGHT - 9 }}
                >
                  {h}h
                </div>
              ))}
            </div>

            {/* Colonnes jours */}
            {activeDays.map((day) => {
              const daysCours = filtered.filter(
                (c) => c.jour?.toLowerCase() === day.toLowerCase()
              );
              return (
                <div
                  key={day}
                  className="relative flex-1 border-l border-border/30"
                  style={{ height: calendarHeight }}
                >
                  {/* Lignes horaires */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-border/20"
                      style={{ top: (h - minHour) * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Demi-heures */}
                  {hours.slice(0, -1).map((h) => (
                    <div
                      key={`${h}-half`}
                      className="absolute left-0 right-0 border-t border-border/10 border-dashed"
                      style={{ top: (h - minHour) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                    />
                  ))}

                  {/* Blocs cours */}
                  {daysCours.map((c) => {
                    const start = timeToMinutes(c.heureDebut);
                    const end = timeToMinutes(c.heureFin);
                    const top = ((start - minHour * 60) / 60) * HOUR_HEIGHT;
                    const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 28);
                    const color = colorMap[c.discipline?.nom] || PALETTE[0];
                    const isSelected = selected?._id === c._id;

                    return (
                      <motion.button
                        key={c._id}
                        className="absolute left-1 right-1 rounded-lg px-2 py-1 text-left overflow-hidden focus:outline-none"
                        style={{
                          top,
                          height,
                          backgroundColor: color.bg,
                          borderLeft: `3px solid ${color.border}`,
                          zIndex: isSelected ? 20 : 1,
                        }}
                        initial={{ opacity: 0, scaleY: 0.8 }}
                        animate={{
                          opacity: 1,
                          scaleY: 1,
                          boxShadow: isSelected
                            ? `0 0 0 2px ${color.border}, 0 8px 24px rgba(0,0,0,0.4)`
                            : "0 2px 8px rgba(0,0,0,0.3)",
                        }}
                        whileHover={{
                          scaleX: 1.03,
                          zIndex: 10,
                          boxShadow: `0 0 0 1.5px ${color.border}, 0 6px 18px rgba(0,0,0,0.35)`,
                        }}
                        transition={{ duration: 0.15 }}
                        onClick={() => handleClick(c)}
                      >
                        <p className="text-xs font-bold leading-tight text-white truncate">
                          {c.discipline?.nomCourt || c.discipline?.nom}
                        </p>
                        {height >= 38 && (
                          <p className="text-[10px] text-white/75 leading-tight">
                            {c.heureDebut}–{c.heureFin}
                          </p>
                        )}
                        {height >= 58 && c.niveau && (
                          <p className="text-[10px] text-white/60 truncate">{c.niveau}</p>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Panneau détails (clic sur un créneau) */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected._id}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 overflow-hidden"
          >
            <div
              className="rounded-xl border p-5 flex items-start justify-between gap-4"
              style={{
                borderColor: (colorMap[selected.discipline?.nom] || PALETTE[0]).border,
                background: `color-mix(in srgb, ${(colorMap[selected.discipline?.nom] || PALETTE[0]).bg} 12%, hsl(var(--card)))`,
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 flex-1">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Discipline</p>
                  <p className="font-serif font-bold text-foreground">{selected.discipline?.nom}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Horaire
                  </p>
                  <p className="font-medium">{selected.heureDebut} – {selected.heureFin}</p>
                </div>
                {selected.lieu && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Lieu
                    </p>
                    <p className="font-medium">{selected.lieu}</p>
                  </div>
                )}
                {selected.ages?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Âges
                    </p>
                    <p className="font-medium">{selected.ages.join(", ")}</p>
                  </div>
                )}
                {selected.niveau && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Niveau</p>
                    <p className="font-medium">{selected.niveau}</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Légende */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {Object.entries(colorMap).map(([name, color]) => (
          <div key={name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color.bg }} />
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
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    client
      .fetch(`*[_type == "cours"] | order(jour asc, heureDebut asc) {
        _id, jour, heureDebut, heureFin, lieu, niveau, ages,
        discipline-> { nom, nomCourt }
      }`)
      .then((data) => {
        setCours(data);
        setLoading(false);
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
                <WeeklyCalendar
                  cours={cours}
                  filtered={filtered}
                  colorMap={colorMap}
                />
              </motion.div>

              {filtered.length === 0 && (
                <p className="mt-8 text-center text-muted-foreground">
                  Aucun cours pour cette discipline.
                </p>
              )}

              {/* Tableau planning (déroulant) */}
              {filtered.length > 0 && (
                <div className="mb-12">
                  <button
                    onClick={() => setShowTable((v) => !v)}
                    className="mx-auto flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${showTable ? "rotate-180" : ""}`}
                    />
                    {showTable ? "Masquer" : "Afficher"} la liste détaillée
                  </button>

                  <AnimatePresence>
                    {showTable && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 overflow-x-auto rounded-xl border border-border/40">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border/50 bg-secondary/50">
                                <th className="px-4 py-3 text-left font-serif font-bold">Jour</th>
                                <th className="px-4 py-3 text-left font-serif font-bold">Horaire</th>
                                <th className="px-4 py-3 text-left font-serif font-bold">Discipline</th>
                                <th className="px-4 py-3 text-left font-serif font-bold">Lieu</th>
                                <th className="px-4 py-3 text-left font-serif font-bold">Niveau</th>
                                <th className="px-4 py-3 text-left font-serif font-bold">Âges</th>
                              </tr>
                            </thead>
                            <tbody>
                              {DAYS.map((day) => {
                                const coursJour = filtered.filter(
                                  (c) => c.jour?.toLowerCase() === day.toLowerCase()
                                );
                                if (coursJour.length === 0) return null;
                                return coursJour.map((c, i) => (
                                  <tr
                                    key={c._id}
                                    className="border-b border-border/30 transition-colors hover:bg-secondary/30"
                                  >
                                    <td className="px-4 py-3 font-medium">{i === 0 ? day : ""}</td>
                                    <td className="px-4 py-3 text-accent">
                                      {c.heureDebut} - {c.heureFin}
                                    </td>
                                    <td className="px-4 py-3">{c.discipline?.nom || "—"}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{c.lieu || "—"}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{c.niveau || "—"}</td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                      {c.ages?.join(", ") || "—"}
                                    </td>
                                  </tr>
                                ));
                              })}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Tarifs */}
              {tarifs.length > 0 && (
                <motion.div
                  className="mt-8"
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

                          {/* Grille de cartes */}
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {tarifsDisc.map((t, i) => (
                              <motion.div
                                key={t._id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.06 }}
                                className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 transition-shadow hover:shadow-lg"
                                style={{
                                  borderLeftColor: color.bg,
                                  borderLeftWidth: 3,
                                }}
                              >
                                {/* Fond coloré subtil */}
                                <div
                                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                                  style={{
                                    background: `radial-gradient(ellipse at top left, ${color.bg}14, transparent 70%)`,
                                  }}
                                />

                                {/* Catégorie */}
                                {t.categorie && (
                                  <div className="mb-3 flex items-center gap-1.5">
                                    <Tag className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                      {t.categorie}
                                    </span>
                                  </div>
                                )}

                                {/* Prix */}
                                <div className="mb-4 flex items-end gap-1">
                                  <span
                                    className="font-serif text-4xl font-black leading-none"
                                    style={{ color: color.bg }}
                                  >
                                    {t.prixAnnuel ?? "—"}
                                  </span>
                                  {t.prixAnnuel && (
                                    <span className="mb-1 text-lg font-bold text-muted-foreground">€</span>
                                  )}
                                  <span className="mb-1 ml-1 text-xs text-muted-foreground">/an</span>
                                </div>

                                {/* Jours */}
                                {t.jours?.length > 0 && (
                                  <div className="mb-3 flex items-start gap-2">
                                    <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="text-sm text-foreground/80">
                                      {t.jours.join(", ")}
                                    </span>
                                  </div>
                                )}

                                {/* Échéancier */}
                                {t.echeancier && (
                                  <div className="mt-3 border-t border-border/30 pt-3">
                                    <p className="text-xs text-muted-foreground">{t.echeancier}</p>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}

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
    </Layout>
  );
};

export default Planning;
