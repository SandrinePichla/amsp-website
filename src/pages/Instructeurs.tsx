import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, User, Award, ExternalLink } from "lucide-react";
import Layout from "@/components/Layout";
import { client } from "@/sanityClient";
import { urlFor } from "@/sanityImage";

const toAnchor = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

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

  // Grouper par première discipline (un instructeur multi-disciplines apparaît dans son groupe principal)
  const parDiscipline = liste.reduce<Record<string, Instructeur[]>>((acc, inst) => {
    const disc = inst.disciplines?.[0]?.nom || "Autre";
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
                      <motion.div
                        key={inst._id}
                        id={toAnchor(inst.nom)}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06 }}
                        className="flex flex-col gap-4 rounded-xl border border-border/40 bg-card p-4 scroll-mt-24 sm:flex-row sm:items-start"
                      >
                        {/* Avatar */}
                        <div className="shrink-0">
                          {inst.photo ? (
                            <img
                              src={urlFor(inst.photo).width(120).height(120).fit("crop").url()}
                              alt={inst.nom}
                              className="h-20 w-20 rounded-xl object-cover ring-2 ring-primary/20"
                            />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/10 ring-2 ring-primary/20">
                              <User size={32} className="text-primary/50" />
                            </div>
                          )}
                        </div>

                        {/* Infos */}
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
                              <Award size={12} className="shrink-0" />
                              {inst.grade}
                            </p>
                          )}

                          {inst.bio && (
                            <p className="mt-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                              {inst.bio}
                            </p>
                          )}

                          <div className="mt-2 flex flex-col gap-1">
                            {inst.telephone && (
                              <a
                                href={`tel:${inst.telephone.replace(/\./g, "")}`}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
                              >
                                <Phone size={11} className="text-primary" />
                                {inst.telephone}
                              </a>
                            )}
                            {inst.email && (
                              <a
                                href={`mailto:${inst.email}`}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
                              >
                                <Mail size={11} className="text-primary" />
                                {inst.email}
                              </a>
                            )}
                            {inst.liens?.map((lien) => (
                              <a
                                key={lien.url}
                                href={lien.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
                              >
                                <ExternalLink size={11} className="text-primary" />
                                {lien.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Instructeurs;
