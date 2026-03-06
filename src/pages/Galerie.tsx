import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { client } from "@/sanityClient";
import { urlFor } from "@/sanityImage";
import { useAuth } from "@/contexts/AuthContext";

interface Photo {
  _key: string;
  legende?: string;
  asset: { _ref: string };
}

interface Album {
  _id: string;
  titre?: string;
  date: string;
  prive: boolean;
  discipline?: { nom: string; nomCourt: string };
  photos: Photo[];
}

const Galerie = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [filter, setFilter] = useState("Toutes");
  const [lightbox, setLightbox] = useState<{ album: Album; index: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    client
      .fetch(`*[_type == "galerie" && publie == true] | order(date desc) {
        _id, titre, date, prive,
        discipline-> { nom, nomCourt },
        photos[] { _key, legende, asset }
      }`)
      .then((data) => {
        setAlbums(data);
        setLoading(false);
      });
  }, []);

  // Filtre selon connexion : visiteur ne voit que les albums publics
  const albumsVisibles = albums.filter((a) => !a.prive || user);

  // Disciplines pour les filtres
  const disciplinesFiltres = [
    "Toutes",
    ...Array.from(new Set(
      albumsVisibles
        .map((a) => a.discipline?.nomCourt || a.discipline?.nom)
        .filter(Boolean)
    ))
  ];

  const albumsFiltres = filter === "Toutes"
    ? albumsVisibles
    : albumsVisibles.filter((a) =>
        (a.discipline?.nomCourt || a.discipline?.nom) === filter
      );

  // Navigation lightbox
  const goNext = () => {
    if (!lightbox) return;
    const photos = lightbox.album.photos;
    const nextIndex = (lightbox.index + 1) % photos.length;
    setLightbox({ album: lightbox.album, index: nextIndex });
  };

  const goPrev = () => {
    if (!lightbox) return;
    const photos = lightbox.album.photos;
    const prevIndex = (lightbox.index - 1 + photos.length) % photos.length;
    setLightbox({ album: lightbox.album, index: prevIndex });
  };

  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h1 className="mb-4 text-center font-serif text-4xl font-black md:text-5xl">
            <span className="text-primary">Galerie</span> photos
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
            Retrouvez les moments forts de l'association en images.
          </p>

          {/* Bandeau espace membre si non connecté */}
          {!user && (
            <div className="mb-8 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-primary" />
                <p className="text-sm text-muted-foreground">
                  Certains albums sont réservés aux membres connectés.
                </p>
              </div>
              <Link
                to="/connexion"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Se connecter
              </Link>
            </div>
          )}

          {loading ? (
            <p className="text-center text-muted-foreground">Chargement...</p>
          ) : (
            <>
              {/* Filtres par discipline */}
              {disciplinesFiltres.length > 1 && (
                <div className="mb-8 flex flex-wrap justify-center gap-2">
                  {disciplinesFiltres.map((d) => (
                    <button
                      key={d}
                      onClick={() => setFilter(d)}
                      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        filter === d
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* Grille d'albums */}
              {albumsFiltres.length === 0 ? (
                <p className="text-center text-muted-foreground">Aucun album disponible.</p>
              ) : (
                <div className="space-y-12">
                  {albumsFiltres.map((album) => (
                    <div key={album._id}>
                      {/* En-tête album */}
                      <div className="mb-4 flex items-center gap-3">
                        <h2 className="font-serif text-xl font-bold">
                          {album.titre || album.discipline?.nom || 'Album photos'}
                        </h2>
                        {album.prive && (
                          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            <Lock size={10} /> Membres
                          </span>
                        )}
                        {album.date && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(album.date).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                          </span>
                        )}
                        {album.discipline && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                            {album.discipline.nomCourt || album.discipline.nom}
                          </span>
                        )}
                      </div>

                      {/* Photos de l'album */}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {album.photos?.map((photo, index) => (
                          <motion.div
                            key={photo._key}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="group cursor-pointer overflow-hidden rounded-lg"
                            onClick={() => setLightbox({ album, index })}
                          >
                            <img
                              src={urlFor(photo).width(400).height(300).fit('crop').url()}
                              alt={photo.legende || album.titre}
                              loading="lazy"
                              className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute right-4 top-4 rounded-full bg-secondary p-2 text-foreground hover:bg-secondary/80"
              onClick={() => setLightbox(null)}
            >
              <X size={24} />
            </button>

            {/* Navigation précédent */}
            {lightbox.album.photos.length > 1 && (
              <button
                className="absolute left-4 rounded-full bg-secondary px-4 py-2 text-foreground hover:bg-secondary/80"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
              >
                ←
              </button>
            )}

            <img
              src={urlFor(lightbox.album.photos[lightbox.index]).width(1200).url()}
              alt={lightbox.album.photos[lightbox.index]?.legende || ""}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Navigation suivant */}
            {lightbox.album.photos.length > 1 && (
              <button
                className="absolute right-4 rounded-full bg-secondary px-4 py-2 text-foreground hover:bg-secondary/80"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
              >
                →
              </button>
            )}

            {/* Légende + compteur */}
            <div className="absolute bottom-4 text-center">
              {lightbox.album.photos[lightbox.index]?.legende && (
                <p className="text-sm text-foreground">{lightbox.album.photos[lightbox.index].legende}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {lightbox.index + 1} / {lightbox.album.photos.length}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Galerie;