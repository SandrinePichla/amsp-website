import { useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { disciplines } from "@/data/disciplines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const Inscription = () => {
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);

  const toggleDiscipline = (id: string) => {
    setSelectedDisciplines((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedDisciplines.length === 0) {
      toast.error("Veuillez sélectionner au moins une discipline.");
      return;
    }
    toast.success("Inscription envoyée avec succès ! Nous vous contacterons bientôt.");
  };

  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto max-w-2xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-4 text-center font-serif text-4xl font-black md:text-5xl">
              <span className="text-primary">Inscription</span> en ligne
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
              Remplissez le formulaire ci-dessous pour vous inscrire à l'A.M.S.P.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-border/50 bg-card p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input id="nom" required maxLength={100} placeholder="Votre nom" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input id="prenom" required maxLength={100} placeholder="Votre prénom" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required maxLength={255} placeholder="votre@email.com" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tel">Téléphone *</Label>
                  <Input id="tel" type="tel" required maxLength={20} placeholder="06 00 00 00 00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date de naissance *</Label>
                  <Input id="dob" type="date" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Discipline(s) souhaitée(s) *</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {disciplines.map((d) => (
                    <label
                      key={d.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-border/50 p-3 transition-colors hover:border-primary/40"
                    >
                      <Checkbox
                        checked={selectedDisciplines.includes(d.id)}
                        onCheckedChange={() => toggleDiscipline(d.id)}
                      />
                      <span className="text-sm">{d.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="niveau">Niveau</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez votre niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debutant">Débutant</SelectItem>
                    <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                    <SelectItem value="avance">Avancé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Envoyer mon inscription
              </Button>
            </form>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Inscription;
