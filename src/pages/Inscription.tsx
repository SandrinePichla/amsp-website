import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Download, Loader2, CheckCircle2 } from "lucide-react";
import { client } from "@/sanityClient";
import {
  buildColorMap,
  PrintableCalendar, PrintableTarifs,
} from "@/components/PrintablePlanning";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import type { Cours, Tarif, TarifSpecial } from "@/components/PrintablePlanning";

import { sendBrevoEmail, TEMPLATES } from "@/lib/brevo";

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

interface RecapData {
  nom: string;
  prenom: string;
  adresse: string;
  telMobile: string;
  email: string;
  dateNaissance: string;
  groupeSanguin: string;
  allergie: string;
  niveau: string;
  urgenceContact: string;
  urgenceTel: string;
  disciplines: string;
  saison: string;
  typeInscription: 'adulte' | 'mineur';
  passSport: boolean;
  moyenPaiement: string;
  droitImage: boolean;
  autorisationParentale: boolean;
  parent1: { nom: string; prenom: string; email: string; tel: string };
  parent2: { nom: string; prenom: string; email: string; tel: string };
  dateEnvoi: string;
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

const MOYEN_PAIEMENT_LABELS: Record<string, string> = {
  cheque_1x: 'Chèque — en 1 fois',
  cheque_4x: 'Chèque — en 4 fois',
  especes: 'Espèces',
  virement: 'Virement bancaire (en une seule fois)',
};

const formVariants = {
  enter: (dir: number) => ({ x: dir * 80, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
  exit: (dir: number) => ({ x: dir * -80, opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }),
};

/* ------------------------------------------------------------------ */
/* Composant hors-écran pour le récapitulatif téléchargeable           */
/* ------------------------------------------------------------------ */
const Section = ({ title }: { title: string }) => (
  <div style={{ margin: '22px 0 8px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: '#b91c1c', letterSpacing: 0.8, borderBottom: '1px solid #f0d0d0', paddingBottom: 4 }}>
    {title}
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', gap: 12, marginBottom: 5, fontSize: 13 }}>
    <span style={{ width: 180, flexShrink: 0, color: '#666' }}>{label}</span>
    <span style={{ fontWeight: 500 }}>{value}</span>
  </div>
);

const PrintableInscription = ({ data }: { data: RecapData }) => {
  const hasParent2 = data.parent2.nom.trim() || data.parent2.prenom.trim();
  return (
    <div
      style={{
        fontFamily: 'Georgia, serif',
        background: '#fff',
        color: '#111',
        padding: '44px 52px',
        width: '760px',
        lineHeight: 1.6,
      }}
    >
      {/* En-tête */}
      <div style={{ borderBottom: '3px solid #b91c1c', paddingBottom: 14, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#b91c1c', letterSpacing: 1 }}>
            AMSP — Arts Martiaux Saint-Pierrois
          </div>
          <div style={{ fontSize: 14, color: '#555', marginTop: 3 }}>
            Récapitulatif d'inscription — Saison {data.saison}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#888', textAlign: 'right' }}>
          Envoyé le {data.dateEnvoi}<br />
          {data.typeInscription === 'mineur' ? 'Inscription mineur' : 'Inscription adulte'}
        </div>
      </div>

      {/* Identité */}
      <Section title="Identité" />
      <Row label="Nom et prénom" value={`${data.prenom} ${data.nom}`} />
      <Row label="Date de naissance" value={data.dateNaissance ? new Date(data.dateNaissance).toLocaleDateString('fr-FR') : '—'} />
      {data.groupeSanguin && <Row label="Groupe sanguin" value={data.groupeSanguin} />}
      {data.allergie && <Row label="Allergie(s)" value={data.allergie} />}

      {/* Coordonnées */}
      <Section title="Coordonnées" />
      <Row label="Adresse" value={data.adresse || '—'} />
      <Row label="Téléphone mobile" value={data.telMobile || '—'} />
      <Row label="Email" value={data.email} />
      {(data.urgenceContact || data.urgenceTel) && (
        <Row label="Contact urgence" value={[data.urgenceContact, data.urgenceTel].filter(Boolean).join(' — ')} />
      )}

      {/* Parents / tuteurs (mineurs) */}
      {data.typeInscription === 'mineur' && (
        <>
          <Section title="Parent / Tuteur 1" />
          <Row label="Nom et prénom" value={`${data.parent1.prenom} ${data.parent1.nom}`.trim() || '—'} />
          {data.parent1.email && <Row label="Email" value={data.parent1.email} />}
          {data.parent1.tel && <Row label="Téléphone" value={data.parent1.tel} />}
          {hasParent2 && (
            <>
              <Section title="Parent / Tuteur 2" />
              <Row label="Nom et prénom" value={`${data.parent2.prenom} ${data.parent2.nom}`.trim() || '—'} />
              {data.parent2.email && <Row label="Email" value={data.parent2.email} />}
              {data.parent2.tel && <Row label="Téléphone" value={data.parent2.tel} />}
            </>
          )}
        </>
      )}

      {/* Disciplines */}
      <Section title="Discipline(s) choisie(s)" />
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{data.disciplines}</div>
      {data.niveau && <Row label="Niveau actuel" value={data.niveau} />}

      {/* Mode de règlement */}
      <Section title="Mode de règlement" />
      <Row label="Moyen de paiement" value={MOYEN_PAIEMENT_LABELS[data.moyenPaiement] ?? data.moyenPaiement} />
      <Row label="Pass Sport 2026-2027" value={data.passSport ? 'Oui' : 'Non'} />

      {/* Autorisations */}
      <Section title="Autorisations" />
      <Row label="Droit à l'image" value={data.droitImage ? 'Accordé' : 'Refusé'} />
      {data.typeInscription === 'mineur' && (
        <Row label="Autorisation parentale" value={data.autorisationParentale ? 'Accordée' : 'Non accordée'} />
      )}

      {/* Pied de page */}
      <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #e5e5e5', fontSize: 11, color: '#aaa' }}>
        Document généré automatiquement — Association Arts Martiaux Saint-Pierrois
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page principale                                                      */
/* ------------------------------------------------------------------ */
const Inscription = () => {
  const { user } = useAuth();
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
  const [downloadingRecap, setDownloadingRecap] = useState(false);
  const planningRef = useRef<HTMLDivElement>(null);
  const tarifsRef = useRef<HTMLDivElement>(null);
  const recapRef = useRef<HTMLDivElement>(null);
  const [autorisationParentale, setAutorisationParentale] = useState(false);
  const [typeInscription, setTypeInscription] = useState<'adulte' | 'mineur'>('adulte');
  const [passSport, setPassSport] = useState(false);
  const [moyenPaiement, setMoyenPaiement] = useState('');
  const [parent1, setParent1] = useState({ nom: '', prenom: '', email: '', tel: '' });
  const [parent2, setParent2] = useState({ nom: '', prenom: '', email: '', tel: '' });
  const [form, setForm] = useState({
    nom: "", prenom: "", adresse: "", codePostal: "", ville: "",
    telMobile: "", email: "",
    dateNaissance: "", groupeSanguin: "", allergie: "",
    niveau: "", urgenceContact: "", urgenceTel: "",
  });
  const [villes, setVilles] = useState<string[]>([]);
  const [loadingVilles, setLoadingVilles] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recapData, setRecapData] = useState<RecapData | null>(null);
  const directionRef = useRef(1);

  useEffect(() => {
    client.fetch(`*[_type == "discipline"] | order(ordre asc) { _id, nom, nomCourt }`).then(setDisciplines);
    client.fetch(`*[_type == "inscription"][0] { saison, reglementInterieur, titreInfosPaiement, infosPaiement, texteAutorisationImage, texteAutorisationParentale, texteInfosCertificatMedical }`).then((d) => { if (d) setInscriptionData(d); });
    client.fetch(`*[_type == "cours"] | order(jour asc, heureDebut asc) { _id, jour, heureDebut, heureFin, lieu, niveau, ages, discipline-> { nom, nomCourt } }`).then(setCours);
    client.fetch(`*[_type == "tarif"] | order(ordre asc) { _id, categorie, jours, prixAnnuel, echeancier, ordre, discipline-> { nom } }`).then(setTarifs);
    client.fetch(`*[_type == "tarifSpecial"] | order(ordre asc)`).then(setTarifsSpeciaux);

    if (user) {
      supabase
        .from("profils")
        .select("prenom, nom, adresse, telephone, email")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setForm((prev) => ({
              ...prev,
              prenom: data.prenom || prev.prenom,
              nom: data.nom || prev.nom,
              adresse: data.adresse || prev.adresse,
              telMobile: data.telephone || prev.telMobile,
              email: data.email || user.email || prev.email,
            }));
          }
        });
    }
  }, [user]);

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

  const handleDownloadRecap = async () => {
    if (!recapRef.current) return;
    setDownloadingRecap(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = recapRef.current;
      const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false, width: el.scrollWidth, height: el.scrollHeight, windowWidth: el.scrollWidth, windowHeight: el.scrollHeight });
      const link = document.createElement("a");
      link.download = `inscription-amsp-${recapData?.nom ?? "recap"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally { setDownloadingRecap(false); }
  };

  const saison = inscriptionData.saison || "2025-2026";
  const reglement = inscriptionData.reglementInterieur || REGLEMENT_DEFAULT;
  const titreInfosPaiement = inscriptionData.titreInfosPaiement || "Règlement des cotisations";
  const infosPaiement = inscriptionData.infosPaiement || "1 chèque de 60€ encaissé à l'inscription (non remboursable) + le solde en 3 chèques encaissables en décembre 2025, mars 2026 et juin 2026. Chèques à l'ordre des Arts Martiaux St Pierrois.";
  const texteAutorisationImage = inscriptionData.texteAutorisationImage || "J'autorise l'association Arts Martiaux St Pierrois à utiliser mon image ou celle de mes enfants pour les besoins du club (articles, internet...)";
  const texteAutorisationParentale = inscriptionData.texteAutorisationParentale || "Je soussigné(e) autorise mon enfant à pratiquer les arts martiaux dans le cadre de l'Association Les Arts Martiaux St Pierrois (entraînements, compétitions, démonstrations).\n\nJ'autorise le professeur et les dirigeants à prendre, en cas de nécessité, les mesures qui s'imposent concernant le transport à l'hôpital.\n\nJe dégage de toute responsabilité les personnes qui prendront mon enfant en charge dans leur véhicule lors des déplacements.\n\nJ'autorise mon enfant à suivre les entraînements destinés à manipuler les armes en bois et les armes articulées (l'autorisation parentale est obligatoire suite à un texte de loi sur « l'incitation des mineurs à la violence »).";
  const texteInfosCertificatMedical = inscriptionData.texteInfosCertificatMedical || "Le certificat médical n'est plus obligatoire — une attestation sur l'honneur sera à remplir.";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));

    if (id === "codePostal") {
      const cp = value.replace(/\D/g, "").slice(0, 5);
      setForm((prev) => ({ ...prev, codePostal: cp, ville: "" }));
      setVilles([]);
      if (cp.length === 5) {
        setLoadingVilles(true);
        fetch(`https://geo.api.gouv.fr/communes?codePostal=${cp}&fields=nom&format=json`)
          .then((r) => r.json())
          .then((data: { nom: string }[]) => {
            const noms = data.map((c) => c.nom).sort();
            setVilles(noms);
            if (noms.length === 1) setForm((prev) => ({ ...prev, ville: noms[0] }));
          })
          .catch(() => setVilles([]))
          .finally(() => setLoadingVilles(false));
      }
    }
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
    if (!moyenPaiement) {
      toast.error("Veuillez sélectionner un moyen de paiement.");
      return;
    }
    if (typeInscription === 'mineur' && (!parent1.nom.trim() || !parent1.prenom.trim())) {
      toast.error("Le nom et prénom du parent / tuteur 1 sont obligatoires.");
      return;
    }
    if (typeInscription === 'mineur' && !autorisationParentale) {
      toast.error("L'autorisation parentale est obligatoire pour un mineur.");
      return;
    }

    setSending(true);

    const disciplinesChoisies = selectedDisciplines
      .map((id) => disciplines.find((d) => d._id === id)?.nom)
      .filter(Boolean)
      .join(", ");

    try {
      const adresseComplete = [form.adresse, form.codePostal, form.ville].filter(Boolean).join(" ");
      const { error } = await supabase.from("inscriptions").insert({
        nom: form.nom,
        prenom: form.prenom,
        adresse: adresseComplete,
        date_naissance: form.dateNaissance || null,
        groupe_sanguin: form.groupeSanguin || null,
        allergie: form.allergie || null,
        tel_mobile: form.telMobile,
        email: form.email,
        urgence_contact: [form.urgenceContact, form.urgenceTel].filter(Boolean).join(" — "),
        disciplines: disciplinesChoisies,
        niveau: form.niveau || null,
        autorisation_parentale: typeInscription === 'mineur' ? autorisationParentale : false,
        droit_image: droitImage,
        saison,
        statut: "en_attente",
        source: "en_ligne",
        type_inscription: typeInscription,
        pass_sport: passSport,
        moyen_paiement: moyenPaiement,
        parent1_nom: typeInscription === 'mineur' ? parent1.nom.trim() || null : null,
        parent1_prenom: typeInscription === 'mineur' ? parent1.prenom.trim() || null : null,
        parent1_email: typeInscription === 'mineur' ? parent1.email.trim() || null : null,
        parent1_tel: typeInscription === 'mineur' ? parent1.tel.trim() || null : null,
        parent2_nom: typeInscription === 'mineur' && parent2.nom.trim() ? parent2.nom.trim() : null,
        parent2_prenom: typeInscription === 'mineur' && parent2.prenom.trim() ? parent2.prenom.trim() : null,
        parent2_email: typeInscription === 'mineur' && parent2.email.trim() ? parent2.email.trim() : null,
        parent2_tel: typeInscription === 'mineur' && parent2.tel.trim() ? parent2.tel.trim() : null,
        user_id: user?.id || null,
      });

      if (error) throw error;

      await sendBrevoEmail(TEMPLATES.INSCRIPTION, { email: form.email, name: `${form.prenom} ${form.nom}` }, {
        nom: form.nom,
        prenom: form.prenom,
        adresse: adresseComplete,
        tel_mobile: form.telMobile,
        email: form.email,
        date_naissance: form.dateNaissance || "",
        groupe_sanguin: form.groupeSanguin || "",
        allergie: form.allergie || "Aucune",
        niveau: form.niveau || "Non précisé",
        urgence_contact: [form.urgenceContact, form.urgenceTel].filter(Boolean).join(" — "),
        disciplines: disciplinesChoisies,
        autorisation_parentale: autorisationParentale ? "Oui" : "Non / Non concerné",
        droit_image: droitImage ? "Oui" : "Non",
        saison,
      });

      try {
        await sendBrevoEmail(TEMPLATES.INSCRIPTION_ADMIN, { email: import.meta.env.VITE_BREVO_ADMIN_EMAIL, name: "AMSP" }, {
          nom: form.nom,
          prenom: form.prenom,
          email: form.email,
          tel_mobile: form.telMobile,
          date_naissance: form.dateNaissance || "",
          niveau: form.niveau || "Non précisé",
          disciplines: disciplinesChoisies,
          saison,
        });
      } catch {
        // Non-bloquant
      }

      setRecapData({
        nom: form.nom,
        prenom: form.prenom,
        adresse: adresseComplete,
        telMobile: form.telMobile,
        email: form.email,
        dateNaissance: form.dateNaissance,
        groupeSanguin: form.groupeSanguin,
        allergie: form.allergie,
        niveau: form.niveau,
        urgenceContact: form.urgenceContact,
        urgenceTel: form.urgenceTel,
        disciplines: disciplinesChoisies,
        saison,
        typeInscription,
        passSport,
        moyenPaiement,
        droitImage,
        autorisationParentale,
        parent1: { ...parent1 },
        parent2: { ...parent2 },
        dateEnvoi: new Date().toLocaleDateString('fr-FR'),
      });
      setSubmitted(true);

      setForm({
        nom: "", prenom: "", adresse: "", codePostal: "", ville: "",
        telMobile: "", email: "",
        dateNaissance: "", groupeSanguin: "", allergie: "",
        niveau: "", urgenceContact: "", urgenceTel: "",
      });
      setVilles([]);
      setSelectedDisciplines([]);
      setReglementAccepte(false);
      setDroitImage(false);
      setPassSport(false);
      setMoyenPaiement('');
      setParent1({ nom: '', prenom: '', email: '', tel: '' });
      setParent2({ nom: '', prenom: '', email: '', tel: '' });

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
            <div className="mx-auto mb-8 max-w-xl rounded-md border border-primary/20 bg-primary/5 px-5 py-4 text-center">
              <p className="text-sm font-semibold text-foreground">Inscription lors du forum des associations</p>
              <p className="mt-1 text-sm text-muted-foreground">ou</p>
            </div>

            <h1 className="mb-4 text-center font-serif text-4xl font-black md:text-5xl">
              <span className="text-primary">Inscription</span> en ligne
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
              Remplissez le formulaire ci-dessous pour vous inscrire à l'A.M.S.P.
            </p>

            {/* Écran de confirmation après envoi */}
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-border/50 bg-card p-8 text-center space-y-6"
                >
                  <CheckCircle2 className="mx-auto text-green-500" size={48} />
                  <div>
                    <h2 className="font-serif text-2xl font-bold mb-2">Inscription envoyée !</h2>
                    <p className="text-muted-foreground text-sm">
                      Nous avons bien reçu votre demande. Vous recevrez un email de confirmation et nous vous contacterons prochainement.
                    </p>
                  </div>
                  <Button onClick={handleDownloadRecap} disabled={downloadingRecap} variant="outline" size="lg" className="w-full">
                    {downloadingRecap ? <Loader2 size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2" />}
                    Télécharger mon récapitulatif
                  </Button>
                  <Button onClick={() => setSubmitted(false)} variant="ghost" size="sm" className="text-muted-foreground">
                    Faire une nouvelle inscription
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-8 rounded-lg border border-border/50 bg-card p-8"
                >

                  {/* Type d'inscription — sélecteur fixe, hors animation */}
                  <div>
                    <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Type d'inscription</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {(['adulte', 'mineur'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            if (type !== typeInscription) {
                              directionRef.current = type === 'mineur' ? 1 : -1;
                              setTypeInscription(type);
                            }
                          }}
                          className={`rounded-md border-2 py-4 text-sm font-semibold capitalize transition-colors ${typeInscription === type ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                        >
                          {type === 'adulte' ? 'Adulte' : 'Mineur'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contenu du formulaire — animé au changement de type */}
                  <AnimatePresence mode="wait" custom={directionRef.current}>
                  <motion.div
                    key={typeInscription}
                    custom={directionRef.current}
                    variants={formVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-8 overflow-hidden"
                  >

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
                        <Input id="adresse" required maxLength={255} placeholder="Numéro et nom de rue" value={form.adresse} onChange={handleChange} />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="codePostal">Code postal *</Label>
                          <Input id="codePostal" required maxLength={5} placeholder="Ex: 97410" value={form.codePostal} onChange={handleChange} inputMode="numeric" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ville">Ville *</Label>
                          {villes.length > 1 ? (
                            <select
                              id="ville"
                              required
                              value={form.ville}
                              onChange={handleChange}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <option value="">Sélectionner une ville</option>
                              {villes.map((v) => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              id="ville"
                              required
                              maxLength={100}
                              placeholder={loadingVilles ? "Chargement…" : "Ex: Saint-Pierre"}
                              value={form.ville}
                              onChange={handleChange}
                              disabled={loadingVilles}
                            />
                          )}
                        </div>
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
                      <div className="space-y-2">
                        <Label htmlFor="telMobile">Téléphone mobile *</Label>
                        <Input id="telMobile" type="tel" required maxLength={20} placeholder="06 00 00 00 00" value={form.telMobile} onChange={handleChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" type="email" required maxLength={255} placeholder="votre@email.com" value={form.email} onChange={handleChange} />
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-medium">Personne à contacter en cas d'urgence *</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="urgenceContact">Nom et prénom</Label>
                            <Input id="urgenceContact" required maxLength={100} placeholder="Nom, prénom" value={form.urgenceContact} onChange={handleChange} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="urgenceTel">Téléphone</Label>
                            <Input id="urgenceTel" type="tel" required maxLength={20} placeholder="06 00 00 00 00" value={form.urgenceTel} onChange={handleChange} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informations parents / tuteurs — mineurs uniquement */}
                  {typeInscription === 'mineur' && (
                    <div>
                      <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">
                        Informations parents / tuteurs légaux
                      </h2>
                      <div className="space-y-6">
                        <div className="rounded-md border border-border/50 p-4 space-y-4">
                          <p className="text-sm font-semibold text-foreground">Parent / Tuteur 1 *</p>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="p1nom">Nom *</Label>
                              <Input id="p1nom" maxLength={100} placeholder="Nom" value={parent1.nom} onChange={e => setParent1(p => ({ ...p, nom: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="p1prenom">Prénom *</Label>
                              <Input id="p1prenom" maxLength={100} placeholder="Prénom" value={parent1.prenom} onChange={e => setParent1(p => ({ ...p, prenom: e.target.value }))} />
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="p1email">Email</Label>
                              <Input id="p1email" type="email" maxLength={255} placeholder="email@exemple.com" value={parent1.email} onChange={e => setParent1(p => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="p1tel">Téléphone</Label>
                              <Input id="p1tel" type="tel" maxLength={20} placeholder="06 00 00 00 00" value={parent1.tel} onChange={e => setParent1(p => ({ ...p, tel: e.target.value }))} />
                            </div>
                          </div>
                        </div>
                        <div className="rounded-md border border-border/50 p-4 space-y-4">
                          <p className="text-sm font-semibold text-foreground">Parent / Tuteur 2 <span className="font-normal text-muted-foreground">(facultatif)</span></p>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="p2nom">Nom</Label>
                              <Input id="p2nom" maxLength={100} placeholder="Nom" value={parent2.nom} onChange={e => setParent2(p => ({ ...p, nom: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="p2prenom">Prénom</Label>
                              <Input id="p2prenom" maxLength={100} placeholder="Prénom" value={parent2.prenom} onChange={e => setParent2(p => ({ ...p, prenom: e.target.value }))} />
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="p2email">Email</Label>
                              <Input id="p2email" type="email" maxLength={255} placeholder="email@exemple.com" value={parent2.email} onChange={e => setParent2(p => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="p2tel">Téléphone</Label>
                              <Input id="p2tel" type="tel" maxLength={20} placeholder="06 00 00 00 00" value={parent2.tel} onChange={e => setParent2(p => ({ ...p, tel: e.target.value }))} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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

                    <label className="flex cursor-pointer items-start gap-3 mt-4">
                      <Checkbox
                        checked={passSport}
                        onCheckedChange={(v) => setPassSport(v as boolean)}
                        className="mt-0.5"
                      />
                      <span className="text-sm">Détenteur d'un code Pass Sport 2026-2027</span>
                    </label>
                  </div>

                  {/* Mode de règlement */}
                  <div>
                    <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Mode de règlement</h2>

                    {/* Encart Règlement des cotisations */}
                    <div className="mb-5 rounded-md border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="font-medium text-foreground">{titreInfosPaiement}</p>
                        <button type="button" onClick={handleDownloadTarifs} disabled={downloadingTarifs} className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50">
                          {downloadingTarifs ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          Voir tarifs
                        </button>
                      </div>
                      <p>{infosPaiement}</p>
                    </div>

                    {/* Choix du moyen de paiement */}
                    <p className="mb-3 text-sm font-semibold">Moyen de paiement *</p>
                    <div className="space-y-3">
                      {[
                        { value: 'cheque_1x', label: 'Chèque — en 1 fois' },
                        { value: 'cheque_4x', label: 'Chèque — en 4 fois', detail: '60 € à l\'inscription (non remboursable) + solde en 3 échéances (décembre, mars, juin)' },
                        { value: 'especes', label: 'Espèces' },
                        { value: 'virement', label: 'Virement bancaire (en une seule fois)' },
                      ].map(option => (
                        <label key={option.value} className="flex cursor-pointer items-start gap-3">
                          <input
                            type="radio"
                            name="moyenPaiement"
                            value={option.value}
                            checked={moyenPaiement === option.value}
                            onChange={() => setMoyenPaiement(option.value)}
                            className="mt-0.5 accent-primary shrink-0"
                          />
                          <div className="text-sm">
                            <span>{option.label}</span>
                            {option.detail && <p className="mt-0.5 text-xs text-muted-foreground">{option.detail}</p>}
                          </div>
                        </label>
                      ))}
                    </div>

                    <p className="mt-4 text-sm font-semibold">
                      Paiement effectué soit au forum des associations, soit remis aux instructeurs lors des premiers cours.
                    </p>
                  </div>

                  {/* Autorisation parentale (mineur) */}
                  {typeInscription === 'mineur' && (
                    <div>
                      <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">
                        Autorisation parentale <span className="text-sm font-normal text-muted-foreground">(obligatoire)</span>
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
                  )}

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

                  <Button type="submit" className="w-full" size="lg" disabled={sending}>
                    {sending ? "Envoi en cours..." : "Envoyer mon inscription"}
                  </Button>

                  </motion.div>
                  </AnimatePresence>
                </motion.form>
              )}
            </AnimatePresence>
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
        {recapData && (
          <div ref={recapRef}>
            <PrintableInscription data={recapData} />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Inscription;
