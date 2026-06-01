// Types Supabase centralisés pour le projet AMSP

export type Role = 'admin' | 'admin_discipline' | 'membre' | 'tiers' | 'en_attente' | 'refuse'

export type TypeAccesEnfant = 'parent' | 'tiers_galerie'

export type SourceAccesGalerie = 'suggestion_auto' | 'admin_manuel'

export type StatutInscription = 'en_attente' | 'validee' | 'refusee' | 'supprimee'

export type SourceInscription = 'en_ligne' | 'papier'

export type TypeInscription = 'adulte' | 'mineur'

export type MoyenPaiement = 'cheque_1x' | 'cheque_4x' | 'especes' | 'virement'

// ----------------------------------------------------------------
// Table profils
// ----------------------------------------------------------------
export interface Profil {
  id: string
  email: string
  prenom: string | null
  nom: string | null
  adresse: string | null
  telephone: string | null
  role: Role
  /** @deprecated Utiliser acces_galerie à la place */
  disciplines: string | null
  created_at: string
}

// ----------------------------------------------------------------
// Table enfants
// Profil persistant d'un enfant (sans compte auth).
// Rattaché à des adultes via liens_compte_enfant.
// ----------------------------------------------------------------
export interface Enfant {
  id: string
  nom: string
  prenom: string
  date_naissance: string | null
  groupe_sanguin: string | null
  allergie: string | null
  created_at: string
}

// ----------------------------------------------------------------
// Table liens_compte_enfant
// Associe un compte adulte à un enfant.
// ----------------------------------------------------------------
export interface LienCompteEnfant {
  id: string
  compte_id: string
  enfant_id: string
  type_acces: TypeAccesEnfant
  created_at: string
  // Relations (quand chargées avec select)
  enfant?: Enfant
  profil?: Profil
}

// ----------------------------------------------------------------
// Table acces_galerie
// Accès explicite aux galeries privées par discipline Sanity.
// ----------------------------------------------------------------
export interface AccesGalerie {
  id: string
  compte_id: string
  discipline_sanity_id: string
  actif: boolean
  source: SourceAccesGalerie
  inscription_id: string | null
  created_at: string
}

// ----------------------------------------------------------------
// Table inscriptions
// ----------------------------------------------------------------
export interface Inscription {
  id: string
  nom: string | null
  prenom: string | null
  email: string | null
  adresse: string | null
  tel_mobile: string | null
  date_naissance: string | null
  groupe_sanguin: string | null
  allergie: string | null
  niveau: string | null
  urgence_contact: string | null
  disciplines: string | null
  saison: string | null
  statut: StatutInscription | null
  source: SourceInscription | null
  type_inscription: TypeInscription | null
  pass_sport: boolean
  moyen_paiement: MoyenPaiement | null
  droit_image: boolean
  autorisation_parentale: boolean
  parent1_nom: string | null
  parent1_prenom: string | null
  parent1_email: string | null
  parent1_tel: string | null
  parent2_nom: string | null
  parent2_prenom: string | null
  parent2_email: string | null
  parent2_tel: string | null
  document_scan_url: string | null
  user_id: string | null
  enfant_id: string | null
  created_at: string
  // Relations (quand chargées avec select)
  enfant?: Enfant
}

// ----------------------------------------------------------------
// Vue combinée pour l'admin : profil + ses inscriptions
// ----------------------------------------------------------------
export type LigneAdmin =
  | { type: 'profil'; profil: Profil; inscriptions: Inscription[] }
  | { type: 'inscription_seule'; inscription: Inscription }

// ----------------------------------------------------------------
// Vue combinée pour l'espace membre : enfant + ses inscriptions
// ----------------------------------------------------------------
export interface EnfantAvecInscriptions {
  enfant: Enfant
  typeAcces: TypeAccesEnfant
  inscriptions: Inscription[]
}
