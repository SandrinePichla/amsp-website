import { supabase } from "@/supabaseClient";

export const TEMPLATES = {
  INSCRIPTION: Number(import.meta.env.VITE_BREVO_TEMPLATE_INSCRIPTION),
  VALIDATION:  Number(import.meta.env.VITE_BREVO_TEMPLATE_VALIDATION),
  COMPTE:      Number(import.meta.env.VITE_BREVO_TEMPLATE_COMPTE),
  CONTACT:     Number(import.meta.env.VITE_BREVO_TEMPLATE_CONTACT),
  REJOINDRE:   Number(import.meta.env.VITE_BREVO_TEMPLATE_REJOINDRE),
  REFUS:            Number(import.meta.env.VITE_BREVO_TEMPLATE_REFUS),
  INSCRIPTION_ADMIN: Number(import.meta.env.VITE_BREVO_TEMPLATE_INSCRIPTION_ADMIN),
};

export const sendBrevoEmail = async (
  templateId: number,
  to: { email: string; name?: string },
  params: Record<string, string>
): Promise<void> => {
  const { error } = await supabase.functions.invoke("send-email", {
    body: { templateId, to, params },
  });
  if (error) throw error;
};
