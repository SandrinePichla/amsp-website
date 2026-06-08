import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

interface PdfPageProps {
  url: string;
  className?: string;
  pageNumber?: number;
  /** Remplit le conteneur (card) — comme object-fit: cover */
  cover?: boolean;
  /** Facteur de zoom pour le mode cover (< 1 = dézoom, montre plus de contenu) */
  zoom?: number;
  /** Limite la hauteur max (modale) — comme object-fit: contain */
  maxHeight?: number;
}

export const PdfPage = ({ url, className, pageNumber = 1, cover = false, zoom = 1, maxHeight }: PdfPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        const page = await pdf.getPage(pageNumber);
        if (cancelled || !canvasRef.current || !containerRef.current) return;

        const containerW = containerRef.current.clientWidth || 600;
        const containerH = containerRef.current.clientHeight || 0;
        const viewport = page.getViewport({ scale: 1 });

        let scale: number;
        if (cover && containerH > 0) {
          // Remplit les 2 dimensions (crop), réduit par le facteur zoom
          scale = Math.max(containerW / viewport.width, containerH / viewport.height) * zoom;
        } else if (maxHeight) {
          // Tient dans la largeur ET dans maxHeight (pas de crop)
          scale = Math.min(containerW / viewport.width, maxHeight / viewport.height);
        } else {
          // Remplit la largeur
          scale = containerW / viewport.width;
        }

        const scaled = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = scaled.width;
        canvas.height = scaled.height;

        await page.render({ canvasContext: ctx, viewport: scaled }).promise;
      } catch {
        if (!cancelled) setError(true);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [url, pageNumber, cover, zoom, maxHeight]);

  if (error) return null;

  if (cover) {
    return (
      <div ref={containerRef} className={`relative overflow-hidden ${className ?? ''}`}>
        <canvas ref={canvasRef} className="absolute left-1/2 top-0 -translate-x-1/2" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex justify-center ${className ?? ''}`}>
      <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }} />
    </div>
  );
};
