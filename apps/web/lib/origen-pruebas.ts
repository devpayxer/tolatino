import "server-only";

/* 23 nov · LA regla de las direcciones de simulador de las pruebas (STRIPE_API_BASE, STRIPE_FILES_BASE, TELNYX_API_BASE, WHATSAPP_API_BASE, SES_API_BASE,
   ANTHROPIC_API_BASE). Cada una cambia SOLO el origen (esquema, servidor y puerto) de las llamadas de su archivo, nunca la ruta ni las cabeceras, y solo:
   - con TOLATINO_ENTORNO=pruebas (servir.sh, el sandbox de Hetzner, el CI y los contratos lo ponen); en producción, el ensayo o local no tiene efecto
     aunque alguien la ponga: las llamadas van al proveedor real (con las llaves reales en la cabecera, nunca a otra dirección);
   - si es local (127.0.0.1 / localhost) por http(s), sin usuario, clave, ruta, consulta ni ancla.
   Además están PROHIBIDAS en infra/comun/secretos.json. UN archivo para las cuatro lecturas (antes, una copia en ses.ts y otra en modelo-claude.ts);
   sin importaciones, para que los cargadores de las pruebas sin servidor (pruebas/lib/ts-servidor.cjs, la batería de El Compa, los contratos y
   scripts/prueba-firma-ses) lo carguen real. Guardián proveedoresSimuladorAislado; en ejecución: scripts/prueba-firma-ses/prueba.mjs. */
export function origenDePruebas(v: string | undefined): URL | null {
  if (process.env.TOLATINO_ENTORNO !== "pruebas" || !v) return null;
  let u: URL;
  try { u = new URL(v); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !["127.0.0.1", "localhost"].includes(u.hostname) || u.username || u.password || u.pathname !== "/" || u.search || u.hash) return null;
  return u;
}
