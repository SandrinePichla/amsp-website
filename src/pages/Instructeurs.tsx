import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, User } from "lucide-react";
import Layout from "@/components/Layout";
import { client } from "@/sanityClient";
import { urlFor } from "@/sanityImage";

interface Instructeur {
  _id: string;
  nom: string;
  discipline?: { nom: string; nomCourt: string };
  telephone?: string;
  email?: string;
  bio?: string;
  photo?: { asset: { _ref: string } };
}

const Instructeurs = () => {
  const [instructeurs, setInstructeurs] = useState<Instructeur[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .fetch(`*[_type == "instructeur"] | order(ordre asc) {
        _id, nom, telephone, email, bio, photo,
        discipline-> { nom, nomCourt }
      }`)
      .then((data) => {
        setInstructeurs(data);
        setLoading(false);
      });
  }, []);

  // Données par défaut affichées tant que Sanity est vide
  const fallback: Instructeur[] = [
    { _id: "1", nom: "Stéphanie Lamoureux", discipline: { nom: "Qi Gong", nomCourt: "Qi Gong" }, telephone: "06.01.91.87.76" },
    { _id: "2", nom: "Myriam Reuter", discipline: { nom: "Wutao", nomCourt: "Wutao" }, telephone: "06.73.23.75.50" },
    { _id: "3", nom: "Houze Alexandre", discipline: { nom: "Tai Chi Épée et Main Nue", nomCourt: "Tai Chi" }, telephone: "06.13.38.59.64" },
    { _id: "4", nom: "Jérémie Sigalat", discipline: { nom: "Karaté", nomCourt: "Karaté" }, telephone: "06.63.67.79.62" },
    { _id: "5", nom: "Sylvaine Colas", discipline: { nom: "Karaté", nomCourt: "Karaté" }, telephone: "06.82.16.22.66" },
  ];

  const liste = instructeurs.length > 0 ? instructeurs : fallback;

  // Grouper par discipline
  const parDiscipline = liste.reduce<Record<string, Instructeur[]>>((acc, inst) => {
    const disc = inst.discipline?.nom || "Autre";
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
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-center gap-4 rounded-xl border border-border/40 bg-card p-4"
                      >
                        {/* Avatar */}
                        <div className="shrink-0">
                          {inst.photo ? (
                            <img
                              src={urlFor(inst.photo).width(80).height(80).fit("crop").url()}
                              alt={inst.nom}
                              className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                              <User size={28} className="text-primary/50" />
                            </div>
                          )}
                        </div>

                        {/* Infos */}
                        <div className="min-w-0 flex-1">
                          <p className="font-serif text-base font-bold leading-tight">{inst.nom}</p>
                          {inst.bio && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
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
