import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Images, ArrowLeft } from "lucide-react";
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
  const [openAlbum, setOpenAlbum] = useState<Album | null>(null);
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

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {disciplinesFiltres.length > 1 && (
                <div className="mb-8 flex flex-wrap justify-center gap-2">
                  {disciplinesFiltres.map((d) => (
                    <button
                      key={d}
                      onClick={() => setFilter(d)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        filter === d
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {albumsFiltres.map((album, i) => {
                    const cover = album.photos?.[0];
                    const label = album.titre || album.discipline?.nomCourt || album.discipline?.nom || 'Album';
                    return (
                      <motion.button
                        key={album._id}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => setOpenAlbum(album)}
                        className="group relative w-full overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 text-left"
                      >
                        <div className="relative aspect-square overflow-hidden">
                          {cover ? (
                            <img
                              src={urlFor(cover).width(300).height(300).fit('crop').url()}
                              alt={label}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-secondary/50">
                              <Images size={32} className="text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                          {album.prive && (
                            <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                              <Lock size={9} /> Membres
                            </span>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 p-2.5">
                            <p className="font-serif text-xs font-bold leading-tight text-white line-clamp-2">{label}</p>
                            <div className="mt-0.5 flex items-center justify-between">
                              {album.date && (
                                <p className="text-[10px] text-white/60">
                                  {new Date(album.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                                </p>
                              )}
                              <p className="text-[10px] text-white/60">{album.photos?.length} photos</p>
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Modale album */}
      <AnimatePresence>
        {openAlbum && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col bg-background"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-serif text-base font-bold leading-tight truncate">
                  {openAlbum.titre || openAlbum.discipline?.nom || 'Album'}
                </p>
                {openAlbum.date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(openAlbum.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' · '}{openAlbum.photos?.length} photos
                  </p>
                )}
              </div>
              <button
                onClick={() => setOpenAlbum(null)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X size={16} />
                Fermer
              </button>
            </div>

            {/* Photos */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="columns-4 sm:columns-6 md:columns-8 lg:columns-10 xl:columns-12 gap-1.5">
                {openAlbum.photos?.map((photo, index) => (
                  <div
                    key={photo._key}
                    className="group cursor-pointer overflow-hidden rounded-md break-inside-avoid mb-1.5"
                    onClick={() => setLightbox({ album: openAlbum, index })}
                  >
                    <img
                      src={urlFor(photo).width(160).url()}
                      alt={photo.legende || ''}
                      loading="lazy"
                      className="w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
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
