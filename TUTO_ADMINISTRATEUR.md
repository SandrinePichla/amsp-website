# Guide de l'administrateur — Site AMSP
### Pour gérer le site sans connaissances techniques

---

## Sommaire

1. [Se connecter à l'espace admin du site](#1-se-connecter-à-lespace-admin-du-site)
2. [Valider ou refuser une demande de membre](#2-valider-ou-refuser-une-demande-de-membre)
3. [Promouvoir un membre (admin ou admin de discipline)](#3-promouvoir-un-membre-admin-ou-admin-de-discipline)
4. [Lire le tableau des inscrits](#4-lire-le-tableau-des-inscrits)
5. [Saisir et suivre les règlements](#5-saisir-et-suivre-les-règlements)
6. [Saisir une inscription papier et créer un espace membre](#6-saisir-une-inscription-papier-et-créer-un-espace-membre)
7. [Modifier une inscription (papier ou en ligne)](#7-modifier-une-inscription-papier-ou-en-ligne)
8. [Modifier le contenu du site avec Sanity](#8-modifier-le-contenu-du-site-avec-sanity)
9. [Vérifier que les modifications sont bien en ligne](#9-vérifier-que-les-modifications-sont-bien-en-ligne)
10. [Modifier les emails automatiques avec EmailJS](#10-modifier-les-emails-automatiques-avec-emailjs)

---

## 1. Se connecter à l'espace admin du site

Le site est accessible à l'adresse :
**https://clubamsp.fr**

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
| **Statut** | Validée, À valider… (masquée dans l'onglet "Validés", où toutes les lignes ont le même statut) |
| **Âge** | Adulte ou Mineur (calculé depuis la date de naissance) |
| **Disciplines** | Disciplines de l'inscription |
| **Urgence · Pass Sport · Droit image** | Informations de la fiche d'inscription |
| **Encaissé (foyer)** | Total des règlements reçus pour le foyer (personnes qui partagent au moins un règlement). Cliquable : ouvre le panneau de règlement |
| **Reste dû** | Montant théorique du foyer moins l'encaissé. Un montant négatif signale un trop-perçu. Cliquable : ouvre le panneau de règlement |

En bas du tableau, une ligne de **totaux** affiche le théorique, l'encaissé et le reste dû de toutes les inscriptions validées. Les totaux sont calculés par foyer, donc un règlement partagé par une famille n'est compté qu'une fois.

### Export Excel

Le bouton **"Exporter"** en haut de page génère un fichier Excel de **10 feuilles**, regroupées par couleur d'onglet et toutes triées par nom puis prénom :

| Feuille | Contenu |
|---------|---------|
| 🟢 **Identité** | Coordonnées et informations générales des inscrits validés |
| 🟢 **Santé & urgence** | Groupe sanguin, allergies, contact d'urgence |
| 🟢 **Autorisations** | Droit à l'image, autorisation parentale, Pass Sport |
| 🟢 **Règlements** | Une ligne par règlement, classée par trimestre : Personnes concernées, Mode, N° chèque, puis le montant dans la colonne de son statut (**Montant reçu**, **Remis en banque** ou **Montant en attente**). Sous-totaux par trimestre et total général |
| 🟢 **Bilan par foyer** | Une ligne par foyer : Activités, Théorique, Encaissé, Remboursé, Écart accepté, Reste dû (−) / Trop-perçu (+), Remis en banque. La colonne Activités sert à filtrer ; pour des totaux par activité, utiliser la Synthèse par activité |
| 🟢 **Répartition par activité** | Une ligne par personne et par activité, avec les montants ventilés : le théorique de chaque personne est réparti entre ses activités au prorata du prix de chacune pratiquée seule, et l'encaissé du foyer de la même façon |
| 🟢 **Synthèse par activité** | Une ligne par activité : adhérents (dont adultes, dont mineurs), Théorique, Encaissé, Remboursé, Écart accepté, Remis en banque, Reste dû / Trop-perçu, et une ligne TOTAL égale au total du Bilan par foyer |
| 🟢 **Remboursements et écarts** | La liste des opérations de solde (type, personne, mode, montant, statut, motif, auteur), avec le total remboursé, le total à rembourser et les totaux des écarts acceptés. Puis la **liste de travail** : les **trop-perçus à traiter** et les **petits restes dus de 5 € ou moins** |
| 🟠 **En attente de règlement** | Identité des dossiers "À valider" |
| 🔴 **Refusées et supprimées** | Identité des dossiers refusés ou supprimés, pour garder un historique complet |

> 💡 Seules les inscriptions **validées** entrent dans les feuilles Règlements et Bilan par foyer, comme sur le site. Tous les montants sont au format monétaire Excel (pas du texte) : ils restent utilisables dans des calculs. Chaque feuille a des filtres sur ses en-têtes.

---

## 5. Saisir et suivre les règlements

### Les 3 statuts d'un règlement

Chaque règlement (chèque, espèces ou virement) a un statut, sur le modèle du bordereau de remise en banque :

| Statut | Signification |
|--------|---------------|
| **Attendu** | Le règlement est annoncé mais pas encore en main. Il ne compte pas dans l'encaissé |
| **Reçu** | Le règlement est en main mais pas encore déposé. Il compte dans l'encaissé |
| **Remis en banque** | Le règlement a été déposé à la banque |

### Le panneau de règlement d'une personne

On l'ouvre avec le bouton **"Règlements"** (disponible dès l'onglet **"À valider"**, donc avant la validation) ou en cliquant sur **Encaissé** / **Reste dû** dans le tableau.

- L'en-tête affiche en permanence le **montant théorique**, l'**encaissé** et le **reste dû** du foyer.
- Les **4 trimestres** sont toujours proposés, quel que soit le mode de paiement coché sur la fiche d'inscription.
- On peut enregistrer **plusieurs règlements par trimestre**, de modes différents (ex : un chèque et des espèces).
- **"+ Ajouter un règlement"** enchaîne les saisies sans fermer le panneau. Après chaque enregistrement, le mode revient sur "chèque".
- Le **crayon** sur une ligne permet de corriger un règlement déjà saisi.
- Pour le **Karaté**, choisir la tranche d'âge (le prix de chaque tranche est affiché à côté), puis cliquer sur **"Enregistrer le montant suggéré"**. Un lien **"réinitialiser"** permet de corriger une erreur de tranche.

> ⚠️ **Karaté : la tranche d'âge est obligatoire pour obtenir le montant théorique.** Tant qu'elle n'est pas choisie, le théorique et le reste dû restent vides, sur le site comme dans l'export Excel. Le choix n'est conservé qu'après le clic sur "Enregistrer le montant suggéré" : si le panneau est fermé avant, il faut recommencer.

- Le montant théorique est calculé à partir de la grille tarifaire Sanity, remise famille comprise. Il est indicatif : le crayon à côté permet de le remplacer à la main (ex : arrivée en cours d'année), et un lien permet de revenir au calcul automatique.

### Solder un foyer : écart accepté ou remboursement

Quand le reste dû d'un foyer n'est pas à zéro, un lien **"Solder…"** apparaît sous les montants du panneau de règlement. Deux cas, de nature comptable différente :

| Cas | Ce qui se passe |
|-----|-----------------|
| **Accepter l'écart** (petit reste dû ou petit trop-perçu, ex : centimes d'arrondi) | Saisir un motif ("Arrondi des chèques" par défaut), puis **"Accepter l'écart"**. **Aucun argent ne bouge** : le club renonce aux quelques euros manquants, ou garde le petit trop-perçu. Le foyer est soldé, l'encaissé et le remis en banque ne changent pas. **Au-delà de 5 €**, une case de confirmation est obligatoire |
| **Rembourser le trop-perçu** | Montant (proposé automatiquement), mode (virement, chèque avec son numéro, espèces) et statut : **"À rembourser"** (décidé) ou **"Remboursé"** (fait). Seul un remboursement fait diminue l'encaissé et solde le foyer. Le lien **"Marquer remboursé"** le fait passer de l'un à l'autre |

> 💡 Les opérations enregistrées s'affichent sous les montants du foyer. Chacune peut être **annulée**, et tout est tracé dans le journal. Dans le tableau des membres, un foyer soldé par un écart affiche "✓" à côté de son reste dû.

### Pour le comptable : faire une remise en banque

Le statut de chaque règlement permet de savoir à tout moment ce qui est **en main** ("Reçu") et ce qui est **déjà à la banque** ("Remis en banque"), comme sur un bordereau de remise.

1. Onglet **"Règlements"** → choisir le **trimestre**, puis le mode **"Chèque"** (ou "Espèces").
2. Les règlements à déposer sont ceux au statut **"Reçu"** (badge vert).
3. **Cocher** les règlements qui partent à la banque. Un bandeau "N sélectionnés" apparaît en haut du tableau.
4. Cliquer sur **Marquer "Remis en banque"** (bouton bleu). Les lignes passent au statut "Remis en banque" (badge bleu).
5. Pour contrôler : bouton **"Exporter"** → onglet **Règlements** du fichier Excel. Chaque montant y figure dans une seule des trois colonnes **Montant reçu** (en main, pas encore déposé), **Remis en banque** ou **Montant en attente** (annoncé, pas encore reçu), avec un sous-total par trimestre et un total général, à rapprocher du bordereau et du relevé de compte. L'onglet **Bilan par foyer** reprend le total remis en banque de chaque foyer.

> 💡 **Une erreur ?** Cliquer sur le badge de statut d'une ligne la fait passer à l'état suivant (En attente → Reçu → Remis en banque → En attente…). Un **virement** arrive directement sur le compte : on peut le marquer "Remis en banque" dès sa saisie.

> ⚠️ L'onglet "Règlements" et l'export Excel ne comptent que les inscriptions **validées**. Un chèque d'un dossier encore "À valider" n'y apparaît pas : pour le marquer "Remis en banque", passer par le bouton **"Règlements"** de ce dossier, ou valider d'abord l'inscription.

### Rattacher une personne à un foyer

Un foyer regroupe les personnes dont la remise famille, l'encaissé et le reste dû sont calculés ensemble. Deux personnes forment un foyer dès qu'elles partagent un règlement, ou quand un admin les rattache. Le rattachement sert notamment pour un membre de la famille inscrit quelques mois plus tard, qui paie ses propres règlements.

1. Ouvrir le panneau de règlement de la personne → **"Rattacher à un foyer…"**.
2. Rechercher un membre du foyer (même saison) et le choisir.
3. Vérifier le tableau **Avant / Après** des montants théoriques. La case **"Garder les montants actuels des personnes déjà dans le foyer"** (cochée par défaut) réserve la remise famille à l'arrivant ; décochée, la remise est recalculée pour tout le foyer, et un trop-perçu peut apparaître.
4. **"Confirmer le rattachement"**.

Le lien **"Détacher du foyer"** corrige une erreur. Une personne qui partage encore un règlement avec le foyer y reste liée tant que ce règlement est partagé. Rattachements et détachements sont tracés dans le journal.

### L'onglet "Règlements" (vue d'ensemble)

| Pour… | Faire… |
|-------|--------|
| Voir les règlements d'un trimestre | Choisir l'un des 4 onglets trimestre, puis filtrer si besoin par mode (chèque / espèces / virement) |
| Repérer un trimestre oublié | Les lignes sans règlement sur un trimestre échu sont surlignées en orange (alerte non bloquante) |
| Changer le statut de plusieurs règlements d'un coup (ex : dépôt d'un lot de chèques) | Cocher les lignes puis **"Marquer reçu"** ou **"Marquer remis en banque"** |
| Saisir un code Pass Sport | Bouton **"Codes Pass Sport"** : une ligne par personne, enregistrement automatique en quittant le champ |

---

## 6. Saisir une inscription papier et créer un espace membre

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

## 7. Modifier une inscription (papier ou en ligne)

Une erreur de saisie, une adresse qui change, un numéro de téléphone à jour... vous pouvez corriger une inscription à tout moment, qu'elle ait été saisie sur papier ou remplie en ligne par l'adhérent.

**Étapes :**

1. Trouver l'inscription :
   - **Pas encore validée** (onglet "Dossiers à examiner" ou "À valider") → elle apparaît directement dans la liste
   - **Déjà validée** → ouvrir la fiche du membre → onglet **"Adhésions"** → cliquer sur la ligne de l'inscription pour la déplier
2. Cliquer sur le bouton **"Modifier"** (icône crayon)
3. Une fenêtre de confirmation s'affiche → cliquer sur **"Modifier"** pour continuer (cela évite les modifications faites par erreur)
4. Corriger les champs souhaités, puis cliquer sur **"Enregistrer les modifications"**

> ⚠️ **Une fois l'inscription validée**, certains champs sont grisés (non modifiables) car le compte membre et les accès en dépendent déjà : **type Adulte/Mineur, disciplines, saison, mode de règlement**. Pour changer l'un de ces champs sur une inscription déjà validée, contactez le développeur. L'email suit une règle à part (voir ci-dessous).
>
> Restent toujours modifiables, même après validation : **nom, prénom, date de naissance, nom et prénom du parent 1, adresse, téléphone (mobile, contact d'urgence, et téléphone du parent 1), groupe sanguin, allergies, niveau, informations du parent 2, droit à l'image, autorisation parentale, Pass Sport, document scanné**.
>
> 💡 Le mode de règlement coché sur la fiche est verrouillé, mais la saisie des règlements reste libre : les 4 trimestres sont toujours proposés dans le panneau de règlement (voir section 5).

### Corriger le nom, le prénom ou la date de naissance

- Le **compte membre** est renommé automatiquement : celui de la personne pour un adulte, celui du parent 1 pour un mineur.
- Le site vérifie qu'une **autre inscription** ne porte pas déjà ce nom, ce prénom et cette date de naissance sur la saison.
- Une date de naissance qui ferait passer la personne d'**adulte à mineur** (ou l'inverse) est refusée : le titulaire du compte changerait. Dans ce cas, contactez le développeur.
- Pour un karatéka, une nouvelle date de naissance peut changer la **tranche d'âge** : un message rappelle de vérifier le montant théorique dans le panneau de règlement.

> 💡 **Toutes les corrections sont tracées** : date, admin, champ, ancienne et nouvelle valeur. L'historique s'affiche en bas de la fenêtre "Modifier". Une correction faite par erreur peut donc toujours être rattrapée.

### Changer une adresse email

- **Si l'adresse ne sert à aucun espace membre**, le champ est modifiable directement, comme les autres.
- **Si c'est l'email de connexion d'un espace membre** (adhérent, parent 1 ou parent 2), le champ est grisé. Cliquer sur **"Changer l'email de connexion…"** sous le champ, saisir la nouvelle adresse, puis **"Envoyer le lien de confirmation"**.
- La personne reçoit un lien sur sa nouvelle adresse, et l'ancienne adresse est prévenue. **Le changement n'est effectif qu'après son clic** ; d'ici là, elle se connecte avec l'ancien email. Son mot de passe ne change pas.
- Au clic, le compte, les inscriptions de toutes les saisons et le journal sont mis à jour automatiquement.
- **L'adhérent peut aussi le faire lui-même**, depuis sa page "Mon profil" (rubrique "Adresse mail de connexion"), en confirmant avec son mot de passe actuel. Il reçoit les mêmes emails, et sa demande est tracée dans le journal avec la mention "l'adhérent lui-même". **La messagerie du club (contact@clubamsp.fr) reçoit un email d'alerte** (ancienne → nouvelle adresse) ; les adresses personnelles des admins ne sont jamais utilisées, pour penser à refaire l'export Excel. C'est la seule donnée que l'adhérent peut modifier lui-même, avec son mot de passe : nom, adresse postale et téléphone ne se corrigent que par un admin.

> ⚠️ **Seule une adresse inconnue du site est acceptée.** Le site refuse une adresse déjà utilisée par un autre compte, ou portée par l'inscription d'une autre personne : deux personnes ne sont jamais fusionnées par un changement d'email. Toutes les inscriptions qui portaient l'ancienne adresse prennent automatiquement la nouvelle. Un changement vers une adresse déjà demandée par un autre compte (pas encore confirmée) est aussi refusé. Si la personne ne reçoit pas le lien (faute de frappe), il suffit de refaire la demande avec la bonne adresse : tant que personne n'a cliqué, rien n'a changé.

---

## 8. Modifier le contenu du site avec Sanity

Sanity est l'outil qui permet de modifier le contenu du site (textes, photos, actualités, disciplines, etc.) **sans toucher au code**.

### Se connecter à Sanity

1. Aller directement sur **https://amsp-admin.netlify.app**
2. Se connecter avec le compte Google ou email associé au projet AMSP

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

## 9. Vérifier que les modifications sont bien en ligne

### Pour les modifications de contenu Sanity

Après avoir cliqué sur **"Publish"** dans Sanity, attendre **30 secondes à 1 minute**, puis :

1. Aller sur le site : **https://clubamsp.fr**
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

## 10. Modifier les emails automatiques avec EmailJS

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
| Modifier une inscription (papier ou en ligne) | Site AMSP | Aucune |
| Saisir et suivre les règlements par trimestre | Site AMSP | Aucune |
| Changer l'email de connexion d'un adhérent | Site AMSP | Aucune |
| Faire une remise en banque (comptable) | Site AMSP | Aucune |
| Solder un foyer (écart accepté ou remboursement) | Site AMSP | Aucune |
| Rattacher une personne à un foyer (ou l'en détacher) | Site AMSP | Aucune |
| Créer un espace membre (adulte ou parent) | Site AMSP | Aucune |
| Promouvoir un admin ou admin de discipline | Site AMSP | Aucune |
| Exporter les inscriptions en Excel | Site AMSP | Aucune |
| Modifier textes et photos | Sanity Studio | Aucune |
| Modifier les emails automatiques | EmailJS | Aucune |
| Modifier le code du site | VSCode + GitHub | Développeur |
| Déployer une mise à jour de code | Terminal | Développeur |
| Modifier les politiques d'accès Supabase | Supabase SQL Editor | Développeur |
