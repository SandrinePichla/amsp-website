# Guide de l'administrateur — Site AMSP
### Pour gérer le site sans connaissances techniques

---

## Sommaire

1. [Se connecter à l'espace admin du site](#1-se-connecter-à-lespace-admin-du-site)
2. [Valider ou refuser une demande de membre](#2-valider-ou-refuser-une-demande-de-membre)
3. [Promouvoir un membre en administrateur](#3-promouvoir-un-membre-en-administrateur)
4. [Modifier le contenu du site avec Sanity](#4-modifier-le-contenu-du-site-avec-sanity)
5. [Vérifier que les modifications sont bien en ligne](#5-vérifier-que-les-modifications-sont-bien-en-ligne)
6. [Modifier les emails automatiques avec EmailJS](#6-modifier-les-emails-automatiques-avec-emailjs)

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

## 3. Promouvoir un membre en administrateur

Pour donner les droits admin à un membre existant (il pourra gérer les autres membres) :

1. Aller dans **"Gestion des membres"**
2. Dans la section **"Membres actifs"**, cliquer sur le nom du membre pour dérouler sa fiche
3. Cliquer sur **"Promouvoir en admin"** (bouton bleu)
4. Une fenêtre de confirmation s'ouvre avec le nom et l'email du membre
5. Cliquer sur **"Confirmer"** pour valider

> ⚠️ Un administrateur peut gérer tous les membres du site. Ne donner ce rôle qu'à des personnes de confiance.

Pour **retirer les droits admin** d'un administrateur, même procédure → bouton **"Retirer les droits admin"** (rouge).

---

## 4. Modifier le contenu du site avec Sanity

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

## 5. Vérifier que les modifications sont bien en ligne

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

## 6. Modifier les emails automatiques avec EmailJS

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
| Valider/refuser des membres | Site AMSP | Aucune |
| Promouvoir un admin | Site AMSP | Aucune |
| Modifier textes et photos | Sanity Studio | Aucune |
| Modifier les emails automatiques | EmailJS | Aucune |
| Modifier le code du site | VSCode + GitHub | Développeur |
| Déployer une mise à jour de code | Terminal | Développeur |
