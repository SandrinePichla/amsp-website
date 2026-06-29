import { Helmet } from "react-helmet-async";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Download, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { client } from "@/sanityClient";
import {
  buildColorMap,
  PrintableCalendar, PrintableTarifs,
} from "@/components/PrintablePlanning";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import type { Cours, Tarif, TarifSpecial } from "@/components/PrintablePlanning";

import { sendBrevoEmail, TEMPLATES } from "@/lib/brevo";
import { PrintableInscription, type RecapData } from "@/components/PrintableInscription";

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

const REGEX_TEL_FR = /^(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const formVariants = {
  enter: (dir: number) => ({ x: dir * 80, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
  exit: (dir: number) => ({ x: dir * -80, opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as [number, number, number, number] } }),
};

const REGLEMENT_BOLD_PHRASES = ["RÈGLEMENT INTÉRIEUR COMMUN", "RÈGLEMENT COMPLEMENTAIRE SPÉCIAL KARATÉ"];
function renderReglement(text: string) {
  let parts: (string | JSX.Element)[] = [text];
  for (const phrase of REGLEMENT_BOLD_PHRASES) {
    parts = parts.flatMap((part, i) => {
      if (typeof part !== 'string') return [part];
      const segments = part.split(phrase);
      return segments.flatMap((seg, j) => j < segments.length - 1 ? [seg, <strong key={`${i}-${j}`}>{phrase}</strong>] : [seg]);
    });
  }
  return <>{parts}</>;
}

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
  const [reglementLu, setReglementLu] = useState(false);
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
    niveau: "", urgencePrenom: "", urgenceNom: "", urgenceTel: "",
  });
  const [villes, setVilles] = useState<string[]>([]);
  const [loadingVilles, setLoadingVilles] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recapData, setRecapData] = useState<RecapData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitErrorList, setSubmitErrorList] = useState<string[]>([]);
  const submitErrorRef = useRef<HTMLDivElement>(null);
  const directionRef = useRef(1);
  const reglementScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    client.fetch(`*[_type == "discipline" && lower(nom) != "stages"] | order(ordre asc) { _id, nom, nomCourt }`).then(setDisciplines);
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

  const isMineur = useMemo(() => {
    if (!form.dateNaissance || typeInscription !== 'adulte') return false;
    const birth = new Date(form.dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age < 18;
  }, [form.dateNaissance, typeInscription]);

  const disciplinesAffichees = useMemo(() =>
    typeInscription === 'mineur'
      ? disciplines.filter((d) => d.nom.toLowerCase().includes('karaté') || d.nom.toLowerCase().includes('karate'))
      : disciplines,
    [disciplines, typeInscription]
  );

  useEffect(() => {
    if (typeInscription === 'mineur') {
      const idsKarate = disciplines
        .filter((d) => d.nom.toLowerCase().includes('karaté') || d.nom.toLowerCase().includes('karate'))
        .map((d) => d._id);
      setSelectedDisciplines((prev) => prev.filter((id) => idsKarate.includes(id)));
    }
  }, [typeInscription, disciplines]);

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

  const setFieldError = (key: string, msg: string) => setErrors(e => ({ ...e, [key]: msg }));
  const clearFieldError = (key: string) => setErrors(e => { const n = { ...e }; delete n[key]; return n; });

  const validateTel = (key: string, val: string, required = false) => {
    if (!val.trim()) { required ? setFieldError(key, 'Numéro de téléphone obligatoire') : clearFieldError(key); return; }
    if (!REGEX_TEL_FR.test(val.trim())) setFieldError(key, 'Format invalide — ex : 06 00 00 00 00');
    else clearFieldError(key);
  };

  const validateEmail = (key: string, val: string, required = false) => {
    if (!val.trim()) { required ? setFieldError(key, 'Email obligatoire') : clearFieldError(key); return; }
    if (!REGEX_EMAIL.test(val.trim())) setFieldError(key, 'Format invalide — ex : nom@domaine.fr');
    else clearFieldError(key);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
    if (['telMobile', 'email', 'urgenceTel'].includes(id)) clearFieldError(id);

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

    // Collecte toutes les erreurs en une seule passe
    const formErrorList: string[] = [];
    const newFieldErrors: Record<string, string> = {};

    if (isMineur) formErrorList.push("Cette personne est mineure. Veuillez utiliser le formulaire Mineur.");
    if (selectedDisciplines.length === 0) formErrorList.push("Sélectionnez au moins une discipline.");
    if (!reglementAccepte) formErrorList.push("Acceptez le règlement intérieur.");
    if (!moyenPaiement) formErrorList.push("Sélectionnez un moyen de paiement.");
    if (typeInscription === 'adulte') {
      if (!form.telMobile.trim()) {
        formErrorList.push("Le téléphone mobile est obligatoire.");
        newFieldErrors.telMobile = 'Champ obligatoire';
      } else if (!REGEX_TEL_FR.test(form.telMobile.trim())) {
        formErrorList.push("Le téléphone mobile est invalide.");
        newFieldErrors.telMobile = 'Format invalide — ex : 06 00 00 00 00';
      }
      if (!form.email.trim()) {
        formErrorList.push("L'email est obligatoire.");
        newFieldErrors.email = 'Champ obligatoire';
      } else if (!REGEX_EMAIL.test(form.email.trim())) {
        formErrorList.push("L'adresse email est invalide.");
        newFieldErrors.email = 'Format invalide — ex : nom@domaine.fr';
      }
    }
    if (!form.urgenceTel.trim()) {
      formErrorList.push("Le téléphone du contact d'urgence est obligatoire.");
      newFieldErrors.urgenceTel = 'Champ obligatoire';
    } else if (!REGEX_TEL_FR.test(form.urgenceTel.trim())) {
      formErrorList.push("Le téléphone du contact d'urgence est invalide.");
      newFieldErrors.urgenceTel = 'Format invalide — ex : 06 00 00 00 00';
    }
    if (typeInscription === 'mineur') {
      if (!parent1.nom.trim() || !parent1.prenom.trim()) formErrorList.push("Le nom et prénom du parent 1 (contact principal) sont obligatoires.");
      if (parent1.tel.trim() && !REGEX_TEL_FR.test(parent1.tel.trim())) { formErrorList.push("Le téléphone du parent 1 est invalide."); newFieldErrors.p1tel = 'Format invalide — ex : 06 00 00 00 00'; }
      if (parent1.email.trim() && !REGEX_EMAIL.test(parent1.email.trim())) { formErrorList.push("L'email du parent 1 est invalide."); newFieldErrors.p1email = 'Format invalide — ex : nom@domaine.fr'; }
      if (parent2.tel.trim() && !REGEX_TEL_FR.test(parent2.tel.trim())) { formErrorList.push("Le téléphone du parent 2 est invalide."); newFieldErrors.p2tel = 'Format invalide — ex : 06 00 00 00 00'; }
      if (parent2.email.trim() && !REGEX_EMAIL.test(parent2.email.trim())) { formErrorList.push("L'email du parent 2 est invalide."); newFieldErrors.p2email = 'Format invalide — ex : nom@domaine.fr'; }
      if (!autorisationParentale) formErrorList.push("L'autorisation parentale est obligatoire pour un mineur.");
    }

    if (formErrorList.length > 0) {
      setSubmitErrorList(formErrorList);
      setErrors(newFieldErrors);
      setTimeout(() => submitErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }

    setSubmitErrorList([]);
    setErrors({});

    setSending(true);

    // Vérification doublon via RPC SECURITY DEFINER (bypass RLS)
    try {
      const { data: isDoublon, error } = await supabase.rpc("check_inscription_doublon", {
        p_nom:            form.nom.trim(),
        p_prenom:         form.prenom.trim(),
        p_saison:         saison,
        p_user_id:        user?.id ?? null,
        p_date_naissance: form.dateNaissance || null,
      });

      if (!error && isDoublon) {
        setSubmitErrorList([
          `Vous êtes déjà inscrit(e) pour la saison ${saison}. Si vous souhaitez vous inscrire à une nouvelle discipline, veuillez nous contacter.`,
        ]);
        setTimeout(() => submitErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
        setSending(false);
        return;
      }
    } catch {
      // Erreur réseau : on laisse passer
    }

    const disciplinesIds = selectedDisciplines.join(",");
    const disciplinesNoms = selectedDisciplines
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
        tel_mobile: typeInscription === 'mineur' ? '' : form.telMobile,
        email: typeInscription === 'mineur' ? (parent1.email.trim() || '') : form.email,
        urgence_contact: [[form.urgencePrenom, form.urgenceNom].filter(Boolean).join(" "), form.urgenceTel].filter(Boolean).join(" — "),
        disciplines: disciplinesIds,
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

      // Créer des suggestions d'accès galerie (actif=false, en attente validation admin)
      if (user && disciplinesIds) {
        for (const discId of selectedDisciplines) {
          supabase.from("acces_galerie").upsert({
            compte_id: user.id,
            discipline_sanity_id: discId,
            actif: false,
            source: "suggestion_auto",
            saison: saison,
          }, { onConflict: "compte_id,discipline_sanity_id,saison", ignoreDuplicates: true });
        }
      }

      const contactEmail = typeInscription === 'mineur' ? (parent1.email.trim() || form.email) : form.email;
      const contactName = typeInscription === 'mineur'
        ? `${parent1.prenom} ${parent1.nom}`.trim() || `${form.prenom} ${form.nom}`
        : `${form.prenom} ${form.nom}`;

      if (contactEmail) {
        await sendBrevoEmail(TEMPLATES.INSCRIPTION, { email: contactEmail, name: contactName }, {
          nom: form.nom,
          prenom: form.prenom,
          adresse: adresseComplete,
          tel_mobile: typeInscription === 'mineur' ? (parent1.tel.trim() || form.telMobile) : form.telMobile,
          email: contactEmail,
          date_naissance: form.dateNaissance || "",
          groupe_sanguin: form.groupeSanguin || "",
          allergie: form.allergie || "Aucune",
          niveau: form.niveau || "Non précisé",
          urgence_contact: [[form.urgencePrenom, form.urgenceNom].filter(Boolean).join(" "), form.urgenceTel].filter(Boolean).join(" — "),
          disciplines: disciplinesNoms,
          autorisation_parentale: autorisationParentale ? "Oui" : "Non / Non concerné",
          droit_image: droitImage ? "Oui" : "Non",
          saison,
        });
      }

      try {
        await sendBrevoEmail(TEMPLATES.INSCRIPTION_ADMIN, { email: import.meta.env.VITE_BREVO_ADMIN_EMAIL, name: "AMSP" }, {
          nom: form.nom,
          prenom: form.prenom,
          email: contactEmail,
          tel_mobile: typeInscription === 'mineur' ? (parent1.tel.trim() || form.telMobile) : form.telMobile,
          date_naissance: form.dateNaissance || "",
          niveau: form.niveau || "Non précisé",
          disciplines: disciplinesNoms,
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
        urgenceContact: [[form.urgencePrenom, form.urgenceNom].filter(Boolean).join(' '), form.urgenceTel].filter(Boolean).join(' — '),
        disciplines: disciplinesNoms,
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
        niveau: "", urgencePrenom: "", urgenceNom: "", urgenceTel: "",
      });
      setVilles([]);
      setSelectedDisciplines([]);
      setReglementAccepte(false);
      setDroitImage(false);
      setPassSport(false);
      setMoyenPaiement('');
      setParent1({ nom: '', prenom: '', email: '', tel: '' });
      setParent2({ nom: '', prenom: '', email: '', tel: '' });
      setSubmitErrorList([]);
      setErrors({});

    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi. Veuillez réessayer ou nous contacter par email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>Inscription en ligne — Club A.M.S.P. Saint-Pierre-la-Palud (69)</title>
        <meta name="description" content="Inscrivez-vous en ligne au club d'arts martiaux A.M.S.P. de Saint-Pierre-la-Palud (69210). Karaté, Tai Chi, Aïkido, Wutao, Épée — adultes et enfants, débutants acceptés." />
      </Helmet>
      <section className="py-20">
        <div className="container mx-auto max-w-2xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mx-auto mb-8 max-w-xl px-5 py-4 text-center">
              <p className="text-base font-semibold text-foreground">Inscription lors du forum des associations</p>
              <p className="mt-1 text-sm text-muted-foreground">ou</p>
            </div>

            <h1 className="mb-4 text-center font-serif text-4xl font-black md:text-5xl">
              <span className="text-primary">Inscription</span> en ligne
            </h1>
            <p className="mx-auto mb-4 max-w-xl text-center text-muted-foreground">
              Remplissez le formulaire ci-dessous pour vous inscrire à l'A.M.S.P.
            </p>
            <p className="mb-10 text-center text-sm font-semibold text-primary">
              {saison}
            </p>

            {/* Écran de confirmation après envoi */}
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-10 text-center space-y-6 shadow-sm"
                >
                  <CheckCircle2 className="mx-auto text-green-500" size={72} />
                  <div>
                    <h2 className="font-serif text-3xl font-bold mb-3">Inscription envoyée !</h2>
                    <p className="text-muted-foreground">
                      Nous avons bien reçu votre demande.<br />
                      Vous recevrez un email de confirmation et nous vous contacterons prochainement.
                    </p>
                  </div>
                  <Button onClick={handleDownloadRecap} disabled={downloadingRecap} variant="outline" size="lg" className="w-full border-green-300 hover:bg-green-100 dark:border-green-700 dark:hover:bg-green-900/30">
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
                      {isMineur && (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-4 flex flex-col items-center gap-3 text-center">
                          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                            <AlertTriangle size={16} className="shrink-0" />
                            <p className="text-sm font-semibold">Cette personne est mineure.</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
                            onClick={() => { directionRef.current = 1; setTypeInscription('mineur'); }}
                          >
                            Basculer vers le formulaire Mineur
                          </Button>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="allergie">Allergie(s)</Label>
                        <Input id="allergie" maxLength={255} placeholder="Précisez si nécessaire" value={form.allergie} onChange={handleChange} />
                      </div>
                    </div>

                    {/* Infos certificat médical */}
                    {typeInscription === 'adulte' ? (
                      <p className="mt-2 text-sm text-muted-foreground italic">
                        Aucun certificat médical ni questionnaire de santé n'est requis pour les adultes.
                      </p>
                    ) : (
                      <div className="mt-3 rounded-lg border border-border/50 bg-muted/40 p-4 text-sm space-y-2">
                        <p className="font-medium text-foreground">Certificat médical et questionnaire de santé</p>
                        <p className="text-muted-foreground">
                          Le certificat médical n'est pas obligatoire. Le responsable légal doit compléter le{' '}
                          <a href="/amsp-website/questionnaire-sante.pdf" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2 hover:text-primary/80">
                            questionnaire de santé
                          </a>{' '}
                          avec son enfant.
                        </p>
                        <p className="text-muted-foreground">
                          Si toutes les réponses sont <span className="font-medium">négatives</span>, remettre au club l'{' '}
                          <a href="/amsp-website/attestation-honneur.pdf" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2 hover:text-primary/80">
                            attestation sur l'honneur
                          </a>{' '}
                          lors des premiers cours.
                        </p>
                        <p className="text-muted-foreground">
                          Si au moins une réponse est <span className="font-medium text-destructive">positive</span>, une consultation médicale est nécessaire avant la pratique.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Coordonnées — adultes uniquement (tel + email) */}
                  {typeInscription === 'adulte' && (
                    <div>
                      <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">Coordonnées</h2>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="telMobile">Téléphone mobile *</Label>
                          <Input id="telMobile" type="tel" required maxLength={20} placeholder="06 00 00 00 00" value={form.telMobile} onChange={handleChange} onBlur={() => validateTel('telMobile', form.telMobile, true)} className={errors.telMobile ? 'border-destructive' : ''} />
                          {errors.telMobile && <p className="text-xs text-destructive">{errors.telMobile}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input id="email" type="email" required maxLength={255} placeholder="votre@email.com" value={form.email} onChange={handleChange} onBlur={() => validateEmail('email', form.email, true)} className={errors.email ? 'border-destructive' : ''} />
                          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informations parents / tuteurs — mineurs uniquement */}
                  {typeInscription === 'mineur' && (
                    <div>
                      <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">
                        Informations parents légaux
                      </h2>
                      <div className="space-y-6">
                        <div className="rounded-md border border-border/50 p-4 space-y-4">
                          <p className="text-sm font-semibold text-foreground">Parent 1 <span className="font-normal text-muted-foreground">(contact principal)</span> *</p>
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
                              <Input id="p1email" type="email" maxLength={255} placeholder="email@exemple.com" value={parent1.email} onChange={e => { setParent1(p => ({ ...p, email: e.target.value })); clearFieldError('p1email'); }} onBlur={() => validateEmail('p1email', parent1.email)} className={errors.p1email ? 'border-destructive' : ''} />
                              {errors.p1email && <p className="text-xs text-destructive">{errors.p1email}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="p1tel">Téléphone</Label>
                              <Input id="p1tel" type="tel" maxLength={20} placeholder="06 00 00 00 00" value={parent1.tel} onChange={e => { setParent1(p => ({ ...p, tel: e.target.value })); clearFieldError('p1tel'); }} onBlur={() => validateTel('p1tel', parent1.tel)} className={errors.p1tel ? 'border-destructive' : ''} />
                              {errors.p1tel && <p className="text-xs text-destructive">{errors.p1tel}</p>}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-md border border-border/50 p-4 space-y-4">
                          <p className="text-sm font-semibold text-foreground">Parent 2 <span className="font-normal text-muted-foreground">(facultatif, si vous souhaitez être contacté)</span></p>
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
                              <Input id="p2email" type="email" maxLength={255} placeholder="email@exemple.com" value={parent2.email} onChange={e => { setParent2(p => ({ ...p, email: e.target.value })); clearFieldError('p2email'); }} onBlur={() => validateEmail('p2email', parent2.email)} className={errors.p2email ? 'border-destructive' : ''} />
                              {errors.p2email && <p className="text-xs text-destructive">{errors.p2email}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="p2tel">Téléphone</Label>
                              <Input id="p2tel" type="tel" maxLength={20} placeholder="06 00 00 00 00" value={parent2.tel} onChange={e => { setParent2(p => ({ ...p, tel: e.target.value })); clearFieldError('p2tel'); }} onBlur={() => validateTel('p2tel', parent2.tel)} className={errors.p2tel ? 'border-destructive' : ''} />
                              {errors.p2tel && <p className="text-xs text-destructive">{errors.p2tel}</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Urgence — adultes dans coordonnées, mineurs sous les parents */}
                  <div>
                    <h2 className="mb-4 font-serif text-lg font-bold border-b border-border/50 pb-2">
                      Personne à contacter en cas d'urgence *
                    </h2>
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="urgencePrenom">Prénom</Label>
                          <Input id="urgencePrenom" required maxLength={100} placeholder="Prénom" value={form.urgencePrenom} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="urgenceNom">Nom</Label>
                          <Input id="urgenceNom" required maxLength={100} placeholder="Nom" value={form.urgenceNom} onChange={handleChange} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="urgenceTel">Téléphone</Label>
                        <Input id="urgenceTel" type="tel" required maxLength={20} placeholder="06 00 00 00 00" value={form.urgenceTel} onChange={handleChange} onBlur={() => validateTel('urgenceTel', form.urgenceTel, true)} className={errors.urgenceTel ? 'border-destructive' : ''} />
                        {errors.urgenceTel && <p className="text-xs text-destructive">{errors.urgenceTel}</p>}
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
                      {disciplinesAffichees.map((d) => (
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
                    <div className="relative mb-1">
                      <div
                        ref={reglementScrollRef}
                        className="max-h-48 overflow-y-auto rounded-md border border-border/50 bg-secondary/30 p-4 text-xs text-muted-foreground whitespace-pre-line"
                        onScroll={(e) => {
                          const el = e.currentTarget;
                          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setReglementLu(true);
                        }}
                      >
                        {renderReglement(reglement)}
                      </div>
                      {!reglementLu && (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle size={12} className="shrink-0" />
                          Faites défiler jusqu'en bas pour débloquer la case à cocher.
                        </p>
                      )}
                    </div>
                    <label className={`mt-3 flex items-start gap-3 ${reglementLu ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                      <Checkbox
                        checked={reglementAccepte}
                        onCheckedChange={(v) => reglementLu && setReglementAccepte(v as boolean)}
                        disabled={!reglementLu}
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
                    <p className="mt-2 text-xs text-muted-foreground">Le code Pass Sport est obligatoire et devra être communiqué au club dès sa réception afin de bénéficier immédiatement de la remise de 70&nbsp;€ sur votre inscription.</p>
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
                        { value: 'cheque_4x', label: 'Chèque — en 4 fois' },
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

                  {submitErrorList.length > 0 && (
                    <div ref={submitErrorRef} className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                      <p className="mb-2 font-semibold">Veuillez corriger les points suivants avant d'envoyer :</p>
                      <ul className="list-disc list-inside space-y-1">
                        {submitErrorList.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}

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
