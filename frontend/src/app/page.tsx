import { ArrowUpRight, Film, Server, Sparkles } from 'lucide-react';

const docsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '/api/docs')
  ?? 'http://localhost:4000/api/docs';

const cards = [
  {
    title: 'Backend API',
    body: 'NestJS scaffold with Swagger, validation, security middleware, and placeholder modules.',
    icon: Server,
  },
  {
    title: 'Frontend App',
    body: 'Next.js app-router shell with Tailwind, Zustand, and TMDB-ready remote image support.',
    icon: Film,
  },
  {
    title: 'Recommendation Service',
    body: 'FastAPI microservice prepared for content-based and collaborative recommenders.',
    icon: Sparkles,
  },
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden px-6 py-10 sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center gap-10">
        <section className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[2rem] border border-black/10 bg-[var(--surface-strong)] p-8 shadow-panel backdrop-blur sm:p-12">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-ink/10 bg-white/70 px-4 py-2 text-sm uppercase tracking-[0.28em] text-brand-pine">
              CineDB Platform
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-brand-ink sm:text-6xl">
              CineDB - Coming Soon
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-brand-ink/75 sm:text-lg">
              The repository foundation is ready for the movie database platform. Backend,
              frontend, recommendation service, and local infrastructure are scaffolded for the
              next implementation phases.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                className="inline-flex items-center gap-2 rounded-full bg-brand-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-pine"
                href={docsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open Swagger
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-full border border-brand-ink/15 px-5 py-3 text-sm font-medium text-brand-ink transition hover:border-brand-coral hover:text-brand-coral"
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noreferrer"
              >
                TMDB Reference
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-black/10 bg-brand-ink p-8 text-white shadow-panel">
            <p className="text-sm uppercase tracking-[0.28em] text-brand-gold">Phase 0</p>
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-3xl font-semibold">3</p>
                <p className="text-sm text-white/70">Core services scaffolded</p>
              </div>
              <div>
                <p className="text-3xl font-semibold">3</p>
                <p className="text-sm text-white/70">Docker dependencies configured</p>
              </div>
              <div>
                <p className="text-3xl font-semibold">1</p>
                <p className="text-sm text-white/70">Shared environment contract</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {cards.map(({ title, body, icon: Icon }) => (
            <article
              key={title}
              className="rounded-[1.75rem] border border-black/10 bg-[var(--surface)] p-6 shadow-panel backdrop-blur"
            >
              <Icon className="h-10 w-10 text-brand-coral" />
              <h2 className="mt-5 text-xl font-semibold text-brand-ink">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-brand-ink/70">{body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

