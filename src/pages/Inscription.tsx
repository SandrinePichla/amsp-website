import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import emailjs from "@emailjs/browser";
import { Download, Loader2 } from "lucide-react";
import { client } from "@/sanityClient";
import {
  buildColorMap,
  PrintableCalendar, PrintableTarifs,
} from "@/components/PrintablePlanning";
import { supabase } from "@/supabaseClient";
import type { Cours, Tarif, TarifSpecial } from "@/components/PrintablePlanning";

const SERVICE_ID = "service_hvx0rnw";
const TEMPLATE_ID = "template_sbgtitc";
const PUBLIC_KEY = "r044e90XA84E6Ua5B";

interface Discipline {
  _id: string;
  nom: string;
  nomCourt?: string;
}

interface InscriptionData {
  saison?: string;
  reglementInterieur?: string;
  titreInfosPaiement?: string;
  infosPaiement?: string;
  texteAutorisationImage?: string;
  texteAutorisationParentale?: string;
  texteInfosCertificatMedical?: string;
}

const REGLEMENT_DEFAULT = `LES PRATIQUANTS DOIVENT :
- Assister régulièrement aux cours et arriver à l'heure (5 min avant le cours)
- Garder toujours une tenue et une attitude correcte : courtoisie, politesse, respect
- LA VIOLENCE, LA VULGARITÉ, LES COMPORTEMENTS DANGEREUX NE SERONT PAS TOLÉRÉS
- Respecter les lieux et le matériel mis à disposition
- Prévenir la Présidente ou l'instructeur en cas d'absence
- Aucune annulation d'adhésion n'est possible à partir du moment où celle-ci est souscrite

KARATÉ spécifiquement :
- Être en tenue : KEIGOGI blanc et sa ceinture
- Avoir les ongles des mains et des pieds coupés
- Ne pas mâcher de chewing-gum pendant le cours
- Bannir tout objet blessant : chaîne, bague, boucles d'oreilles pendantes, montre
- Des chaussons d'intérieur seront obligatoires pour se rendre au DOJO

L'INSTRUCTEUR DOIT :
- Transmettre ses connaissances techniques et les valeurs propres aux arts martiaux
- Se réserve le droit d'isoler ou d'expulser toute personne pouvant perturber les cours
- Prodiguer les premiers soins en cas de blessure
- Les instructeurs étant bénévoles, ils peuvent être dans l'impossibilité de faire les cours et doivent prévenir les adhérents de leur absence`;

