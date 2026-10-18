import { supabase } from "@/supabaseClient";

/**
 * Appel de la fonction serveur "changer-email" (fenêtre admin et page "Mon profil").
 * Renvoie la réponse, ou un message d'erreur lisible : la fonction répond { error } avec un
 * statut 4xx/5xx en cas de refus (adresse déjà prise, droits…), que supabase-js range dans
 * error.context.
 */
export const appelerChangerEmail = async (body: {
  profilId: string;
  nouvelEmail: string;
  redirectTo?: string;
  verifierSeulement?: boolean;
}): Promise<{ data: { nombre?: number; noms?: string[] } | null; erreur: string | null }> => {
  const { data, error } = await supabase.functions.invoke("changer-email", { body });
  let erreur: string | null = (data as { error?: string } | null)?.error ?? null;
  if (!erreur && error) {
    const contexte = (error as { context?: Response }).context;
    let corps = "";
    try { corps = contexte ? await contexte.text() : ""; } catch { /* corps illisible */ }
    let detail = corps;
    try { const json = JSON.parse(corps); detail = json.error ?? json.message ?? json.code ?? corps; } catch { /* pas du JSON */ }
    erreur = `${detail || error.message}${contexte?.status && contexte.status >= 500 ? ` (code ${contexte.status})` : ""}`;
  }
  return { data: erreur ? null : data, erreur };
};

/** Texte d'avertissement quand la nouvelle adresse est déjà portée par d'autres inscriptions. */
export const texteAvertissementEmail = (nombre: number, noms: string[], pourAdmin: boolean): string => {
  const qui = noms.length
    ? `l'inscription de ${noms.join(", ")}`
    : nombre > 1 ? `${nombre} inscriptions de l'association` : "une inscription de l'association";
  return pourAdmin
    ? `Cette adresse est déjà utilisée par ${qui}. Après le changement, ${nombre > 1 ? "ces inscriptions seront rattachées" : "cette inscription sera rattachée"} à ce compte : son titulaire pourra voir et modifier ${nombre > 1 ? "leurs" : "ses"} informations.`
    : `Cette adresse est déjà utilisée par ${qui}. Après le changement, ${nombre > 1 ? "ces inscriptions seront rattachées" : "elle sera rattachée"} à votre compte : vous pourrez voir et modifier ${nombre > 1 ? "leurs" : "ses"} informations.`;
};
