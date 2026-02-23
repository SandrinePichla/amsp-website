import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Disciplines from "./pages/Disciplines";
import Planning from "./pages/Planning";
import Inscription from "./pages/Inscription";
import Galerie from "./pages/Galerie";
import Contact from "./pages/Contact";
import Connexion from "./pages/Connexion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/amsp-website">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/disciplines" element={<Disciplines />} />
        <Route path="/planning" element={<Planning />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/galerie" element={<Galerie />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
