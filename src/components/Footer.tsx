import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border/50 bg-background py-12">
    <div className="container mx-auto px-4">
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <h3 className="mb-3 font-serif text-lg font-bold text-primary">A.M.S.P</h3>
          <p className="text-sm text-muted-foreground">
            Association d'Arts Martiaux St Pierrois — Depuis des années au service des arts martiaux.
          </p>
        </div>
        <div>
          <h4 className="mb-3 font-serif text-sm font-bold text-foreground">Navigation</h4>
          <div className="flex flex-col gap-2">
            {[
              { label: "Disciplines", path: "/disciplines" },
              { label: "Planning", path: "/planning" },
              { label: "Inscription", path: "/inscription" },
              { label: "Galerie", path: "/galerie" },
              { label: "Contact", path: "/contact" },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-3 font-serif text-sm font-bold text-foreground">Contact</h4>
          <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Email :<br />
            artsmartiauxstpierrois@gmail.com <br />
            </p>
            <p className="text-sm text-muted-foreground">
            Téléphone : <br />
            06.82.16.22.66
          </p>
          <a
            href="https://www.facebook.com/artsmartiauxstpierrois"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
            Nous rejoindre sur Facebook
          </a>
        </div>
        </div>
      </div>
     <div className="mt-8 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} Association d'Arts Martiaux St Pierrois. Tous droits réservés.
      <span className="mx-2">—</span>
      <Link to="/mentions-legales" className="hover:text-primary transition-colors">
        Mentions légales
      </Link>
    </div>
    </div>
  </footer>
);

export default Footer;
