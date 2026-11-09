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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"DenseTable" | "AdminList" | "Pager" | "Icon", ComponentType<any>>;
type Fila = { id: string; nombre: string | null; phone: string; photo: string | null; zona: string | null; ciudad: string | null; estado: string; dueno: boolean; staff: string | null; creado: string; visto: string | null };
export const EST_USR: Record<string, string> = { adv: "ADVERTIDO", mute: "SILENCIADO", susp: "SUSPENDIDO", ban: "BANEADO", del: "BORRADO" };
export const haceUsr = (iso: string | null) => {
  if (!iso) return "nunca";
  const m = (Date.now() - new Date(iso).getTime()) / 60_000;
  return m < 5 ? "ahora" : m < 60 ? `hace ${Math.floor(m)} min` : m < 1440 ? `hace ${Math.floor(m / 60)} h` : m < 43200 ? `hace ${Math.floor(m / 1440)} d` : new Date(iso).toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric" });
};

export function Usuarios({ filas, total, cab, f, porPagina }: { filas: Fila[]; total: number; cab: { n: number; duenos: number; sanc: number }; f: FiltrosUsr; porPagina: number }) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const w = useAncho(), desk = w >= 1024;
  const [q, setQ] = useState(f.q), [mas, setMas] = useState(f.mas.length > 0);
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("pag" in p)) u.delete("pag"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const toggle = (k: "quien" | "est" | "mas", v: string) => { const l = f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]; ir({ [k]: l.join(",") || null }); };
  const chips = (k: "quien" | "est" | "mas", label: string, items: [string, string][]): Bloque => ({ type: "chips", k: label, items: items.map(([v, l]) => ({ l, v: f[k].includes(v) ? "selected" : "filter", onClick: () => toggle(k, v) })) });
  const hayFiltro = !!(f.q || f.quien.length || f.est.length || f.mas.length || f.rk || f.orden !== "last");
  const nombre = (r: Fila) => r.nombre ?? "(sin nombre todavía)";
  const lugar = (r: Fila) => [r.zona, r.ciudad].filter(Boolean).join(" · ") || "Sin ciudad";
  const tag = (r: Fila): [string, string] => r.estado !== "ok" ? [EST_USR[r.estado] ?? r.estado.toUpperCase(), "danger"] : r.staff ? [r.staff.toUpperCase(), "ink"] : r.dueno ? ["DUEÑO", "action"] : ["ACTIVO", "neutral"];
  const bloques: Bloque[] = [{ type: "head", eye: "TODAS LAS CUENTAS", t: "Usuarios", s: `${cab.n} ${cab.n === 1 ? "vecino" : "vecinos"} con cuenta · ${cab.duenos} ${cab.duenos === 1 ? "dueño" : "dueños"} · ${cab.sanc} con sanción`, h1: desk ? 26 : 22 }];
  const despues: (Bloque | null)[] = [
    chips("quien", "QUIÉN", [["own", "Dueños de negocio"], ["cli", "Solo clientes"]]),
    chips("est", "ESTADO", [["ok", "Activo"], ["adv", "Advertido"], ["mute", "Silenciado"], ["susp", "Suspendido"], ["ban", "Baneado"], ["del", "Borrado"]]),
    mas ? chips("mas", "ACTIVIDAD", [["new", "Nuevos 30 d"], ["act7", "Activos 7 d"], ["inact", "Sin entrar 30 d+"], ["mdev", "Varios dispositivos"], ["noemail", "Sin correo"], ["rep", "Con reportes"]]) : null,
    mas ? { type: "chips", k: "RANGO EN LA COMUNIDAD", items: ([["", "Cualquiera"], ["4", "4 o más"], ["7", "7 o más"], ["9", "9 o más"]] as [string, string][]).map(([v, l]) => ({ l, v: String(f.rk ?? "") === v ? "selected" : "filter", onClick: () => ir({ rk: v || null }) })) } : null,
    { type: "chips", k: "ORDENAR", items: ([["last", "Última vez"], ["new", "Más nuevos"]] as const).map(([v, l]) => ({ l, v: f.orden === v ? "selected" : "filter", onClick: () => ir({ orden: v === "last" ? null : v }) })) },
    { type: "acts", items: [
      { l: mas ? "Menos filtros" : `Más filtros${f.mas.length ? ` (${f.mas.length})` : ""}`, icon: "grid", onClick: () => setMas(!mas) },
      ...(hayFiltro ? [{ l: "Quitar filtros", icon: "close", onClick: () => router.push(path) }] : []),
    ] },
  ];
  const a = total ? (f.pag - 1) * porPagina + 1 : 0, b = Math.min(total, f.pag * porPagina);
  const pager = { label: `${a}–${b} · ${total}`, hasPrev: f.pag > 1, hasNext: b < total, onPrev: () => ir({ pag: String(f.pag - 1) }), onNext: () => ir({ pag: String(f.pag + 1) }) };
  const abrir = (id: string) => router.push(`/admin/usuarios/${id}`);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={bloques} h1={desk ? 26 : 22} />
      <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null }); }} style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.45)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, teléfono, correo o id" aria-label="Buscar usuario"
          style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 40px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
        {q ? <span role="button" aria-label="Borrar" onClick={() => { setQ(""); ir({ q: null }); }} style={{ position: "absolute", right: 12, top: 13, cursor: "pointer", display: "grid" }}><A.Icon name="close" size={18} color="rgba(11,14,18,.5)" /></span> : null}
      </form>
      <PanelBloques bloques={despues} />
      {!filas.length ? (
        <PanelBloques bloques={[{ type: "empty", icon: "users", t: "Nadie con esos filtros", s: "Quita un filtro o busca por teléfono." }]} />
      ) : desk ? (
        <A.DenseTable columns="minmax(0,2fr) minmax(0,1.3fr) 110px 130px"
          head={[{ label: "USUARIO" }, { label: "ZONA" }, { label: "ÚLTIMA VEZ" }, { label: "ESTADO" }]}
          rows={filas.map((r) => {
            const [t, tone] = tag(r);
            return {
              opacity: r.estado === "ban" || r.estado === "del" ? 0.55 : 1, onClick: () => abrir(r.id),
              cells: [
                { image: r.photo ?? undefined, initials: r.photo ? undefined : nombre(r).slice(0, 1), text: nombre(r), bold: true, sub: r.phone },
                { text: lugar(r) },
                { text: haceUsr(r.visto) },
                { tag: t, tone },
              ],
            };
          })}
          page={pager} />
      ) : (
        <>
          <A.AdminList rows={filas.map((r) => ({
            image: r.photo ?? undefined, initials: r.photo ? undefined : nombre(r).slice(0, 1), title: nombre(r), sub: `${lugar(r)}${r.dueno ? " · dueño" : ""}`,
            tag: r.estado !== "ok" ? EST_USR[r.estado] : undefined, tone: "danger", chevron: true, onClick: () => abrir(r.id),
          }))} />
          <A.Pager {...pager} />
        </>
      )}
    </div>
  );
}
