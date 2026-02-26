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
  className="scroll-mt-24 rounded-lg border border-border/50 bg-card"
  style={{
    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  }}
  whileHover={{ 
    scale: 1.02,
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
  }}
>
  <div className="overflow-hidden rounded-lg">
        <div className="flex flex-col md:flex-row">

          {/* Colonne gauche — texte */}
          <div className="flex-1 p-8">
            {/* Icône + Titre */}
            <div className="flex items-center gap-4 mb-4">
              <IconeComposant
                size={40}
                className="shrink-0 text-primary"
              />
              <h2 className="font-serif text-2xl font-bold">{d.nom}</h2>
            </div>

            {/* Description */}
            <p className="mb-6 text-muted-foreground leading-relaxed">
              {d.description}
            </p>

            {/* Horaires + Professeurs */}
            <div className="flex flex-wrap gap-3 text-sm mb-4">
              {d.horaires && (
                <span className="rounded bg-secondary px-3 py-1 text-foreground">
                  📅 {d.horaires}
                </span>
              )}
            </div>

            {d.professeurs?.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2 text-sm">
                {d.professeurs.map((prof) => (
                  <span key={prof} className="rounded bg-secondary px-3 py-1 text-foreground">
                    👤 {prof}
                  </span>
                ))}
              </div>
            )}

            {/* Niveaux */}
            {d.niveaux?.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2 text-sm">
                {d.niveaux.map((niveau) => (
                  <span key={niveau} className="flex items-center gap-1.5 rounded bg-secondary px-3 py-1 text-foreground">
                    <GraduationCap size={14} className="text-primary" />
                    {niveau}
                  </span>
                ))}
              </div>
            )}

            {/* Âges */}
            {d.ages?.length > 0 && (
              <div className="flex flex-wrap gap-2 text-sm">
                {d.ages.map((age) => (
                  <span key={age} className="flex items-center gap-1.5 rounded bg-secondary px-3 py-1 text-foreground">
                    <Users size={14} className="text-primary" />
                    {age}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Colonne droite — photo */}
          {d.image ? (
            <div className="md:w-2/5 shrink-0">
              <img
                src={urlFor(d.image).width(600).height(500).fit('crop').url()}
                alt={d.nom}
                className="w-full h-64 md:h-full object-cover"
              />
            </div>
          ) : (
            // Placeholder si pas de photo
            <div className="md:w-2/5 shrink-0 bg-secondary/30 flex items-center justify-center min-h-48">
              <IconeComposant size={64} className="text-primary/20" />
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