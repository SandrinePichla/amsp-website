import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, User, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface NavChild {
  label: string;
  path: string;
}

interface NavItem {
  label: string;
  path?: string;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { label: "Accueil", path: "/" },
  { label: "L'Asso", path: "/lasso" },
  { label: "Disciplines", path: "/disciplines" },
  { label: "Instructeurs", path: "/instructeurs" },
  { label: "Planning & Tarifs", path: "/planning" },
  { label: "Galerie", path: "/galerie" },
  { label: "Inscription", path: "/inscription" },
  { label: "Contact", path: "/contact" },
];

const DropdownMenu = ({
  item,
  currentPath,
}: {
  item: NavItem;
  currentPath: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isActive = item.children?.some((c) => c.path === currentPath);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {item.label}
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1 min-w-[160px] rounded-lg border border-border/60 bg-background shadow-lg"
          >
            {item.children?.map((child) => (
              <Link
                key={child.path}
                to={child.path}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-secondary hover:text-foreground ${
                  currentPath === child.path
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {child.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const UserMenu = ({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative ml-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/20"
      >
        <User size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 min-w-[200px] rounded-lg border border-border/60 bg-background shadow-lg"
          >
            <div className="border-b border-border/40 px-4 py-2.5">
              <p className="text-[11px] text-muted-foreground truncate">{email}</p>
            </div>
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              className="flex w-full items-center gap-2 rounded-b-lg px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut size={14} />
              Se déconnecter
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
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
        <nav className="hidden items-center gap-0.5 md:flex">
          {navItems.map((item) =>
            item.children ? (
              <DropdownMenu
                key={item.label}
                item={item}
                currentPath={location.pathname}
              />
            ) : (
              <Link
                key={item.path}
                to={item.path!}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === item.path
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            )
          )}

          {user ? (
            <UserMenu email={user.email!} onSignOut={handleSignOut} />
          ) : (
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
            <div className="flex flex-col gap-0.5 p-4">
              {navItems.map((item) =>
                item.children ? (
                  <div key={item.label}>
                    <button
                      onClick={() =>
                        setMobileExpanded(
                          mobileExpanded === item.label ? null : item.label
                        )
                      }
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
                    >
                      {item.label}
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${
                          mobileExpanded === item.label ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {mobileExpanded === item.label && (
                      <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={() => setMobileOpen(false)}
                            className={`rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary ${
                              location.pathname === child.path
                                ? "text-primary font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path!}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary ${
                      location.pathname === item.path
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              )}

              {user ? (
                <>
                  <div className="mt-1 border-t border-border/40 pt-2">
                    <p className="px-3 py-1 text-[11px] text-muted-foreground truncate">
                      {user.email}
                    </p>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
                    >
                      <LogOut size={14} />
                      Se déconnecter
                    </button>
                  </div>
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
