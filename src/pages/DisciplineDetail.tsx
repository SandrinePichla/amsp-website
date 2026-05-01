import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { client } from "@/sanityClient";
import { urlFor } from "@/sanityImage";
import {
  Sparkles, GraduationCap, Users, Clock, Phone, Mail, User, Award,
  CalendarDays, ArrowRight, ChevronLeft, ExternalLink,
} from "lucide-react";
import { iconesDisciplines } from "@/iconesDisciplines";
import { PALETTE, buildColorMap, timeToMinutes, DAYS } from "@/components/PrintablePlanning";
import type { Cours, Tarif, TarifSpecial } from "@/components/PrintablePlanning";

const toSlug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const LIENS_UTILES: Record<string, { label: string; url: string; description?: string }[]> = {
  "karate-shotokan": [
    { label: "Fédération Française de Karaté", url: "https://www.ffkarate.fr/", description: "Site officiel de la FFKaraté" },
    { label: "Site de Steve Piazza", url: "https://stevepiazza.com/arimoto-sensei-a-tassin/", description: "Arimoto Sensei à Tassin" },
    { label: "Groupe Facebook Karaté Shotokan", url: "https://www.facebook.com/groups/178854439724135", description: "Communauté Karaté Shotokan" },
  ],
  "tai-chi-chuan-main-nue": [
    { label: "I.R.A.P – Institut de Recherche des Arts du Poing", url: "https://wangxian.com/", description: "Maître WANG Xi An – Taiji Quan Style Chen" },
    { label: "Site d'Alex Houze", url: "https://taichimontslyonnais.fr/", description: "Tai Chi Monts Lyonnais" },
  ],
  "tai-chi-chuan-epee": [
    { label: "I.R.A.P – Institut de Recherche des Arts du Poing", url: "https://wangxian.com/", description: "Maître WANG Xi An – Taiji Quan Style Chen" },
    { label: "Site d'Alex Houze", url: "https://taichimontslyonnais.fr/", description: "Tai Chi Monts Lyonnais" },
  ],
};

interface Discipline {
  _id: string;
  nom: string;
  nomCourt: string;
  icone: string;
  description: string;
  horaires: string;
  professeurs: string[];
  niveaux: string[];
  ages: string[];
  image?: { asset: { _ref: string } };
}

interface Lien {
  label: string;
  url: string;
}

interface Instructeur {
  _id: string;
  nom: string;
  grade?: string;
  telephone?: string;
  email?: string;
  bio?: string;
  liens?: Lien[];
  photo?: { asset: { _ref: string } };
}

const DisciplineDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [instructeurs, setInstructeurs] = useState<Instructeur[]>([]);
  const [cours, setCours] = useState<Cours[]>([]);
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [tarifsSpeciaux, setTarifsSpeciaux] = useState<TarifSpecial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .fetch('*[_type == "discipline"] | order(ordre asc) { ..., image }')
      .then((disciplines: Discipline[]) => {
        const found = disciplines.find((d) => toSlug(d.nom) === slug);
        if (!found) { navigate("/disciplines"); return; }
        setDiscipline(found);

        return Promise.all([
          client.fetch(
            `*[_type == "instructeur" && "${found._id}" in disciplines[]->_id] | order(ordre asc) {
              _id, nom, grade, telephone, email, bio, liens, photo
            }`
          ),
          client.fetch(
            `*[_type == "cours" && discipline->_id == "${found._id}"] | order(jour asc, heureDebut asc) {
              _id, jour, heureDebut, heureFin, lieu, niveau, ages,
              discipline-> { nom, nomCourt }
            }`
          ),
          client.fetch(
            `*[_type == "tarif" && discipline->_id == "${found._id}"] | order(ordre asc) {
              _id, categorie, jours, prixAnnuel, echeancier, ordre,
              discipline-> { nom }
            }`
          ),
          client.fetch(`*[_type == "tarifSpecial"] | order(ordre asc)`),
        ]);
      })
      .then((results) => {
        if (!results) return;
        const [inst, crs, trfs, trfsSpec] = results;
        setInstructeurs(inst || []);
        setCours(crs || []);
        setTarifs(trfs || []);
        setTarifsSpeciaux(trfsSpec || []);
        setLoading(false);
      });
  }, [slug, navigate]);

  if (loading || !discipline) {
    return (
      <Layout>
        <section className="flex items-center justify-center py-40">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </section>
      </Layout>
    );
  }

  const IconeComposant = iconesDisciplines[discipline.icone] || Sparkles;
  const colorMap = buildColorMap(cours);
  const color = colorMap[discipline.nom] || PALETTE[0];
  const activeDays = DAYS.filter((day) => cours.some((c) => c.jour?.toLowerCase() === day.toLowerCase()));

  return (
    <Layout>

      {/* Hero bandeau */}
      <section className="relative overflow-hidden">
        {discipline.image ? (
          <img
            src={urlFor(discipline.image).width(1200).height(320).fit("crop").url()}
            alt={discipline.nom}
            className="h-48 w-full object-cover md:h-64"
          />
        ) : (
          <div
            className="h-48 w-full md:h-64"
            style={{ background: `linear-gradient(135deg, ${color.bg}30, ${color.bg}10)` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Breadcrumb */}
        <div className="absolute left-4 top-4 z-10">
          <Link
            to="/disciplines"
            className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-background"
          >
            <ChevronLeft size={13} />
            Toutes les disciplines
          </Link>
        </div>

        {/* Titre */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6">
          <div className="container mx-auto flex items-end gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg"
              style={{ backgroundColor: `${color.bg}20`, border: `2px solid ${color.bg}40` }}
            >
              <IconeComposant size={26} style={{ color: color.bg }} />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-black md:text-4xl">{discipline.nom}</h1>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {discipline.horaires && (
                  <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground">
                    <Clock size={10} className="text-primary" />{discipline.horaires}
                  </span>
                )}
                {discipline.niveaux?.map((n) => (
                  <span key={n} className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <GraduationCap size={10} />{n}
                  </span>
                ))}
                {discipline.ages?.map((a) => (
                  <span key={a} className="flex items-center gap-1 rounded-full border border-border/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    <Users size={10} />{a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-10 space-y-14">

        {/* Description */}
        {discipline.description && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-base leading-relaxed text-muted-foreground">{discipline.description}</p>
          </motion.section>
        )}

        {/* Instructeurs */}
        {instructeurs.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="mb-6 font-serif text-2xl font-bold">
              <span style={{ color: color.bg }}>Instructeur{instructeurs.length > 1 ? "s" : ""}</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {instructeurs.map((inst) => (
                <div key={inst._id} className="flex flex-col gap-4 rounded-xl border border-border/40 bg-card p-4 sm:flex-row sm:items-start">
                  {inst.photo ? (
                    <img
                      src={urlFor(inst.photo).width(120).height(120).fit("crop").url()}
                      alt={inst.nom}
                      className="h-20 w-20 shrink-0 rounded-xl object-cover ring-2 ring-primary/20"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-2 ring-primary/20">
                      <User size={32} className="text-primary/50" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base font-bold">{inst.nom}</p>
                    {inst.grade && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                        <Award size={12} className="shrink-0" />
                        {inst.grade}
                      </p>
                    )}
                    {inst.bio && (
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{inst.bio}</p>
                    )}
                    <div className="mt-2 flex flex-col gap-1">
                      {inst.telephone && (
                        <a href={`tel:${inst.telephone.replace(/\./g, "")}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Phone size={11} className="text-primary" />{inst.telephone}
                        </a>
                      )}
                      {inst.email && (
                        <a href={`mailto:${inst.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Mail size={11} className="text-primary" />{inst.email}
                        </a>
                      )}
                      {inst.liens?.map((lien) => (
                        <a
                          key={lien.url}
                          href={lien.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink size={11} className="text-primary" />{lien.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Planning */}
        {cours.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="mb-6 font-serif text-2xl font-bold">
              <span style={{ color: color.bg }}>Planning des cours</span>
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeDays.map((day) => {
                const daysCours = cours
                  .filter((c) => c.jour?.toLowerCase() === day.toLowerCase())
                  .sort((a, b) => timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut));
                if (daysCours.length === 0) return null;
                return (
                  <div key={day} className="overflow-hidden rounded-xl border border-border/40 bg-card">
                    <div className="border-b border-border/30 bg-secondary/30 px-3 py-2">
                      <p className="font-serif text-sm font-bold">{day}</p>
                    </div>
                    <div className="space-y-1.5 p-2">
                      {daysCours.map((c) => (
                        <div
                          key={c._id}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                          style={{ backgroundColor: `${color.bg}18`, borderLeft: `2.5px solid ${color.bg}` }}
                        >
                          <div className="shrink-0 text-right" style={{ minWidth: 44 }}>
                            <p className="text-[11px] font-bold leading-none" style={{ color: color.bg }}>{c.heureDebut}</p>
                            <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">{c.heureFin}</p>
                          </div>
                          <div className="h-7 w-px shrink-0 bg-border/40" />
                          <div className="min-w-0">
                            {(c.niveau || c.ages?.length > 0) && (
                              <p className="text-xs text-muted-foreground leading-tight">
                                {[c.niveau, c.ages?.join(", ")].filter(Boolean).join(" · ")}
                              </p>
                            )}
                            {c.lieu && (
                              <p className="text-[10px] text-muted-foreground/60">{c.lieu}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs italic text-muted-foreground/60">
              Horaires donnés à titre indicatif, susceptibles de modification.
            </p>
          </motion.section>
        )}

        {/* Tarifs */}
        {tarifs.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="mb-2 font-serif text-2xl font-bold">
              <span style={{ color: color.bg }}>Tarifs</span>
            </h2>
            <p className="mb-1 text-sm text-muted-foreground">Cotisations annuelles — adhésion à la Fédération incluse</p>
            <p className="mb-6">
              <span className="inline-block rounded-lg border border-primary/30 bg-primary/8 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                2 séances gratuites avant inscription définitive
              </span>
            </p>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tarifs.map((t) => (
                <div key={t._id} className="flex overflow-hidden rounded-lg border border-border/30 bg-card">
                  <div className="w-1 shrink-0" style={{ backgroundColor: color.bg }} />
                  <div className="flex flex-1 items-start justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      {t.categorie && <p className="text-sm font-bold leading-tight text-foreground">{t.categorie}</p>}
                      {t.jours?.length > 0 && (
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3 shrink-0" />
                          {t.jours.join(", ")}
                        </span>
                      )}
                      {t.echeancier && (
                        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground/70">
                          <span className="font-medium">Règlement par chèques :</span> {t.echeancier}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex items-end justify-end gap-0.5">
                        <span className="font-serif text-2xl font-black leading-none" style={{ color: color.bg }}>
                          {t.prixAnnuel ?? "—"}
                        </span>
                        {t.prixAnnuel && <span className="mb-0.5 text-sm font-semibold text-muted-foreground">€</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground/50">/an</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Réductions */}
            <div className="mt-4 overflow-hidden rounded-xl border border-border/30 bg-card">
              <div className="border-b border-border/20 bg-secondary/20 px-5 py-3">
                <h3 className="font-serif text-sm font-bold">Réductions</h3>
              </div>
              <div className="grid gap-0 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 divide-border/20">
                <div className="px-5 py-4">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Multi-cours</p>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-sm text-foreground/80">Pour 2 cours au choix</p>
                    <p className="shrink-0 font-serif text-lg font-black text-primary">−10%</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground/60">du tarif total</p>
                </div>
                <div className="px-5 py-4">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tarifs famille</p>
                  <div className="space-y-1.5">
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
            </div>

            {/* Tarifs spéciaux */}
            {tarifsSpeciaux.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <h3 className="font-serif font-bold text-accent">Tarifs spéciaux</h3>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {tarifsSpeciaux.map((ts) => (
                    <div key={ts._id}>
                      <p className="mb-1.5 text-sm font-semibold">{ts.titre}</p>
                      <ul className="space-y-1">
                        {ts.lignes?.map((ligne, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            {ligne}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        )}

        {/* Liens utiles */}
        {(() => {
          const liensKey = Object.keys(LIENS_UTILES).find(k => slug!.includes(k) || k.includes(slug!));
          const liens = liensKey ? LIENS_UTILES[liensKey] : null;
          if (!liens) return null;
          return (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="mb-6 font-serif text-2xl font-bold">
              <span style={{ color: color.bg }}>Liens utiles</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {liens.map((lien) => (
                <a
                  key={lien.url}
                  href={lien.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-xl border border-border/40 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <ExternalLink size={15} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                      {lien.label}
                    </p>
                    {lien.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{lien.description}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </motion.section>
          );
        })()}

        {/* CTA inscription */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center"
        >
          <h2 className="mb-2 font-serif text-2xl font-bold">Prêt à vous lancer ?</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Rejoignez le {discipline.nom} à l'AMSP — 2 séances d'essai gratuites avant tout engagement.
          </p>
          <Link
            to="/inscription"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            S'inscrire en ligne <ArrowRight size={16} />
          </Link>
        </motion.section>

      </div>
    </Layout>
  );
};

export default DisciplineDetail;
