# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:8080
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # ESLint
npm run test       # Run tests once (Vitest)
npm run test:watch # Watch mode tests
npm run deploy     # Build + deploy to GitHub Pages
```

## Architecture

**AMSP Website** — Association website for a martial arts club, built with React + TypeScript + Vite.

### Data Sources

- **Sanity CMS** (`sanityClient.ts`, `sanityImage.ts`) — Content for disciplines, gallery, news, contact info. Use `client.fetch(GROQ_QUERY)` pattern. Images via `urlFor(image).width(X).url()`.
- **Supabase** (`supabaseClient.ts`) — Authentication only. Used to gate private gallery albums behind member login.
- **EmailJS** (`pages/Contact.tsx`) — Sends contact form submissions.

### Key Patterns

**Routing & Layout** — `App.tsx` uses React Router with all pages lazy-loaded via `React.lazy()`. All routes render inside `<Layout>` which wraps content with `<Header>` and `<Footer>`.

**Auth** — `contexts/AuthContext.tsx` provides `user`, `signIn`, `signOut` via Supabase. Access private galleries with `!album.prive || user`.

**Data fetching** — Pages use `useEffect` + `useState` to call `sanityClient.fetch()`. TanStack Query is installed but not yet used for Sanity queries.

**UI** — shadcn/ui components in `src/components/ui/`. Animations with Framer Motion (`motion.div`, `AnimatePresence`, `whileInView`). Toast notifications via Sonner.

**Sanity content types**: `discipline`, `galerie`, `actualite`, `parametres`

### Config Notes

- Vite base path is `/amsp-website/` for GitHub Pages deployment
- TypeScript is configured with loose checking (`noImplicitAny: false`, `strictNullChecks: false`)
- Path alias `@` maps to `src/`
- Tests use jsdom environment, files match `src/**/*.{test,spec}.{ts,tsx}`
