import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { client } from "@/sanityClient";
import { Sparkles, GraduationCap, Users } from "lucide-react";
import { iconesDisciplines } from "@/iconesDisciplines";
import { urlFor } from "@/sanityImage";

interface Discipline {
  _id: string;
  nom: string;
  nomCourt: string;
  icone: string;
  description: string;
  horaires: string;
  professeur: string;
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
          <h1 className="mb-4 text-center font-serif text-4xl font-black md:text-5xl">
            Nos <span className="text-primary">Disciplines</span>
          </h1>
          <p className="mx-auto mb-16 max-w-2xl text-center text-muted-foreground">
            Découvrez les {disciplines.length} disciplines enseignées au sein
            de l'Association d'Arts Martiaux St Pierrois.
          </p>

          {loading ? (
            <p className="text-center text-muted-foreground">Chargement...</p>
          ) : (
            <div className="space-y-16">
              {disciplines.map((d) => {
                const IconeComposant = iconesDisciplines[d.icone] || Sparkles;

                return (
                  <motion.article
                    key={d._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="scroll-mt-24 rounded-lg border border-border/50 bg-card overflow-hidden"
                  >
                    {/* Photo */}
                    {d.image && (
                      <img
                        src={urlFor(d.image).width(1200).height(400).fit('crop').url()}
                        alt={d.nom}
                        className="w-full object-cover h-48 md:h-56"
                      />
                    )}

                    <div className="p-8">
                      {/* Icône + Titre — même style qu'avant */}
                      <div className="flex items-start gap-4">
                        <IconeComposant
                          size={40}
                          className="mt-1 shrink-0 text-primary"
                        />
                        <div className="flex-1">
                          <h2 className="mb-3 font-serif text-2xl font-bold">
                            {d.nom}
                          </h2>
                          <p className="mb-4 text-muted-foreground">
                            {d.description}
                          </p>

                          {/* Horaires + Professeur — même style badge qu'avant */}
                          <div className="flex flex-wrap gap-4 text-sm">
                            {d.horaires && (
                              <span className="rounded bg-secondary px-3 py-1 text-foreground">
                                📅 {d.horaires}
                              </span>
                            )}
                            {d.professeur && (
                              <span className="rounded bg-secondary px-3 py-1 text-foreground">
                                👤 {d.professeur}
                              </span>
                            )}
                          </div>

                          {/* Niveaux — icône GraduationCap, même style badge */}
                          {d.niveaux?.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 text-sm">
                              {d.niveaux.map((niveau) => (
                                <span
                                  key={niveau}
                                  className="flex items-center gap-1.5 rounded bg-secondary px-3 py-1 text-foreground"
                                >
                                  <GraduationCap size={14} className="text-primary" />
                                  {niveau}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Âges — icône Users, même style badge */}
                          {d.ages?.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 text-sm">
                              {d.ages.map((age) => (
                                <span
                                  key={age}
                                  className="flex items-center gap-1.5 rounded bg-secondary px-3 py-1 text-foreground"
                                >
                                  <Users size={14} className="text-primary" />
                                  {age}
                                </span>
                              ))}
                            </div>
                          )}
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