# Sauvegarde automatique AMSP

## Ce qui est sauvegardé
- **Supabase** : toutes les tables (inscriptions, règlements, comptes, journal…) et la liste des comptes membres (sans les mots de passe, que Supabase n'expose jamais).
- **Sanity** : tout le contenu (textes, disciplines, galerie, paramètres) et, dans une archive à part, les photos et documents.

Le code du site est déjà sauvegardé par GitHub.

## Quand
Le planificateur de tâches Windows lance chaque jour à 13 h (ou dès que l'ordinateur est rallumé) :

```
node scripts/sauvegarde/sauvegarde.mjs --auto
```

Une sauvegarde est faite si **7 jours** se sont écoulés depuis la précédente, **ou** si **5 nouvelles inscriptions** sont arrivées entre-temps. Sinon, rien.

Pour sauvegarder tout de suite (par exemple avant une modification de la base) :

```
node scripts/sauvegarde/sauvegarde.mjs
```

## Où
- `C:\Dev\AMSP\amsp-project\backups\automatiques\` (ordinateur) ;
- `G:\Mon Drive\AMSP-sauvegardes\` (Google Drive, 2e support).

Chaque sauvegarde est une archive **7-Zip chiffrée** (AES-256, noms de fichiers masqués) : `amsp-sauvegarde-AAAA-MM-JJ_HHhMM.7z`. Les photos sont dans `amsp-photos-….7z`, refaite seulement quand il y a de nouvelles photos.

Conservation : toutes les sauvegardes des 8 dernières semaines, puis une par mois pendant 12 mois ; les photos : les 2 dernières archives. Le reste est supprimé automatiquement.

Le fichier `journal-sauvegardes.log` (dans le dossier de l'ordinateur) indique chaque passage : sauvegarde faite, pas nécessaire, ou échec.

## Configuration
`sauvegarde.config.local.json` (à côté du script, **jamais envoyé sur GitHub**) contient la clé secrète Supabase et le mot de passe des archives. Modèle : `sauvegarde.config.exemple.json`.

- Si la clé Supabase est régénérée, la remplacer dans ce fichier, sinon les sauvegardes échouent (visible dans le journal).
- **Le mot de passe des archives doit être noté en lieu sûr** (hors de cet ordinateur) : sans lui, les sauvegardes sont illisibles.

## Relire / restaurer
1. Ouvrir l'archive avec 7-Zip et le mot de passe.
2. Contenu Sanity : `sanity dataset import production-export.ndjson production` (depuis le projet du Studio).
3. Supabase : recréer la structure avec les fichiers de `supabase/migrations/`, puis réinsérer les JSON de `supabase/tables/` table par table. Les membres devront refaire « mot de passe oublié » si les comptes sont recréés.
