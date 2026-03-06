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
  albumId: string;
  albumIndex: number;
}

interface Album {
  _id: string;
  titre?: string;
  date: string;
  prive: boolean;
  discipline?: { nom: string; nomCourt: string };
  photos: Omit<Photo, 'albumId' | 'albumIndex'>[];
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

  const albumsVisibles = albums.filter((a) => !a.prive || user);

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

  const goNext = () => {
    if (!lightbox) return;
    const photos = lightbox.album.photos;
    setLightbox({ album: lightbox.album, index: (lightbox.index + 1) % photos.length });
  };

  const goPrev = () => {
    if (!lightbox) return;
    const photos = lightbox.album.photos;
    setLightbox({ album: lightbox.album, index: (lightbox.index - 1 + photos.length) % photos.length });
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

 {albumsFiltres.length === 0 ? (
  <p className="text-center text-muted-foreground">Aucun album disponible.</p>
) : (
  <div>
    {albumsFiltres.map((album) => (
      <div key={album._id} className="mb-10">
        {/* Séparateur fin */}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="h-px flex-1 bg-border/50" />
          <h2 className="font-serif text-sm font-bold text-muted-foreground uppercase tracking-wider">
            {album.titre || album.discipline?.nom || 'Album photos'}
          </h2>
          {album.date && (
            <span className="text-xs text-muted-foreground">
              {new Date(album.date).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </span>
          )}
          {album.prive && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              <Lock size={10} /> Membres
            </span>
          )}
          <div className="h-px flex-1 bg-border/50" />
        </div>

        {/* Photos en colonnes maçonnerie */}
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
          {album.photos?.map((photo, index) => (
            <motion.div
              key={photo._key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="group cursor-pointer overflow-hidden rounded-lg break-inside-avoid mb-3"
              onClick={() => setLightbox({ album, index })}
            >
              <img
                src={urlFor(photo).width(400).url()}
                alt={photo.legende || album.titre || ''}
                loading="lazy"
                className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
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

            {lightbox.album.photos.length > 1 && (
              <button
                className="absolute right-4 rounded-full bg-secondary px-4 py-2 text-foreground hover:bg-secondary/80"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
              >
                →
              </button>
            )}

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