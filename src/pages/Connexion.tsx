import Layout from "@/components/Layout";

const Connexion = () => (
  <Layout>
    <section className="flex min-h-[70vh] items-center justify-center py-20">
      <div className="mx-auto w-full max-w-md px-4">
        <h1 className="mb-2 text-center font-serif text-3xl font-black">
          Espace <span className="text-primary">Membre</span>
        </h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Connectez-vous pour accéder à votre espace personnel.
        </p>
        <div className="rounded-lg border border-border/50 bg-card p-8 text-center text-muted-foreground">
          <p className="mb-2">🔒 L'authentification sera disponible prochainement.</p>
          <p className="text-xs">Le backend sera configuré avec Lovable Cloud.</p>
        </div>
      </div>
    </section>
  </Layout>
);

export default Connexion;
