import { NextResponse } from "next/server";
import { dispositivo, mismoOrigen, yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { accesoPuerta, contar, entradaManual, escanearQR, idAjeno, llegadaNoche, marcarRsvp } from "@/lib/puerta";
import { aplicarCola } from "@/lib/puerta-sync";

/* 6g · POST /api/puerta/escanear: un escaneo de To'Latino Puerta (o del modo puerta del panel). Cada llamada trae el id del escaneo (uuid
   del teléfono = idempotencia) y la hora del teléfono (gancho del modo sin conexión, 6h). La persona tiene que tener acceso a ESA puerta
   en ESE momento (accesoPuerta → puerta_acceso de la base); si no, 403 y la pantalla dice que la puerta se cerró. La respuesta nunca
   trae montos, teléfonos ni correos (D1: la puerta solo escanea). 6h: { tipo: "cola" } sube la cola sin conexión (lib/puerta-sync.ts). */
export const dynamic = "force-dynamic";
const NO = (es: string, en: string, status: number, cerrada = false) => NextResponse.json({ ok: false, msg: { es, en }, ...(cerrada ? { cerrada: true } : {}) }, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  if (!(await mismoOrigen())) return NO("Petición no permitida.", "Request not allowed.", 403);
  const u = await yo();
  if (!u) return NO("Tu sesión terminó. Entra otra vez.", "Your session ended. Sign in again.", 401);
  let b: Record<string, unknown>;
  try { b = (await req.json()) as Record<string, unknown>; } catch { return NO("Petición mal formada.", "Malformed request.", 400); }
  if (!b || typeof b !== "object") return NO("Petición mal formada.", "Malformed request.", 400);
  // 6h · La cola sin conexión: la sesión puede estar cerrada (lo escaneado sin señal antes del cierre sube igual hasta que vence el
  // paquete); la base decide con puerta_sesion_cola (de esa persona; revocada o portero quitado = nada sube).
  if (b.tipo === "cola") {
    const c = await aplicarCola(u.id, String(b.sesion ?? ""), await dispositivo(false), b.ahora, b.escaneos);
    return NextResponse.json(c, { status: c.ok ? 200 : 403, headers: { "cache-control": "no-store" } });
  }
  const ctx = await accesoPuerta(u.id, String(b.sesion ?? ""));
  if (!ctx) return NO("Ya no tienes acceso a esta puerta. Si es un error, habla con el negocio.", "You no longer have access to this door. If this is a mistake, talk to the business.", 403, true);
  // 6h · Un id de escaneo que ya es de OTRA puerta no devuelve lo que se decidió allá (la misma clase que «ajeno» en la cola).
  if (typeof b.id === "string" && (await idAjeno(b.id, ctx.sesion))) return NO("Ese escaneo es de otra puerta.", "That scan belongs to another door.", 409);
  const es = (await idioma()) === "es";
  const r = b.tipo === "qr" ? await escanearQR(ctx, String(b.qr ?? ""), b, es)
    : b.tipo === "boleto" ? await entradaManual(ctx, String(b.boleto ?? ""), String(b.motivo ?? ""), b, es)
    : b.tipo === "rsvp" ? await marcarRsvp(ctx, String(b.rsvp ?? ""), b)
    : b.tipo === "noche" ? await llegadaNoche(ctx, String(b.noche ?? ""), Number(b.n ?? 1), b)
    : b.tipo === "contar" ? await contar(ctx, b)
    : null;
  if (!r) return NO("Ese tipo de escaneo no existe.", "That scan type does not exist.", 400);
  return NextResponse.json(r, { status: r.ok ? 200 : "cerrada" in r && r.cerrada ? 403 : 200, headers: { "cache-control": "no-store" } });
}
