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
          <p className="text-sm text-muted-foreground">
            Saint-Pierre<br />
            contact@amsp.fr
          </p>
        </div>
      </div>
      <div className="mt-8 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Association d'Arts Martiaux St Pierrois. Tous droits réservés.
      </div>
    </div>
  </footer>
);

export default Footer;
