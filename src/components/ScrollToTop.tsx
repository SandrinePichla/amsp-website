import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Le contenu ciblé peut arriver après un chargement asynchrone (Sanity) : on
      // retente pendant une courte fenêtre le temps que l'élément apparaisse dans le DOM.
      let tries = 0;
      let cancelled = false;
      const attempt = () => {
        if (cancelled) return;
        const el = document.getElementById(hash.slice(1));
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (tries < 20) {
          tries += 1;
          setTimeout(attempt, 150);
        }
      };
      attempt();
      return () => { cancelled = true; };
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
