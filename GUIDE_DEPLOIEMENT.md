# Guide développeur et déploiement — Site AMSP

*Mis à jour le 21 octobre 2026. Document technique, à ne pas publier sur le site (ce fichier n'est pas dans `public/`).*

À destination de la personne qui maintient le site : comment les outils s'imbriquent, comment travailler, déployer, faire évoluer la base, et ce qui tourne tout seul (sauvegardes, maintien en activité).

---

## Sommaire

0. [Vue d'ensemble](#0-vue-densemble)
1. [Prérequis](#1-prérequis-à-installer-une-seule-fois)
2. [Travailler en local](#2-travailler-en-local)
3. [Organisation du code](#3-organisation-du-code)
4. [Vérifier avant de déployer](#4-vérifier-avant-de-déployer)
5. [Déployer](#5-déployer-sur-le-site-en-ligne)
6. [Supabase : base, migrations, règles d'accès](#6-supabase--base-migrations-règles-daccès)
7. [Supabase : fonctions serveur (Edge Functions)](#7-supabase--fonctions-serveur-edge-functions)
8. [Supabase : authentification](#8-supabase--authentification)
9. [Brevo : emails](#9-brevo--emails)
10. [Sanity : contenu](#10-sanity--contenu)
11. [Sauvegardes](#11-sauvegardes)
12. [Tâches automatiques (récapitulatif)](#12-tâches-automatiques-récapitulatif)
13. [Clés et secrets : qui est où](#13-clés-et-secrets--qui-est-où)
14. [En cas de problème](#14-en-cas-de-problème)

---

## 0. Vue d'ensemble

| Service | Rôle | Où c'est géré |
|---|---|---|
| **Site** (React + TypeScript + Vite) | Site public, formulaire d'inscription, espace membre (« Mon profil »), gestion des membres | Ce dépôt (`amsp-website`, **public** sur GitHub). Hébergé sur GitHub Pages : https://clubamsp.fr |
| **Supabase** | Comptes, authentification, inscriptions, règlements, foyers, journal, accès galerie | https://supabase.com → projet `nlztcbltrxatqxjgjuvq`. Plan gratuit |
| **Sanity** | Contenu éditorial : disciplines, actualités, galerie, textes du formulaire, grille tarifaire, paramètres (dont l'email du club) | Studio dans le dépôt `amsp-admin` (https://amsp-admin.netlify.app). Données : projet `t7u49x1d`, dataset `production` |
| **Brevo** | Emails automatiques du site + relais SMTP des emails d'authentification Supabase | https://www.brevo.com |
| **GitHub Actions** | Maintien en activité de Supabase, sauvegarde dans le cloud | Dépôts `amsp-website` et `amsp-sauvegardes` (privé) |
| **Identifiants** | Comptes et mots de passe des services | Fichier séparé `IDENTIFIANTS_ACCES.html`, jamais commité ni publié |

En résumé : le **code** se modifie dans VS Code et se déploie sur GitHub Pages ; le **contenu** (textes, photos, tarifs) se modifie dans Sanity, sans redéploiement ; les **données des adhérents** vivent dans Supabase ; les **emails** partent par Brevo.

---

## 1. Prérequis (à installer une seule fois)

- **Node.js 20** (installé via nvm-windows : `C:\nvm4w\nodejs20\nodejs`), **Git**, **VS Code**.
- Accès GitHub au dépôt `SandrinePichla/amsp-website` (et `amsp-sauvegardes`, privé).
- Pour les sauvegardes du PC : **7-Zip** et **PostgreSQL client** (installés via scoop : `C:\Users\sandr\scoop\`), Google Drive pour ordinateur (lecteur `G:`).
- Fichier **`.env`** à la racine (jamais commité) : copier `.env.example` et renseigner `VITE_BREVO_ADMIN_EMAIL` et les numéros de templates Brevo.

---

## 2. Travailler en local

```
cd C:\Dev\AMSP\amsp-project\amsp-website
npm install          (la première fois, ou après une mise à jour des dépendances)
npm run dev          → http://localhost:8080
```

Le site local utilise la **vraie base Supabase** : une manipulation faite en local (validation, règlement, changement d'email…) est réelle. Tester sur des inscriptions de test (ex. « TEST PICHLA »).

---

## 3. Organisation du code

| Fichier | Rôle |
|---|---|
| `src/pages/AdminMembres.tsx` | Gestion des membres : onglets, tableaux, vue Foyer, fenêtre « Modifier », export Excel (`handleExportCSV`, 11 feuilles), changement d'email par un admin |
| `src/components/ReglementsPanel.tsx` | Panneau de règlement d'un adhérent : règlements par trimestre, montant théorique (crayon + aide au prorata), « Solder… », rattachement à un foyer, simulateur « Changement en cours d'année » et son historique |
| `src/lib/reglements.ts` | **Tous les calculs financiers** : foyer (`getFoyerIds`), théorique, encaissé, bilan, solde (remboursements / écarts), changements d'activité, prorata, répartition par activité. Testé par `reglements.test.ts` |
| `src/lib/tarifs.ts` | Lecture de la grille tarifaire Sanity, remises |
| `src/lib/changerEmail.ts` | Appel de la fonction serveur `changer-email` |
| `src/pages/Profil.tsx` | « Mon profil » de l'adhérent : titulaire, personnes inscrites, email de connexion, mot de passe |
| `src/contexts/AuthContext.tsx` | Session, rôle, accès galerie |
| `supabase/migrations/` | Scripts SQL de la base, à exécuter à la main (section 6) |
| `supabase/functions/` | Fonctions serveur (section 7) |
| `scripts/sauvegarde/` | Sauvegarde cloud (section 11) |
| `public/TUTO_ADMINISTRATEUR.html`, `public/PRESENTATION_ADMINISTRATEURS.html` | Documentation des admins, **publiées sur le site** |
| `TUTO_ADMINISTRATEUR.md` | Version Markdown du tuto admin (à garder synchronisée) |

### Règles métier codées (à connaître avant de toucher aux règlements)
- **Foyer** : personnes liées par un règlement partagé **ou** un rattachement explicite (`inscriptions.foyer_id`). Jamais déduit du compte de connexion.
- **Théorique** d'une personne = `montant_attendu` (saisi à la main ou figé) ou calcul de la grille Sanity avec remise famille, **+ somme des changements en cours d'année non annulés**.
- **Encaissé** = règlements « reçu » + « remis en banque » (pas « en attente »). **Reste dû** = théorique − (encaissé − remboursé) − écarts acceptés.
- **En cours d'année** : prorata au mois sur 10 mois (sept. → juin), mois commencé dû, prix de l'activité seule (sans réduction) ; le site suggère, l'admin corrige ; réservé au rôle `admin`.
- **Email** : on ne peut passer qu'à une adresse inconnue du site (ni compte, ni inscription d'une autre personne, ni demande en cours) — aucune fusion possible.

---

## 4. Vérifier avant de déployer

```
npm run test        → tests des calculs (src/lib/reglements.test.ts) : tous doivent passer
npx eslint src/pages/AdminMembres.tsx src/components/ReglementsPanel.tsx src/pages/Profil.tsx
npm run build       → doit se terminer par « built in … »
```

À savoir :
- `eslint` signale **2 erreurs anciennes** dans `AdminMembres.tsx` (fonctions `validatePapierTel` / `validatePapierEmail`, expression `a ? b() : c()`). Sans conséquence ; toute **nouvelle** erreur doit être corrigée.
- **Ni `eslint` ni `npm run build` ne détectent un composant ou une icône non importé** (ex. `<User />` sans import depuis `lucide-react`) : la page plante seulement dans le navigateur. Après avoir ajouté une icône, vérifier l'import, puis ouvrir la page en local.
- `npx tsc` ne fonctionne pas tel quel (option `ignoreDeprecations` du `tsconfig.app.json` refusée par la version installée). Pour un contrôle de types ponctuel, utiliser une copie du `tsconfig.app.json` sans cette ligne. Les erreurs `TS2503 namespace 'ExcelJS'` et celles sur `setCheques` / `setInscriptions` (props du panneau) sont anciennes et sans effet à l'exécution.

---

## 5. Déployer sur le site en ligne

```
git add .
git commit -m "Description de la modification"
git push origin main        → sauvegarde le code (et met à jour le script de sauvegarde cloud)
npm run deploy              → compile et publie dist/ sur la branche gh-pages
```

Le site est à jour 1 à 2 minutes après (`Ctrl + Maj + R` pour vider le cache). Suivi : GitHub → dépôt `amsp-website` → onglet **Actions** (« pages build and deployment »).

⚠️ **Tout fichier placé dans `public/` est publié sur le site**, même s'il est ignoré par git (le `.gitignore` n'empêche pas Vite de le copier). Ne jamais y mettre de document confidentiel.

Ordre conseillé quand une modification touche la base : **sauvegarde → SQL dans Supabase → test en local → commit/push → deploy**.

---

## 6. Supabase : base, migrations, règles d'accès

### Migrations
Les fichiers de `supabase/migrations/` s'exécutent **à la main**, dans **Supabase → SQL Editor → Run**, une seule fois chacun, dans l'ordre des dates. Chaque fichier commence par un commentaire qui explique son rôle et comment l'annuler. Avant toute migration : **sauvegarde** (section 11).

| Fichier | Contenu |
|---|---|
| `20260514_*` | Journal des connexions ; refonte familles/enfants/accès galerie ; règles d'accès des nouvelles tables |
| `20260601_*`, `20260609_*` | Règles d'accès admin de discipline et membres sur `profils` / `inscriptions` (fonction `get_auth_user_role`) |
| `20260911_*`, `20260911b_*`, `20260911c_*` | Numéros de chèque, chèques partagés (`cheque_echeances`), code Pass Sport |
| `20260911d_reset_donnees_test.sql` | ⛔ **Remise à zéro des données de test — NE JAMAIS RELANCER** (efface les adhésions) |
| `20260912_*` | Type de règlement (chèque / espèces / virement) |
| `20261016_*` | Plusieurs règlements par trimestre, statut, `inscriptions.montant_attendu` |
| `20261020_*` | Vérification de doublon : retrait du blocage « par compte » (fonction `check_inscription_doublon`) |
| `20261021_*` | Statut « remis en banque » |
| `20261022_*` | Table `journal_modifications` (qui a modifié quoi, quand) |
| `20261023_*` | **Déclencheur** `on_auth_user_email_change` sur `auth.users` : à la confirmation d'un changement d'email, recopie l'adresse dans `profils` et dans `inscriptions` (email, parent 1, parent 2), et l'inscrit au journal |
| `20261024_*` | Colonne `inscriptions.foyer_id` (rattachement explicite à un foyer) |
| `20261025_*` | Table `operations_solde` (remboursements, écarts acceptés) |
| `20261026_*` | Table `ajustements_activite` (changements d'activité en cours d'année) |
| `20261027_*` | Colonnes `annule_le` / `annule_par` (un changement annulé est conservé, sans compter) |

### Tables principales
| Table | Rôle |
|---|---|
| `profils` | Un compte de connexion (email, nom, rôle : `admin`, `admin_discipline`, `membre`, `tiers`, `en_attente`, `refuse`) |
| `inscriptions` | Une inscription d'une personne pour une saison (identité, santé, disciplines, statut, `montant_attendu`, `foyer_id`…) |
| `cheques` | Un règlement (type, numéro, montant, saison, statut `attendu` / `recu` / `depose`) |
| `cheque_echeances` | Lien règlement ↔ inscription ↔ trimestre (un règlement peut couvrir plusieurs personnes) |
| `operations_solde` | Remboursements et écarts acceptés d'un foyer |
| `ajustements_activite` | Changements d'activité en cours d'année (montant signé, activités avant, annulation) |
| `journal_modifications` | Historique des corrections (lecture et ajout pour les admins, pas de modification possible) |
| `acces_galerie`, `enfants`, `liens_compte_enfant` | Accès aux galeries privées, familles |
| `connexions_log` | Journal des connexions |

### Règles d'accès (RLS)
⚠️ **Critique — table `profils`** : une règle sur `profils` qui interroge `profils` (`EXISTS (SELECT 1 FROM profils …)`) provoque une **récursion infinie** qui bloque toute la table, connexion admin comprise. Toujours passer par la fonction `public.get_auth_user_role()` (SECURITY DEFINER) :
```sql
CREATE POLICY "exemple" ON une_table FOR ALL TO authenticated
  USING (public.get_auth_user_role() IN ('admin', 'admin_discipline'))
  WITH CHECK (public.get_auth_user_role() IN ('admin', 'admin_discipline'));
```
Si un bouton semble fonctionner mais que la donnée revient au rechargement, c'est presque toujours une règle d'accès manquante : Supabase bloque l'opération **sans renvoyer d'erreur**.

### Maintien en activité (plan gratuit)
Le plan gratuit met le projet en pause après ~7 jours sans requête. Le workflow `.github/workflows/supabase-keepalive.yml` (dépôt du site) l'interroge chaque lundi et jeudi à 6 h UTC. Rien à faire ; « Run workflow » pour le déclencher à la main.

---

## 7. Supabase : fonctions serveur (Edge Functions)

Fichiers dans `supabase/functions/`. Elles se déploient **depuis le tableau de bord** : Supabase → **Edge Functions** → la fonction → onglet **Code** → coller **tout** le fichier → **Deploy**. Modifier le fichier dans le dépôt ne suffit pas.

| Fonction | Rôle | Secrets utilisés |
|---|---|---|
| `send-email` | Envoie les emails à template Brevo (inscription, validation…) | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` |
| `changer-email` | Demande de changement d'email de connexion, par un admin (n'importe quel compte) ou par l'adhérent (son propre compte, depuis « Mon profil ») : vérifie les droits, refuse une adresse déjà connue du site ou déjà demandée, génère le lien de confirmation, envoie l'email à la nouvelle adresse, prévient l'ancienne, inscrit la demande au journal ; si c'est l'adhérent, alerte la **messagerie du club** (adresse lue dans Sanity → Paramètres, jamais les adresses personnelles des admins) | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, clé service (fournie automatiquement) |

Le changement d'email n'est effectif qu'au clic sur le lien ; c'est alors le déclencheur SQL (migration `20261023`) qui met tout à jour.

`changer-email` renvoie un numéro `version` (actuellement 9) : utile pour vérifier que la version déployée est la bonne.

---

## 8. Supabase : authentification

Supabase → **Authentication** :
- **Sign In / Providers → Email** : **« Secure email change » désactivé**. Sinon Supabase exige aussi un clic depuis l'ancienne adresse, ce qui bloque les personnes qui n'y ont plus accès (l'ancienne adresse est de toute façon prévenue par `changer-email`).
- **URL Configuration** : Site URL `https://clubamsp.fr` ; Redirect URLs : pages de réinitialisation du mot de passe et `/profil` (en ligne et `http://localhost:8080/…`).
- **Emails** : relais SMTP Brevo (section 9), pour lever la limite de 2 emails/heure du plan gratuit.

---

## 9. Brevo : emails

- **Emails du site** : 7 templates Brevo, appelés par la fonction `send-email` ; leurs numéros sont dans `.env` (`VITE_BREVO_TEMPLATE_…`). Modifier un texte : Brevo → Email → Templates → le template → Modifier → Enregistrer. Variables : `{{ params.nom }}`, etc.

  | N° | Template | Envoyé quand |
  |---|---|---|
  | 1 | Demande d'inscription | Au membre, à la soumission du formulaire |
  | 2 | Validation inscription | Au membre, quand un admin valide son inscription |
  | 3 | Validation espace membre | Au membre, quand son compte est approuvé |
  | 4 | Formulaire de contact | Au club, quand quelqu'un remplit le formulaire de contact |
  | 5 | Demande accès espace membre | Au club, quand quelqu'un demande un accès membre |
  | 6 | Refus inscription | Au membre, quand un admin refuse son inscription |
  | 7 | Nouvelle demande d'inscription (admin) | Au club, à chaque nouveau formulaire d'inscription |
- **Emails de `changer-email`** : texte écrit directement dans la fonction (pas de template).
- **Emails d'authentification Supabase** (mot de passe oublié, invitation) : via SMTP Brevo (`smtp-relay.brevo.com:587`), réglés dans Supabase → Project Settings → Auth → SMTP. Les identifiants sont dans `IDENTIFIANTS_ACCES.html`. La restriction d'IP Brevo doit rester **désactivée pour les clés SMTP** (Supabase utilise des IP variables).
- Diagnostic : Brevo → Transactionnel → **Logs** (un email absent des logs n'a pas été envoyé par Brevo).

---

## 10. Sanity : contenu

- Studio en ligne : https://amsp-admin.netlify.app ; en local : `cd C:\Dev\AMSP\amsp-project\amsp-admin` puis `npm run dev` (http://localhost:3333).
- Contenu publié immédiatement, sans redéployer le site.
- **Paramètres → email** : adresse de la messagerie du club (formulaire de contact et alertes de changement d'email).
- **Grille tarifaire** : sert au calcul du théorique. Règle du club : **ne pas modifier les tarifs en cours de saison** (tous les théoriques calculés changeraient).
- **Changer de saison** : Sanity → Inscription → champ Saison. ⛔ Ne pas utiliser le bouton « Remettre tous les membres en attente » de l'onglet Administration : il bloque la connexion de tous les adhérents (la refonte du passage de saison reste à faire).

---

## 11. Sauvegardes

Trois sauvegardes indépendantes, **chiffrées** avec le même mot de passe (7-Zip AES-256, noms de fichiers masqués). Le mot de passe est noté hors de l'ordinateur ; sans lui, rien n'est lisible. Détails : `scripts/sauvegarde/LISEZMOI.md`.

| | Contenu | Déclenchement | Emplacement | Conservation |
|---|---|---|---|---|
| **PC — Supabase** | Structure complète + données (`pg_dump`, schémas public, auth, storage) | Ouverture de session Windows, 1×/jour | `G:\Mon Drive\amsp\sauvegardes-supabase\supabase-AAAA-MM-JJ.7z` | 30 jours |
| **PC — Sanity** | Textes (chaque jour) ; complet avec photos (1×/semaine) | Idem | `G:\Mon Drive\amsp\sauvegardes-sanity\sanity-textes-….7z` / `sanity-complet-….7z` | 30 jours / 4 derniers |
| **Cloud** | Structure + données (`pg_dump`), tables JSON, comptes, textes Sanity ; photos 1×/mois | GitHub Actions, chaque jour à 11 h UTC : sauvegarde si 7 jours écoulés ou 5 nouvelles inscriptions — **PC éteint ou non** | Dépôt privé `amsp-sauvegardes` → Actions → exécution → Artifacts | 90 jours |

### PC
- Scripts : `C:\Dev\AMSP\sauvegardes-supabase\backup-supabase.ps1`, `C:\Dev\AMSP\sauvegardes-sanity\backup-sanity.ps1`, lancés par les `.vbs` du dossier Démarrage de Windows.
- Le dump est fait dans `%TEMP%`, chiffré, puis le dossier temporaire est supprimé : rien n'arrive en clair sur le Drive.
- Mots de passe : base dans `%APPDATA%\postgresql\pgpass.conf` ; archives dans `scripts/sauvegarde/sauvegarde.config.local.json` (ignoré par git).
- Journaux : `backup-log.txt` dans chaque dossier du Drive.

### Cloud
- Workflow `.github/workflows/sauvegarde-cloud.yml` du dépôt privé (modèle : `scripts/sauvegarde/cloud/sauvegarde-cloud.yml`). Il lit le script `scripts/sauvegarde/sauvegarde.mjs` **dans le dépôt public du site** : pousser les modifications du script sur GitHub.
- Secrets du dépôt privé : `SUPABASE_SECRET_KEY`, `ARCHIVE_PASSWORD`, `SUPABASE_DB_URL` (chaîne **Session pooler** : le serveur direct n'a pas d'IPv4, injoignable depuis GitHub). Sans `SUPABASE_DB_URL`, la sauvegarde échoue volontairement.
- `pg_dump` 17 (même version majeure que la base, PostgreSQL 17) installé à chaque exécution ; Ubuntu figé en 24.04.
- Un échec déclenche un email de GitHub.

### Restaurer
1. Ouvrir l'archive avec 7-Zip (cloud : télécharger l'artifact, un `.zip` qui contient le `.7z`).
2. Base : sur une base vide, exécuter `schema.sql` puis `data.sql`. Les comptes et leurs mots de passe (chiffrés par Supabase) sont inclus.
3. Sanity (depuis `amsp-admin`) : `npx sanity dataset import <fichier> production --replace`.
4. Supprimer ensuite les fichiers extraits (données personnelles en clair).

### Archive historique
`C:\Dev\AMSP\amsp-project\backups\amsp-sauvegardes-manuelles-octobre-2026.7z` (+ copie dans `G:\Mon Drive\AMSP-sauvegardes\`) : état d'avant la refonte d'octobre (base, Sanity avec photos, code). Jamais supprimée automatiquement.

---

## 12. Tâches automatiques (récapitulatif)

| Tâche | Où | Quand |
|---|---|---|
| Maintien en activité Supabase | GitHub Actions, dépôt `amsp-website` | Lundi et jeudi, 6 h UTC |
| Sauvegarde cloud | GitHub Actions, dépôt privé `amsp-sauvegardes` | Chaque jour, 11 h UTC |
| Sauvegardes Supabase et Sanity du PC | Dossier Démarrage de Windows | À l'ouverture de session, 1×/jour |
| Synchronisation des emails après changement | Déclencheur SQL dans Supabase | Au clic sur le lien de confirmation |

---

## 13. Clés et secrets : qui est où

| Secret | Où il est utilisé | À mettre à jour en cas de changement |
|---|---|---|
| Clé publique Supabase (`sb_publishable_…`) | `src/supabaseClient.ts`, workflow keepalive | Ces deux fichiers (elle n'est pas secrète) |
| Clé secrète Supabase (`sb_secret_…`) | Sauvegardes | `sauvegarde.config.local.json` **et** secret `SUPABASE_SECRET_KEY` du dépôt privé. Les Edge Functions la reçoivent automatiquement |
| Mot de passe de la base | Sauvegardes | `%APPDATA%\postgresql\pgpass.conf` **et** secret `SUPABASE_DB_URL` |
| Mot de passe des archives | Toutes les sauvegardes | `sauvegarde.config.local.json` **et** secret `ARCHIVE_PASSWORD` |
| Clé API Brevo, email expéditeur | Edge Functions | Supabase → Edge Functions → Secrets (`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`) |
| Identifiants SMTP Brevo | Emails d'authentification | Supabase → Project Settings → Auth → SMTP |

Ne jamais coller une clé secrète dans un fichier commité ni dans `public/`.

---

## 14. En cas de problème

| Problème | Piste |
|---|---|
| `npm run dev` ne démarre pas | `node -v` ; sinon `npm install` |
| Une page d'administration est blanche | Console du navigateur (F12) : souvent un composant ou une icône non importé (voir section 4) |
| Un bouton fonctionne mais la donnée revient au rechargement | Règle d'accès (RLS) manquante sur la table (section 6) |
| Un écran affiche une erreur après une mise à jour | Migration SQL pas encore exécutée dans Supabase (nouvelle table ou colonne inconnue) |
| Changement d'email : « Action réservée aux administrateurs » ou ancien comportement | Fonction `changer-email` pas redéployée (section 7) ; vérifier le numéro `version` |
| Changement d'email confirmé mais inscriptions non mises à jour | Déclencheur `on_auth_user_email_change` absent : exécuter `20261023_synchro_email_compte.sql` |
| Le lien de confirmation d'email « ne fait rien » | « Secure email change » réactivé, ou `/profil` absent des Redirect URLs (section 8) |
| Les emails n'arrivent pas | Brevo → Logs ; secrets `BREVO_*` dans Supabase ; SMTP (section 9) |
| La sauvegarde cloud échoue (email de GitHub) | Dépôt privé → Actions → l'exécution en rouge → lire l'étape fautive : secret manquant ou clé changée (section 13) |
| Pas de sauvegarde PC récente | `backup-log.txt` dans le dossier du Drive ; mot de passe des archives ou `pgpass.conf` |
| Le site ne se met pas à jour | `Ctrl + Maj + R` ; vérifier l'onglet Actions du dépôt |
