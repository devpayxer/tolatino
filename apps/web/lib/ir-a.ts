import { NextResponse } from "next/server";

/* Anchos (16 nov) · Llevar a otra página de To'Latino desde una ruta (route.ts). La dirección va RELATIVA («Location: /entrar»): el navegador
   la resuelve contra lo que él mismo pidió (https://tolatino.com/…). Nunca se arma con req.url ni con req.nextUrl.origin: en el servidor
   independiente de Next esos dicen el host de ESTE proceso (http://0.0.0.0:3100), no el del navegador, y detrás de nginx y Cloudflare la persona
   terminaba en una dirección interna (Safari ni siquiera la abre). Tampoco con x-forwarded-host: es una cabecera que cualquiera puede mandar.
   Solo rutas propias («/…», nunca «//otro.sitio»). Guardián redireccionRelativa. */
export function irA(ruta: string, status: 302 | 303 | 307 = 303, headers?: Record<string, string>): NextResponse {
  if (!/^\/(?![/\\])/.test(ruta)) throw new Error(`irA: solo rutas de To'Latino («${ruta.slice(0, 40)}»)`);
  const r = new NextResponse(null, { status, headers });
  r.headers.set("location", ruta);
  return r;
}
