/* Pantalla del sandbox que todavía se construye: lo dice, con su bloque. Nunca llega a producción (fase 9 exige 0). */
export function Pronto({ titulo, bloque }: { titulo: string; bloque: string }) {
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-2 px-5 pt-8">
      <span className="font-mono text-[10px] font-extrabold tracking-[0.12em] text-text-muted">EN CONSTRUCCIÓN · {bloque}</span>
      <h1 className="font-display text-[24px] font-extrabold tracking-[-0.04em]">{titulo}</h1>
      <p className="text-[13.5px] leading-[1.6] text-text-2">Esta pantalla se construye en: {bloque}, tal como está en el diseño.</p>
    </main>
  );
}
