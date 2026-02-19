import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Layout from "@/components/Layout";

const placeholderPhotos = [
  { id: 1, src: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=600&h=400&fit=crop", category: "Karaté", alt: "Entraînement karaté" },
  { id: 2, src: "https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=600&h=400&fit=crop", category: "Aïkido", alt: "Pratique aïkido" },
  { id: 3, src: "https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?w=600&h=400&fit=crop", category: "Tai Chi", alt: "Tai Chi en extérieur" },
  { id: 4, src: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=400&fit=crop", category: "Compétition", alt: "Compétition arts martiaux" },
  { id: 5, src: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop", category: "Qi Gong", alt: "Pratique Qi Gong" },
  { id: 6, src: "https://images.unsplash.com/photo-1509563268479-0f004cf3f58b?w=600&h=400&fit=crop", category: "Karaté", alt: "Kata" },
];

const categories = ["Toutes", ...new Set(placeholderPhotos.map((p) => p.category))];

const Galerie = () => {
  const [filter, setFilter] = useState("Toutes");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const filtered = filter === "Toutes" ? placeholderPhotos : placeholderPhotos.filter((p) => p.category === filter);

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

          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  filter === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((photo) => (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="group cursor-pointer overflow-hidden rounded-lg"
                onClick={() => setLightbox(photo.id)}
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  loading="lazy"
                  className="aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4"
            onClick={() => setLightbox(null)}
          >
            <button className="absolute right-4 top-4 text-foreground" onClick={() => setLightbox(null)}>
              <X size={32} />
            </button>
            <img
              src={placeholderPhotos.find((p) => p.id === lightbox)?.src?.replace("w=600&h=400", "w=1200&h=800")}
              alt=""
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Galerie;
