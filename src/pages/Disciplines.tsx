import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { client } from "@/sanityClient";
import { Sparkles } from "lucide-react";
import { iconesDisciplines } from "@/iconesDisciplines";

interface Discipline {
  _id: string;
  nom: string;
  nomCourt: string;
  icone: string;
  couleur: string;
  description: string;
  horaires: string;
  professeur: string;
  niveaux: string[];
  ages: string[];
  ordre: number;
}

const Disciplines = () => {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .fetch('*[_type == "discipline"] | order(ordre asc)')
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
            Découvrez les {disciplines.length} disciplines enseignées au sein de l'Association d'Arts Martiaux St Pierrois.
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
                    className="scroll-mt-24 rounded-lg border border-border/50 bg-card p-8"
                    style={ d.couleur ? { borderLeftColor: d.couleur, borderLeftWidth: '4px' } : {} }
                  >
                    <div className="flex items-start gap-4">
                      <IconeComposant
                        size={40}
                        className="mt-1 shrink-0"
                        style={ d.couleur ? { color: d.couleur } : {} }
                      />
                      <div className="flex-1">
                        <h2 className="mb-3 font-serif text-2xl font-bold">{d.nom}</h2>
                        <p className="mb-4 text-muted-foreground">{d.description}</p>

                        <div className="flex flex-wrap gap-3 text-sm">
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

                        {d.niveaux?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            {d.niveaux.map((niveau) => (
                              <span key={niveau} className="rounded bg-secondary px-3 py-1 text-foreground">
                                🥋 {niveau}
                              </span>
                            ))}
                          </div>
                        )}

                        {d.ages?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            {d.ages.map((age) => (
                              <span key={age} className="rounded bg-secondary px-3 py-1 text-foreground">
                                👶 {age}
                              </span>
                            ))}
                          </div>
                        )}
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