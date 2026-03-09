import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";

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
const AdminMembres = lazy(() => import("./pages/AdminMembres"));
const Rejoindre = lazy(() => import("./pages/Rejoindre"));

const queryClient = new QueryClient();

const App = () => (
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
        <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Chargement…</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/disciplines" element={<Disciplines />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/inscription" element={<Inscription />} />
            <Route path="/galerie" element={<Galerie />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/lasso" element={<Lasso />} />
            <Route path="/instructeurs" element={<Instructeurs />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/admin/membres" element={<AdminMembres />} />
            <Route path="/rejoindre" element={<Rejoindre />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
