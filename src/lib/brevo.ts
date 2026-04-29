const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export const TEMPLATES = {
  INSCRIPTION: Number(import.meta.env.VITE_BREVO_TEMPLATE_INSCRIPTION),
  VALIDATION:  Number(import.meta.env.VITE_BREVO_TEMPLATE_VALIDATION),
  COMPTE:      Number(import.meta.env.VITE_BREVO_TEMPLATE_COMPTE),
  CONTACT:     Number(import.meta.env.VITE_BREVO_TEMPLATE_CONTACT),
};

export const sendBrevoEmail = async (
  templateId: number,
  to: { email: string; name?: string },
  params: Record<string, string>
): Promise<void> => {
  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": import.meta.env.VITE_BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        name: "AMSP",
        email: import.meta.env.VITE_BREVO_SENDER_EMAIL,
      },
      to: [to],
      templateId,
      params,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Erreur Brevo (${res.status})`);
  }
};
