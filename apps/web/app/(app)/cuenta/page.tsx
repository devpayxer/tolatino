import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { misDirecciones, numeroVecino } from "@/lib/direcciones";
import { idioma } from "@/lib/idioma";
import { resumen } from "@/lib/mi-cuenta";
import { misNegocios } from "@/lib/panel";
import { Inicio } from "./Inicio";
import { yoMarco } from "./yo";

/* USR-HOME · Mi cuenta (diseño homeV): tu tarjeta de vecino, completa tu cuenta, tu semana, lo que espera de ti, accesos,
   tu apoyo al barrio y tu cuenta. Todo del servidor; lo que todavía no existe (rango, monedas, Wallet, boletos, mensajes)
   no se muestra. */
export const metadata: Metadata = { title: "Mi cuenta · To'Latino" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await yo();
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta")}`);
  const lang = await idioma(), es = lang === "es";
  const [sanciones, dirs, me, r, nv, negs, del] = await Promise.all([
    db().query<{ kind: string; reason: string; ends_at: string | null }>(
      `select kind, reason, ends_at from sanctions where target_kind = 'user' and target_id = $1::text and kind in ('adv', 'mute7', 'nopub')
          and lifted_at is null and (ends_at is null or ends_at > now()) order by starts_at desc limit 3`, [u.id]),
    misDirecciones(u.id), yoMarco(u, es), resumen(u.id), numeroVecino(u.id), misNegocios(u.id),
    db().query<{ d: string | null }>(`select to_char(delete_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as d from users where id = $1`, [u.id]),
  ]);
  return <Inicio es={es} yo={me} r={r} dirs={dirs.length} ciudad={nv?.ciudad ?? null} nick={u.nick} borrar={del.rows[0]?.d ?? null}
    nombre={[u.first_name, u.last_name].filter(Boolean).join(" ")} negocio={negs[0] ? { id: negs[0].id, name: negs[0].name } : null}
    sanciones={sanciones.rows.map((x) => ({ kind: x.kind, reason: x.reason, hasta: x.ends_at }))} />;
}
