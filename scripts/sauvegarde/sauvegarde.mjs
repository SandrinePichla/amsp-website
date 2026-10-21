// ================================================================
// Sauvegarde AMSP : base Supabase + contenu Sanity (+ photos), chiffrée.
//
//   node scripts/sauvegarde/sauvegarde.mjs          → sauvegarde tout de suite
//   node scripts/sauvegarde/sauvegarde.mjs --auto   → seulement si nécessaire :
//        7 jours depuis la dernière sauvegarde, OU 5 nouvelles inscriptions
//        (c'est ce que lance chaque jour le planificateur de tâches Windows)
//
// Configuration (clé, mot de passe, dossiers) : scripts/sauvegarde/sauvegarde.config.local.json
// — fichier local, JAMAIS envoyé sur GitHub (voir .gitignore). Modèle :
// sauvegarde.config.exemple.json.
//
// Résultat : une archive 7-Zip chiffrée (AES-256, noms de fichiers masqués)
//   amsp-sauvegarde-AAAA-MM-JJ_HHhMM.7z
// dans le dossier local ET dans le dossier Google Drive. Les photos Sanity, lourdes et
// rarement modifiées, sont dans une archive à part, refaite seulement quand il y en a
// de nouvelles. Conservation : toutes les sauvegardes des 8 dernières semaines, puis
// une par mois pendant 12 mois ; les plus anciennes sont supprimées (RGPD).
//
// Pour relire une sauvegarde : ouvrir l'archive avec 7-Zip et le mot de passe.
// ================================================================

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FICHIER = path.join(ICI, "sauvegarde.config.local.json");
const SUPABASE_URL = "https://nlztcbltrxatqxjgjuvq.supabase.co";
const SANITY = { projet: "t7u49x1d", dataset: "production", version: "v2024-01-01" };
const SEUIL_JOURS = 7;
const SEUIL_NOUVELLES_INSCRIPTIONS = 5;
const GARDER_JOURS_TOUTES = 56; // 8 semaines
const GARDER_JOURS_MENSUELLES = 365; // 1 par mois pendant 12 mois

const auto = process.argv.includes("--auto");

// ── Journal ──────────────────────────────────────────────────────────
let config;
const journal = (msg) => {
  const ligne = `${new Date().toLocaleString("fr-FR")}  ${msg}`;
  console.log(ligne);
  if (config?.dossierLocal) {
    try { fs.appendFileSync(path.join(config.dossierLocal, "journal-sauvegardes.log"), ligne + os.EOL); } catch { /* dossier absent */ }
  }
};
const echec = (msg) => { journal(`ÉCHEC : ${msg}`); process.exit(1); };

// ── Configuration ────────────────────────────────────────────────────
if (!fs.existsSync(CONFIG_FICHIER)) {
  console.error(`Configuration absente : copiez sauvegarde.config.exemple.json en sauvegarde.config.local.json et remplissez-la.`);
  process.exit(1);
}
config = JSON.parse(fs.readFileSync(CONFIG_FICHIER, "utf8"));
for (const champ of ["cleServiceSupabase", "motDePasseArchives", "dossierLocal"]) {
  if (!config[champ] || String(config[champ]).includes("À_REMPLIR")) echec(`champ « ${champ} » à remplir dans sauvegarde.config.local.json`);
}
fs.mkdirSync(config.dossierLocal, { recursive: true });
const septZip = config.cheminSeptZip || "7z";

