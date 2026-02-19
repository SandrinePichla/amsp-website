import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

const Contact = () => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success("Message envoyé ! Nous vous répondrons dans les meilleurs délais.");
  };

  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h1 className="mb-4 text-center font-serif text-4xl font-black md:text-5xl">
            <span className="text-primary">Contact</span>
          </h1>
          <p className="mx-auto mb-12 max-w-xl text-center text-muted-foreground">
            Une question ? N'hésitez pas à nous contacter.
          </p>

          <div className="grid gap-12 md:grid-cols-2">
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5 rounded-lg border border-border/50 bg-card p-8"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Nom *</Label>
                <Input id="name" required maxLength={100} placeholder="Votre nom" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required maxLength={255} placeholder="votre@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sujet">Sujet *</Label>
                <Input id="sujet" required maxLength={200} placeholder="Objet de votre message" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea id="message" required maxLength={1000} rows={5} placeholder="Votre message..." />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Envoyer
              </Button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="flex items-start gap-4">
                <MapPin size={24} className="mt-1 shrink-0 text-primary" />
                <div>
                  <h3 className="mb-1 font-serif font-bold">Adresse</h3>
                  <p className="text-sm text-muted-foreground">
                    Saint-Pierre<br />
                    (Adresse complète à renseigner)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail size={24} className="mt-1 shrink-0 text-primary" />
                <div>
                  <h3 className="mb-1 font-serif font-bold">Email</h3>
                  <p className="text-sm text-muted-foreground">contact@amsp.fr</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Clock size={24} className="mt-1 shrink-0 text-primary" />
                <div>
                  <h3 className="mb-1 font-serif font-bold">Horaires d'accueil</h3>
                  <p className="text-sm text-muted-foreground">
                    Lundi au Vendredi : 18h00 — 21h00<br />
                    Samedi : 9h00 — 12h30
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
