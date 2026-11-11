import { NextResponse } from "next/server";
import { valor } from "@/lib/config";
import { autenticar, guardarArchivo } from "@/lib/tiendas/tuberia";
import { leerCuerpo, NO_CACHE } from "../cuerpo";

/* 8h · Los archivos de un build (?tipo=apk|aab|simbolos&app=&canal=&build=; 8i: ?tipo=captura&app=&tienda=&idioma=&orden=): el APK propio, el .aab (el servidor lo sube a Play interno) y los
   símbolos, al almacén PRIVADO. Con la cabecera x-tl-sha256 (se comprueba); solo el run que creó el build; tope tiendas_archivo_mb. */
export const dynamic = "force-dynamic";
export async function PUT(req: Request) {
  const a = await autenticar(req, "archivo");
  if (!a.ok) return NextResponse.json({ ok: false, motivo: a.motivo }, { status: a.status, headers: NO_CACHE });
  const b = await leerCuerpo(req, (await valor("tiendas_archivo_mb")) * 1024 * 1024);
  if (!b) return NextResponse.json({ ok: false, msg: "El archivo es demasiado grande." }, { status: 413, headers: NO_CACHE });
  const q = new URL(req.url).searchParams;
  // 8i · Las capturas de la ficha (?tipo=captura&app=&tienda=&idioma=&orden=): PNG del tamaño de cada tienda, al almacén privado (store_screenshots).
  const r = q.get("tipo") === "captura" ? await (await import("@/lib/tiendas/fichas")).registrarCaptura(a.c, q, b, req.headers.get("x-tl-sha256"))
    : await guardarArchivo(a.c, q, b, req.headers.get("x-tl-sha256"));
  return NextResponse.json(r.json, { status: r.status, headers: NO_CACHE });
}
