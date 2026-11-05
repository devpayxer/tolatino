"use client";
/* Marco de la app del vecino: SiteHeader (patrón 2e) + BottomNav (móvil). Desktop = header con tabs, sin barra inferior. */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ComponentType, type ReactNode } from "react";
import { cambiarIdioma } from "./acciones";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { SiteHeader, BottomNav } = UI as unknown as Record<"SiteHeader" | "BottomNav", ComponentType<any>>;

export type TextosShell = { search: string; searchDesk: string; nav: readonly string[]; tabs: readonly string[]; login: string; publish: string };

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

export function AppShell({ lang, t, yo, children }: { lang: "es" | "en"; t: TextosShell; yo: { iniciales: string } | null; children: ReactNode }) {
  const desk = useDesk();
  const router = useRouter();
  const ruta = usePathname();
  const [, pasar] = useTransition();
  const activo = ruta === "/" ? "home" : ruta.startsWith("/negocios") || ruta.startsWith("/c/") || ruta.startsWith("/n/") ? "neg" : ruta.startsWith("/comunidad") ? "com" : ruta.startsWith("/eventos") ? "evt" : "";
  const ir = (id: string) => router.push(id === "me" && !yo ? "/entrar" : RUTAS[id] ?? "/");
  return (
    <div className="min-h-dvh bg-white">
      <div className="sticky top-0 z-40">
        <SiteHeader
          variant={desk ? "desktop" : "mobile"}
          city="Hazleton, PA"
          cityShort="Hazleton"
          radius="5 mi"
          lang={lang.toUpperCase()}
          member={!!yo}
          initials={yo?.iniciales}
          searchPlaceholder={desk ? t.searchDesk : t.search}
          loginLabel={t.login}
          publishLabel={t.publish}
          tabs={t.tabs.map((label, i) => ({ id: ["home", "neg", "com", "evt"][i], label }))}
          activeTab={activo}
          onTab={ir}
          onHome={() => router.push("/")}
          onSearch={() => router.push("/buscar")}
          onCity={() => router.push("/ciudad")}
          onLang={() => pasar(async () => { await cambiarIdioma(lang === "es" ? "en" : "es"); router.refresh(); })}
          onLogin={() => router.push("/entrar")}
          onAvatar={() => router.push("/cuenta")}
          onPublish={() => router.push("/publica")}
          assetBase="/assets/"
        />
      </div>
      <div className={desk ? "" : "pb-[96px]"}>{children}</div>
      {!desk && (
        <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
          <BottomNav items={t.nav.map((label, i) => ({ id: ["home", "neg", "com", "evt", "me"][i], label, icon: ICONOS[i] }))} active={activo} onChange={ir} homeIndicator={false} />
        </div>
      )}
    </div>
  );
}