const H = { apikey: config.cleServiceSupabase, Authorization: `Bearer ${config.cleServiceSupabase}` };
const lireJson = async (url, options = {}) => {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status} ${await r.text()}`);
  return r.json();
};

// ── Faut-il sauvegarder ? ────────────────────────────────────────────
const ETAT = path.join(config.dossierLocal, "etat.json");
const etat = fs.existsSync(ETAT) ? JSON.parse(fs.readFileSync(ETAT, "utf8")) : { derniere: null, photos: 0 };

if (auto && etat.derniere) {
  const jours = (Date.now() - new Date(etat.derniere).getTime()) / 86400000;
  let nouvelles = 0;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/inscriptions?select=id&created_at=gt.${encodeURIComponent(etat.derniere)}`, {
      headers: { ...H, Prefer: "count=exact", Range: "0-0" },
    });
    nouvelles = Number((r.headers.get("content-range") || "").split("/")[1] || 0);
  } catch (e) { echec(`impossible de joindre Supabase (${e.message})`); }
  if (jours < SEUIL_JOURS && nouvelles < SEUIL_NOUVELLES_INSCRIPTIONS) {
    journal(`Pas de sauvegarde nécessaire (${jours.toFixed(1)} j depuis la dernière, ${nouvelles} nouvelle(s) inscription(s)).`);
    process.exit(0);
  }
  journal(`Sauvegarde déclenchée : ${jours >= SEUIL_JOURS ? `${Math.floor(jours)} jours écoulés` : `${nouvelles} nouvelles inscriptions`}.`);
}

// ── Export dans un dossier temporaire (jamais laissé en clair) ───────
const horodatage = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "h");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "amsp-sauvegarde-"));
const ecrire = (fichier, contenu) => {
  fs.mkdirSync(path.dirname(path.join(tmp, fichier)), { recursive: true });
  fs.writeFileSync(path.join(tmp, fichier), typeof contenu === "string" ? contenu : JSON.stringify(contenu, null, 2));
};

