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

interface Tarif {
  _id: string;
  discipline: { nom: string };
  categorie: string;
  jours: string[];
  prixAnnuel: number;
  echeancier: string;
  ordre: number;
}

interface TarifSpecial {
  _id: string;
  titre: string;
  lignes: string[];
  ordre: number;
}

const Planning = () => {
  // ← TOUS les useState sont ICI, à l'intérieur du composant
  const [cours, setCours] = useState<Cours[]>([]);
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [tarifsSpeciaux, setTarifsSpeciaux] = useState<TarifSpecial[]>([]);
  const [filter, setFilter] = useState("Toutes");
  const [loading, setLoading] = useState(true);

  // ← TOUS les fetches sont dans UN SEUL useEffect
  useEffect(() => {
    client
      .fetch(`*[_type == "cours"] | order(jour asc, heureDebut asc) {
        _id, jour, heureDebut, heureFin, lieu, niveau, ages,
        discipline-> { nom, nomCourt }
      }`)
      .then((data) => {
        setCours(data);
        setLoading(false);
      });

    client
      .fetch(`*[_type == "tarif"] | order(ordre asc) {
        _id, categorie, jours, prixAnnuel, echeancier, ordre,
        discipline-> { nom }
      }`)
      .then((data) => setTarifs(data));

    client
      .fetch(`*[_type == "tarifSpecial"] | order(ordre asc)`)
      .then((data) => setTarifsSpeciaux(data));
  }, []);

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
              {/* Filtres */}
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

              {/* Tableau planning */}
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
                          <td className="px-4 py-3 font-medium">{i === 0 ? day : ""}</td>
                          <td className="px-4 py-3 text-accent">{c.heureDebut} - {c.heureFin}</td>
                          <td className="px-4 py-3">{c.discipline?.nom || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.lieu || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.niveau || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.ages?.join(', ') || "—"}</td>
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

              {/* Encart Tarifs */}
              {tarifs.length > 0 && (
                <div className="mt-16">
                  <h2 className="mb-8 text-center font-serif text-3xl font-bold">
                    <span className="text-primary">Tarifs</span> saison
                  </h2>
                  <div className="overflow-x-auto rounded-lg border border-border/50 mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-secondary/50">
                          <th className="px-4 py-3 text-left font-serif font-bold">Discipline</th>
                          <th className="px-4 py-3 text-left font-serif font-bold">Catégorie</th>
                          <th className="px-4 py-3 text-left font-serif font-bold">Jours</th>
                          <th className="px-4 py-3 text-left font-serif font-bold">Prix annuel</th>
                          <th className="px-4 py-3 text-left font-serif font-bold">Échéancier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tarifs.map((t) => (
                          <tr
                            key={t._id}
                            className="border-b border-border/30 transition-colors hover:bg-secondary/30"
                          >
                            <td className="px-4 py-3 font-medium">{t.discipline?.nom || '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{t.categorie || '—'}</td>
                            <td className="px-4 py-3 text-accent">{t.jours?.join(', ') || '—'}</td>
                            <td className="px-4 py-3 font-bold text-primary">{t.prixAnnuel ? `${t.prixAnnuel} €` : '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{t.echeancier || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Tarifs spéciaux */}
                  {tarifsSpeciaux.length > 0 && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
                      {tarifsSpeciaux.map((ts) => (
                        <div key={ts._id} className="mb-4 last:mb-0">
                          <h3 className="mb-2 font-serif font-bold text-primary">{ts.titre}</h3>
                          <ul className="space-y-1">
                            {ts.lignes?.map((ligne, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-0.5">→</span>
                                {ligne}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Planning;