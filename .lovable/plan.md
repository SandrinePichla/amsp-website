

# Site Web — Association d'Arts Martiaux St Pierrois

## Design
- **Style sombre & martial** : fond noir/gris foncé, accents rouges et dorés, typographie élégante
- Design responsive (mobile, tablette, desktop)
- Navigation claire avec les disciplines mises en avant

## Pages publiques

### 1. Page d'accueil
- Hero section avec image de fond martial et nom de l'association
- Présentation rapide des 6 disciplines : Karaté Shotokan, Viet Vo Dao, Tai Chi Chuan, Aïkido, Wutao/Qi Gong, Épée
- Horaires résumés et appel à l'action vers l'inscription

### 2. Pages disciplines
- Une section par discipline avec description, horaires et professeur
- Karaté Shotokan, Viet Vo Dao, Tai Chi Chuan, Aïkido, Wutao - Qi Gong - Tai Chi Chuan, Épée

### 3. Planning
- Vue hebdomadaire des cours par discipline
- Filtrage par discipline
- Jours, horaires et salles affichés clairement

### 4. Inscription en ligne
- Formulaire simple : nom, prénom, email, téléphone, date de naissance, discipline(s) choisie(s), niveau (débutant/intermédiaire/avancé)
- Confirmation par email

### 5. Galerie photos
- Grille de photos organisées par catégorie/événement
- Lightbox pour visualiser en grand

### 6. Contact
- Formulaire de contact (nom, email, sujet, message)
- Adresse, plan d'accès, horaires d'accueil

## Espace membre (connexion requise)
- Voir son profil et ses inscriptions
- Consulter le planning personnalisé selon sa/ses discipline(s)
- Voir les actualités de l'association

## Espace administrateur (connexion requise)
- **Gestion du planning** : ajouter, modifier, supprimer des cours
- **Gestion des membres** : voir la liste des inscrits, valider les inscriptions, gérer les profils
- **Gestion de la galerie** : ajouter/supprimer des photos
- **Gestion du contenu** : modifier les textes des pages disciplines

## Backend (Supabase via Lovable Cloud)
- Authentification (inscription/connexion membres + rôle admin)
- Base de données : membres, planning, galeries, messages contact
- Stockage des photos de la galerie
- Système de rôles sécurisé (membre / admin)

