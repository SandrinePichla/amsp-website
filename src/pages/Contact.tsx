import { Helmet } from "react-helmet-async";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Mail, Clock, Phone, Paperclip, CheckCircle2 } from "lucide-react";
import { client } from "@/sanityClient";
import { supabase } from "@/supabaseClient";
import { sendBrevoEmail, TEMPLATES } from "@/lib/brevo";

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
  const [submitted, setSubmitted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitErrorList, setSubmitErrorList] = useState<string[]>([]);
  const submitErrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    client
      .fetch('*[_type == "parametres"][0]')
      .then((data) => setParametres(data));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));
    if (id === "from_email") setEmailError("");
    setSubmitErrorList([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFileError("");
    if (!f) { setFile(null); return; }
    if (f.size > 5 * 1024 * 1024) {
      setFileError("Fichier trop volumineux (5 Mo max).");
      setFile(null);
      e.target.value = "";
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Collecte toutes les erreurs en une seule passe
    const formErrorList: string[] = [];
    let newEmailError = "";

    if (!form.from_name.trim()) formErrorList.push("Le nom est obligatoire.");
    if (!form.from_email.trim()) {
      formErrorList.push("L'email est obligatoire.");
      newEmailError = "Champ obligatoire";
    } else if (!REGEX_EMAIL.test(form.from_email.trim())) {
      formErrorList.push("L'adresse email est invalide.");
      newEmailError = "Format invalide — ex : nom@domaine.fr";
    }
    if (!form.subject.trim()) formErrorList.push("Le sujet est obligatoire.");
    if (!form.message.trim()) formErrorList.push("Le message est obligatoire.");

    if (formErrorList.length > 0) {
      setSubmitErrorList(formErrorList);
      setEmailError(newEmailError);
      setTimeout(() => submitErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }

    setSubmitErrorList([]);
    setEmailError("");
    setSending(true);

    try {
      let message = form.message;

      if (file) {
        const ext = file.name.split(".").pop();
        const fileName = `contact/${Date.now()}-${form.from_name.replace(/\s+/g, "_").slice(0, 30)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("contact-attachments")
          .upload(fileName, file, { upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("contact-attachments")
          .getPublicUrl(fileName);
        message += `\n\n📎 Pièce jointe : ${urlData.publicUrl}`;
      }

      const adminEmail = parametres?.email || import.meta.env.VITE_BREVO_ADMIN_EMAIL;
      await sendBrevoEmail(TEMPLATES.CONTACT, { email: adminEmail, name: "AMSP" }, {
        from_name: form.from_name,
        from_email: form.from_email,
        subject: form.subject,
        message,
      });

      setForm({ from_name: "", from_email: "", subject: "", message: "" });
      setFile(null);
      setSubmitted(true);
    } catch (error) {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer ou nous contacter par email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>Contact — Club A.M.S.P. Saint-Pierre-la-Palud (69210)</title>
        <meta name="description" content="Contactez le club d'arts martiaux A.M.S.P. de Saint-Pierre-la-Palud (69210). Formulaire de contact, téléphone et plan d'accès." />
      </Helmet>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h1 className="mb-4 text-center font-serif text-4xl font-black md:text-5xl">
            <span className="text-primary">Contact</span>
          </h1>
          <p className="mx-auto mb-12 max-w-xl text-center text-muted-foreground">
            Une question ? N'hésitez pas à nous contacter.
          </p>

          <AnimatePresence mode="wait">
          {submitted && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-lg rounded-2xl border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-10 text-center space-y-5 shadow-sm"
            >
              <CheckCircle2 className="mx-auto text-green-500" size={64} />
              <div>
                <h2 className="font-serif text-2xl font-bold mb-2">Message envoyé !</h2>
                <p className="text-muted-foreground text-sm">
                  Nous avons bien reçu votre message et vous répondrons dans les meilleurs délais.
                </p>
              </div>
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Envoyer un autre message
              </Button>
            </motion.div>
          )}
          </AnimatePresence>

          {!submitted && <div className="grid gap-12 md:grid-cols-2">
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
                  onBlur={() => {
                    if (!form.from_email.trim()) { setEmailError("Champ obligatoire"); return; }
                    if (!REGEX_EMAIL.test(form.from_email.trim())) setEmailError("Format invalide — ex : nom@domaine.fr");
                    else setEmailError("");
                  }}
                  className={emailError ? "border-destructive" : ""}
                />
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
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
              <div className="space-y-2">
                <Label htmlFor="attachment" className="flex items-center gap-1.5">
                  <Paperclip size={14} className="text-muted-foreground" />
                  Pièce jointe
                  <span className="font-normal text-muted-foreground">(facultatif — PDF ou image, 5 Mo max)</span>
                </Label>
                <Input
                  id="attachment"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20"
                />
                {fileError && <p className="text-xs text-destructive">{fileError}</p>}
                {file && !fileError && (
                  <p className="text-xs text-muted-foreground">
                    {file.name} — {(file.size / 1024).toFixed(0)} Ko
                  </p>
                )}
              </div>

              {submitErrorList.length > 0 && (
                <div ref={submitErrorRef} className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                  <p className="mb-2 font-semibold">Veuillez corriger les points suivants avant d'envoyer :</p>
                  <ul className="list-disc list-inside space-y-1">
                    {submitErrorList.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

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
          </div>}
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
