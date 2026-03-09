import { motion } from "framer-motion";
import Layout from "@/components/Layout";

const MentionsLegales = () => {
  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-10 text-center font-serif text-4xl font-black md:text-5xl">
              <span className="text-primary">Mentions</span> légales
            </h1>

            <div className="space-y-10 text-sm text-muted-foreground">

              {/* Éditeur */}
              <div>
                <h2 className="mb-3 font-serif text-xl font-bold text-foreground">1. Éditeur du site</h2>
                <p>Le présent site est édité par :</p>
                <ul className="mt-2 space-y-1 pl-4">
                  <li><strong className="text-foreground">Dénomination :</strong> Arts Martiaux St Pierrois (A.M.S.P.)</li>
                  <li><strong className="text-foreground">Forme juridique :</strong> Association loi 1901</li>
                  <li><strong className="text-foreground">Siège social :</strong> XXX, Saint-Pierre-la-Palud</li>
                  <li><strong className="text-foreground">Numéro RNA :</strong> WXXXXXXXXX</li>
                  <li><strong className="text-foreground">Email :</strong> artsmartiauxstpierrois@gmail.com</li>
                  <li><strong className="text-foreground">Téléphone :</strong> 06.82.16.22.66</li>
                </ul>
              </div>

              {/* Responsable de publication */}
              <div>
                <h2 className="mb-3 font-serif text-xl font-bold text-foreground">2. Responsable de publication</h2>
                <p>La responsable de publication est <strong className="text-foreground">Colas Sylvaine</strong>, Présidente de l'association Arts Martiaux St Pierrois.</p>
              </div>

              {/* Hébergement */}
              <div>
                <h2 className="mb-3 font-serif text-xl font-bold text-foreground">3. Hébergement</h2>
                <p>Ce site est hébergé par :</p>
                <ul className="mt-2 space-y-1 pl-4">
                  <li><strong className="text-foreground">GitHub Pages</strong> — Microsoft Corporation, One Microsoft Way, Redmond, WA 98052, États-Unis — <a href="https://pages.github.com" className="hover:text-primary transition-colors">pages.github.com</a></li>
                  <li><strong className="text-foreground">Netlify</strong> (Sanity Studio) — Netlify, Inc., 512 2nd Street, San Francisco, CA 94107, États-Unis — <a href="https://www.netlify.com" className="hover:text-primary transition-colors">netlify.com</a></li>
                </ul>
              </div>

              {/* Services tiers */}
              <div>
                <h2 className="mb-3 font-serif text-xl font-bold text-foreground">4. Services tiers utilisés</h2>
                <ul className="mt-2 space-y-3 pl-4">
                  <li>
                    <strong className="text-foreground">Sanity CMS</strong> — Gestion du contenu du site (textes, images, disciplines, actualités). Données hébergées par Sanity AS, Norvège. <a href="https://www.sanity.io/privacy" className="hover:text-primary transition-colors">Politique de confidentialité</a>
                  </li>
                  <li>
                    <strong className="text-foreground">Supabase</strong> — Authentification des membres. Données hébergées par Supabase Inc. <a href="https://supabase.com/privacy" className="hover:text-primary transition-colors">Politique de confidentialité</a>
                  </li>
                  <li>
                    <strong className="text-foreground">EmailJS</strong> — Envoi des formulaires de contact et d'inscription par email. <a href="https://www.emailjs.com/legal/privacy-policy/" className="hover:text-primary transition-colors">Politique de confidentialité</a>
                  </li>
                </ul>
              </div>

              {/* Données personnelles */}
              <div>
                <h2 className="mb-3 font-serif text-xl font-bold text-foreground">5. Données personnelles</h2>
                <p className="mb-2">Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez des droits suivants sur vos données personnelles :</p>
                <ul className="mt-2 space-y-1 pl-4 list-disc">
                  <li>Droit d'accès, de rectification et d'effacement de vos données</li>
                  <li>Droit à la portabilité de vos données</li>
                  <li>Droit d'opposition au traitement de vos données</li>
                </ul>
                <p className="mt-3">Les données collectées via les formulaires (contact, inscription) sont utilisées uniquement pour le fonctionnement de l'association et ne sont jamais cédées à des tiers.</p>
                <p className="mt-2">Pour exercer vos droits, contactez-nous à : <a href="mailto:artsmartiauxstpierrois@gmail.com" className="hover:text-primary transition-colors">artsmartiauxstpierrois@gmail.com</a></p>
              </div>

              {/* Cookies */}
              <div>
                <h2 className="mb-3 font-serif text-xl font-bold text-foreground">6. Cookies</h2>
                <p>Ce site utilise uniquement des cookies techniques nécessaires au fonctionnement de l'authentification des membres (Supabase). Aucun cookie publicitaire ou de tracking n'est utilisé.</p>
              </div>

              {/* Propriété intellectuelle */}
              <div>
                <h2 className="mb-3 font-serif text-xl font-bold text-foreground">7. Propriété intellectuelle</h2>
                <p>L'ensemble des contenus présents sur ce site (textes, images, logos) sont la propriété de l'association Arts Martiaux St Pierrois ou de leurs auteurs respectifs. Toute reproduction, même partielle, est interdite sans autorisation préalable.</p>
              </div>

              {/* Mise à jour */}
              <p className="border-t border-border/50 pt-6 text-xs">
                Mentions légales mises à jour le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
              </p>

            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default MentionsLegales;