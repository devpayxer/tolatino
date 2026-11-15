"use client";
/* ADM-USR · lista (Super Admin.dc.html secUsr / usrList): buscar por nombre, teléfono, correo o id; QUIÉN, ESTADO,
   «Más filtros» y ORDENAR. Tabla densa en escritorio, filas en el teléfono, paginador. Los filtros viven en la URL; el
   servidor filtra. Rango, compras, reportes recibidos y Wallet llegan con sus módulos. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { FiltrosUsr } from "@/lib/admin-usuarios";
import { useAncho } from "./Colas";
import { useAhora } from "@/lib/ahora";

import { tec } from "@/lib/tec";
import { useE } from "./idioma-admin";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"DenseTable" | "AdminList" | "Pager" | "Icon", ComponentType<any>>;
type Fila = { id: string; nombre: string | null; phone: string; photo: string | null; zona: string | null; ciudad: string | null; estado: string; dueno: boolean; staff: string | null; creado: string; visto: string | null;
  rango: number; pedidos: number; citas: number; reportes: number; promo: boolean; posts: number; resenas: number };
export const EST_USR: Record<string, string> = { adv: "ADVERTIDO", mute: "SILENCIADO", susp: "SUSPENDIDO", ban: "BANEADO", del: "BORRADO" };
export const EST_USR_EN: Record<string, string> = { adv: "WARNED", mute: "MUTED", susp: "SUSPENDED", ban: "BANNED", del: "DELETED" };
export const haceUsr = (iso: string | null, ahora: number, en = false) => {
  if (!iso) return en ? "never" : "nunca";
  const m = (ahora - new Date(iso).getTime()) / 60_000;
  if (en) return m < 5 ? "now" : m < 60 ? `${Math.floor(m)} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : m < 43200 ? `${Math.floor(m / 1440)} d ago` : new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  return m < 5 ? "ahora" : m < 60 ? `hace ${Math.floor(m)} min` : m < 1440 ? `hace ${Math.floor(m / 60)} h` : m < 43200 ? `hace ${Math.floor(m / 1440)} d` : new Date(iso).toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric" });
};

export function Usuarios({ filas, total, cab, f, porPagina }: { filas: Fila[]; total: number; cab: { n: number; duenos: number; sanc: number }; f: FiltrosUsr; porPagina: number }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const E = useE(), en = E("", "x") === "x", EST = en ? EST_USR_EN : EST_USR;
  const w = useAncho(), desk = w >= 1024;
  const [q, setQ] = useState(f.q), [mas, setMas] = useState(f.mas.length > 0);
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("pag" in p)) u.delete("pag"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const toggle = (k: "quien" | "est" | "mas", v: string) => { const l = f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]; ir({ [k]: l.join(",") || null }); };
  const chips = (k: "quien" | "est" | "mas", label: string, items: [string, string][]): Bloque => ({ type: "chips", k: label, items: items.map(([v, l]) => ({ l, v: f[k].includes(v) ? "selected" : "filter", onClick: () => toggle(k, v) })) });
  const hayFiltro = !!(f.q || f.quien.length || f.est.length || f.mas.length || f.rk || f.orden !== "last");
  const nombre = (r: Fila) => r.nombre ?? E("(sin nombre todavía)", "(no name yet)");
  const lugar = (r: Fila) => [r.zona, r.ciudad].filter(Boolean).join(" · ") || E("Sin ciudad", "No city");
  const tag = (r: Fila): [string, string] => r.estado !== "ok" ? [EST[r.estado] ?? r.estado.toUpperCase(), "danger"] : r.staff ? [r.staff.toUpperCase(), "ink"] : r.dueno ? [E("DUEÑO", "OWNER"), "action"] : [E("ACTIVO", "ACTIVE"), "neutral"];
  const bloques: Bloque[] = [{ type: "head", eye: E("TODAS LAS CUENTAS", "ALL ACCOUNTS"), t: E("Usuarios", "Users"), s: E(`${cab.n} ${cab.n === 1 ? "vecino" : "vecinos"} con cuenta · ${cab.duenos} ${cab.duenos === 1 ? "dueño" : "dueños"} · ${cab.sanc} con sanción`, `${cab.n} ${cab.n === 1 ? "neighbor" : "neighbors"} with an account · ${cab.duenos} ${cab.duenos === 1 ? "owner" : "owners"} · ${cab.sanc} with a sanction`), h1: desk ? 26 : 22 }];
  const despues: (Bloque | null)[] = [
    chips("quien", E("QUIÉN", "WHO"), [["own", E("Dueños de negocio", "Business owners")], ["promo", E("Promotores", "Promoters")], ["cli", E("Solo clientes", "Customers only")]]),
    chips("est", E("ESTADO", "STATUS"), [["ok", E("Activo", "Active")], ["adv", E("Advertido", "Warned")], ["mute", E("Silenciado", "Muted")], ["susp", E("Suspendido", "Suspended")], ["ban", E("Baneado", "Banned")], ["del", E("Borrado", "Deleted")]]),
    mas ? chips("mas", E("ACTIVIDAD", "ACTIVITY"), [["new", E("Nuevos 30 d", "New 30 d")], ["act7", E("Activos 7 d", "Active 7 d")], ["inact", E("Sin entrar 30 d+", "Inactive 30 d+")], ["mdev", E("Varios dispositivos", "Multiple devices")], ["noemail", E("Sin correo", "No email")], ["rep", E("Con reportes", "With reports")]]) : null,
    mas ? { type: "chips", k: E("RANGO EN LA COMUNIDAD", "COMMUNITY RANK"), items: ([["", E("Cualquiera", "Any")], ["4", E("4 o más", "4 or more")], ["7", E("7 o más", "7 or more")], ["9", E("9 o más", "9 or more")]] as [string, string][]).map(([v, l]) => ({ l, v: String(f.rk ?? "") === v ? "selected" : "filter", onClick: () => ir({ rk: v || null }) })) } : null,
    { type: "chips", k: E("ORDENAR", "SORT"), items: ([["last", E("Última vez", "Last seen")], ["new", E("Más nuevos", "Newest")], ["ped", E("Más compras", "Most purchases")], ["rep", E("Más reportes", "Most reports")], ["rk", E("Rango", "Rank")]] as const).map(([v, l]) => ({ l, v: f.orden === v ? "selected" : "filter", onClick: () => ir({ orden: v === "last" ? null : v }) })) },
    { type: "acts", items: [
      { l: mas ? E("Menos filtros", "Fewer filters") : `${E("Más filtros", "More filters")}${f.mas.length ? ` (${f.mas.length})` : ""}`, icon: "grid", onClick: () => setMas(!mas) },
      ...(hayFiltro ? [{ l: E("Quitar filtros", "Clear filters"), icon: "close", onClick: () => router.push(path) }] : []),
    ] },
  ];
  const a = total ? (f.pag - 1) * porPagina + 1 : 0, b = Math.min(total, f.pag * porPagina);
  const pager = { label: `${a}–${b} · ${total}`, hasPrev: f.pag > 1, hasNext: b < total, onPrev: () => ir({ pag: String(f.pag - 1) }), onNext: () => ir({ pag: String(f.pag + 1) }) };
  const abrir = (id: string) => router.push(`/admin/usuarios/${id}`);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={bloques} h1={desk ? 26 : 22} />
      <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null }); }} style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.6)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={E("Nombre, teléfono, correo o id", "Name, phone, email or id")} aria-label={E("Buscar usuario", "Search user")}
          style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 40px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
        {q ? <span role="button" aria-label={E("Borrar", "Clear")} onClick={() => { setQ(""); ir({ q: null }); }} {...tec(() => { setQ(""); ir({ q: null }); })} style={{ position: "absolute", right: 12, top: 13, cursor: "pointer", display: "grid" }}><A.Icon name="close" size={18} color="rgba(11,14,18,.6)" /></span> : null}
      </form>
      <PanelBloques bloques={despues} />
      {!filas.length ? (
        <PanelBloques bloques={[{ type: "empty", icon: "users", t: E("Nadie con esos filtros", "No one matches those filters"), s: E("Quita un filtro o busca por teléfono.", "Remove a filter or search by phone.") }]} />
      ) : desk ? (
        <A.DenseTable columns="minmax(0,2fr) minmax(0,1.1fr) 60px minmax(0,1.4fr) 90px 110px"
          head={[{ label: E("USUARIO", "USER") }, { label: E("ZONA", "AREA") }, { label: E("RANGO", "RANK") }, { label: E("ACTIVIDAD", "ACTIVITY") }, { label: E("ÚLTIMA VEZ", "LAST SEEN") }, { label: E("ESTADO", "STATUS") }]}
          rows={filas.map((r) => {
            const [t, tone] = tag(r);
            return {
              opacity: r.estado === "ban" || r.estado === "del" ? 0.55 : 1, onClick: () => abrir(r.id),
              cells: [
                { image: r.photo ?? undefined, initials: r.photo ? undefined : nombre(r).slice(0, 1), text: nombre(r), bold: true, sub: r.phone },
                { text: lugar(r) },
                { text: String(r.rango) },
                { text: E(`${r.pedidos} ${r.pedidos === 1 ? "pedido" : "pedidos"} · ${r.citas} ${r.citas === 1 ? "cita" : "citas"}`, `${r.pedidos} ${r.pedidos === 1 ? "order" : "orders"} · ${r.citas} ${r.citas === 1 ? "booking" : "bookings"}`),
                  sub: E(`${r.resenas} ${r.resenas === 1 ? "reseña" : "reseñas"} · ${r.posts} posts${r.reportes ? ` · ${r.reportes} ${r.reportes === 1 ? "reporte" : "reportes"}` : ""}`, `${r.resenas} ${r.resenas === 1 ? "review" : "reviews"} · ${r.posts} posts${r.reportes ? ` · ${r.reportes} ${r.reportes === 1 ? "report" : "reports"}` : ""}`) },
                { text: haceUsr(r.visto, ahora, en) },
                { tag: t, tone },
              ],
            };
          })}
          page={pager} />
      ) : (
        <>
          <A.AdminList rows={filas.map((r) => ({
            image: r.photo ?? undefined, initials: r.photo ? undefined : nombre(r).slice(0, 1), title: nombre(r), sub: E(`${lugar(r)}${r.dueno ? " · dueño" : ""}${r.promo ? " · promotor" : ""} · rango ${r.rango} · ${r.pedidos + r.citas} ${r.pedidos + r.citas === 1 ? "compra" : "compras"}`, `${lugar(r)}${r.dueno ? " · owner" : ""}${r.promo ? " · promoter" : ""} · rank ${r.rango} · ${r.pedidos + r.citas} ${r.pedidos + r.citas === 1 ? "purchase" : "purchases"}`),
            tag: r.estado !== "ok" ? EST[r.estado] : undefined, tone: "danger", chevron: true, onClick: () => abrir(r.id),
          }))} />
          <A.Pager {...pager} />
        </>
      )}
    </div>
  );
}
