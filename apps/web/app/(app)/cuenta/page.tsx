import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { misDirecciones } from "@/lib/direcciones";
import { idioma } from "@/lib/idioma";
import { Inicio } from "./Inicio";
import { yoMarco } from "./yo";

/* USR-HOME · Mi cuenta. Hoy: lo que el equipo decidió sobre la cuenta, tus direcciones y cerrar sesión. El Resumen
   completo (tu tarjeta de vecino, tu semana, pedidos, citas, boletos) llega con el bloque 2h. */
export const metadata: Metadata = { title: "Mi cuenta · To'Latino" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await yo();
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta")}`);
  const es = (await idioma()) === "es";
  const [sanciones, dirs, me] = await Promise.all([
    db().query<{ kind: string; reason: string; ends_at: string | null }>(
      `select kind, reason, ends_at from sanctions where target_kind = 'user' and target_id = $1::text and kind in ('adv', 'mute7', 'nopub')
          and lifted_at is null and (ends_at is null or ends_at > now()) order by starts_at desc limit 3`, [u.id]),
    misDirecciones(u.id), yoMarco(u, es),
  ]);
  const tel = u.phone.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");
  return <Inicio es={es} yo={me} tel={tel} nombre={`${u.nick || u.first_name} ${u.last_name ?? ""}`.trim()} dirs={dirs.length}
    sanciones={sanciones.rows.map((x) => ({ kind: x.kind, reason: x.reason, hasta: x.ends_at }))} />;
}
