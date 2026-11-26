/** Extrait l'identifiant (11 caractères) d'une URL YouTube : watch?v=, youtu.be/, embed/, shorts/, live/. */
export function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
