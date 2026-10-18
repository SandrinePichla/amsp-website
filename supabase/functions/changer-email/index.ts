// Edge Function "changer-email" — demande de changement de l'email de connexion d'un compte,
// à l'initiative d'un admin (pour n'importe quel compte) ou de l'adhérent lui-même (pour son
// propre compte uniquement, depuis la page "Mon profil").
//
// Le changement n'est PAS appliqué ici : la fonction génère un lien de confirmation, l'envoie
// à la nouvelle adresse et prévient l'ancienne. Le changement devient effectif au clic sur le
// lien ; le déclencheur SQL on_auth_user_email_change (migration 20261023) recopie alors le
// nouvel email dans profils et inscriptions et trace le tout dans journal_modifications.
//
// Secrets utilisés (déjà présents pour send-email) : BREVO_API_KEY, BREVO_SENDER_EMAIL.
// SUPABASE_URL et la clé service sont fournis automatiquement par Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const repondre = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Clé service : ancienne clé JWT si présente, sinon la nouvelle clé secrète (sb_secret_…). */
const cleService = (): string => {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const cles = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    return cles.default ?? Object.values(cles)[0] ?? "";
  } catch {
    return "";
  }
};

/** Envoie un email via Brevo et renvoie sa réponse (statut + messageId), aussi écrite dans les logs de la fonction. */
const envoyerEmail = async (to: string, subject: string, htmlContent: string) => {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": Deno.env.get("BREVO_API_KEY") ?? "" },
    body: JSON.stringify({
      sender: { name: "AMSP", email: Deno.env.get("BREVO_SENDER_EMAIL") ?? "" },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });
  const corps = await res.text();
  console.log(`Brevo → ${to} : ${res.status} ${corps}`);
  if (!res.ok) throw new Error(`Envoi de l'email à ${to} impossible (${res.status}) : ${corps}`);
  let messageId: string | null = null;
  try { messageId = JSON.parse(corps).messageId ?? null; } catch { /* réponse non JSON */ }
  return { to, statut: res.status, messageId };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", cleService(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. L'appelant doit être connecté, et être admin ou le titulaire du compte concerné
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: appelant, error: errAppelant } = await admin.auth.getUser(jwt);
    if (errAppelant || !appelant?.user) return repondre({ error: "Vous devez être connecté." }, 401);
    const { data: profilAppelant } = await admin.from("profils").select("role, prenom, nom").eq("id", appelant.user.id).single();
    const { profilId, nouvelEmail, redirectTo } = await req.json();
    const estAdmin = !!profilAppelant && ["admin", "admin_discipline"].includes(profilAppelant.role);
    const estTitulaire = appelant.user.id === profilId;
    if (!estAdmin && !estTitulaire) {
      return repondre({ error: "Vous ne pouvez changer que l'email de votre propre compte." }, 403);
    }

    // 2. Vérification de la demande
    const nouveau = String(nouvelEmail ?? "").trim().toLowerCase();
    if (!profilId || !REGEX_EMAIL.test(nouveau)) return repondre({ error: "Adresse email invalide." }, 400);

    const { data: cible, error: errCible } = await admin.auth.admin.getUserById(profilId);
    if (errCible || !cible?.user?.email) return repondre({ error: "Compte introuvable." }, 404);
    const ancien = cible.user.email;
    if (ancien.toLowerCase() === nouveau) return repondre({ error: "C'est déjà l'email de ce compte." }, 400);

    // ilike sans joker : on échappe % et _ (le _ est fréquent dans les emails)
    const motif = nouveau.replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data: dejaPris } = await admin.from("profils").select("id").ilike("email", motif).neq("id", profilId).limit(1);
    if (dejaPris && dejaPris.length > 0) {
      return repondre({ error: "Cette adresse est déjà utilisée par un autre compte membre." }, 409);
    }

    // Adresse déjà DEMANDÉE par un autre compte (changement pas encore confirmé) : sinon deux comptes
    // attendent la même adresse et le premier lien cliqué l'emporte, l'autre échouant.
    for (let page = 1; ; page++) {
      const { data: lot, error: errLot } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (errLot) break;
      const enConcurrence = lot.users.find((u) => u.id !== profilId && (u.new_email ?? "").toLowerCase() === nouveau);
      if (enConcurrence) {
        return repondre({ error: "Un changement vers cette adresse est déjà en attente de confirmation pour un autre compte." }, 409);
      }
      if (lot.users.length < 1000) break;
    }

    // Adresse déjà portée par l'inscription d'une autre personne (sans compte) : refus ferme. Après le
    // changement, cette inscription serait rattachée au compte (accès à ses données) — c'est une
    // fusion, que l'association a choisi d'interdire. Seule une adresse inconnue du site est acceptée.
    const portees = (await Promise.all(["email", "parent1_email", "parent2_email"].map((col) =>
      admin.from("inscriptions").select("prenom, nom, user_id, statut").ilike(col, motif)
    ))).flatMap((r) => r.data ?? []);
    const autres = portees.filter((i) =>
      i.user_id !== profilId && i.statut !== "refusee" && i.statut !== "supprimee");
    if (autres.length > 0) {
      const noms = [...new Set(autres.map((i) => [i.prenom, i.nom].filter(Boolean).join(" ")).filter(Boolean))];
      // Un adhérent ne voit pas les noms : ne pas révéler qui se cache derrière une adresse
      return repondre({
        error: estAdmin && noms.length
          ? `Cette adresse est déjà utilisée par l'inscription de ${noms.join(", ")}. Choisissez une adresse qui n'est utilisée nulle part sur le site.`
          : "Cette adresse est déjà utilisée par une inscription de l'association. Choisissez une autre adresse.",
      }, 409);
    }

    // 3. Lien de confirmation (n'envoie rien par lui-même et ne change encore rien)
    const { data: lien, error: errLien } = await admin.auth.admin.generateLink({
      type: "email_change_new",
      email: ancien,
      newEmail: nouveau,
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (errLien || !lien?.properties?.action_link) {
      return repondre({ error: "Impossible de préparer le changement : " + (errLien?.message ?? "lien non généré") }, 400);
    }

    const { data: profilCible } = await admin.from("profils").select("prenom, nom").eq("id", profilId).single();
    const prenom = profilCible?.prenom ?? "";

    // 4. Emails : confirmation à la nouvelle adresse, information à l'ancienne
    const parLuiMeme = estTitulaire && !estAdmin;
    const envoiNouveau = await envoyerEmail(
      nouveau,
      "AMSP — Confirmez votre nouvelle adresse email",
      `<p>Bonjour ${prenom},</p>
       <p>${parLuiMeme
         ? "Vous avez demandé à changer l'adresse email de votre espace membre AMSP."
         : "L'association AMSP a enregistré une demande de changement de l'adresse email de votre espace membre."}</p>
       <p>Nouvelle adresse : <strong>${nouveau}</strong></p>
       <p><a href="${lien.properties.action_link}">Cliquez ici pour confirmer cette nouvelle adresse</a>.</p>
       <p>Tant que vous n'avez pas confirmé, vous continuez à vous connecter avec votre ancienne adresse. Votre mot de passe ne change pas.</p>
       <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email et contactez l'association.</p>`,
    );
    const envoiAncien = await envoyerEmail(
      ancien,
      "AMSP — Demande de changement de votre adresse email",
      `<p>Bonjour ${prenom},</p>
       <p>${parLuiMeme
         ? "Une demande de changement de l'adresse email de votre espace membre a été faite depuis votre compte"
         : "L'association AMSP a enregistré une demande de changement de l'adresse email de votre espace membre"}, vers <strong>${nouveau}</strong>.</p>
       <p>Le changement ne sera effectif qu'après confirmation depuis cette nouvelle adresse. Votre mot de passe ne change pas.</p>
       <p><strong>Si cette demande est une erreur</strong>, contactez l'association rapidement : tant que le lien n'a pas été confirmé, rien n'est modifié.</p>`,
    );

    // 5. Trace de la demande (le changement effectif sera tracé par le déclencheur SQL)
    await admin.from("journal_modifications").insert({
      admin_id: appelant.user.id,
      admin_nom: ([profilAppelant?.prenom, profilAppelant?.nom].filter(Boolean).join(" ") || appelant.user.email) + (parLuiMeme ? " (l'adhérent lui-même)" : ""),
      table_cible: "profils",
      ligne_id: profilId,
      personne: [profilCible?.prenom, profilCible?.nom].filter(Boolean).join(" ") || ancien,
      champ: "Email de connexion (demande envoyée, en attente de confirmation)",
      ancienne_valeur: ancien,
      nouvelle_valeur: nouveau,
    });

    return repondre({ ok: true, ancien, nouveau, envois: [envoiNouveau, envoiAncien], version: 6 });
  } catch (e) {
    return repondre({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
