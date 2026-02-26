import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, MapPin, Euro, Clock, Users, User } from "lucide-react";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { client } from "@/sanityClient";
import { urlFor } from "@/sanityImage";
import { Sparkles } from "lucide-react";
import { iconesDisciplines } from "@/iconesDisciplines";
import heroImage from "@/assets/hero-martial.jpg";

interface Discipline {
  _id: string;
  nom: string;
  nomCourt: string;
  icone: string;
  description: string;
  horaires: string;
  ordre: number;
}

interface Actualite {
  _id: string;
  titre: string;
  type: string;
  date: string;
  horaires: string;
  contenu: string;
  lieu: string;
  prix: string;
  intervenant: string;
  inscription: string;  
  minimumPersonnes: number;
  image?: { asset: { _ref: string } };
  publie: boolean;
}

const Index = () => {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [actualites, setActualites] = useState<Actualite[]>([]);
  const [selectedActu, setSelectedActu] = useState<Actualite | null>(null);

  useEffect(() => {
    client
      .fetch('*[_type == "discipline"] | order(ordre asc)')
      .then((data) => setDisciplines(data));

    client
      .fetch('*[_type == "actualite" && publie == true] | order(date asc)')
      .then((data) => setActualites(data));
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
          <p className="mx-auto mb-8 max-w-xl text-sm text-muted-foreground md:text-base">
            {disciplines.length} disciplines — un seul dojo.
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
                  className="rounded-lg border border-border/50 bg-card overflow-hidden cursor-pointer group hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
                  onClick={() => setSelectedActu(a)}
                >
                  {a.image && (
                    <img
                      src={urlFor(a.image).width(600).height(300).fit('crop').url()}
                      alt={a.titre}
                      className="w-full object-cover h-48 transition-transform group-hover:scale-105"
                    />
                  )}
                  <div className="p-5">
                    {/* Badge type */}
                    <span className={`inline-block mb-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                      a.type === 'stage'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary text-foreground'
                    }`}>
                      {a.type === 'stage' ? '🥋 Stage' : '📢 Actualité'}
                    </span>
                    {a.date && (
                      <p className="mb-1 text-xs text-muted-foreground">
                        📅 {new Date(a.date).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>
                    )}
                    <h3 className="mb-2 font-serif text-lg font-bold">{a.titre}</h3>
                    {a.contenu && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{a.contenu}</p>
                    )}
                    <p className="mt-3 text-xs text-primary font-medium">Lire + →</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selectedActu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedActu(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Bouton fermer */}
              <button
                onClick={() => setSelectedActu(null)}
                className="absolute top-4 right-4 z-10 rounded-full bg-background/80 p-2 hover:bg-secondary transition-colors"
              >
                <X size={20} />
              </button>

              {/* Image flyer */}
              {selectedActu.image && (
                <img
                  src={urlFor(selectedActu.image).width(800).url()}
                  alt={selectedActu.titre}
                  className="w-full object-contain max-h-80"
                />
              )}

              <div className="p-6">
                {/* Badge + Titre */}
                <span className={`inline-block mb-3 text-xs font-medium px-2 py-0.5 rounded-full ${
                  selectedActu.type === 'stage'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary text-foreground'
                }`}>
                  {selectedActu.type === 'stage' ? '🥋 Stage' : '📢 Actualité'}
                </span>
                <h2 className="mb-4 font-serif text-2xl font-bold">{selectedActu.titre}</h2>

                {/* Infos essentielles */}
                <div className="mb-4 space-y-2 text-sm">
                  {selectedActu.date && (
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="text-primary">📅</span>
                      <span className="font-medium">Date :</span>
                      {new Date(selectedActu.date).toLocaleDateString('fr-FR', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </div>
                  )}
                  {selectedActu.horaires && (
                    <div className="flex items-center gap-2 text-foreground">
                      <Clock size={16} className="text-primary shrink-0" />
                      <span className="font-medium">Horaire :</span>
                      {selectedActu.horaires}
                    </div>
                  )}
                  {selectedActu.lieu && (
                    <div className="flex items-center gap-2 text-foreground">
                      <MapPin size={16} className="text-primary shrink-0" />
                      <span className="font-medium">Lieu :</span>
                      {selectedActu.lieu}
                    </div>
                  )}
                  {selectedActu.prix && (
                    <div className="flex items-center gap-2 text-foreground">
                      <Euro size={16} className="text-primary shrink-0" />
                      <span className="font-medium">Prix :</span>
                      {selectedActu.prix}
                    </div>
                  )}
                  {selectedActu.intervenant && (
                    <div className="flex items-center gap-2 text-foreground">
                      <User size={16} className="text-primary shrink-0" />
                      <span className="font-medium">Intervenant :</span>
                      {selectedActu.intervenant}
                    </div>
                  )}
                  {selectedActu.minimumPersonnes && (
                    <div className="flex items-center gap-2 text-foreground">
                      <Users size={16} className="text-primary shrink-0" />
                      <span className="font-medium">Minimum :</span>
                      Stage maintenu à partir de {selectedActu.minimumPersonnes} participants
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedActu.contenu && (
                  <p className="mb-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {selectedActu.contenu}
                  </p>
                )}

                {/* Inscription */}
                <div className="rounded-lg bg-secondary/50 p-4 text-sm">
                  <p className="font-medium mb-1">📝 Inscription obligatoire</p>
                  <p className="text-muted-foreground">
                    {selectedActu.inscription || '06.82.16.22.66 ou artsmartiauxstpierrois@gmail.com'}
                  </p>                  
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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