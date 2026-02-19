import { useState } from "react";
import Layout from "@/components/Layout";
import { disciplines } from "@/data/disciplines";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const planningData = [
  { day: "Lundi", time: "19h00 - 20h30", discipline: "Viet Vo Dao", room: "Salle A" },
  { day: "Mardi", time: "18h30 - 20h00", discipline: "Karaté Shotokan", room: "Salle A" },
  { day: "Mardi", time: "20h00 - 21h30", discipline: "Aïkido", room: "Salle A" },
  { day: "Mercredi", time: "10h00 - 11h30", discipline: "Tai Chi Chuan", room: "Salle B" },
  { day: "Mercredi", time: "19h00 - 20h30", discipline: "Viet Vo Dao", room: "Salle A" },
  { day: "Jeudi", time: "18h30 - 20h00", discipline: "Karaté Shotokan", room: "Salle A" },
  { day: "Vendredi", time: "10h00 - 11h30", discipline: "Tai Chi Chuan", room: "Salle B" },
  { day: "Vendredi", time: "20h00 - 21h30", discipline: "Aïkido", room: "Salle A" },
  { day: "Samedi", time: "9h30 - 11h00", discipline: "Wutao — Qi Gong — Tai Chi Chuan", room: "Salle B" },
  { day: "Samedi", time: "11h00 - 12h30", discipline: "Épée", room: "Salle A" },
];

const Planning = () => {
  const [filter, setFilter] = useState("Toutes");

  const filtered =
    filter === "Toutes"
      ? planningData
      : planningData.filter((p) => p.discipline.includes(filter));

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

          {/* Filter */}
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {["Toutes", ...disciplines.map((d) => d.shortName)].map((d) => (
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

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/50">
                  <th className="px-4 py-3 text-left font-serif font-bold">Jour</th>
                  <th className="px-4 py-3 text-left font-serif font-bold">Horaire</th>
                  <th className="px-4 py-3 text-left font-serif font-bold">Discipline</th>
                  <th className="px-4 py-3 text-left font-serif font-bold">Salle</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => {
                  const courses = filtered.filter((p) => p.day === day);
                  if (courses.length === 0) return null;
                  return courses.map((c, i) => (
                    <tr
                      key={`${day}-${i}`}
                      className="border-b border-border/30 transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3 font-medium">{i === 0 ? day : ""}</td>
                      <td className="px-4 py-3 text-accent">{c.time}</td>
                      <td className="px-4 py-3">{c.discipline}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.room}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Planning;