const Inscription = () => {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [inscriptionData, setInscriptionData] = useState<InscriptionData>({});
  const [cours, setCours] = useState<Cours[]>([]);
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [tarifsSpeciaux, setTarifsSpeciaux] = useState<TarifSpecial[]>([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [reglementAccepte, setReglementAccepte] = useState(false);
  const [droitImage, setDroitImage] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloadingPlanning, setDownloadingPlanning] = useState(false);
  const [downloadingTarifs, setDownloadingTarifs] = useState(false);
  const planningRef = useRef<HTMLDivElement>(null);
  const tarifsRef = useRef<HTMLDivElement>(null);
  const [autorisationParentale, setAutorisationParentale] = useState(false);
  const [form, setForm] = useState({
    nom: "", prenom: "", adresse: "",
    telFixe: "", telMobile: "", email: "",
    dateNaissance: "", groupeSanguin: "", allergie: "",
    niveau: "", urgenceContact: "",
  });

  useEffect(() => {
    client.fetch(`*[_type == "discipline"] | order(ordre asc) { _id, nom, nomCourt }`).then(setDisciplines);
    client.fetch(`*[_type == "inscription"][0] { saison, reglementInterieur, titreInfosPaiement, infosPaiement, texteAutorisationImage, texteAutorisationParentale, texteInfosCertificatMedical }`).then((d) => { if (d) setInscriptionData(d); });
    client.fetch(`*[_type == "cours"] | order(jour asc, heureDebut asc) { _id, jour, heureDebut, heureFin, lieu, niveau, ages, discipline-> { nom, nomCourt } }`).then(setCours);
    client.fetch(`*[_type == "tarif"] | order(ordre asc) { _id, categorie, jours, prixAnnuel, echeancier, ordre, discipline-> { nom } }`).then(setTarifs);
    client.fetch(`*[_type == "tarifSpecial"] | order(ordre asc)`).then(setTarifsSpeciaux);
  }, []);

  const colorMap = useMemo(() => buildColorMap(cours), [cours]);

  const handleDownloadPlanning = async () => {
    if (!planningRef.current) return;
    setDownloadingPlanning(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = planningRef.current;
      const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false, width: el.scrollWidth, height: el.scrollHeight, windowWidth: el.scrollWidth, windowHeight: el.scrollHeight });
      const link = document.createElement("a");
      link.download = "planning-amsp.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally { setDownloadingPlanning(false); }
  };

  const handleDownloadTarifs = async () => {
    if (!tarifsRef.current) return;
    setDownloadingTarifs(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = tarifsRef.current;
      const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false, width: 900, height: el.scrollHeight, windowWidth: 900, windowHeight: el.scrollHeight });
      const link = document.createElement("a");
      link.download = "tarifs-amsp.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally { setDownloadingTarifs(false); }
  };

  const saison = inscriptionData.saison || "2025-2026";
  const reglement = inscriptionData.reglementInterieur || REGLEMENT_DEFAULT;
  const titreInfosPaiement = inscriptionData.titreInfosPaiement || "Règlement des cotisations";
  const infosPaiement = inscriptionData.infosPaiement || "Modalités de paiement à définir. Chèques à l'ordre des Arts Martiaux St Pierrois.";
  const texteAutorisationImage = inscriptionData.texteAutorisationImage || "J'autorise l'association Arts Martiaux St Pierrois à utiliser mon image ou celle de mes enfants pour les besoins du club (articles, internet...)";
  const texteAutorisationParentale = inscriptionData.texteAutorisationParentale || "Je soussigné(e) autorise mon enfant à pratiquer les arts martiaux dans le cadre de l'Association Les Arts Martiaux St Pierrois (entraînements, compétitions, démonstrations).\n\nJ'autorise le professeur et les dirigeants à prendre, en cas de nécessité, les mesures qui s'imposent concernant le transport à l'hôpital.\n\nJe dégage de toute responsabilité les personnes qui prendront mon enfant en charge dans leur véhicule lors des déplacements.\n\nJ'autorise mon enfant à suivre les entraînements destinés à manipuler les armes en bois et les armes articulées (l'autorisation parentale est obligatoire suite à un texte de loi sur « l'incitation des mineurs à la violence »).";
  const texteInfosCertificatMedical = inscriptionData.texteInfosCertificatMedical || "Le certificat médical n'est plus obligatoire — une attestation sur l'honneur sera à remplir.";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const toggleDiscipline = (id: string) => {
    setSelectedDisciplines((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (selectedDisciplines.length === 0) {
    toast.error("Veuillez sélectionner au moins une discipline.");
    return;
  }
  if (!reglementAccepte) {
    toast.error("Veuillez accepter le règlement intérieur.");
    return;
  }

  setSending(true);

  const disciplinesChoisies = selectedDisciplines
    .map((id) => disciplines.find((d) => d._id === id)?.nom)
    .filter(Boolean)
    .join(", ");

  try {
    // 1 — Enregistrement dans Supabase
    const { error } = await supabase.from("inscriptions").insert({
      nom: form.nom,
      prenom: form.prenom,
      adresse: form.adresse,
      date_naissance: form.dateNaissance || null,
      groupe_sanguin: form.groupeSanguin || null,
      allergie: form.allergie || null,
      tel_fixe: form.telFixe || null,
      tel_mobile: form.telMobile,
      email: form.email,
      urgence_contact: form.urgenceContact,
      disciplines: disciplinesChoisies,
      niveau: form.niveau || null,
      autorisation_parentale: autorisationParentale,
      droit_image: droitImage,
      saison,
      statut: "en_attente",
    });

    if (error) throw error;

    // 2 — Envoi email via EmailJS
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      nom: form.nom,
      prenom: form.prenom,
      adresse: form.adresse,
      tel_fixe: form.telFixe,
      tel_mobile: form.telMobile,
      email: form.email,
      date_naissance: form.dateNaissance,
      groupe_sanguin: form.groupeSanguin,
      allergie: form.allergie || "Aucune",
      niveau: form.niveau || "Non précisé",
      urgence_contact: form.urgenceContact,
      disciplines: disciplinesChoisies,
      autorisation_parentale: autorisationParentale ? "Oui" : "Non / Non concerné",
      droit_image: droitImage ? "Oui" : "Non",
    }, PUBLIC_KEY);

    toast.success("Inscription envoyée ! Nous vous contacterons bientôt.");
    setForm({
      nom: "", prenom: "", adresse: "",
      telFixe: "", telMobile: "", email: "",
      dateNaissance: "", groupeSanguin: "", allergie: "",
      niveau: "", urgenceContact: "",
    });
    setSelectedDisciplines([]);
    setReglementAccepte(false);
    setDroitImage(false);

  } catch (err) {
    console.error(err);
    toast.error("Erreur lors de l'envoi. Veuillez réessayer ou nous contacter par email.");
  } finally {
    setSending(false);
  }
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

            <form onSubmit={handleSubmit} className="space-y-8 rounded-lg border border-border/50 bg-card p-8">

              {/* Identité */}
              <div>
                <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Identité</h2>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom *</Label>
                      <Input id="nom" required maxLength={100} placeholder="Votre nom" value={form.nom} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prenom">Prénom *</Label>
                      <Input id="prenom" required maxLength={100} placeholder="Votre prénom" value={form.prenom} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adresse">Adresse *</Label>
                    <Input id="adresse" required maxLength={255} placeholder="Votre adresse complète" value={form.adresse} onChange={handleChange} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dateNaissance">Date de naissance *</Label>
                      <Input id="dateNaissance" type="date" required value={form.dateNaissance} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="groupeSanguin">Groupe sanguin</Label>
                      <Input id="groupeSanguin" maxLength={5} placeholder="Ex: A+" value={form.groupeSanguin} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allergie">Allergie(s)</Label>
                    <Input id="allergie" maxLength={255} placeholder="Précisez si nécessaire" value={form.allergie} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* Coordonnées */}
              <div>
                <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Coordonnées</h2>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="telFixe">Téléphone fixe</Label>
                      <Input id="telFixe" type="tel" maxLength={20} placeholder="04 00 00 00 00" value={form.telFixe} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telMobile">Téléphone mobile *</Label>
                      <Input id="telMobile" type="tel" required maxLength={20} placeholder="06 00 00 00 00" value={form.telMobile} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" required maxLength={255} placeholder="votre@email.com" value={form.email} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="urgenceContact">Personne à contacter en cas d'urgence *</Label>
                    <Input id="urgenceContact" required maxLength={255} placeholder="Nom, prénom et téléphone" value={form.urgenceContact} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* Discipline(s) */}
              <div>
                <div className="mb-4 flex items-center justify-between border-b border-border/50 pb-2">
                  <h2 className="font-serif text-lg font-bold">Discipline(s) souhaitée(s) *</h2>
                  <button type="button" onClick={handleDownloadPlanning} disabled={downloadingPlanning} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50">
                    {downloadingPlanning ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Voir planning
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {disciplines.map((d) => (
                    <label
                      key={d._id}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-border/50 p-3 transition-colors hover:border-primary/40"
                    >
                      <Checkbox
                        checked={selectedDisciplines.includes(d._id)}
                        onCheckedChange={() => toggleDiscipline(d._id)}
                      />
                      <span className="text-sm">{d.nom}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Niveau */}
              <div>
                <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Niveau</h2>
                <div className="space-y-2">
                  <Label htmlFor="niveau">Votre niveau actuel</Label>
                  <Input id="niveau" maxLength={100} placeholder="Ex: Débutant, ceinture jaune..." value={form.niveau} onChange={handleChange} />
                </div>
              </div>

              {/* Règlement intérieur */}
              <div>
                <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Règlement intérieur</h2>
                <div className="mb-4 max-h-48 overflow-y-auto rounded-md border border-border/50 bg-secondary/30 p-4 text-xs text-muted-foreground whitespace-pre-line">
                  {reglement}
                </div>
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={reglementAccepte}
                    onCheckedChange={(v) => setReglementAccepte(v as boolean)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    Je reconnais avoir lu et j'accepte le règlement intérieur de l'association *
                  </span>
                </label>
              </div>

              {/* Autorisation parentale */}
              <div>
                <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">
                  Autorisation parentale <span className="text-sm font-normal text-muted-foreground">(pour les mineurs uniquement)</span>
                </h2>
                <div className="mb-4 rounded-md border border-border/50 bg-secondary/30 p-4 text-xs text-muted-foreground whitespace-pre-line">
                  {texteAutorisationParentale}
                </div>
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={autorisationParentale}
                    onCheckedChange={(v) => setAutorisationParentale(v as boolean)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    Je soussigné(e) accepte les termes de l'autorisation parentale ci-dessus
                  </span>
                </label>
              </div>

              {/* Droit à l'image */}
              <div>
                <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Droit à l'image</h2>
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={droitImage}
                    onCheckedChange={(v) => setDroitImage(v as boolean)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">{texteAutorisationImage}</span>
                </label>
                <p className="mt-3 text-xs text-muted-foreground italic">{texteInfosCertificatMedical}</p>
              </div>

              {/* Infos paiement */}
              <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-medium text-foreground">{titreInfosPaiement}</p>
                  <button type="button" onClick={handleDownloadTarifs} disabled={downloadingTarifs} className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50">
                    {downloadingTarifs ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Voir tarifs
                  </button>
                </div>
                <p>{infosPaiement}</p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={sending}>
                {sending ? "Envoi en cours..." : "Envoyer mon inscription"}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Composants hors-écran pour html2canvas */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none" }}>
        <div ref={planningRef}>
          <PrintableCalendar cours={cours} colorMap={colorMap} />
        </div>
        <div ref={tarifsRef}>
          <PrintableTarifs tarifs={tarifs} tarifsSpeciaux={tarifsSpeciaux} colorMap={colorMap} />
        </div>
      </div>
    </Layout>
  );
};

export default Inscription;
