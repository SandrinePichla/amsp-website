import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { client } from "@/sanityClient";
import { iconesDisciplines } from "@/iconesDisciplines";

interface Discipline {
  _id: string;
  nom: string;
  description: string;
  professeur: string;
  niveaux: string[];
  ordre: number;
  icone: string;
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
              {disciplines.map((d, i) => (
                <motion.article
                  key={d._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="scroll-mt-24 rounded-lg border border-border/50 bg-card p-8"
                >
                  <div>
                    <h2 className="mb-3 font-serif text-2xl font-bold">{d.nom}</h2>
                    <p className="mb-4 text-muted-foreground">{d.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {d.professeur && (
                        <span className="rounded bg-secondary px-3 py-1 text-foreground">
                          👤 {d.professeur}
                        </span>
                      )}
                      {d.niveaux?.map((niveau) => (
                        <span key={niveau} className="rounded bg-secondary px-3 py-1 text-foreground">
                          🥋 {niveau}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Disciplines;