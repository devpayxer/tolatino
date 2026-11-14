import { AdminNote, KpiRow } from "@tolatino/ui";
import { requerir } from "@/lib/admin";
import { db } from "@/lib/db";
import { gruposNav } from "@/lib/admin-nav";
import { ciudadViva } from "@/lib/admin-analitica";
import { idioma } from "@/lib/idioma";
import { Auditoria } from "./sistema/Auditoria";
import {SeccionesMovil, Titulo } from "./ui";

/* ADM-HOME · Inicio. Números reales de la base; sin datos de ejemplo. */
export default async function Inicio({ searchParams }: { searchParams: Promise<{ sin?: string }> }) {
  const { sin } = await searchParams;
  const s = await requerir("home");
  const r = await db().query<{ usuarios: number; nuevos: number; abiertas: number; proximas: number; equipo: number; acciones: number }>(
    `select (select count(*)::int from users where status <> 'deleted') as usuarios,
            (select count(*)::int from users where created_at > now() - interval '7 days') as nuevos,
            (select count(*)::int from cities where status = 'on') as abiertas,
            (select count(*)::int from cities where status in ('soon', 'beta')) as proximas,
            (select count(*)::int from staff_members where status = 'active') as equipo,
            (select count(*)::int from audit_entries where at > now() - interval '24 hours') as acciones`,
  );
  const k = r.rows[0]!;
  const grupos = await gruposNav((x) => s.puede(x, "ver"));
  // 6j · Alerta «evento con sobreventa» (admin-dashboard L74): la vista evt_sobreventa; con los checks de la base no debería salir nunca.
  const sv = s.puede("evt", "ver") ? await (await import("@/lib/evt-admin")).sobreventa(s) : [];
  // 7c · Alerta del tope de El Compa (decisión F): al pasar compa_alerta_pct y al llegar al tope.
  const cg = s.puede("compa", "ver") ? await (await import("@/lib/compa/tope")).gastoDelMes() : null;
  const cAl = cg && (cg.topeEn || cg.pct >= 100) ? "tope" : cg && cg.pct >= cg.alertaPct ? "aviso" : null;
  const usd = (c: number) => "$" + (c / 100).toFixed(2);
  // 9g · «Ciudad viva» (pantallas-iniciales.md §2, ADM-HOME): por ciudad abierta o por abrir, de la base de análisis; con analit:ver.
  const [lang, vivas] = await Promise.all([idioma(), s.puede("analit", "ver") ? ciudadViva(s) : Promise.resolve([])]);
  const E = (a: string, b: string) => (lang === "en" ? b : a);
  // 9k · «El dinero no cuadra» (el guardián del dinero): diferencias de la conciliación de los últimos 14 días que nadie tomó.
  // 9i · La lista de espera de las ciudades que vienen (9h → 9i: va aquí con su OK sobre la captura nueva) y el cierre de una ciudad que espera a otra persona.
  const ce = s.puede("ciud", "ver") ? await (await import("@/lib/ciudades/admin")).esperaInicio(s) : null;
  const dn = s.puede("tx", "ver") ? (await db().query<{ dias: number; n: number; c: string }>(
    `select count(*) filter (where x.sin_dueno > 0)::int as dias, coalesce(sum(x.sin_dueno), 0)::int as n, coalesce(sum(x.diferencia_cents) filter (where x.sin_dueno > 0), 0)::text as c
       from generate_series((now() at time zone 'UTC')::date - 14, (now() at time zone 'UTC')::date - 1, interval '1 day') g, conciliacion_del_dia(g::date) x`)).rows[0] : null;
  return (
    <>
      <Titulo eyebrow="SUPER ADMIN · INICIO" titulo={`Hola, ${s.first_name}`} sub="Todo lo de aquí sale de la base real del servidor de pruebas." />
      {sin && <AdminNote tone="warn">Tu rol no tiene permiso para eso ({sin.replace(":", " · ")}). Si lo necesitas, pídeselo a un Admin.</AdminNote>}
      {cg && cAl ? <AdminNote tone={cAl === "tope" ? "bad" : "warn"} icon="warning">{cAl === "tope"
        ? `EL COMPA LLEGÓ AL TOPE · ${usd(cg.gastado)} de ${usd(cg.tope)} este mes. Contesta con reglas fijas y ofrece «Con una persona». Sube el tope en El Compa · IA si hace falta.`
        : `EL COMPA VA EN EL ${cg.pct} % DEL TOPE · ${usd(cg.gastado)} de ${usd(cg.tope)} este mes. Míralo en El Compa · IA.`}</AdminNote> : null}
      {dn && dn.n > 0 ? <AdminNote tone="bad" icon="warning">{`EL DINERO NO CUADRA · ${dn.n} diferencia${dn.n === 1 ? "" : "s"} sin dueño en ${dn.dias} día${dn.dias === 1 ? "" : "s"} (${usd(Math.abs(Number(dn.c)))}). Tómalas en Planes › Ingresos › Conciliación.`}</AdminNote> : null}
      {ce && ce.cierres ? <AdminNote tone="warn" icon="warning">{E(`CIERRE DE CIUDAD POR APROBAR · ${ce.cierres}. Lo aprueba otra persona del equipo en Ciudades.`, `CITY CLOSE PENDING · ${ce.cierres}. Another team member approves it in Cities.`)}</AdminNote> : null}
      {sv.length ? <AdminNote tone="bad" icon="warning">{`EVENTO CON SOBREVENTA · ${sv.slice(0, 3).map((x) => `${x.titulo.es} · ${x.dia}: ${x.vivos} vivos de ${x.cantidad}`).join(" · ")}. Míralo en Eventos y boletos.`}</AdminNote> : null}
      <KpiRow
        columns="repeat(auto-fill, minmax(min(100%, 160px), 1fr))"
        items={[
          { label: "USUARIOS", value: String(k.usuarios), sub: `${k.nuevos} nuevos en 7 días`, dark: true },
          { label: "CIUDADES", value: `${k.abiertas} abiertas`, sub: `${k.proximas} próximamente` },
          ...(ce ? [{ label: E("LISTA DE ESPERA", "WAITLIST"), value: ce.total.toLocaleString("en-US"), sub: ce.ciudades.filter((c) => c.n).map((c) => `${c.name} ${c.n}`).join(" · ") || E("nadie esperando", "no one waiting") }] : []),
          { label: "EQUIPO", value: String(k.equipo), sub: "personas activas" },
          { label: "ACCIONES 24 H", value: String(k.acciones), sub: "en la auditoría" },
        ]}
      />
      <SeccionesMovil grupos={grupos} />
      {s.puede("sys", "ver") && <Auditoria limite={8} titulo="ÚLTIMAS ACCIONES DEL EQUIPO" />}
      {vivas.length ? (
        <section className="flex flex-col gap-2.5" data-ciudad-viva>
          <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-text-muted">{E("CIUDAD VIVA", "LIVING CITY")}</span>
          {vivas.map((c) => (
            <div key={c.id} className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold">{c.ciudad}{c.status === "on" ? "" : c.status === "beta" ? E(" · beta (solo invitados)", " · beta (invited only)") : E(" · próximamente", " · coming soon")}</span>
              <KpiRow columns="repeat(auto-fill, minmax(min(100%, 160px), 1fr))" items={[
                { label: E("SEMILLAS RECLAMADAS", "SEEDS CLAIMED"), value: c.semillas ? `${Math.round((c.reclamadas / c.semillas) * 100)} %` : "—", sub: E(`${c.reclamadas} de ${c.semillas}`, `${c.reclamadas} of ${c.semillas}`), dark: c.status === "on" },
                { label: E("PUBLICACIONES · DÍA", "POSTS · DAY"), value: (Math.round((c.posts7 / 7) * 10) / 10).toString(), sub: E(`${c.posts7} en 7 días`, `${c.posts7} in 7 days`) },
                { label: E("RECOMENDACIONES", "RECOMMENDATIONS"), value: String(c.recs30), sub: E("de vecinos en 30 días", "by neighbors in 30 days") },
                { label: E("VECINOS ACTIVOS", "ACTIVE NEIGHBORS"), value: String(c.activos7), sub: E("en 7 días", "in 7 days") },
              ]} />
            </div>))}
        </section>) : null}
    </>
  );
}
