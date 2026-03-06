import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Accueil", path: "/" },
  { label: "Disciplines", path: "/disciplines" },
  { label: "Planning", path: "/planning" },
  { label: "Inscription", path: "/inscription" },
  { label: "Galerie", path: "/galerie" },
  { label: "Contact", path: "/contact" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setMobileOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-serif text-xl font-bold tracking-wide text-primary">
            A.M.S.P
          </span>
          <span className="hidden text-xs text-muted-foreground sm:block">
            Arts Martiaux St Pierrois
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === item.path
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {user ? (
            // Connecté — affiche email + bouton déconnexion
            <div className="ml-2 flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User size={14} className="text-primary" />
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <LogOut size={14} />
                Déconnexion
              </button>
            </div>
          ) : (
            // Non connecté — bouton Espace Membre
            <Link
              to="/connexion"
              className="ml-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Espace Membre
            </Link>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-md p-2 text-foreground md:hidden"
          aria-label="Menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/50 bg-background md:hidden"
          >
            <div className="flex flex-col gap-1 p-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary ${
                    location.pathname === item.path
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {user ? (
                <>
                  <span className="px-3 py-2 text-xs text-muted-foreground">
                    Connecté : {user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
                  >
                    <LogOut size={14} />
                    Se déconnecter
                  </button>
                </>
              ) : (
                <Link
                  to="/connexion"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground"
                >
                  Espace Membre
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;