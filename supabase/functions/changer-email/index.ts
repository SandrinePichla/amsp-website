// Edge Function "changer-email" — demande de changement de l'email de connexion d'un compte,
// à l'initiative d'un admin.
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

    // 1. L'appelant doit être connecté et admin
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: appelant, error: errAppelant } = await admin.auth.getUser(jwt);
    if (errAppelant || !appelant?.user) return repondre({ error: "Vous devez être connecté." }, 401);
    const { data: profilAppelant } = await admin.from("profils").select("role, prenom, nom").eq("id", appelant.user.id).single();
    if (!profilAppelant || !["admin", "admin_discipline"].includes(profilAppelant.role)) {
      return repondre({ error: "Action réservée aux administrateurs." }, 403);
    }

    // 2. Vérification de la demande
    const { profilId, nouvelEmail, redirectTo } = await req.json();
    const nouveau = String(nouvelEmail ?? "").trim().toLowerCase();
    if (!profilId || !REGEX_EMAIL.test(nouveau)) return repondre({ error: "Adresse email invalide." }, 400);

    const { data: cible, error: errCible } = await admin.auth.admin.getUserById(profilId);
    if (errCible || !cible?.user?.email) return repondre({ error: "Compte introuvable." }, 404);
    const ancien = cible.user.email;
    if (ancien.toLowerCase() === nouveau) return repondre({ error: "C'est déjà l'email de ce compte." }, 400);

    const { data: dejaPris } = await admin.from("profils").select("id").ilike("email", nouveau).neq("id", profilId).limit(1);
    if (dejaPris && dejaPris.length > 0) {
      return repondre({ error: "Cette adresse est déjà utilisée par un autre compte membre." }, 409);
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
    const envoiNouveau = await envoyerEmail(
      nouveau,
      "AMSP — Confirmez votre nouvelle adresse email",
      `<p>Bonjour ${prenom},</p>
       <p>L'association AMSP a enregistré une demande de changement de l'adresse email de votre espace membre.</p>
       <p>Nouvelle adresse : <strong>${nouveau}</strong></p>
       <p><a href="${lien.properties.action_link}">Cliquez ici pour confirmer cette nouvelle adresse</a>.</p>
       <p>Tant que vous n'avez pas confirmé, vous continuez à vous connecter avec votre ancienne adresse. Votre mot de passe ne change pas.</p>
       <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email et contactez l'association.</p>`,
    );
    const envoiAncien = await envoyerEmail(
      ancien,
      "AMSP — Demande de changement de votre adresse email",
      `<p>Bonjour ${prenom},</p>
       <p>L'association AMSP a enregistré une demande de changement de l'adresse email de votre espace membre, vers <strong>${nouveau}</strong>.</p>
       <p>Le changement ne sera effectif qu'après confirmation depuis cette nouvelle adresse. Votre mot de passe ne change pas.</p>
       <p><strong>Si cette demande est une erreur</strong>, contactez l'association rapidement : tant que le lien n'a pas été confirmé, rien n'est modifié.</p>`,
    );

    // 5. Trace de la demande (le changement effectif sera tracé par le déclencheur SQL)
    await admin.from("journal_modifications").insert({
      admin_id: appelant.user.id,
      admin_nom: [profilAppelant.prenom, profilAppelant.nom].filter(Boolean).join(" ") || appelant.user.email,
      table_cible: "profils",
      ligne_id: profilId,
      personne: [profilCible?.prenom, profilCible?.nom].filter(Boolean).join(" ") || ancien,
      champ: "Email de connexion (demande envoyée, en attente de confirmation)",
      ancienne_valeur: ancien,
      nouvelle_valeur: nouveau,
    });

    return repondre({ ok: true, ancien, nouveau, envois: [envoiNouveau, envoiAncien], version: 2 });
  } catch (e) {
    return repondre({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
