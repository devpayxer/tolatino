"use client";
/* APP-CIUDAD-PRONTO (diseño «To'Latino Ciudad», modo pronto): la ciudad que estás viendo todavía no abre. Qué tan lista
   está (negocios listos de la meta), cuántos vecinos esperan, «Avísame cuando llegue», Publica tu negocio, Recomienda un
   negocio y, mientras, la ciudad abierta más cercana. Cifras reales del servidor. */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { Pronto } from "@/lib/ciudad";
import { teselas, vista } from "@/lib/mapa-geo";
import { elegirUbicacion, esperarCiudad } from "./ciudad/acciones";
import { KF_CIUDAD } from "./CiudadSelector";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { CitySoon } = UI as unknown as Record<"CitySoon", ComponentType<any>>;

function useAncho() {
  const [w, setW] = useState(393);
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}

export function CiudadPronto({ p, lang, miCiudad }: { p: Pronto; lang: "es" | "en"; miCiudad: string }) {
  const es = lang === "es", E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ruta = usePathname();
  const dw = useAncho(), desk = dw >= 1024, two = desk && dw >= 960;
  const [on, setOn] = useState(p.yaEspero), [espera, setEspera] = useState(p.espera);
  const [toast, setToast] = useState<string | null>(null);
  const tt = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (tt.current) clearTimeout(tt.current); }, []);
  const avisar = (t: string) => { if (tt.current) clearTimeout(tt.current); setToast(t); tt.current = setTimeout(() => setToast(null), 2600); };

  const nm = p.n;
  const mw = two ? Math.min(560, (Math.min(dw, 1180) - 64 - 40) / 2) : desk ? Math.min(dw - 64, 760) : Math.min(dw - 40, 560), mh = two ? 420 : desk ? 300 : 220;
  const V = vista([p.lat, p.lng], 5, 70);
  const unirse = async () => {
    const r = await esperarCiudad(p.id);
    if (!r.ok) { if (r.entrar) router.push(`/entrar?volver=${encodeURIComponent(ruta)}`); return; }
    setOn(r.on); setEspera(r.n);
    avisar(r.on ? E2(`Listo. Te escribimos solo cuando ${nm} abra.`, `Done. We will only text you when ${nm} opens.`) : E2("Te quitamos de la lista.", "Removed from the list."));
  };
  const verAbierta = async () => { if (!p.abierta) return; const r = await elegirUbicacion({ c: p.abierta.id, z: "centro", r: p.abierta.radio }); if (r.ok) router.refresh(); };

  const soon = {
    maxWidth: desk ? "1180px" : "none", padding: desk ? "36px 32px 56px" : "20px 20px 40px", columns: two ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: two ? "36px" : "20px", mapHeight: mh,
    map: { scale: V.sc, tiles: teselas([p.lat, p.lng], V.z, mw, mh, V.sc).map(({ src, left, top }) => ({ src, left, top })), circle: 140 },
    soonTag: E2("PRÓXIMAMENTE", "COMING SOON"), eyebrow: `${nm.toUpperCase()}, ${p.st}${E2(" · LA SIGUIENTE ZONA", " · THE NEXT AREA")}`,
    title: E2(`Todavía no hay negocios alrededor de ${nm}`, `No businesses around ${nm} yet`), titleSize: desk ? 40 : 30,
    body: E2("To’Latino va a estar en todo Estados Unidos y siempre buscas alrededor de donde estés. Abrimos cada zona cuando ya tiene suficientes negocios para que valga la pena buscar; puedes ayudar a que llegue antes.", "To’Latino is going nationwide and you always search around wherever you are. We open each area once it has enough businesses to make searching worth it; you can help it arrive sooner."),
    ready: { title: E2(`${p.listos} de ${p.meta} negocios para abrir esta zona`, `${p.listos} of ${p.meta} businesses to open this area`), pct: `${Math.min(100, Math.round((p.listos / (p.meta || 50)) * 100))}%` },
    stats: [{ value: String(espera), label: E2("EN LA LISTA DE ESPERA", "ON THE WAITLIST") }].concat(p.abierta ? [{ value: `${p.abierta.d} mi`, label: E2(`DE ${p.abierta.corto.toUpperCase()}`, `FROM ${p.abierta.corto.toUpperCase()}`) }] : []),
    join: { label: on ? E2("Te avisamos cuando llegue · quitar", "We will tell you when it arrives · remove") : E2(`Avísame cuando llegue a ${nm}`, `Tell me when it reaches ${nm}`), variant: on ? "secondary" : "primary", onClick: unirse },
    publish: { label: E2("Publica tu negocio gratis", "List your business free"), onClick: () => router.push("/publica") },
    recommend: { label: E2(`Recomienda un negocio de ${nm}`, `Recommend a business in ${nm}`), onClick: () => router.push(`/recomendar?ciudad=${p.id}`) },
    asksLabel: E2(`LO QUE MÁS BUSCAN LOS VECINOS DE ${nm.toUpperCase()}`, `WHAT NEIGHBORS IN ${nm.toUpperCase()} LOOK FOR MOST`), asks: [] as string[],
    meanwhile: p.abierta ? { kicker: E2("MIENTRAS TANTO", "IN THE MEANTIME"), title: p.abierta.n, sub: E2(`${p.abierta.biz} negocios · a ${p.abierta.d} mi`, `${p.abierta.biz} businesses · ${p.abierta.d} mi away`), cta: E2(`Ver ${p.abierta.corto}`, `See ${p.abierta.corto}`), onClick: verAbierta } : undefined,
    meanwhileAt: p.abierta ? (two ? "desk" : "mob") : null,
    foot: E2(`Elegir ${nm}, ${p.st} para ver no cambia Mi ciudad en la comunidad: sigue en ${miCiudad}.`, `Viewing ${nm}, ${p.st} doesn’t change your community city: it stays ${miCiudad}.`),
  };
  return (
    <div data-screen-label="APP-CIUDAD-PRONTO" style={{ background: "var(--tl-paper)", animation: "cFade .2s ease-out" }}>
      <style>{KF_CIUDAD}</style>
      <CitySoon {...soon} />
      {toast ? <div role="status" style={{ position: "fixed", left: "50%", bottom: desk ? 28 : 110, transform: "translateX(-50%)", zIndex: 70, padding: "14px 18px", borderRadius: 15, background: "var(--tl-ink)", color: "var(--tl-white)", font: "700 13px Manrope,sans-serif", animation: "cUp .25s ease-out", maxWidth: 340 }}>{toast}</div> : null}
    </div>
  );
}
