export interface RecapData {
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
  source?: string | null;
}

export const MOYEN_PAIEMENT_LABELS: Record<string, string> = {
  cheque_1x: 'Chèque — en 1 fois',
  cheque_4x: 'Chèque — en 4 fois',
  especes: 'Espèces',
  virement: 'Virement bancaire (en une seule fois)',
};

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

export const PrintableInscription = ({ data }: { data: RecapData }) => {
  const hasParent2 = data.parent2.nom.trim() || data.parent2.prenom.trim();
  const sourceLabel = data.source === 'papier' ? 'Formulaire papier' : 'En ligne';

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#fff', color: '#111', padding: '44px 52px', width: '760px', lineHeight: 1.6 }}>

      {/* En-tête */}
      <div style={{ borderBottom: '3px solid #b91c1c', paddingBottom: 14, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#b91c1c', letterSpacing: 1 }}>
            AMSP — Arts Martiaux Saint-Pierrois
          </div>
          <div style={{ fontSize: 14, color: '#555', marginTop: 3 }}>
            Récapitulatif d'inscription — Saison {data.saison || '—'}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#888', textAlign: 'right' }}>
          Envoyé le {data.dateEnvoi}<br />
          {data.typeInscription === 'mineur' ? 'Inscription mineur' : 'Inscription adulte'}<br />
          {data.source && <>Source : {sourceLabel}</>}
        </div>
      </div>

      {/* Identité */}
      <Section title="Identité" />
      <Row label="Nom et prénom" value={`${data.prenom} ${data.nom}`.trim() || '—'} />
      <Row label="Date de naissance" value={data.dateNaissance ? new Date(data.dateNaissance).toLocaleDateString('fr-FR') : '—'} />
      <Row label="Groupe sanguin" value={data.groupeSanguin || '—'} />
      <Row label="Allergie(s)" value={data.allergie || '—'} />

      {/* Coordonnées */}
      <Section title="Coordonnées" />
      <Row label="Adresse" value={data.adresse || '—'} />
      <Row label="Téléphone mobile" value={data.telMobile || '—'} />
      <Row label="Email" value={data.email || '—'} />
      <Row label="Contact urgence" value={data.urgenceContact || '—'} />

      {/* Parents / tuteurs */}
      {data.typeInscription === 'mineur' && (
        <>
          <Section title="Parent / Tuteur 1" />
          <Row label="Nom et prénom" value={`${data.parent1.prenom} ${data.parent1.nom}`.trim() || '—'} />
          <Row label="Email" value={data.parent1.email || '—'} />
          <Row label="Téléphone" value={data.parent1.tel || '—'} />
          {hasParent2 && (
            <>
              <Section title="Parent / Tuteur 2" />
              <Row label="Nom et prénom" value={`${data.parent2.prenom} ${data.parent2.nom}`.trim() || '—'} />
              <Row label="Email" value={data.parent2.email || '—'} />
              <Row label="Téléphone" value={data.parent2.tel || '—'} />
            </>
          )}
        </>
      )}

      {/* Disciplines */}
      <Section title="Discipline(s) choisie(s)" />
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{data.disciplines || '—'}</div>
      <Row label="Niveau actuel" value={data.niveau || '—'} />

      {/* Mode de règlement */}
      <Section title="Mode de règlement" />
      <Row label="Moyen de paiement" value={MOYEN_PAIEMENT_LABELS[data.moyenPaiement] ?? (data.moyenPaiement || '—')} />
      <Row label="Pass Sport 2026-2027" value={data.passSport ? 'Oui' : 'Non'} />

      {/* Autorisations */}
      <Section title="Autorisations" />
      <Row label="Droit à l'image" value={data.droitImage ? 'Accordé' : 'Refusé'} />
      <Row label="Autorisation parentale" value={data.typeInscription === 'mineur' ? (data.autorisationParentale ? 'Accordée' : 'Non accordée') : 'Non concerné'} />

      {/* Pied de page */}
      <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #e5e5e5', fontSize: 11, color: '#aaa' }}>
        Document généré automatiquement — Association Arts Martiaux Saint-Pierrois
      </div>
    </div>
  );
};
