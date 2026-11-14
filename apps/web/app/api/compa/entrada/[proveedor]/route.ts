import { after, NextResponse, type NextRequest } from "next/server";
import { valor } from "@/lib/config";
import { contarRechazo, procesar, recibir } from "@/lib/compa/canales";
import { CUERPO_MAX, firmaTelnyx, firmaWhatsApp, leerEstadosTelnyx, leerEstadosWhatsApp, leerPlantillasWhatsApp, leerTelnyx, leerWhatsApp, retoWhatsApp, type Entrante } from "@/lib/compa/canales-proveedor";
import { anotar } from "@/lib/canales/estados";

/* 7h · La entrada de WhatsApp y SMS de El Compa: POST /api/compa/entrada/telnyx · /api/compa/entrada/whatsapp (fase7-compa.md §4 7h; guardián
   canalConFirma). Orden fijo: tamaño → FIRMA del proveedor (antes de leer el JSON; sin firma buena: 401 y solo se cuenta el rechazo, sin
   guardar nada de lo que traía) → hora (Telnyx: la firmada, compa_canal_firma_seg; WhatsApp: la del mensaje, 24 h) → idempotencia por id
   de mensaje (el mismo dos veces = una entrada, una respuesta) → 200 enseguida. El turno corre aparte (after(); si el proceso se cae, el
   barrido lo retoma): el proveedor no espera al Compa. Ninguna acción se hace por mensaje. No hay proveedor «sim» aquí: el simulador del
   sandbox entra por el Super Admin con sesión, nunca por una ruta pública. Nada de lo que entra va al registro del servidor. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const DIA_MS = 24 * 3600 * 1000;
const no = (s: number) => new NextResponse(null, { status: s });

/* La verificación del webhook de Meta (una vez, al conectarlo en el panel de Meta). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ proveedor: string }> }) {
  if ((await params).proveedor !== "whatsapp") return no(404);
  const u = req.nextUrl.searchParams, r = retoWhatsApp(u.get("hub.mode"), u.get("hub.verify_token"), u.get("hub.challenge"));
  return r ? new NextResponse(r, { status: 200, headers: { "content-type": "text/plain" } }) : no(403);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ proveedor: string }> }) {
  const p = (await params).proveedor;
  if (p !== "telnyx" && p !== "whatsapp") return no(404);
  if (Number(req.headers.get("content-length") ?? 0) > CUERPO_MAX) { await contarRechazo(p, "tamano"); return no(413); }
  const cuerpo = Buffer.from(await req.arrayBuffer());
  if (cuerpo.length > CUERPO_MAX) { await contarRechazo(p, "tamano"); return no(413); }
  // ── La firma, antes de leer nada ──
  const f = p === "telnyx"
    ? firmaTelnyx(cuerpo, req.headers.get("telnyx-signature-ed25519"), req.headers.get("telnyx-timestamp"), Math.floor(Date.now() / 1000), await valor("compa_canal_firma_seg"))
    : firmaWhatsApp(cuerpo, req.headers.get("x-hub-signature-256"));
  if (!f.ok) { await contarRechazo(p, f.motivo); return no(401); }
  let j: unknown;
  try { j = JSON.parse(cuerpo.toString("utf8")); } catch { await contarRechazo(p, "formato"); return no(400); }
  const L: Entrante[] = p === "telnyx" ? leerTelnyx(j) : leerWhatsApp(j);
  // 9l · Los avisos de entrega (Telnyx message.finalized, Meta statuses) y el estado de las plantillas de WhatsApp: no son mensajes, se anotan aquí.
  const E = p === "telnyx" ? leerEstadosTelnyx(j) : leerEstadosWhatsApp(j), PL = p === "whatsapp" ? leerPlantillasWhatsApp(j) : [];
  if (E.length || PL.length) await anotar(E, PL);
  const nuevos: string[] = [];
  for (const m of L) {
    // WhatsApp no firma la hora: la del mensaje vale 24 h (su ventana); más vieja o del futuro = repetida, no se contesta.
    if (p === "whatsapp" && (!m.hora || Math.abs(Date.now() - m.hora.getTime()) > DIA_MS)) { await contarRechazo(p, "hora"); continue; }
    const r = await recibir(m);
    if (r.nuevo) nuevos.push(r.id);
  }
  if (nuevos.length) after(async () => { for (const id of nuevos) await procesar(id).catch(() => undefined); });
  return NextResponse.json({ ok: true });
}
