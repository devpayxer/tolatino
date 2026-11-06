"use client";
/* Marco de la app del vecino: SiteHeader (patrón 2e) + BottomNav (móvil). Desktop = header con tabs, sin barra inferior. */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type ComponentType, type ReactNode } from "react";
import { cambiarIdioma } from "./acciones";
import { CiudadSelector } from "./CiudadSelector";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { SiteHeader, BottomNav } = UI as unknown as Record<"SiteHeader" | "BottomNav", ComponentType<any>>;

export type TextosShell = { searchIn: string; searchDesk: string; nav: readonly string[]; tabs: readonly string[]; login: string; publish: string };
export type CiudadShell = { nombre: string; corto: string; abierta: boolean; radio: string; radioMovil: string };
// Pantallas que muestran «Pronto» cuando la ciudad que estás viendo todavía no abre (prototipo isPronto).
const CON_CIUDAD = /^\/($|negocios|c\/|buscar|abierto|mapa)/;

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

const RUTAS: Record<string, string> = { home: "/", neg: "/negocios", com: "/comunidad", evt: "/eventos", me: "/cuenta" };
const ICONOS = ["home", "store", "users", "ticket", "wallet"]; // prototipo navIcons

export function AppShell({ lang, t, yo, ciudad, children }: { lang: "es" | "en"; t: TextosShell; yo: { iniciales: string; avisos?: number } | null; ciudad: CiudadShell; children: ReactNode }) {
  const desk = useDesk();
  const router = useRouter();
  const ruta = usePathname();
  const sp = useSearchParams();
  const [, pasar] = useTransition();
  // APP-CIUDAD: hoja en el teléfono, ventana bajo el botón de ciudad en escritorio. /ciudad y ?ciudad la abren.
  const [sel, setSel] = useState<{ pedir: boolean } | null>(null);
  const [ancla, setAncla] = useState<{ left: number; top: number } | null>(null);
  const clic = useRef<DOMRect | null>(null);
  useEffect(() => { if (sp.has("ciudad")) { setSel({ pedir: sp.get("ciudad") === "pedir" }); const q = new URLSearchParams(sp.toString()); q.delete("ciudad"); router.replace(q.size ? `${ruta}?${q}` : ruta, { scroll: false }); } }, [sp, ruta, router]);
  const abrir = () => {
    const r = clic.current;
    if (r) setAncla({ left: Math.max(16, Math.min(r.left - 1, window.innerWidth - 780 - 16)), top: r.bottom + 8 });
    setSel({ pedir: false });
  };
  const cerrar = useCallback(() => setSel(null), []);
  const aplicada = (abierta: boolean) => {
    setSel(null);
    if (!abierta && !CON_CIUDAD.test(ruta)) router.push("/");
    else router.refresh();
  };
  const activo = ruta === "/" ? "home" : ruta.startsWith("/negocios") || ruta.startsWith("/c/") || ruta.startsWith("/n/") ? "neg" : ruta.startsWith("/comunidad") ? "com" : ruta.startsWith("/eventos") ? "evt" : "";
  // Buscar en el teléfono es pantalla completa: sin encabezado ni barra inferior (prototipo showMHeader / showNav).
  const pantallaCompleta = !desk && (ruta.startsWith("/buscar") || /^\/n\/[^/]+\/licencia/.test(ruta)); // Licencia: su propia barra (showMHeader false)
  // Pantallas de detalle (prototipo showMBrand): encabezado compacto y sin barra inferior en el teléfono.
  const compacto = !desk && /^\/(mapa|n\/|pedido\/|reserva\/|cita\/|pre\/|emergencia|cuenta\/|recomendar|publica|recuperar)/.test(ruta);
  const ir = (id: string) => router.push(id === "me" && !yo ? "/entrar" : RUTAS[id] ?? "/");
  return (
    <div className="min-h-dvh bg-white">
      <div className={`sticky top-0 z-40 ${pantallaCompleta ? "hidden" : ""}`}
        onClickCapture={(e) => { let el = e.target as HTMLElement | null; while (el && !(el.tagName === "SPAN" && el.style.padding === "7px 11px")) el = el.parentElement; clic.current = el ? el.getBoundingClientRect() : null; }}>
        <SiteHeader
          variant={desk ? "desktop" : "mobile"}
          compact={compacto}
          city={ciudad.nombre}
          cityShort={ciudad.corto}
          radius={desk ? ciudad.radio : ciudad.radioMovil}
          lang={lang.toUpperCase()}
          member={!!yo}
          initials={yo?.iniciales}
          searchPlaceholder={desk ? t.searchDesk : t.searchIn}
          loginLabel={t.login}
          publishLabel={t.publish}
          tabs={t.tabs.map((label, i) => ({ id: ["home", "neg", "com", "evt"][i], label }))}
          activeTab={activo}
          onTab={ir}
          onHome={() => router.push("/")}
          onSearch={() => router.push("/buscar")}
          onCity={abrir}
          onLang={() => pasar(async () => { await cambiarIdioma(lang === "es" ? "en" : "es"); router.refresh(); })}
          onLogin={() => router.push("/entrar")}
          onAvatar={() => router.push("/cuenta")}
          unread={!!yo?.avisos && ruta !== "/avisos"}
          onBell={() => router.push(yo ? "/avisos" : "/entrar?volver=%2Favisos")}
          onPublish={() => router.push("/publica")}
          assetBase="/assets/"
        />
      </div>
      <div className={desk || pantallaCompleta || compacto ? "" : "pb-[96px]"}>{children}</div>
      {sel ? <CiudadSelector lang={lang} modo={desk ? "pop" : "sheet"} ancla={ancla} pedir={sel.pedir} onClose={cerrar} onAplicada={aplicada} /> : null}
      {!desk && !pantallaCompleta && !compacto && (
        <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
          <BottomNav items={t.nav.map((label, i) => ({ id: ["home", "neg", "com", "evt", "me"][i], label, icon: ICONOS[i] }))} active={activo} onChange={ir} homeIndicator={false} />
        </div>
      )}
    </div>
  );
}
