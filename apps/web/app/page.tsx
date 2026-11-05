import { Wordmark } from "@tolatino/ui";

/* APP-HOME · cimientos (Fase 0). Pantalla temporal: solo demuestra tokens y fuentes.
   Se reemplaza por el Inicio real en la Fase 1. */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[393px] flex-col gap-6 px-5 pb-12 pt-10">
      <Wordmark size={28} />
      <section className="flex flex-col gap-3">
        <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-muted">
          Fase 0 · Cimientos
        </span>
        <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink">
          Servidor de pruebas en marcha
        </h1>
        <p className="text-[13.5px] leading-[1.62] text-text-2">
          Esta pantalla solo comprueba que el sistema de diseño llegó al servidor: fondo Paper, tinta Ink, Sora para
          títulos, Manrope para el cuerpo y JetBrains Mono para las etiquetas.
        </p>
      </section>
      <section className="grid grid-cols-4 gap-2">
        {[
          ["Ink", "bg-ink"],
          ["Action", "bg-action"],
          ["Signal", "bg-signal"],
          ["Pro", "bg-pro"],
        ].map(([n, c]) => (
          <div key={n} className="flex flex-col gap-1.5">
            <div className={`h-14 rounded-card ${c}`} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">{n}</span>
          </div>
        ))}
      </section>
      <div className="flex">
        <a
          href="/api/salud"
          className="flex h-12 flex-1 items-center justify-center rounded-button bg-ink text-[14.5px] font-bold text-white"
        >
          Ver estado del servidor
        </a>
      </div>
    </main>
  );
}
