import "server-only";
import { open } from "node:fs/promises";

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

/* 9t · Medios en flujo · Recibir UN archivo grande (el video del negocio, hasta 120 MB) directo al DISCO, sin tenerlo nunca entero en memoria.
   leerFormulario (arriba) junta el formulario en memoria: bien para una foto de 12 MB que sharp igual necesita entera, nunca para un video (la
   medida, scripts/carga/memoria-medios.mjs: ~610 MB de memoria por cada video de 120 MB). Aquí el formulario multipart se lee por partes y la
   parte `campo` se escribe en `ruta` a medida que llega; en memoria solo queda el trozo que está pasando (y una cola de bytes para encontrar el
   borde). El tope se aplica MIENTRAS llega (sin confiar en content-length): antes de escribir un trozo se mira si pasaría del tope, y si pasa no
   se escribe nada más (lo ya escrito lo borra quien llama, con su carpeta). Como leerFormulario, después del tope se termina de recibir tirándolo
   (Safari lee el 413 y no «se cortó la conexión») hasta el doble del tope; pasado eso, se corta. Guardián mediosEnFlujo. */
export type Recibido = { ok: true; bytes: number } | { ok: false; motivo: "grande" | "sin_archivo" | "cortado" };
export async function recibirArchivo(req: Request, o: { campo: string; tope: number; ruta: string; margen?: number }): Promise<Recibido> {
  const topeCuerpo = o.tope + (o.margen ?? 64 * 1024);
  if (Number(req.headers.get("content-length") ?? 0) > topeCuerpo) return { ok: false, motivo: "grande" };
  const b = /boundary=(?:"([^"]{1,70})"|([^;\s]{1,70}))/i.exec(req.headers.get("content-type") ?? "");
  const r = req.body?.getReader();
  if (!b || !r) return { ok: false, motivo: "sin_archivo" };
  const borde = Buffer.from(`\r\n--${b[1] ?? b[2]}`);
  const fh = await open(o.ruta, "w", 0o600);
  // La cola empieza con «\r\n» para que el primer borde se busque igual que los demás.
  let cola: Buffer = Buffer.from("\r\n"), total = 0, escritos = 0;
  let estado: "inicio" | "cabeceras" | "parte" | "fin" = "inicio", esLaNuestra = false, hubo = false;
  const tirarResto = async () => {
    for (;;) {
      const x = await r.read().catch(() => null);
      if (!x || x.done) break;
      total += x.value.byteLength;
      if (total > topeCuerpo * 2) { await r.cancel().catch(() => undefined); break; }
    }
  };
  try {
    for (;;) {
      const x = await r.read().catch(() => null);
      if (!x) return { ok: false, motivo: "cortado" };
      if (x.done) break;
      total += x.value.byteLength;
      if (total > topeCuerpo) { await tirarResto(); return { ok: false, motivo: "grande" }; }
      const trozo = Buffer.from(x.value.buffer, x.value.byteOffset, x.value.byteLength);
      cola = cola.length ? Buffer.concat([cola, trozo]) : trozo;
      for (;;) {
        if (estado === "inicio" || estado === "parte") {
          const i = cola.indexOf(borde);
          // Sin borde a la vista: de la parte se suelta todo menos lo que podría ser el comienzo de un borde.
          const hasta = i >= 0 ? i : Math.max(0, cola.length - borde.length + 1);
          if (estado === "parte" && esLaNuestra && hasta > 0) {
            if (escritos + hasta > o.tope) { await tirarResto(); return { ok: false, motivo: "grande" }; }
            await fh.write(cola.subarray(0, hasta));
            escritos += hasta;
          }
          if (i < 0) { cola = Buffer.from(cola.subarray(hasta)); break; }
          if (estado === "parte" && esLaNuestra) { hubo = true; esLaNuestra = false; }
          cola = Buffer.from(cola.subarray(i + borde.length));
          estado = "cabeceras";
        }
        if (cola.length < 2) break;
        if (cola[0] === 0x2d && cola[1] === 0x2d) { estado = "fin"; break; } // «--»: el último borde
        const j = cola.indexOf("\r\n\r\n");
        if (j < 0) { if (cola.length > 16 * 1024) return { ok: false, motivo: "sin_archivo" }; break; }
        const disp = /content-disposition:[^\r\n]*/i.exec(cola.subarray(0, j).toString("latin1"))?.[0] ?? "";
        esLaNuestra = !hubo && /\bname="([^"]*)"/i.exec(disp)?.[1] === o.campo && /\bfilename=/i.test(disp);
        cola = Buffer.from(cola.subarray(j + 4));
        estado = "parte";
      }
      if (estado === "fin") break;
    }
    if (!hubo && estado === "parte" && escritos > 0) return { ok: false, motivo: "cortado" };
    if (!hubo || escritos === 0) {
      console.warn(`[subida] sin archivo «${o.campo}»: ${total} bytes recibidos · ${(req.headers.get("content-type") ?? "sin tipo").slice(0, 80)}`);
      return { ok: false, motivo: "sin_archivo" };
    }
    return { ok: true, bytes: escritos };
  } finally {
    await fh.close().catch(() => undefined);
  }
}
