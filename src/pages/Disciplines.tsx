import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { client } from "@/sanityClient";
import { iconesDisciplines } from "@/iconesDisciplines";
import { urlFor } from "@/sanityImage";
import { GraduationCap, Users } from "lucide-react";

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
            <div className="space-y-10">
              {disciplines.map((d) => {
                const config = iconesDisciplines[d.icone] || iconesDisciplines["Sparkles"];
                const IconeComposant = config.icone;

                return (
                  <motion.article
                    key={d._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className={`scroll-mt-24 rounded-xl border border-border/50 bg-card overflow-hidden`}
                  >
                    {/* Photo en haut, bien dimensionnée */}
                    {d.image && (
                      <img
                        src={urlFor(d.image).width(1200).height(400).fit('crop').url()}
                        alt={d.nom}
                        className="w-full object-cover h-56"
                      />
                    )}

                    <div className="p-8">
                      {/* Icône + Titre */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`rounded-xl p-3 ${config.bg}`}>
                          <IconeComposant size={32} className={config.couleur} />
                        </div>
                        <h2 className="font-serif text-2xl font-bold">{d.nom}</h2>
                      </div>

                      {/* Description */}
                      <p className="mb-6 text-muted-foreground leading-relaxed">
                        {d.description}
                      </p>

                      {/* Horaires + Professeur */}
                      <div className="flex flex-wrap gap-3 text-sm mb-4">
                        {d.horaires && (
                          <span className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-foreground font-medium">
                            📅 {d.horaires}
                          </span>
                        )}
                        {d.professeur && (
                          <span className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-foreground font-medium">
                            👤 {d.professeur}
                          </span>
                        )}
                      </div>

                      {/* Niveaux — icône GraduationCap à la place de 🥋 */}
                      {d.niveaux?.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-sm mb-3">
                          {d.niveaux.map((niveau) => (
                            <span
                              key={niveau}
                              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${config.bg} ${config.couleur}`}
                            >
                              <GraduationCap size={14} />
                              {niveau}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Âges — icône Users */}
                      {d.ages?.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-sm">
                          {d.ages.map((age) => (
                            <span
                              key={age}
                              className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground font-medium"
                            >
                              <Users size={14} />
                              {age}
                            </span>
                          ))}
                        </div>
                      )}
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