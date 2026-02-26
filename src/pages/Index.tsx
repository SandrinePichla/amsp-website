import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { client } from "@/sanityClient";
import { Sparkles } from "lucide-react";
import { iconesDisciplines } from "@/iconesDisciplines";
import heroImage from "@/assets/hero-martial.jpg";
import { urlFor } from "@/sanityImage";

interface Actualite {
  _id: string;
  titre: string;
  date: string;
  contenu: string;
  image?: {
    asset: {
      _ref: string;
    };
  };
  publie: boolean;
}

interface Discipline {
  _id: string;
  nom: string;
  nomCourt: string;
  icone: string;
  description: string;
  horaires: string;
  ordre: number;
}

const Index = () => {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [actualites, setActualites] = useState<Actualite[]>([]);

useEffect(() => {
  client
    .fetch('*[_type == "actualite" && publie == true] | order(date desc)')
    .then((data) => setActualites(data));
}, []);

  useEffect(() => {
    client
      .fetch('*[_type == "discipline"] | order(ordre asc)')
      .then((data) => setDisciplines(data));
  }, []);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 px-4 text-center"
        >
          <h1 className="mb-4 font-serif text-5xl font-black tracking-tight md:text-7xl">
            <span className="text-primary">A.M.S.P</span>
          </h1>
          <p className="mb-2 text-lg text-foreground/80 md:text-2xl">
            Association d'Arts Martiaux St Pierrois
          </p>

          {/* Section Actualités — visible uniquement s'il y a des actualités publiées */}
{actualites.length > 0 && (
  <section className="py-16 bg-secondary/20">
    <div className="container mx-auto px-4">
      <h2 className="mb-10 text-center font-serif text-3xl font-bold md:text-4xl">
        Actualités & <span className="text-primary">Stages</span>
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {actualites.map((a, i) => (
          <motion.div
            key={a._id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-lg border border-border/50 bg-card overflow-hidden"
          >
            {/* Image si disponible */}
            {a.image && (
              <img
                src={urlFor(a.image).width(600).height(300).fit('crop').url()}
                alt={a.titre}
                className="w-full object-cover h-40"
              />
            )}
            <div className="p-5">
              {/* Date */}
              {a.date && (
                <p className="mb-2 text-xs text-muted-foreground">
                  📅 {new Date(a.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              )}
              {/* Titre */}
              <h3 className="mb-2 font-serif text-lg font-bold">{a.titre}</h3>
              {/* Contenu tronqué */}
              {a.contenu && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {a.contenu}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
)}


          <p className="mx-auto mb-8 max-w-xl text-sm text-muted-foreground md:text-base">
            {disciplines.length} disciplines.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/inscription"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              S'inscrire <ArrowRight size={16} />
            </Link>
            <Link
              to="/disciplines"
              className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Découvrir nos disciplines
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Disciplines grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center font-serif text-3xl font-bold md:text-4xl">
            Nos <span className="text-primary">Disciplines</span>
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {disciplines.map((d, i) => {
              const IconeComposant = iconesDisciplines[d.icone] || Sparkles;

              return (
                <motion.div
                  key={d._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    to="/disciplines"
                    className="group block rounded-lg border border-border/50 bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <IconeComposant
                      size={32}
                      className="mb-4 text-primary transition-transform group-hover:scale-110"
                    />
                    <h3 className="mb-2 font-serif text-lg font-bold">
                      {d.nomCourt || d.nom}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {d.description}
                    </p>
                    {d.horaires && (
                      <p className="mt-3 text-xs text-accent">{d.horaires}</p>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 bg-secondary/30 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 font-serif text-2xl font-bold md:text-3xl">
            Prêt à commencer ?
          </h2>
          <p className="mx-auto mb-6 max-w-md text-muted-foreground">
            Rejoignez l'A.M.S.P et découvrez l'art martial qui vous correspond.
          </p>
          <Link
            to="/inscription"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Inscription en ligne <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Index;