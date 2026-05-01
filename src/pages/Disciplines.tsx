import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { client } from "@/sanityClient";
import { Sparkles, GraduationCap, Users, Clock } from "lucide-react";
import { iconesDisciplines } from "@/iconesDisciplines";
import { urlFor } from "@/sanityImage";

const toAnchor = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

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
  ordre: number;
  image?: {
    asset: {
      _ref: string;
    };
  };
}

const Disciplines = () => {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .fetch('*[_type == "discipline"] | order(ordre asc) { ..., image }')
      .then((data) => {
        setDisciplines(data);
        setLoading(false);
      });
  }, []);

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
              Arts pratiqués
            </p>
            <h1 className="mb-4 font-serif text-4xl font-black md:text-5xl">
              Nos <span className="text-primary">Disciplines</span>
            </h1>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Découvrez les disciplines enseignées au sein
              de l'Association d'Arts Martiaux St Pierrois.
            </p>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-4">
              {disciplines.map((d, i) => {
                const IconeComposant = iconesDisciplines[d.icone] || Sparkles;
                const imageLeft = i % 2 !== 0;

                return (
                  <motion.article
                    key={d._id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                    className="overflow-hidden rounded-2xl border border-border/40 bg-card"
                  >
                    <div className={`flex flex-col ${imageLeft ? 'md:flex-row-reverse' : 'md:flex-row'}`}>

                      {/* Zone image / placeholder */}
                      <div className="relative md:w-1/3 shrink-0 overflow-hidden">
                        {d.image ? (
                          <img
                            src={urlFor(d.image).width(500).height(360).fit('crop').url()}
                            alt={d.nom}
                            className="h-40 md:h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-40 md:h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/15 via-primary/8 to-transparent">
                            <IconeComposant size={52} className="text-primary/20" />
                          </div>
                        )}
                        <div className={`absolute inset-0 hidden md:block ${
                          imageLeft
                            ? 'bg-gradient-to-l from-card via-transparent to-transparent'
                            : 'bg-gradient-to-r from-card via-transparent to-transparent'
                        }`} />
                      </div>

                      {/* Contenu texte */}
                      <div className="flex flex-1 flex-col justify-center p-5 md:p-7">
                        {/* Icone + Nom */}
                        <div className="mb-3 flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20">
                            <IconeComposant size={20} className="text-primary" />
                          </div>
                          <h2 className="font-serif text-xl font-black leading-tight md:text-2xl">
                            {d.nom}
                          </h2>
                        </div>

                        {/* Description */}
                        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                          {d.description}
                        </p>

                        {/* Lien détail */}
                        <Link
                          to={`/disciplines/${toAnchor(d.nom)}`}
                          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          En savoir plus →
                        </Link>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {d.horaires && (
                            <span className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground">
                              <Clock size={12} className="text-primary" />
                              {d.horaires}
                            </span>
                          )}
                          {d.professeurs?.map((prof) => (
                            <Link
                              key={prof}
                              to={`/instructeurs#${toAnchor(prof)}`}
                              className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                            >
                              <Users size={12} className="text-primary" />
                              {prof}
                            </Link>
                          ))}
                          {d.niveaux?.map((niveau) => (
                            <span
                              key={niveau}
                              className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary"
                            >
                              <GraduationCap size={12} />
                              {niveau}
                            </span>
                          ))}
                          {d.ages?.map((age) => (
                            <span
                              key={age}
                              className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                            >
                              <Users size={12} />
                              {age}
                            </span>
                          ))}
                        </div>
                      </div>

                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Disciplines;
