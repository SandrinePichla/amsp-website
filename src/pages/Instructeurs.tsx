import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mail, User, Award, ExternalLink, X } from "lucide-react";
import Layout from "@/components/Layout";
import { client } from "@/sanityClient";
import { urlFor } from "@/sanityImage";

const toAnchor = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

interface Lien {
  label: string;
  url: string;
}

interface Instructeur {
  _id: string;
  nom: string;
  disciplines?: { nom: string; nomCourt: string }[];
  grade?: string;
  telephone?: string;
  email?: string;
  bio?: string;
  liens?: Lien[];
  photo?: { asset: { _ref: string } };
}

const Instructeurs = () => {
  const [instructeurs, setInstructeurs] = useState<Instructeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Instructeur | null>(null);

  useEffect(() => {
    client
      .fetch(`*[_type == "instructeur"] | order(ordre asc) {
        _id, nom, grade, telephone, email, bio, liens, photo,
        disciplines[]-> { nom, nomCourt }
      }`)
      .then((data) => {
        setInstructeurs(data);
        setLoading(false);
        if (window.location.hash) {
          const id = window.location.hash.slice(1);
          setTimeout(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      });
  }, []);

  // Données par défaut affichées tant que Sanity est vide
  const fallback: Instructeur[] = [
    { _id: "1", nom: "Stéphanie Lamoureux", disciplines: [{ nom: "Qi Gong", nomCourt: "Qi Gong" }], telephone: "06.01.91.87.76" },
    { _id: "2", nom: "Myriam Reuter", disciplines: [{ nom: "Wutao", nomCourt: "Wutao" }], telephone: "06.73.23.75.50" },
    { _id: "3", nom: "Houze Alexandre", disciplines: [{ nom: "Tai Chi Chuan Main Nue", nomCourt: "Tai Chi" }, { nom: "Tai Chi Chuan Épée", nomCourt: "Tai Chi Épée" }], telephone: "06.13.38.59.64" },
    { _id: "4", nom: "Jérémie Sigalat", disciplines: [{ nom: "Karaté Shotokan", nomCourt: "Karaté" }], telephone: "06.63.67.79.62" },
    { _id: "5", nom: "Sylvaine Colas", disciplines: [{ nom: "Karaté Shotokan", nomCourt: "Karaté" }], telephone: "06.82.16.22.66" },
  ];

  const liste = instructeurs.length > 0 ? instructeurs : fallback;

  const groupLabel = (inst: Instructeur): string => {
    const discs = inst.disciplines;
    if (!discs || discs.length === 0) return "Autre";
    if (discs.length === 1) return discs[0].nom;
    // Préfixe commun mot par mot (ex: "Tai Chi Chuan Main Nue" + "Tai Chi Chuan Épée" → "Tai Chi Chuan")
    const mots = discs.map(d => d.nom.split(" "));
    const ref = mots[0];
    const commun: string[] = [];
    for (let i = 0; i < ref.length; i++) {
      if (mots.every(m => m[i] === ref[i])) commun.push(ref[i]);
      else break;
    }
    return commun.length > 0 ? commun.join(" ") : discs[0].nom;
  };

  const parDiscipline = liste.reduce<Record<string, Instructeur[]>>((acc, inst) => {
    const disc = groupLabel(inst);
    if (!acc[disc]) acc[disc] = [];
    acc[disc].push(inst);
    return acc;
  }, {});

  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto px-4">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary/60">
              Notre équipe
            </p>
            <h1 className="mb-4 font-serif text-4xl font-black md:text-5xl">
              Les <span className="text-primary">Instructeurs</span>
            </h1>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Des passionnés dévoués à la transmission des arts martiaux.
            </p>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(parDiscipline).map(([discipline, membres], gi) => (
                <motion.div
                  key={discipline}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: gi * 0.05 }}
                >
                  <h2 className="mb-4 flex items-center gap-3 font-serif text-lg font-bold text-primary">
                    <span className="h-px flex-1 bg-border/60" />
                    {discipline}
                    <span className="h-px flex-1 bg-border/60" />
                  </h2>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {membres.map((inst, i) => (
                      <motion.button
                        key={inst._id}
                        id={toAnchor(inst.nom)}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => setSelected(inst)}
                        className="flex items-center gap-4 rounded-xl border border-border/40 bg-card p-4 scroll-mt-24 text-left transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 cursor-pointer w-full"
                      >
                        {/* Avatar */}
                        <div className="shrink-0">
                          {inst.photo ? (
                            <img
                              src={urlFor(inst.photo).width(80).height(80).fit("crop").url()}
                              alt={inst.nom}
                              className="h-14 w-14 rounded-xl object-cover ring-2 ring-primary/20"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 ring-2 ring-primary/20">
                              <User size={26} className="text-primary/50" />
                            </div>
                          )}
                        </div>

                        {/* Infos résumées */}
                        <div className="min-w-0 flex-1">
                          <p className="font-serif text-base font-bold leading-tight">{inst.nom}</p>

                          {inst.disciplines && inst.disciplines.length > 1 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {inst.disciplines.map((d) => (
                                <span key={d.nom} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                  {d.nomCourt || d.nom}
                                </span>
                              ))}
                            </div>
                          )}

                          {inst.grade && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                              <Award size={11} className="shrink-0" />
                              {inst.grade}
                            </p>
                          )}

                          {inst.bio && (
                            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {inst.bio}
                            </p>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Popup fiche instructeur */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Bouton fermer */}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 z-10 rounded-full bg-background/80 p-2 hover:bg-secondary transition-colors"
              >
                <X size={18} />
              </button>

              {/* Photo grande */}
              {selected.photo ? (
                <img
                  src={urlFor(selected.photo).width(600).height(400).fit("crop").url()}
                  alt={selected.nom}
                  className="w-full h-56 object-cover rounded-t-2xl"
                />
              ) : (
                <div className="w-full h-40 flex items-center justify-center bg-primary/10 rounded-t-2xl">
                  <User size={64} className="text-primary/30" />
                </div>
              )}

              <div className="p-6">
                {/* Nom + disciplines */}
                <h2 className="font-serif text-2xl font-bold">{selected.nom}</h2>

                {selected.disciplines && selected.disciplines.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.disciplines.map((d) => (
                      <span key={d.nom} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {d.nom}
                      </span>
                    ))}
                  </div>
                )}

                {/* Grade */}
                {selected.grade && (
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary">
                    <Award size={14} className="shrink-0" />
                    {selected.grade}
                  </p>
                )}

                {/* Bio complète */}
                {selected.bio && (
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {selected.bio}
                  </p>
                )}

                {/* Coordonnées + liens */}
                {(selected.telephone || selected.email || (selected.liens && selected.liens.length > 0)) && (
                  <div className="mt-5 flex flex-col gap-2 border-t border-border/40 pt-4">
                    {selected.telephone && (
                      <a
                        href={`tel:${selected.telephone.replace(/\./g, "")}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Phone size={14} className="text-primary shrink-0" />
                        {selected.telephone}
                      </a>
                    )}
                    {selected.email && (
                      <a
                        href={`mailto:${selected.email}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Mail size={14} className="text-primary shrink-0" />
                        {selected.email}
                      </a>
                    )}
                    {selected.liens?.map((lien) => (
                      <a
                        key={lien.url}
                        href={lien.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink size={14} className="text-primary shrink-0" />
                        {lien.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Instructeurs;
