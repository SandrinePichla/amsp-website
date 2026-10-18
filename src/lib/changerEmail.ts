import { supabase } from "@/supabaseClient";

/**
 * Appel de la fonction serveur "changer-email" (fenêtre admin et page "Mon profil").
 * Renvoie un message d'erreur lisible en cas de refus : la fonction répond { error } avec un
 * statut 4xx/5xx (adresse déjà connue du site, droits…), que supabase-js range dans error.context.
 */
export const appelerChangerEmail = async (body: {
  profilId: string;
  nouvelEmail: string;
  redirectTo?: string;
}): Promise<{ erreur: string | null }> => {
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
  return { erreur };
};
