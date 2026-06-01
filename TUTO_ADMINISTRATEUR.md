# Guide de l'administrateur — Site AMSP
### Pour gérer le site sans connaissances techniques

---

## Sommaire

1. [Se connecter à l'espace admin du site](#1-se-connecter-à-lespace-admin-du-site)
2. [Valider ou refuser une demande de membre](#2-valider-ou-refuser-une-demande-de-membre)
3. [Promouvoir un membre (admin ou admin de discipline)](#3-promouvoir-un-membre-admin-ou-admin-de-discipline)
4. [Lire le tableau des inscrits](#4-lire-le-tableau-des-inscrits)
5. [Saisir une inscription papier et créer un espace membre](#5-saisir-une-inscription-papier-et-créer-un-espace-membre)
6. [Modifier le contenu du site avec Sanity](#6-modifier-le-contenu-du-site-avec-sanity)
7. [Vérifier que les modifications sont bien en ligne](#7-vérifier-que-les-modifications-sont-bien-en-ligne)
8. [Modifier les emails automatiques avec EmailJS](#8-modifier-les-emails-automatiques-avec-emailjs)

---

## 1. Se connecter à l'espace admin du site

Le site est accessible à l'adresse :
**https://sandrinepichla.github.io/amsp-website**

**Étapes :**

1. Aller sur le site
2. Cliquer sur l'icône de personne en haut à droite → **"Se connecter"**
3. Entrer votre adresse email et votre mot de passe administrateur
4. Cliquer sur **"Se connecter"**

Une fois connecté, votre prénom apparaît en haut à droite.
Vous verrez un menu avec un **bouclier** → **"Gestion des membres"**

> Si vous ne voyez pas "Gestion des membres", votre compte n'a pas les droits admin.
> Contactez le développeur pour vérifier votre rôle dans Supabase.

---

## 2. Valider ou refuser une demande de membre

Lorsqu'une personne s'inscrit via la page **"Rejoindre l'espace membre"**, vous recevez un email de notification et son compte est mis **en attente**.

**Étapes pour valider :**

1. Connectez-vous à votre compte admin (voir section 1)
2. Cliquer sur l'icône bouclier en haut à droite → **"Gestion des membres"**
3. Dans la section **"En attente"**, vous voyez les demandes en attente
4. Pour chaque demande, vous avez deux boutons :
   - ✅ **Approuver** → la personne pourra se connecter à l'espace membre
   - ❌ **Refuser** → la personne ne pourra pas se connecter (elle en sera informée si elle retente de se connecter)

> Le badge orange sur "En attente" indique le nombre de demandes à traiter.

**Ce que voit le membre selon la décision :**
- **Approuvé** → il peut se connecter normalement
- **En attente** → message : *"Votre compte est en attente de validation"*
- **Refusé** → message : *"Votre demande a été refusée"*

---

## 3. Promouvoir un membre (admin ou admin de discipline)

Il existe deux niveaux d'administration :

| Rôle | Ce qu'il voit | Ce qu'il peut faire |
|------|---------------|---------------------|
| **Admin** | Tous les membres, toutes les disciplines | Tout gérer, exporter, modifier les rôles |
| **Admin de discipline** | Uniquement les membres et inscriptions de sa discipline | Valider/refuser les inscriptions, saisir des inscriptions papier |

### Promouvoir en admin complet

1. Aller dans **"Gestion des membres"** → ouvrir la fiche du membre → onglet **"Paramètres"**
2. Cliquer sur **"Promouvoir en admin"**
3. Confirmer

> ⚠️ Un administrateur complet peut gérer tous les membres du site. Ne donner ce rôle qu'à des personnes de confiance.

### Promouvoir en admin de discipline

1. Aller dans **"Gestion des membres"** → ouvrir la fiche → onglet **"Paramètres"**
2. Cliquer sur **"Admin discipline"**
3. Dans la fenêtre, **cocher la ou les disciplines** que cette personne gère
4. Confirmer

La discipline affectée apparaît en gris à côté du badge "Admin discipline" dans sa fiche.

L'admin de discipline se connecte normalement sur le site — il voit automatiquement **uniquement les inscrits de sa discipline**, avec le même tableau que l'admin complet.

Pour **retirer les droits**, onglet **"Paramètres"** → bouton **"Retirer les droits discipline"** (rouge).

---

## 4. Lire le tableau des inscrits

Le tableau de la page "Gestion des membres" présente chaque inscrit sur une ligne avec :

- **Un numéro** à gauche (position dans la liste filtrée courante) dont la couleur indique l'âge :
  - 🟢 **Vert** = adulte (≥ 18 ans)
  - 🔵 **Bleu** = mineur (< 18 ans)
  - ⚪ **Gris** = date de naissance non renseignée
- **Une colonne "Âge"** avec le badge Adulte ou Mineur
- Les enfants/mineurs apparaissent comme des **lignes séparées** (pas dans la fiche de leur parent)

### Colonnes du tableau

| Colonne | Ce qu'elle contient |
|---------|---------------------|
| **Membre** | Nom, prénom, email |
| **Statut** | Admin / Membre / En attente / Validée… |
| **Âge** | Adulte ou Mineur (calculé depuis la date de naissance) |
| **Disciplines actives** | Disciplines des inscriptions validées |
| **Accès web** | Bouton pour ouvrir la fiche ou créer un espace |

### Export Excel

Le bouton **"Exporter"** en haut de page génère un fichier Excel avec les colonnes dans cet ordre :
Numéro · Nom · Prénom · Date naissance · Type · Adresse · Téléphone · Email · Discipline(s) · Niveau · Groupe sanguin · Allergie(s) · Urgence · Paiement · Pass Sport · Droit image · Autorisation parentale · Parent 1 · Parent 1 email · Parent 1 tél · Parent 2 · Saison · Statut · Source · Reçue le

---

## 5. Saisir une inscription papier et créer un espace membre

### Saisir une inscription papier

1. Aller dans **"Gestion des membres"** → bouton **"+ Saisir inscription papier"**
2. Remplir le formulaire (choisir Adulte ou Mineur en haut)
3. Pour un **mineur** : renseigner les coordonnées du parent 1 (et éventuellement parent 2)
4. Cliquer sur **"Enregistrer"**

### Créer un espace membre

Après qu'une inscription est **validée**, vous pouvez créer un espace membre (accès galerie) :

1. Cliquer sur la ligne de l'inscrit → onglet **"Espace web"**
2. Selon le cas :

| Cas | Ce que vous voyez | Action |
|-----|-------------------|--------|
| Adulte | Bloc "Titulaire" avec son email | Cliquer **"Créer l'espace web"** |
| Mineur avec parent 1 | Bloc "Parent / tuteur 1" | Cliquer **"Créer l'espace web"** |
| Mineur avec parent 2 | Bloc "Parent / tuteur 2" (si email renseigné) | Cliquer **"Créer l'espace web"** |

> 💡 Pour des **parents divorcés**, vous pouvez créer un espace séparé pour chaque parent. Chacun aura ses propres identifiants pour se connecter.

Chaque parent reçoit automatiquement un email avec un lien pour définir son mot de passe.

Si un espace existe déjà, un bouton **"Renvoyer l'invitation / reset mot de passe"** permet de renvoyer le lien de connexion.

---

## 6. Modifier le contenu du site avec Sanity

Sanity est l'outil qui permet de modifier le contenu du site (textes, photos, actualités, disciplines, etc.) **sans toucher au code**.

### Se connecter à Sanity

1. Aller sur **https://www.sanity.io**
2. Cliquer sur **"Log in"** en haut à droite
3. Se connecter avec le compte Google ou email associé au projet AMSP
4. Une fois connecté, aller sur **https://amsp-admin.sanity.studio** (ou lancer Sanity en local — voir le guide technique)

### Ce que vous pouvez modifier

| Rubrique | Ce que vous pouvez faire |
|----------|--------------------------|
| **Disciplines** | Modifier les descriptions, photos, noms des disciplines |
| **Actualités** | Créer, modifier, supprimer des articles |
| **Galerie** | Ajouter des albums photos, les rendre privés ou publics |
| **Inscription** | Modifier les textes du formulaire d'inscription (règlement, infos paiement, autorisation parentale…) |
| **Paramètres** | Modifier l'adresse, le téléphone, l'email de contact, les horaires |

### Comment modifier un contenu

**Exemple : modifier le texte du règlement intérieur**

1. Dans Sanity Studio, cliquer sur **"Inscription"** dans le menu gauche
2. Cliquer sur le document existant
3. Trouver le champ **"Règlement intérieur"** et cliquer dessus
4. Modifier le texte directement
5. Cliquer sur **"Publish"** (bouton vert en bas ou en haut à droite)

> ⚠️ **Important : toujours cliquer sur "Publish"** après une modification. Tant que vous ne publiez pas, les changements ne sont pas visibles sur le site.

**Exemple : ajouter une actualité**

1. Cliquer sur **"Actualités"** dans le menu gauche
2. Cliquer sur le bouton **"+"** ou **"New"**
3. Remplir le titre, le texte, ajouter une image
4. Cliquer sur **"Publish"**

**Exemple : ajouter une photo dans la galerie**

1. Cliquer sur **"Galerie"** dans le menu gauche
2. Ouvrir l'album concerné (ou en créer un nouveau)
3. Cliquer sur le champ images → **"Add item"**
4. Glisser-déposer ou sélectionner les photos depuis votre ordinateur
5. Cliquer sur **"Publish"**

---

## 7. Vérifier que les modifications sont bien en ligne

### Pour les modifications de contenu Sanity

Après avoir cliqué sur **"Publish"** dans Sanity, attendre **30 secondes à 1 minute**, puis :

1. Aller sur le site : **https://sandrinepichla.github.io/amsp-website**
2. Appuyer sur **Ctrl + Maj + R** (Windows) pour vider le cache et forcer le rechargement
3. Naviguer vers la page modifiée pour vérifier

> Le contenu Sanity se met à jour automatiquement sur le site — pas besoin de redéployer.

### Pour les modifications de code (faites par le développeur)

Après un déploiement (`npm run deploy`), attendre **2 à 3 minutes**, puis :

1. Aller sur le site
2. Appuyer sur **Ctrl + Maj + R**
3. Si le site n'est pas à jour après 5 minutes, vider complètement le cache :
   - Chrome : **Ctrl + Maj + Suppr** → cocher "Images et fichiers en cache" → **Effacer**

### Comment savoir si un déploiement a eu lieu

Sur **https://github.com/SandrinePichla/amsp-website** :
1. Cliquer sur l'onglet **"Actions"**
2. La dernière ligne indique le dernier déploiement avec :
   - ✅ Cercle vert = déploiement réussi
   - ❌ Croix rouge = erreur lors du déploiement (contacter le développeur)
   - 🟡 Cercle orange = déploiement en cours

---

## 8. Modifier les emails automatiques avec EmailJS

EmailJS gère les emails envoyés automatiquement par le site :
- Email reçu quand quelqu'un remplit le formulaire d'**inscription**
- Email reçu quand quelqu'un crée un **compte membre**
- Email envoyé depuis le formulaire de **contact**

### Se connecter à EmailJS

1. Aller sur **https://www.emailjs.com**
2. Cliquer sur **"Sign In"** en haut à droite
3. Se connecter avec le compte associé au projet AMSP

### Modifier le contenu d'un email

1. Dans le menu gauche, cliquer sur **"Email Templates"**
2. Vous verrez la liste des templates :
   - **template pour les inscriptions** (reçu quand un membre remplit le formulaire d'inscription)
   - **template pour les notifications** (reçu quand quelqu'un crée un compte membre)
3. Cliquer sur le template à modifier
4. Modifier le sujet (**Subject**) et le corps du message
5. Les mots entre doubles accolades sont des variables automatiques — **ne pas les modifier** :
   - `{{nom}}` → sera remplacé par le nom de la personne
   - `{{email}}` → sera remplacé par son email
   - `{{disciplines}}` → sera remplacé par les disciplines choisies
   - etc.
6. Cliquer sur **"Save"** pour enregistrer

> Les modifications de templates sont actives **immédiatement**, sans redéployer le site.

### Tester un email

Dans un template EmailJS, cliquer sur **"Test It"** pour envoyer un email de test et vérifier le rendu.

### Quota d'emails

La version gratuite d'EmailJS permet **200 emails par mois**. Pour voir le nombre d'emails envoyés :
- Menu gauche → **"Dashboard"** → section **"Email Sent"**

Si vous dépassez 200 emails/mois, il faudra passer à un abonnement payant sur emailjs.com.

---

## Récapitulatif — Qui fait quoi

| Tâche | Outil | Compétences requises |
|-------|-------|----------------------|
| Valider/refuser des inscriptions | Site AMSP | Aucune |
| Saisir une inscription papier | Site AMSP | Aucune |
| Créer un espace membre (adulte ou parent) | Site AMSP | Aucune |
| Promouvoir un admin ou admin de discipline | Site AMSP | Aucune |
| Exporter les inscriptions en Excel | Site AMSP | Aucune |
| Modifier textes et photos | Sanity Studio | Aucune |
| Modifier les emails automatiques | EmailJS | Aucune |
| Modifier le code du site | VSCode + GitHub | Développeur |
| Déployer une mise à jour de code | Terminal | Développeur |
| Modifier les politiques d'accès Supabase | Supabase SQL Editor | Développeur |
