# Sauvegardes AMSP — organisation

Trois sauvegardes indépendantes, **toutes chiffrées** avec le même mot de passe (7-Zip, AES-256, noms de fichiers masqués). Le mot de passe est noté hors de l'ordinateur : **sans lui, aucune sauvegarde n'est lisible**.

| | Quoi | Quand | Où | Conservation |
|---|---|---|---|---|
| **1. PC — Supabase** | Structure complète + données de la base (`pg_dump`) | À l'ouverture de session Windows, 1×/jour max | `G:\Mon Drive\amsp\sauvegardes-supabase\supabase-AAAA-MM-JJ.7z` | 30 jours |
| **2. PC — Sanity** | Textes chaque jour ; export complet avec photos 1×/semaine | Idem | `G:\Mon Drive\amsp\sauvegardes-sanity\sanity-textes-….7z` et `sanity-complet-….7z` | Textes 30 jours ; complets : les 4 derniers |
| **3. Cloud — tout** | Structure + données Supabase (`pg_dump`), tables en JSON, comptes, textes Sanity ; photos 1×/mois | Chaque jour sur GitHub, **PC éteint ou non** : si 7 jours écoulés ou 5 nouvelles inscriptions | Dépôt privé GitHub `amsp-sauvegardes` → Actions → une exécution → Artifacts | 90 jours |

Le code du site est sauvegardé par GitHub (dépôt `amsp-website`).

## 1 et 2 — Scripts du PC
- `C:\Dev\AMSP\sauvegardes-supabase\backup-supabase.ps1` et `C:\Dev\AMSP\sauvegardes-sanity\backup-sanity.ps1`.
- Lancés par `backup-supabase-launcher.vbs` et `backup-sanity-launcher.vbs` dans le dossier Démarrage de Windows (`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`).
- Le dump Supabase se fait dans un dossier temporaire du PC, puis est chiffré : **rien n'arrive en clair sur Google Drive**.
- Mot de passe de la base : `%APPDATA%\postgresql\pgpass.conf`. Mot de passe des archives : `motDePasseArchives` dans `sauvegarde.config.local.json` (ce dossier).
- Journaux : `backup-log.txt` dans chaque dossier Google Drive.
- Anciennes versions (sans chiffrement) : fichiers `.avant-chiffrement` à côté des scripts.

## 3 — Cloud (GitHub Actions)
- Script : `sauvegarde.mjs --cloud --auto`, lu dans le dépôt public du site : **il doit être poussé sur GitHub** pour qu'une modification soit prise en compte.
- Workflow : `cloud/sauvegarde-cloud.yml`, copié dans le dépôt privé sous `.github/workflows/`.
- Secrets du dépôt privé (Settings → Secrets and variables → Actions) :
  - `SUPABASE_SECRET_KEY` : clé secrète Supabase (`sb_secret_…`) ;
  - `ARCHIVE_PASSWORD` : mot de passe des archives ;
  - `SUPABASE_DB_URL` : chaîne de connexion **Session pooler** (Supabase → Connect → Session pooler), mot de passe de la base compris. Le serveur direct n'a pas d'adresse IPv4, que GitHub ne sait pas joindre.
- Sans `SUPABASE_DB_URL`, la sauvegarde cloud **échoue volontairement** (la structure ne serait pas sauvegardée) et GitHub envoie un email.

## Sauvegarde manuelle (avant une modification de la base)
Ouvrir une nouvelle session Windows suffit (une fois par jour). Pour forcer tout de suite :
- PC : supprimer l'archive du jour `supabase-AAAA-MM-JJ.7z`, puis lancer `powershell -ExecutionPolicy Bypass -File C:\Dev\AMSP\sauvegardes-supabase\backup-supabase.ps1` ;
- cloud : dépôt `amsp-sauvegardes` → Actions → « Sauvegarde AMSP (cloud) » → **Run workflow**.

`node scripts/sauvegarde/sauvegarde.mjs` (sans `--cloud`) fonctionne aussi sur le PC (tables en JSON + textes et photos Sanity, dans `backups\automatiques` et `G:\Mon Drive\AMSP-sauvegardes`), mais **sans la structure** de la base, sauf à renseigner `urlBaseDeDonnees` dans la configuration.

## Si une clé ou un mot de passe change
- Clé secrète Supabase : `sauvegarde.config.local.json` **et** secret `SUPABASE_SECRET_KEY`.
- Mot de passe de la base : `pgpass.conf` **et** secret `SUPABASE_DB_URL`.
- Mot de passe des archives : `sauvegarde.config.local.json` **et** secret `ARCHIVE_PASSWORD` (les anciennes archives restent lisibles avec l'ancien mot de passe).

## Relire / restaurer
1. Ouvrir l'archive avec 7-Zip et le mot de passe (cloud : télécharger l'artifact, un `.zip` qui contient le `.7z`).
2. **Base Supabase** : sur une base vide, exécuter `schema.sql` puis `data.sql` (psql ou SQL Editor). Les comptes (schéma `auth`) sont inclus ; les mots de passe des membres aussi (chiffrés par Supabase), donc ils pourront se reconnecter normalement.
3. **Sanity** (depuis `amsp-admin`) : `npx sanity dataset import <fichier .tar.gz ou .ndjson> production --replace`. Le `.tar.gz` (sauvegarde complète) contient aussi les photos.
4. **Supprimer les fichiers extraits** après usage : ils sont en clair (données personnelles, dont des mineurs).
