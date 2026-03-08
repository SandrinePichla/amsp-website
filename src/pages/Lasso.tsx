import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, GraduationCap, Users, Star, Shield, Handshake, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import { client } from "@/sanityClient";
import { urlFor } from "@/sanityImage";

const icones: Record<string, React.ElementType> = {
  Heart,
  GraduationCap,
  Users,
  Star,
  Shield,
  Handshake,
  Sparkles,
};

interface Valeur {
  _key: string;
  titre: string;
  description: string;
  icone: string;
}

interface AssoData {
  titre?: string;
  sousTitre?: string;
  description?: string;
  anneesExistence?: number;
  nbAdherents?: string;
  valeurs?: Valeur[];
  publicsCibles?: string[];
  image?: { asset: { _ref: string } };
}

const Lasso = () => {
  const [data, setData] = useState<AssoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .fetch(`*[_type == "asso"][0] {
        titre, sousTitre, description,
        anneesExistence, nbAdherents,
        valeurs[] { _key, titre, description, icone },
        publicsCibles,
        image
      }`)
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  // Valeurs par défaut si Sanity est vide
  const valeurs: Valeur[] = data?.valeurs?.length
    ? data.valeurs
    : [
        { _key: "1", titre: "Bienveillance", description: "Transmettre nos connaissances dans le respect et la bienveillance.", icone: "Heart" },
        { _key: "2", titre: "Transmission", description: "Partager l'art martial de génération en génération.", icone: "GraduationCap" },
        { _key: "3", titre: "Club familial", description: "Une grande famille ouverte à tous, du débutant à l'expert.", icone: "Users" },
        { _key: "4", titre: "Bénévolat", description: "Un club basé sur l'engagement et la passion de ses membres.", icone: "Handshake" },
      ];

  const publicsCibles: string[] = data?.publicsCibles?.length
    ? data.publicsCibles
    : [
        "Débutants",
        "Pratiquants intermédiaires",
        "Experts / Professionnels",
        "Parents d'enfants pratiquants",
        "Grand public intéressé par les arts martiaux",
      ];

  const anneesExistence = data?.anneesExistence ?? 40;
  const nbAdherents = data?.nbAdherents ?? "40 à 70";
  const titre = data?.titre ?? "L'Association";
  const sousTitre = data?.sousTitre ?? "Un club familial ouvert à tous depuis plus de 40 ans";
  const description = data?.description ?? "L'A.M.S.P est une association d'arts martiaux fondée sur le bénévolat et la passion. Notre mission : transmettre nos connaissances dans le respect et la bienveillance, dans un cadre familial et accueillant.";

  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto px-4">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary/60">
              Qui sommes-nous
            </p>
            <h1 className="mb-4 font-serif text-4xl font-black md:text-5xl">
              <span className="text-primary">{titre}</span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground">
              {sousTitre}
            </p>
          </motion.div>

          {/* Chiffres clés */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 grid grid-cols-2 gap-4 sm:grid-cols-2 max-w-lg mx-auto"
          >
            <div className="rounded-2xl border border-border/40 bg-card p-6 text-center">
              <p className="font-serif text-5xl font-black text-primary">{anneesExistence}</p>
              <p className="mt-1 text-sm text-muted-foreground">ans d'existence</p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-card p-6 text-center">
              <p className="font-serif text-5xl font-black text-primary">{nbAdherents}</p>
              <p className="mt-1 text-sm text-muted-foreground">adhérents</p>
            </div>
          </motion.div>

          {/* Image + description */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-16 overflow-hidden rounded-2xl border border-border/40 bg-card"
            >
              <div className="flex flex-col md:flex-row">
                {data?.image && (
                  <div className="shrink-0 md:w-2/5">
                    <img
                      src={urlFor(data.image).width(600).height(420).fit("crop").url()}
                      alt="L'association AMSP"
                      className="h-60 md:h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-col justify-center p-6 md:p-10">
                  <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-line">
                    {description}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Valeurs */}
          <div className="mb-16">
            <div className="mb-8 text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary/60">Ce qui nous anime</p>
              <h2 className="font-serif text-2xl font-bold md:text-3xl">
                Nos <span className="text-primary">valeurs</span>
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {valeurs.map((v, i) => {
                const Icone = icones[v.icone] || Sparkles;
                return (
                  <motion.div
                    key={v._key}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-xl border border-border/40 bg-card p-5"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Icone size={20} className="text-primary" />
                    </div>
                    <h3 className="mb-1.5 font-serif text-base font-bold">{v.titre}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Publics */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl rounded-2xl border border-border/40 bg-card p-8 text-center"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary/60">Ouvert à</p>
            <h2 className="mb-6 font-serif text-2xl font-bold">
              Le club est fait pour <span className="text-primary">vous</span>
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {publicsCibles.map((p) => (
                <span
                  key={p}
                  className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary"
                >
                  {p}
                </span>
              ))}
            </div>
          </motion.div>

        </div>
      </section>
    </Layout>
  );
};

export default Lasso;
