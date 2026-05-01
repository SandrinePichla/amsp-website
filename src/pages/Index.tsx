import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, MapPin, Euro, Clock, Users, User } from "lucide-react";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { client } from "@/sanityClient";
import { urlFor } from "@/sanityImage";
import { Sparkles } from "lucide-react";
import { iconesDisciplines } from "@/iconesDisciplines";
import heroImage from "@/assets/hero-martial-banner-modif4.webp";

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
      <section className="relative flex h-[200px] items-center justify-center overflow-hidden">
        <img
          src={heroImage}
          alt="Arts martiaux AMSP"
          className="absolute inset-0 h-full w-full object-cover object-[center_80%]"
          loading="eager"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 px-4 text-center"
        >
          <h1 className="mb-1 font-serif text-3xl font-black tracking-tight md:text-4xl">
            <span className="text-primary">A.M.S.P</span>
          </h1>
          <p className="mb-4 text-sm text-foreground/80 md:text-base">
            Association d'Arts Martiaux St Pierrois
          </p>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <Link
              to="/inscription"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              S'inscrire <ArrowRight size={14} />
            </Link>
            <Link
              to="/disciplines"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Découvrir nos disciplines
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Section Actualités — visible uniquement s'il y a des actualités publiées */}
      {actualites.length > 0 && (
        <section className="py-20 bg-secondary/10">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary/60">Agenda</p>
              <h2 className="font-serif text-3xl font-bold md:text-4xl">
                Actualités & <span className="text-primary">Stages</span>
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {actualites.map((a, i) => (
                <motion.div
                  key={a._id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="group cursor-pointer flex"
                  onClick={() => setSelectedActu(a)}
                >
                  <div className="flex flex-col w-full overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
                    {/* Zone image / placeholder — hauteur fixe */}
                    <div className="relative h-48 shrink-0 overflow-hidden">
                      {a.image ? (
                        <img
                          src={urlFor(a.image).width(600).height(400).fit('crop').url()}
                          alt={a.titre}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className={`h-full w-full ${
                          a.type === 'stage'
                            ? 'bg-gradient-to-br from-primary/60 via-primary/30 to-primary/10'
                            : 'bg-gradient-to-br from-secondary via-secondary/60 to-secondary/20'
                        }`} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                      <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur-sm ${
                        a.type === 'stage'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-black/50 text-white'
                      }`}>
                        {a.type === 'stage' ? 'Stage' : 'Actualité'}
                      </span>

                      {a.date && (
                        <div className="absolute right-3 top-3 min-w-[42px] rounded-lg bg-black/55 px-2 py-1.5 text-center backdrop-blur-sm">
                          <p className="text-lg font-black leading-none text-white">
                            {new Date(a.date).getDate()}
                          </p>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/70">
                            {new Date(a.date).toLocaleDateString('fr-FR', { month: 'short' })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Contenu — flex-1 pour égaliser les hauteurs */}
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="mb-1.5 font-serif text-base font-bold leading-snug line-clamp-2 transition-colors group-hover:text-primary">
                        {a.titre}
                      </h3>
                      {a.contenu && (
                        <p className="flex-1 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {a.contenu}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary">
                        Voir le détail
                        <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-1" />
                      </div>
                    </div>
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
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary/60">Arts pratiqués</p>
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              Nos <span className="text-primary">Disciplines</span>
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {disciplines.map((d, i) => {
              const IconeComposant = iconesDisciplines[d.icone] || Sparkles;
              return (
                <motion.div
                  key={d._id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    to="/disciplines"
                    className="group block overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
                  >
                    {/* Header — nom en vedette */}
                    <div className="relative flex h-28 items-center gap-4 overflow-hidden bg-gradient-to-br from-primary/15 via-primary/8 to-transparent px-5">
                      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/8 transition-all duration-500 group-hover:scale-125 group-hover:bg-primary/12" />
                      {/* Icone — secondaire */}
                      <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20 transition-all duration-300 group-hover:bg-primary/22 group-hover:ring-primary/40">
                        <IconeComposant size={22} className="text-primary" />
                      </div>
                      {/* Nom — héros */}
                      <h3 className="relative z-10 font-serif text-xl font-black leading-tight transition-colors group-hover:text-primary">
                        {d.nomCourt || d.nom}
                      </h3>
                    </div>

                    {/* Corps */}
                    <div className="p-5">
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {d.description}
                      </p>
                      {d.horaires && (
                        <p className="mt-2 text-xs font-medium text-primary/70">{d.horaires}</p>
                      )}
                      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        En savoir plus
                        <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/disciplines"
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-5 py-2.5 text-sm font-medium transition-all hover:border-primary/40 hover:bg-secondary"
            >
              Voir toutes les disciplines <ArrowRight size={14} />
            </Link>
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