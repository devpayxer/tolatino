import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@tolatino/ui";
import { yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { idioma } from "@/lib/idioma";
import { Salir } from "./Salir";

/* USR · Mi cuenta (mínima, Fase 0): solo confirma la sesión. Mi cuenta completa (patrón 2s) entra con la Fase 2. */
export const metadata: Metadata = { title: "Mi cuenta · To'Latino" };
export const dynamic = "force-dynamic";

const fmt = (p: string) => p.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");

export default async function Page() {
  const u = await yo();
  if (!u) redirect("/entrar");
  if (!u.first_name) redirect("/entrar");
  // Lo que el equipo de To'Latino decidió sobre la cuenta (advertencia, silencio): con su motivo y hasta cuándo.
  const en = (await idioma()) === "en";
  const sanciones = (await db().query<{ kind: string; reason: string; ends_at: string | null }>(
    `select kind, reason, ends_at from sanctions where target_kind = 'user' and target_id = $1::text and kind in ('adv', 'mute7', 'nopub')
        and lifted_at is null and (ends_at is null or ends_at > now()) order by starts_at desc limit 3`, [u.id])).rows;
  const dia = (d: string) => new Date(d).toLocaleDateString(en ? "en-US" : "es-US", { day: "numeric", month: "long", timeZone: "America/New_York" });
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
      {sanciones.map((x, i) => (
        <p key={i} role="status" className="rounded-sm bg-danger-tint px-4 py-3 text-[14px] font-semibold leading-[1.5] text-danger">
          {x.kind === "adv"
            ? (en ? `To’Latino sent you a warning: ${x.reason}.` : `To’Latino te mandó una advertencia: ${x.reason}.`)
            : (en ? `You can’t post until ${dia(x.ends_at!)}: ${x.reason}.` : `No puedes publicar hasta el ${dia(x.ends_at!)}: ${x.reason}.`)}
        </p>
      ))}
      <Salir />
    </main>
  );
}
