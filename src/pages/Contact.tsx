import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Mail, Clock, Phone } from "lucide-react";
import { toast } from "sonner";
import emailjs from "@emailjs/browser";
import { client } from "@/sanityClient";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_NOTIFICATION;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

interface Parametres {
  adresse: string;
  email: string;
  telephone: string;
  horairesAccueil: string[];
}

const Contact = () => {
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [form, setForm] = useState({
    from_name: "",
    from_email: "",
    subject: "",
    message: ""
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    client
      .fetch('*[_type == "parametres"][0]')
      .then((data) => setParametres(data));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);

    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
        from_name: form.from_name,
        from_email: form.from_email,
        subject: form.subject,
        message: form.message,
      }, PUBLIC_KEY);

      toast.success("Message envoyé ! Nous vous répondrons dans les meilleurs délais.");
      setForm({ from_name: "", from_email: "", subject: "", message: "" });
    } catch (error) {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer ou nous contacter par email.");
    } finally {
      setSending(false);
    }
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
            {/* Formulaire */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5 rounded-lg border border-border/50 bg-card p-8"
            >
              <div className="space-y-2">
                <Label htmlFor="from_name">Nom *</Label>
                <Input
                  id="from_name"
                  required
                  maxLength={100}
                  placeholder="Votre nom"
                  value={form.from_name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from_email">Email *</Label>
                <Input
                  id="from_email"
                  type="email"
                  required
                  maxLength={255}
                  placeholder="votre@email.com"
                  value={form.from_email}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Sujet *</Label>
                <Input
                  id="subject"
                  required
                  maxLength={200}
                  placeholder="Objet de votre message"
                  value={form.subject}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  required
                  maxLength={1000}
                  rows={5}
                  placeholder="Votre message..."
                  value={form.message}
                  onChange={handleChange}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={sending}>
                {sending ? "Envoi en cours..." : "Envoyer"}
              </Button>
            </motion.form>

            {/* Infos de contact */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {parametres?.adresse && (
                <div className="flex items-start gap-4">
                  <MapPin size={24} className="mt-1 shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-serif font-bold">Adresse</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {parametres.adresse}
                    </p>
                  </div>
                </div>
              )}

              {parametres?.email && (
                <div className="flex items-start gap-4">
                  <Mail size={24} className="mt-1 shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-serif font-bold">Email</h3>
                    
                      <a href={`mailto:${parametres.email}`}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {parametres.email}
                    </a>
                  </div>
                </div>
              )}

              {parametres?.telephone && (
                <div className="flex items-start gap-4">
                  <Phone size={24} className="mt-1 shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-serif font-bold">Téléphone</h3>
                    
                     <a href={`tel:${parametres.telephone}`}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {parametres.telephone}
                    </a>
                  </div>
                </div>
              )}

              {parametres?.horairesAccueil?.length > 0 && (
                <div className="flex items-start gap-4">
                  <Clock size={24} className="mt-1 shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-serif font-bold">Horaires d'accueil</h3>
                    <ul className="space-y-1">
                      {parametres.horairesAccueil.map((h, i) => (
                        <li key={i} className="text-sm text-muted-foreground">{h}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;