try {
  // Supabase : toutes les tables exposées (liste lue dans la description de l'API)
  const description = await lireJson(`${SUPABASE_URL}/rest/v1/`, { headers: H });
  const tables = Object.keys(description.definitions || {});
  const resume = {};
  for (const t of tables) {
    let lignes = [], debut = 0;
    for (;;) {
      const lot = await lireJson(`${SUPABASE_URL}/rest/v1/${t}?select=*`, { headers: { ...H, Range: `${debut}-${debut + 999}` } });
      lignes = lignes.concat(lot);
      if (lot.length < 1000) break;
      debut += 1000;
    }
    ecrire(`supabase/tables/${t}.json`, lignes);
    resume[t] = lignes.length;
  }
  // Comptes (sans les mots de passe : Supabase ne les expose jamais)
  let comptes = [];
  for (let page = 1; ; page++) {
    const r = await lireJson(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: H });
    comptes = comptes.concat(r.users || []);
    if ((r.users || []).length < 1000) break;
  }
  ecrire("supabase/auth/users.json", comptes);
  resume["comptes (auth.users)"] = comptes.length;

  // Sanity : tout le contenu (textes, disciplines, galerie, paramètres…)
  const r = await fetch(`https://${SANITY.projet}.api.sanity.io/${SANITY.version}/data/export/${SANITY.dataset}`);
  if (!r.ok) throw new Error(`export Sanity → HTTP ${r.status}`);
  const ndjson = await r.text();
  ecrire("sanity/production-export.ndjson", ndjson);
  const documents = ndjson.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  resume["documents Sanity"] = documents.length;

  ecrire("LISEZMOI.txt", [
    `Sauvegarde AMSP du ${new Date().toLocaleString("fr-FR")}`,
    "",
    ...Object.entries(resume).map(([k, v]) => `- ${k} : ${v}`),
    "",
    "Contient des données personnelles d'adhérents (dont des mineurs) : à ne jamais diffuser.",
    "Restauration Sanity : sanity dataset import production-export.ndjson production",
    "Restauration Supabase : réinsérer les JSON table par table (structure : supabase/migrations du dépôt).",
  ].join("\n"));

  // Archive chiffrée (AES-256 ; -mhe=on masque aussi les noms des fichiers)
  const nomArchive = `amsp-sauvegarde-${horodatage}.7z`;
  const archive = path.join(config.dossierLocal, nomArchive);
  execFileSync(septZip, ["a", "-t7z", "-mx=9", "-mhe=on", `-p${config.motDePasseArchives}`, archive, path.join(tmp, "*")], { stdio: "ignore" });
  journal(`Archive créée : ${nomArchive} (${(fs.statSync(archive).size / 1024).toFixed(0)} Ko) — ${Object.entries(resume).map(([k, v]) => `${k} ${v}`).join(", ")}.`);

  // Photos Sanity : archive à part, refaite seulement s'il y a de nouvelles photos
  const assets = documents.filter((d) => d._type === "sanity.imageAsset" || d._type === "sanity.fileAsset");
  if (assets.length !== etat.photos || !fs.readdirSync(config.dossierLocal).some((f) => f.startsWith("amsp-photos-"))) {
    const dossierPhotos = path.join(tmp, "photos");
    fs.mkdirSync(dossierPhotos, { recursive: true });
    for (const a of assets) {
      const reponse = await fetch(a.url);
      if (reponse.ok) fs.writeFileSync(path.join(dossierPhotos, `${a._id}.${a.extension || "bin"}`), Buffer.from(await reponse.arrayBuffer()));
    }
    const nomPhotos = `amsp-photos-${horodatage}.7z`;
    execFileSync(septZip, ["a", "-t7z", "-mx=1", "-mhe=on", `-p${config.motDePasseArchives}`, path.join(config.dossierLocal, nomPhotos), path.join(dossierPhotos, "*")], { stdio: "ignore" });
    journal(`Photos Sanity : ${assets.length} fichier(s) → ${nomPhotos}.`);
    etat.photos = assets.length;
  }

  etat.derniere = new Date().toISOString();
  fs.writeFileSync(ETAT, JSON.stringify(etat, null, 2));
} catch (e) {
  echec(e.message);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ── Conservation : 8 dernières semaines complètes, puis 1 par mois pendant 12 mois ──
const nettoyer = (dossier) => {
  if (!dossier || !fs.existsSync(dossier)) return;
  const dateDe = (f) => new Date(f.replace(/^amsp-(sauvegarde|photos)-/, "").replace(".7z", "").replace("_", "T").replace("h", ":"));
  for (const prefixe of ["amsp-sauvegarde-", "amsp-photos-"]) {
    const archives = fs.readdirSync(dossier).filter((f) => f.startsWith(prefixe) && f.endsWith(".7z")).sort();
    const gardees = new Set();
    if (prefixe === "amsp-photos-") archives.slice(-2).forEach((f) => gardees.add(f)); // photos : les 2 dernières
    else {
      const moisVus = new Set();
      for (const f of archives) {
        const age = (Date.now() - dateDe(f).getTime()) / 86400000;
        const mois = f.slice(prefixe.length, prefixe.length + 7);
        if (age <= GARDER_JOURS_TOUTES) gardees.add(f);
        else if (age <= GARDER_JOURS_MENSUELLES && !moisVus.has(mois)) gardees.add(f);
        moisVus.add(mois);
      }
    }
    for (const f of archives) if (!gardees.has(f)) { fs.rmSync(path.join(dossier, f)); journal(`Ancienne archive supprimée : ${f}`); }
  }
};

// ── Copie vers Google Drive (2e support, hors de l'ordinateur) ───────
if (config.dossierGoogleDrive) {
  try {
    fs.mkdirSync(config.dossierGoogleDrive, { recursive: true });
    for (const f of fs.readdirSync(config.dossierLocal).filter((x) => x.endsWith(".7z"))) {
      const cible = path.join(config.dossierGoogleDrive, f);
      if (!fs.existsSync(cible)) fs.copyFileSync(path.join(config.dossierLocal, f), cible);
    }
    nettoyer(config.dossierGoogleDrive);
    journal("Copie vers Google Drive : OK.");
  } catch (e) {
    journal(`ATTENTION : copie vers Google Drive impossible (${e.message}). La sauvegarde locale est faite.`);
  }
}
nettoyer(config.dossierLocal);
journal("Sauvegarde terminée.");
