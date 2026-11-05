import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@tolatino/ui";
import { yo } from "@/lib/cuenta";
import { Salir } from "./Salir";

/* USR · Mi cuenta (mínima, Fase 0): solo confirma la sesión. Mi cuenta completa (patrón 2s) entra con la Fase 2. */
export const metadata: Metadata = { title: "Mi cuenta · To'Latino" };
export const dynamic = "force-dynamic";

const fmt = (p: string) => p.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");

export default async function Page() {
  const u = await yo();
  if (!u) redirect("/entrar");
  if (!u.first_name) redirect("/entrar");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-6 px-5 pb-12 pt-8">
      <Wordmark size={22} />
      <section className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-muted">Mi cuenta</span>
        <h1 className="font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em]">
          {u.nick || u.first_name} {u.last_name}
        </h1>
        <p className="text-[14px] font-medium text-text-2">Entraste con el {fmt(u.phone)}. Esta sesión queda abierta en este teléfono.</p>
      </section>
      <Salir />
    </main>
  );
}
