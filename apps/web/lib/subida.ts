import "server-only";

/* 9t (19 nov) · Leer un formulario de subida CON TOPE. Un navegador que no avisa el tamaño (Safari en iPad/iPhone manda el cuerpo sin
   content-length) llegaba entero hasta req.formData(): un archivo de más se leía completo en memoria y salía «No llegó la foto» (400) en vez de
   «pesa demasiado» (413). Aquí se lee el cuerpo por partes y no se guarda nada pasado el tope; el aviso de content-length se mira primero.
   Lo usan todas las rutas de subida (guardián subidaConTope). */
export type Leido = { ok: true; fd: FormData } | { ok: false; grande: boolean };

export async function leerFormulario(req: Request, tope: number): Promise<Leido> {
  if (Number(req.headers.get("content-length") ?? 0) > tope) return { ok: false, grande: true };
  const r = req.body?.getReader();
  if (!r) return { ok: false, grande: false };
  const partes: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await r.read();
    if (done) break;
    n += value.byteLength;
    if (n > tope) {
      // Pasado el tope no se guarda nada más, pero se termina de recibir (tirándolo) para que quien sube lea el 413 y no un «se cortó la
      // conexión» (Safari). Si sigue mandando más de 4 veces el tope, se corta igual.
      for (;;) { const x = await r.read(); if (x.done) break; n += x.value.byteLength; if (n > tope * 4) { await r.cancel().catch(() => undefined); break; } }
      return { ok: false, grande: true };
    }
    partes.push(value);
  }
  const fd = await new Response(Buffer.concat(partes), { headers: { "content-type": req.headers.get("content-type") ?? "" } }).formData().catch(() => null);
  // 20 nov · Un formulario que llega sin archivo (o ilegible) deja dicho QUÉ llegó: bytes, tipo del cuerpo y el tamaño de cada parte (nada de
  // la persona). «No llegó la foto» en el iPhone SE del CI (confirmación 44734711575) no decía si llegó vacía, cortada o sin la parte.
  if (!fd || ![...fd.values()].some((v) => typeof v !== "string" && v.size > 0))
    console.warn(`[subida] sin archivo: ${n} bytes recibidos · ${(req.headers.get("content-type") ?? "sin tipo").slice(0, 80)} · ${fd ? [...fd.entries()].map(([k, v]) => `${k.slice(0, 20)}:${typeof v === "string" ? "texto" : v.size}`).join(",") || "sin partes" : "ilegible"}`);
  return fd ? { ok: true, fd } : { ok: false, grande: false };
}
