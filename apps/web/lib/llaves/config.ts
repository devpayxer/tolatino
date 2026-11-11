import "server-only";
import { headers } from "next/headers";
import { db } from "../db";

/* 8d · Dónde valen las llaves de acceso (fase8-apps.md §3.4). WebAuthn ata cada llave a un RP ID (un dominio) y solo acepta firmas hechas en
   los orígenes de ese dominio. Los dos salen del ENTORNO, nunca del cliente:
   · PASSKEY_RP_ID: el dominio de la cuenta («pruebas.tolatino.com» hoy en el papel; «tolatino.com» en producción; «localhost» en local).
   · PASSKEY_ORIGENES: los orígenes que pueden firmar, separados por comas: la web («https://pruebas.tolatino.com») y, cuando 8h firme las
     apps, el de Android («android:apk-key-hash:…», la huella de la llave de firma). iOS firma como «https://<RP ID>» (dominio asociado).
   Sin las dos, o con el interruptor cuenta.llaves apagado, NO se ofrecen (y el servidor no entra con ellas): el SMS sigue igual.
   El sandbox de hoy se sirve por HTTP en una IP: el navegador no permite WebAuthn ahí y el origen de la petición no está en la lista, así que
   la página ni siquiera ofrece el botón (nunca un botón roto). */
export type Rp = { rpId: string; origenes: string[]; web: string[] };

export function rp(): Rp | null {
  const rpId = (process.env.PASSKEY_RP_ID ?? "").trim().toLowerCase();
  if (!/^(localhost|[a-z0-9-]+(\.[a-z0-9-]+)+)$/.test(rpId)) return null;
  const origenes = (process.env.PASSKEY_ORIGENES ?? "").split(",").map((x) => x.trim()).filter(Boolean).filter((o) => {
    if (/^android:apk-key-hash:[A-Za-z0-9_-]{20,100}$/.test(o)) return true;
    try {
      const u = new URL(o);
      if (u.origin !== o) return false;
      // Solo HTTPS (o http://localhost, que el navegador trata como seguro). El origen tiene que ser el RP ID o un subdominio suyo.
      const seguro = u.protocol === "https:" || (u.protocol === "http:" && u.hostname === "localhost");
      return seguro && (u.hostname === rpId || u.hostname.endsWith(`.${rpId}`));
    } catch { return false; }
  });
  const web = origenes.filter((o) => /^https?:\/\//.test(o));
  return origenes.length ? { rpId, origenes, web } : null;
}

/* El origen de ESTA petición, como lo ve el navegador (detrás de nginx/Cloudflare: x-forwarded-proto y el host). */
export async function origenPeticion(): Promise<string | null> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (!host || !/^[A-Za-z0-9.:[\]-]{1,260}$/.test(host)) return null;
    const proto = (h.get("x-forwarded-proto") || "http").split(",")[0]!.trim();
    return `${proto === "https" ? "https" : "http"}://${host.toLowerCase()}`;
  } catch { return null; }
}

async function encendidas(): Promise<boolean> {
  return (await db().query<{ on: boolean }>(`select enabled as on from feature_flags where key = 'cuenta.llaves'`).catch(() => ({ rows: [] as { on: boolean }[] }))).rows[0]?.on === true;
}

/* ¿Se ofrecen aquí? El entorno las configura, el interruptor está encendido y la página se abrió en uno de los orígenes web de la lista.
   (En la app, la cáscara abre el mismo origen web.) Lo usan las pantallas para decidir si muestran algo, y las rutas para no entrar. */
export async function llavesAqui(): Promise<Rp | null> {
  const r = rp();
  if (!r || !(await encendidas())) return null;
  const o = await origenPeticion();
  return o && r.web.includes(o) ? r : null;
}
