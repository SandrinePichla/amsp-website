import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border/50 bg-background">
    <div className="container mx-auto px-4 py-10">

      {/* Bloc central */}
      <div className="flex flex-col items-center gap-4 text-center">
        <h3 className="font-serif text-xl font-bold text-primary">A.M.S.P</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Association d'Arts Martiaux St Pierrois
        </p>

        {/* Coordonnées en ligne */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <a
            href="mailto:artsmartiauxstpierrois@gmail.com"
            className="transition-colors hover:text-primary"
          >
            artsmartiauxstpierrois@gmail.com
          </a>
          <span className="hidden sm:inline text-border">|</span>
          <span>06.82.16.22.66</span>
          <span className="hidden sm:inline text-border">|</span>
          <a
            href="https://www.facebook.com/artsmartiauxstpierrois"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
            Nous rejoindre sur Facebook
          </a>
        </div>
      </div>

      {/* Bas de page */}
      <div className="mt-8 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Association d'Arts Martiaux St Pierrois. Tous droits réservés.
        <span className="mx-2">—</span>
        <Link to="/mentions-legales" className="transition-colors hover:text-primary">
          Mentions légales
        </Link>
      </div>

    </div>
  </footer>
);

export default Footer;
