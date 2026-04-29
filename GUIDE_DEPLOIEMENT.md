# Guide de déploiement — Site AMSP

## Prérequis (à installer une seule fois)

- **Node.js** (version 18 ou supérieure) — https://nodejs.org
- **Git** — https://git-scm.com
- **VSCode** — https://code.visualstudio.com
- Un compte **GitHub** avec accès au dépôt `sandrinepichla/amsp-website`

---

## 1. Ouvrir le projet dans VSCode

1. Ouvrir VSCode
2. `Fichier` → `Ouvrir le dossier` → sélectionner `C:\Dev\AMSP\amsp-project\amsp-website`
3. Ouvrir le terminal intégré : `Ctrl + ù` (ou menu `Terminal` → `Nouveau terminal`)

---

## 2. Lancer le serveur de développement (pour tester en local)

Dans le terminal :

```
npm run dev
```

Puis ouvrir dans le navigateur : **http://localhost:8080**

Le serveur se met à jour automatiquement à chaque modification de fichier.
Pour l'arrêter : `Ctrl + C` dans le terminal.

---

## 3. Modifier le code

- Modifier les fichiers dans `src/`
- Le navigateur se recharge automatiquement
- Vérifier le résultat sur http://localhost:8080 avant de déployer

---

## 4. Déployer sur le site en ligne (GitHub Pages)

> Le site est hébergé sur GitHub Pages à l'adresse :
> **https://sandrinepichla.github.io/amsp-website**

### Étape 1 — Enregistrer les modifications dans Git

Dans le terminal VSCode :

```
git add .
git commit -m "Description de ce que tu as modifié"
```

Exemples de messages de commit :
- `"Ajout du champ code postal dans le formulaire d'inscription"`
- `"Correction affichage mobile du header"`

### Étape 2 — Déployer

```
npm run deploy
```

Cette commande :
1. Compile le projet (`npm run build`)
2. Publie le dossier `dist/` sur la branche `gh-pages` de GitHub

Attendre 1 à 2 minutes puis actualiser le site.

### Étape 3 — Pousser le code source sur GitHub (optionnel mais recommandé)

```
git push origin main
```

Cela sauvegarde le code source sur GitHub (en plus du site déployé).

---

## 5. Mises à jour Supabase

> Supabase gère les comptes membres, les inscriptions et les profils.
> Adresse : **https://supabase.com** → se connecter → projet AMSP

### Modifier des données (Table Editor)

1. Menu gauche → **Table Editor**
2. Sélectionner la table (`profils`, `inscriptions`…)
3. Cliquer sur une cellule pour la modifier directement
4. Valider avec `Entrée`

### Cas courants

| Action | Où |
|--------|-----|
| Changer le rôle d'un membre (`membre` / `admin`) | Table `profils` → colonne `role` → maintenant faisable depuis le site (Gestion des membres) |
| Voir les inscriptions | Table `inscriptions` |
| Supprimer un compte | Table `profils` → sélectionner la ligne → icône poubelle |

### Modifier la structure des tables (SQL Editor)

1. Menu gauche → **SQL Editor**
2. Écrire la commande SQL, par exemple :
   ```sql
   ALTER TABLE profils ADD COLUMN nouvelle_colonne text;
   ```
3. Cliquer sur **Run**

### Modifier les politiques d'accès (Row Level Security)

1. Menu gauche → **Authentication** → **Policies**
2. Sélectionner la table
3. Modifier ou créer une politique

---

## 6. EmailJS

> EmailJS envoie les emails automatiques (formulaire de contact, inscriptions, notifications admin).
> Adresse : **https://www.emailjs.com** → se connecter

### Modifier un template d'email

1. Menu gauche → **Email Templates**
2. Cliquer sur le template à modifier (`template_sbgtitc` pour les inscriptions, `template_konhz3s` pour les notifications admin)
3. Modifier le contenu HTML/texte
4. Cliquer **Save**

Les variables disponibles dans les templates sont entre doubles accolades : `{{nom}}`, `{{email}}`, `{{disciplines}}`…

### Identifiants utilisés dans le code

Les identifiants sont stockés dans le fichier **`.env`** à la racine du projet (jamais commité sur GitHub).
Si tu travailles sur un nouvel ordinateur, copie `.env.example` en `.env` et remplis les valeurs.

---

## 7. Contenu du site (Sanity CMS)

> Le contenu éditorial (disciplines, actualités, galerie, textes du formulaire…) est géré dans Sanity Studio.

### Lancer Sanity Studio en local

```
cd C:\Dev\AMSP\amsp-project\amsp-admin
npm run dev
```

Ouvrir : **http://localhost:3333**

### Modifier le contenu

- **Disciplines** : textes, images, descriptions
- **Actualités** : articles, photos
- **Galerie** : albums photos (privés ou publics)
- **Inscription** : textes du formulaire (règlement intérieur, infos paiement, autorisation parentale…)
- **Paramètres** : informations de contact, horaires

Les modifications sont publiées immédiatement sur le site (pas besoin de redéployer).

---

## Résumé rapide — Workflow type

```
1. Ouvrir VSCode + terminal
2. npm run dev          ← tester en local sur localhost:8080
3. Modifier les fichiers dans src/
4. Vérifier dans le navigateur
5. git add .
6. git commit -m "description"
7. npm run deploy       ← publier sur le site
8. git push origin main ← sauvegarder le code
```

---

## En cas de problème

| Problème | Solution |
|----------|----------|
| `npm run dev` ne démarre pas | Vérifier que Node.js est installé : `node -v` dans le terminal |
| `npm run deploy` échoue | Vérifier la connexion internet et les droits GitHub |
| Le site ne se met pas à jour | Vider le cache navigateur (`Ctrl + Maj + R`) et attendre 2 min |
| Erreur "permission denied" sur Git | Vérifier que tu es bien connectée à GitHub dans VSCode |
| Les emails n'arrivent pas | Vérifier le quota EmailJS (200 emails/mois en version gratuite) |
