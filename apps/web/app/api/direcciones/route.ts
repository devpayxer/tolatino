import { NextResponse, type NextRequest } from "next/server";
import { ipCliente, yo } from "@/lib/cuenta";
import { inversa, sugerir } from "@/lib/direcciones";
import { dentroDelTope } from "@/lib/topes";
import { ubicacion } from "@/lib/ubicacion";

/* 9m · Direcciones propias (decisión AC): autocompletar mientras se escribe (?q=) y «Usar mi ubicación» (?lat=&lng=), de nuestra base, sin terceros.
   Solo lectura y sin guardar nada (el punto del GPS nunca se guarda aquí). El punto de partida para ordenar «lo más cerca primero» es la ciudad que
   la persona está viendo (o el punto que la pantalla manda, el mismo que ve en el mapa). Tope por persona o por IP: 120 por minuto (escribir rápido
   son ~3 por segundo con la espera de la pantalla). */
export const dynamic = "force-dynamic";
const NO = { headers: { "Cache-Control": "no-store" } };

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const u = await yo();
  const quien = u?.id ?? (await ipCliente()) ?? "sin-ip";
  if (!(await dentroDelTope("dir", quien, 120))) return NextResponse.json({ ok: false, tope: true, items: [] }, { status: 429, ...NO });
  const num = (k: string) => { const v = Number(sp.get(k)); return sp.get(k) != null && Number.isFinite(v) ? v : null; };
  const lat = num("lat"), lng = num("lng");
  if (sp.get("inversa") === "1") {
    if (lat == null || lng == null) return NextResponse.json({ ok: false, item: null }, NO);
    return NextResponse.json({ ok: true, item: await inversa(lat, lng) }, NO);
  }
  const q = (sp.get("q") ?? "").slice(0, 120);
  const loc = await ubicacion(u);
  const centro = lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng, estado: loc.c.state } : { lat: loc.lat, lng: loc.lng, estado: loc.c.state };
  const t0 = Date.now();
  const items = await sugerir(q, centro);
  return NextResponse.json({ ok: true, items, ms: Date.now() - t0 }, NO);
}
