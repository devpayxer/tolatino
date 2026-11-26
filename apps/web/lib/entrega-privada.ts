import "server-only";
import { abrirObjeto } from "./medios";

/* 9t · Medios en flujo · Entregar un objeto PRIVADO del almacén (la foto de un mensaje, de una entrega, de una ayuda, de un destino privado, la que
   quedó en revisión, el documento de un reclamo). Quien llama YA comprobó el permiso (y respondió 404 a quien no puede): esto va después, nunca
   antes. Así un 304 también pasó por el permiso y no le dice a nadie que algo existe (guardián mediosEnFlujo).
   - En flujo: el cuerpo pasa del almacén a quien lo pidió por partes (antes se leía entero en la memoria del proceso con leerObjeto).
   - ETag fuerte: el del almacén (la versión del objeto; cambia si cambia el contenido). Con If-None-Match igual → 304 sin cuerpo: el almacén
     contesta 304 y el cuerpo no se lee.
   - La caché sigue igual que antes: «private, no-store» (nunca public: son privadas; no se guardan en el disco de un teléfono o computadora
     compartidos). Con no-store un navegador no vuelve a preguntar con If-None-Match; el 304 sirve a quien sí lo manda (la app, una descarga
     que se reanuda). Que el navegador las guarde («private, no-cache») es una decisión de privacidad pendiente (LAUNCH, 9t medios en flujo).
   - Sin Range: aquí solo salen fotos (1600 px como mucho, < 2 MB); el video lo sirve nginx desde el almacén (/medios/v/…), no la app.
   `llaves`: en orden; la primera que exista (la variante WebP y, si falta, la maestra). Ninguna → `siFalta()` (o se lanza «almacenamiento 404»).
   `siFalta`: lo que se contesta si NINGUNA llave está en el almacén (la fila vive pero el archivo no: 404 igual al de «no tienes permiso», nunca 500).
   `alEntregar` (22 nov): el renglón de auditoría de «vio la foto» del equipo. Se deja SOLO cuando el objeto existe y va a salir (también con 304): un
   404 por archivo ausente no deja renglón de que alguien vio algo. Si falla, el cuerpo se suelta y el error sube (no sale la foto sin su renglón).
   `cabeceras`: las de cada ruta, escritas en la ruta (sus guardianes las leen ahí); van también en el 304. Una caché que no empiece con
   «private» no sale nunca (se lanza: un error de código, no una foto privada en una caché compartida). */
export const CACHE_PRIVADA = "private, no-store";
type Llave = { clave: string; tipo: string };
export async function entregarPrivado(req: Request, llaves: Llave[], cabeceras: Record<string, string>, siFalta?: () => Response, alEntregar?: () => Promise<unknown>): Promise<Response> {
  if (!/^private,/.test(cabeceras["cache-control"] ?? "") || /\b(public|s-maxage)\b/.test(cabeceras["cache-control"] ?? "")) throw new Error("entregarPrivado: la caché de un objeto privado es «private»");
  const inm = req.headers.get("if-none-match");
  const base: Record<string, string> = { "x-content-type-options": "nosniff", ...cabeceras };
  for (const l of llaves) {
    const a = await abrirObjeto(l.clave, inm);
    if (!a) continue;
    if (alEntregar) { try { await alEntregar(); } catch (e) { if (a.estado === 200) void a.cuerpo.cancel().catch(() => undefined); throw e; } }
    if (a.estado === 304) return new Response(null, { status: 304, headers: { ...base, etag: a.etag } });
    const h: Record<string, string> = { ...base, "content-type": l.tipo };
    if (a.etag) h.etag = a.etag;
    // 26 nov · Sin content-length: Next 15 lo quita de toda respuesta de una ruta (FORBIDDEN_HEADERS); el cuerpo sale «chunked» (guardián exportacionEnFlujo).
    return new Response(a.cuerpo, { status: 200, headers: h });
  }
  if (siFalta) return siFalta();
  throw new Error("almacenamiento 404: el objeto no está");
}
