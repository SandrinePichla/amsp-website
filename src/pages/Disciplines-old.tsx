import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { disciplines } from "@/data/disciplines";

const Disciplines = () => (
  <Layout>
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h1 className="mb-4 text-center font-serif text-4xl font-black md:text-5xl">
          Nos <span className="text-primary">Disciplines</span>
        </h1>
        <p className="mx-auto mb-16 max-w-2xl text-center text-muted-foreground">
          Découvrez les 6 disciplines enseignées au sein de l'Association d'Arts Martiaux St Pierrois.
        </p>

        <div className="space-y-16">
          {disciplines.map((d, i) => (
            <motion.article
              key={d.id}
              id={d.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="scroll-mt-24 rounded-lg border border-border/50 bg-card p-8"
            >
              <div className="flex items-start gap-4">
                <d.icon size={40} className="mt-1 shrink-0 text-primary" />
                <div>
                  <h2 className="mb-3 font-serif text-2xl font-bold">{d.name}</h2>
                  <p className="mb-4 text-muted-foreground">{d.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="rounded bg-secondary px-3 py-1 text-foreground">
                      📅 {d.schedule}
                    </span>
                    <span className="rounded bg-secondary px-3 py-1 text-foreground">
                      👤 {d.teacher}
                    </span>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default Disciplines;
