"use client";
/* Piezas cliente del Super Admin, compuestas con el sistema de diseño (patrones 2aj–2aq). */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { Resultado } from "./acciones";
import { tomarSiguiente } from "./acciones-colas";
import { elegirCiudad } from "./acciones";
import { tec } from "@/lib/tec";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Icono = UI.Icon as ComponentType<any>;

type N = "AdminBar" | "AdminNav" | "AdminNote" | "AdminRow" | "AdminList" | "KpiRow" | "AuditLog" | "PermMatrix" | "ReasonConfirm" | "Tag" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const A = UI as unknown as Record<N, ComponentType<any>>;

function useDesk() {
  const [d, setD] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const f = () => setD(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return d;
}

export type ItemNav = { key: string; label: string; icon: string; href: string | null; fase?: string };
export type GrupoNav = { label: string; items: ItemNav[] };

export function Shell({ yo, grupos, casos, ciudades = [], vista = null, children }: { yo: { nombre: string; rol: string; iniciales: string }; grupos: GrupoNav[]; casos: { n: number; late: boolean; tomar: boolean }; ciudades?: { id: string; nombre: string }[]; vista?: string | null; children: ReactNode }) {
  const desk = useDesk();
  const router = useRouter();
  const ruta = usePathname();
  const navGroups = grupos.map((g) => ({
    label: g.label,
    items: g.items.map((i) => ({
      label: i.label,
      icon: i.icon,
      on: i.href ? (i.href === "/admin" ? ruta === "/admin" : ruta.startsWith(i.href)) : false,
      lock: !i.href,
      dim: !i.href,
      count: i.key === "colas" && casos.n ? casos.n : undefined,
      late: i.key === "colas" && casos.late,
      onClick: () => router.push(i.href ?? `/admin/pendiente/${i.key}`),
    })),
  }));
  // 9n-3 · ⌘K (o Ctrl K) abre el buscador global desde cualquier pantalla.
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); router.push("/admin/buscar"); } };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [router]);
  // 9n-3 · El selector de ciudad filtra TODAS las secciones (lib/admin.ts: `cities` de la vista). En escritorio: Todas + una por ciudad; en el teléfono no caben
  // cinco segmentos: «Todas» y la ciudad elegida (tocarla pasa a la siguiente).
  const elegir = (id: string | null) => void elegirCiudad(id).then(() => router.refresh());
  const siguiente = () => { const i = ciudades.findIndex((c) => c.id === vista); elegir(ciudades[(i + 1) % ciudades.length]?.id ?? null); };
  const segmentos = ciudades.length < 2 ? [{ label: "Todas", on: true }]
    : desk ? [{ label: "Todas", on: !vista, onClick: () => elegir(null) }, ...ciudades.map((c) => ({ label: c.nombre, on: vista === c.id, onClick: () => elegir(c.id) }))]
    : [{ label: "Todas", on: !vista, onClick: () => elegir(null) }, { label: vista ? ciudades.find((c) => c.id === vista)?.nombre ?? "Ciudad" : "Ciudad…", on: !!vista, onClick: siguiente }];
  return (
    <div className="min-h-dvh bg-paper">
      <div className="sticky top-0 z-30">
        <A.AdminBar
          desk={desk}
          assetBase="/assets/"
          onHome={() => router.push("/admin")}
          searchPlaceholder="Buscar negocio, usuario, # de operación…"
          onSearch={() => router.push("/admin/buscar")}
          onBell={() => router.push("/admin/colas")}
          cities={segmentos}
          count={casos.n}
          me={{ name: yo.nombre, role: yo.rol, initials: yo.iniciales }}
          onMe={() => router.push("/cuenta")}
        />
      </div>
      <div className="mx-auto flex w-full max-w-[1440px] gap-6 px-4 pb-16 pt-4 lg:px-6">
        {desk && (
          <aside className="sticky top-[76px] h-[calc(100dvh-92px)] w-[232px] flex-none overflow-y-auto">
            <A.AdminNav groups={navGroups} onTakeNext={casos.tomar ? () => void tomarSiguiente().then((r) => { if (r.ok && r.caso) router.push(`/admin/colas?caso=${r.caso}`); else router.push("/admin/colas?f=sin"); }) : undefined} />
          </aside>
        )}
        <main className="flex min-w-0 flex-1 flex-col gap-5 pb-[84px] lg:pb-0">{children}</main>
      </div>
      {!desk && (
        /* Barra inferior del teléfono (Super Admin.dc.html SA:251-262): Inicio · Colas · Negocios · Usuarios.
           Transacciones llega en la Fase 2. */
        <nav style={{ position: "fixed", insetInline: 0, bottom: 0, zIndex: 40, background: "rgba(247,246,243,.96)", backdropFilter: "blur(14px)", borderTop: "1px solid rgba(11,14,18,.08)", padding: "8px 8px 14px", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
          {([["/admin", "home", "Inicio"], ["/admin/colas", "bell", "Colas"], ["/admin/negocios", "store", "Negocios"], ["/admin/usuarios", "users", "Usuarios"]] as const).map(([href, icon, l]) => {
            const on = href === "/admin" ? ruta === "/admin" : ruta.startsWith(href);
            return (
              <div key={href} role="link" onClick={() => router.push(href)} {...tec(() => router.push(href))} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0", cursor: "pointer", color: on ? "var(--tl-ink)" : "rgba(11,14,18,.42)" }}>
                <Icono name={icon} size={21} color={on ? "var(--tl-ink)" : "rgba(11,14,18,.42)"} />
                <span style={{ font: "700 10.5px Manrope,sans-serif" }}>{l}</span>
                {href === "/admin/colas" && casos.n ? <span style={{ position: "absolute", top: 1, left: "calc(50% + 6px)", minWidth: 17, height: 17, padding: "0 4px", boxSizing: "border-box", borderRadius: 99, background: casos.late ? "var(--tl-danger)" : "var(--tl-action)", color: "var(--tl-white)", display: "grid", placeItems: "center", font: "800 9px 'JetBrains Mono',monospace" }}>{casos.n}</span> : null}
              </div>);
          })}
        </nav>
      )}
    </div>
  );
}

export function Titulo({ eyebrow, titulo, sub }: { eyebrow: string; titulo: string; sub?: string }) {
  return (
    <header className="flex flex-col gap-1">
      <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-muted">{eyebrow}</span>
      <h1 className="font-display text-[24px] font-extrabold leading-[1.08] tracking-[-0.04em]">{titulo}</h1>
      {sub && <p className="max-w-[640px] text-[13.5px] leading-[1.6] text-text-2">{sub}</p>}
    </header>
  );
}

/* Lista de secciones para el móvil (plan §6: en móvil el admin es una lista de secciones). */
export function SeccionesMovil({ grupos }: { grupos: GrupoNav[] }) {
  const desk = useDesk();
  const router = useRouter();
  if (desk) return null;
  return (
    <div className="flex flex-col gap-4">
      {grupos.map((g) => (
        <A.AdminList
          key={g.label}
          label={g.label.toUpperCase()}
          rows={g.items.map((i) => ({
            key: i.key,
            icon: i.icon,
            title: i.label,
            sub: i.href ? undefined : `Se construye en la ${i.fase}`,
            opacity: i.href ? 1 : 0.6,
            chevron: true,
            onClick: () => router.push(i.href ?? `/admin/pendiente/${i.key}`),
          }))}
        />
      ))}
    </div>
  );
}

/* Acción sobre un tercero: siempre con motivo (patrón 2ao). Envía un server action con campos ocultos. */
export function ConMotivo({
  accion, campos, boton, titulo, sub, plantillas = [], peligro, cta = "Confirmar",
}: {
  accion: (p: Resultado | null, f: FormData) => Promise<Resultado>;
  campos: Record<string, string>;
  boton: string;
  titulo: string;
  sub?: string;
  plantillas?: string[];
  peligro?: boolean;
  cta?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [estado, enviar, pendiente] = useActionState(accion, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) { setAbierto(false); setMotivo(""); }
  }, [estado]);
  if (!abierto)
    return (
      <div className="flex flex-col gap-1">
        <div className="flex">
          <A.Button size="sm" variant={peligro ? "danger" : "secondary"} onClick={() => setAbierto(true)}>{boton}</A.Button>
        </div>
        {estado?.mensaje && <span className={`text-[12px] font-semibold ${estado.ok ? "text-open-text" : "text-danger"}`}>{estado.mensaje}</span>}
      </div>
    );
  return (
    <form ref={formRef} action={enviar} className="rounded-card border border-line bg-white">
      {Object.entries(campos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input type="hidden" name="motivo" value={motivo} />
      <A.ReasonConfirm
        desk={false}
        title={titulo}
        sub={sub}
        templates={plantillas.map((t) => ({ label: t, on: motivo === t, onClick: () => setMotivo(t) }))}
        reason={motivo}
        onReason={(e: { target: { value: string } } | string) => setMotivo(typeof e === "string" ? e : e.target.value)}
        cta={pendiente ? "Guardando…" : cta}
        danger={peligro}
        disabled={!motivo.trim() || pendiente}
        onConfirm={() => { if (motivo.trim() && !pendiente) formRef.current?.requestSubmit(); }}
        onBack={() => setAbierto(false)}
      />
      {estado && !estado.ok && <p className="px-4 pb-3 text-[12.5px] font-semibold text-danger">{estado.mensaje}</p>}
    </form>
  );
}

export function Matriz({ roles, secciones, acciones, permisos, puedeEditar, accion }: {
  roles: { key: string; name: string }[];
  secciones: { key: string; name: string }[];
  acciones: string[];
  permisos: Record<string, boolean>;
  puedeEditar: boolean;
  accion: (p: Resultado | null, f: FormData) => Promise<Resultado>;
}) {
  const [rol, setRol] = useState(roles[1]?.key ?? "admin");
  const [sel, setSel] = useState<{ section: string; action: string } | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {roles.map((r) => (
          <button key={r.key} type="button" onClick={() => { setRol(r.key); setSel(null); }}
            className={`h-9 rounded-pill px-3.5 text-[12.5px] font-bold ${rol === r.key ? "bg-ink text-white" : "border border-line-strong bg-white text-ink"}`}>
            {r.name}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <A.PermMatrix
          columns={`minmax(150px,1.6fr) repeat(${acciones.length}, minmax(64px,1fr))`}
          head={acciones.map((a) => a.toUpperCase())}
          rows={secciones.map((s) => ({
            label: s.name,
            cells: acciones.map((a) => ({
              on: !!permisos[`${rol}:${s.key}:${a}`],
              onClick: puedeEditar ? () => setSel({ section: s.key, action: a }) : undefined,
            })),
          }))}
        />
      </div>
      {sel && (
        <ConMotivo
          key={`${rol}${sel.section}${sel.action}`}
          accion={accion}
          campos={{ rol, seccion: sel.section, accion: sel.action }}
          boton="Cambiar este permiso"
          titulo={`${permisos[`${rol}:${sel.section}:${sel.action}`] ? "Quitar" : "Dar"} «${sel.action}» en ${secciones.find((s) => s.key === sel.section)?.name}`}
          sub={`Rol: ${roles.find((r) => r.key === rol)?.name}. Queda en la auditoría.`}
          plantillas={["Ajuste de responsabilidades del rol", "Corrección de un permiso mal puesto"]}
        />
      )}
    </div>
  );
}
