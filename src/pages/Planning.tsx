import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { client } from "@/sanityClient";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

interface Cours {
  _id: string;
  jour: string;
  heureDebut: string;
  heureFin: string;
  lieu: string;
  niveau: string;
  ages: string[];
  discipline: {
    nom: string;
    nomCourt: string;
  };
}

const Planning = () => {
  const [cours, setCours] = useState<Cours[]>([]);
  const [filter, setFilter] = useState("Toutes");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .fetch(`*[_type == "cours"] | order(jour asc, heureDebut asc) {
        _id,
        jour,
        heureDebut,
        heureFin,
        lieu,
        niveau,
        ages,
        discipline-> {
          nom,
          nomCourt
        }
      }`)
      .then((data) => {
        setCours(data);
        setLoading(false);
      });
  }, []);

  // Liste unique des disciplines pour les filtres
  const disciplinesFiltres = [
    "Toutes",
    ...Array.from(new Set(
      cours
        .map((c) => c.discipline?.nomCourt || c.discipline?.nom)
        .filter(Boolean)
    ))
  ];

  const filtered =
    filter === "Toutes"
      ? cours
      : cours.filter((c) =>
          (c.discipline?.nomCourt || c.discipline?.nom) === filter
        );

  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h1 className="mb-4 text-center font-serif text-4xl font-black md:text-5xl">
            <span className="text-primary">Planning</span> des cours
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
            Retrouvez l'ensemble des horaires par discipline et par jour.
          </p>

          {loading ? (
            <p className="text-center text-muted-foreground">Chargement...</p>
          ) : (
            <>
              {/* Filtres — générés dynamiquement depuis Sanity */}
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

              {/* Tableau */}
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/50">
                      <th className="px-4 py-3 text-left font-serif font-bold">Jour</th>
                      <th className="px-4 py-3 text-left font-serif font-bold">Horaire</th>
                      <th className="px-4 py-3 text-left font-serif font-bold">Discipline</th>
                      <th className="px-4 py-3 text-left font-serif font-bold">Lieu</th>
                      <th className="px-4 py-3 text-left font-serif font-bold">Niveau</th>
                      <th className="px-4 py-3 text-left font-serif font-bold">Âges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day) => {
                      const coursJour = filtered.filter(
                        (c) => c.jour?.toLowerCase() === day.toLowerCase()
                      );
                      if (coursJour.length === 0) return null;

                      return coursJour.map((c, i) => (
                        <tr
                          key={c._id}
                          className="border-b border-border/30 transition-colors hover:bg-secondary/30"
                        >
                          <td className="px-4 py-3 font-medium">
                            {i === 0 ? day : ""}
                          </td>
                          <td className="px-4 py-3 text-accent">
                            {c.heureDebut} - {c.heureFin}
                          </td>
                          <td className="px-4 py-3">
                            {c.discipline?.nom || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {c.lieu || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {c.niveau || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {c.ages?.join(', ') || "—"}
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>

              {filtered.length === 0 && (
                <p className="mt-8 text-center text-muted-foreground">
                  Aucun cours pour cette discipline.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Planning;