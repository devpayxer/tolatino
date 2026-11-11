import { NextResponse } from "next/server";
import { valor } from "@/lib/config";
import { autenticar, guardarArchivo } from "@/lib/tiendas/tuberia";
import { leerCuerpo, NO_CACHE } from "../cuerpo";

/* 8h · Los archivos de un build (?tipo=apk|aab|simbolos&app=&canal=&build=): el APK propio, el .aab (el servidor lo sube a Play interno) y los
   símbolos, al almacén PRIVADO. Con la cabecera x-tl-sha256 (se comprueba); solo el run que creó el build; tope tiendas_archivo_mb. */
export const dynamic = "force-dynamic";
export async function PUT(req: Request) {
  const a = await autenticar(req, "archivo");
  if (!a.ok) return NextResponse.json({ ok: false, motivo: a.motivo }, { status: a.status, headers: NO_CACHE });
  const b = await leerCuerpo(req, (await valor("tiendas_archivo_mb")) * 1024 * 1024);
  if (!b) return NextResponse.json({ ok: false, msg: "El archivo es demasiado grande." }, { status: 413, headers: NO_CACHE });
  const r = await guardarArchivo(a.c, new URL(req.url).searchParams, b, req.headers.get("x-tl-sha256"));
  return NextResponse.json(r.json, { status: r.status, headers: NO_CACHE });
}
