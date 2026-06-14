import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import ScrollToTop from "@/components/ScrollToTop";
import { HelmetProvider } from "react-helmet-async";

const Index = lazy(() => import("./pages/Index"));
const Disciplines = lazy(() => import("./pages/Disciplines"));
const Planning = lazy(() => import("./pages/Planning"));
const Inscription = lazy(() => import("./pages/Inscription"));
const Galerie = lazy(() => import("./pages/Galerie"));
const Contact = lazy(() => import("./pages/Contact"));
const Connexion = lazy(() => import("./pages/Connexion"));
const Lasso = lazy(() => import("./pages/Lasso"));
const Instructeurs = lazy(() => import("./pages/Instructeurs"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const Profil = lazy(() => import("./pages/Profil"));
const EspaceMembre = lazy(() => import("./pages/EspaceMembre"));
const AdminMembres = lazy(() => import("./pages/AdminMembres"));
const Rejoindre = lazy(() => import("./pages/Rejoindre"));
const DisciplineDetail = lazy(() => import("./pages/DisciplineDetail"));
const MotDePasseOublie = lazy(() => import("./pages/MotDePasseOublie"));
const ReinitialisationMotDePasse = lazy(() => import("./pages/ReinitialisationMotDePasse"));

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <BrowserRouter basename="/amsp-website"
       future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >       
        <ScrollToTop />
        <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Chargement…</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/disciplines" element={<Disciplines />} />
            <Route path="/disciplines/:slug" element={<DisciplineDetail />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/inscription" element={<Inscription />} />
            <Route path="/galerie" element={<Galerie />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/lasso" element={<Lasso />} />
            <Route path="/instructeurs" element={<Instructeurs />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/espace-membre" element={<EspaceMembre />} />
            <Route path="/admin/membres" element={<AdminMembres />} />
            <Route path="/rejoindre" element={<Rejoindre />} />
            <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
            <Route path="/reinitialisation-mot-de-passe" element={<ReinitialisationMotDePasse />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
