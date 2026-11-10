"use server";
/* 6a · Super Admin › Eventos y boletos y Colas › Eventos a revisar. Permisos (adm-data.js PERM evt): decidir y verificar al
   organizador piden evt:aprobar (Admin y Ciudad); ocultar del módulo y bloquear la publicación, evt:retirar (Admin). Cada decisión la
   toma lib/evt-revision.ts con la fila bloqueada, la auditoría, el libro de revisión y el aviso al negocio con el motivo. */
import { revalidatePath } from "next/cache";
import { requerir } from "@/lib/admin";
import { decidirEvento, ocultarEvento, organizadorPaso, type Decision } from "@/lib/evt-revision";
import type { ResAdm } from "./acciones-colas";

const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 500) : "");
const listo = () => { revalidatePath("/admin/eventos"); revalidatePath("/admin/colas"); revalidatePath("/admin"); };

export async function evtDecidir(id: string, d: Decision, razon: string | null, nota: string): Promise<ResAdm> {
  const s = await requerir("evt", "aprobar");
  if (d !== "aprobar" && d !== "cambios" && d !== "rechazar") return no("Esa decisión no existe.");
  const r = await decidirEvento(s, String(id), d, typeof razon === "string" ? razon : null, motivoOk(nota));
  if (r.err) return no(r.err);
  listo();
  return { ok: true, mensaje: d === "aprobar" ? "Publicado. El negocio recibe el aviso." : d === "cambios" ? "Cambios pedidos. El negocio recibe el motivo." : "No aprobado. El negocio recibe el motivo y puede apelar." };
}

export async function evtOcultar(id: string, ocultar: boolean, motivo: string): Promise<ResAdm> {
  const s = await requerir("evt", "retirar");
  const r = await ocultarEvento(s, String(id), !!ocultar, motivoOk(motivo));
  if (r.err) return no(r.err);
  listo();
  return { ok: true, mensaje: ocultar ? "Oculto del módulo. El organizador recibe el motivo y puede apelar." : "Visible otra vez." };
}

export async function evtOrganizador(negocio: string, paso: "verificar" | "quitar_verificado" | "bloquear" | "desbloquear", motivo: string): Promise<ResAdm> {
  const s = await requerir("evt", paso === "bloquear" || paso === "desbloquear" ? "retirar" : "aprobar");
  if (!["verificar", "quitar_verificado", "bloquear", "desbloquear"].includes(paso)) return no("Ese paso no existe.");
  const r = await organizadorPaso(s, String(negocio), paso, motivoOk(motivo));
  if (r.err) return no(r.err);
  listo();
  revalidatePath(`/admin/negocios/${negocio}`);
  return { ok: true, mensaje: paso === "verificar" ? "Verificado: sus eventos se publican al enviarlos." : paso === "quitar_verificado" ? "Sus eventos vuelven a pasar por revisión." : paso === "bloquear" ? "Bloqueado. El negocio recibe el motivo y puede apelar." : "Puede publicar otra vez." };
}

/* 6c · Buscar boleto: Reenviar (evt:editar) · Reemitir (evt:editar; sube la versión del QR) · Anular con motivo (evt:retirar). */
export async function evtBoleto(code: string, paso: "reenviar" | "reemitir" | "anular", motivo: string): Promise<ResAdm> {
  const s = await requerir("evt", paso === "anular" ? "retirar" : "editar");
  if (!["reenviar", "reemitir", "anular"].includes(paso)) return no("Ese paso no existe.");
  const r = await (await import("@/lib/boletos-admin")).accionBoletoAdmin(s, String(code), paso, motivoOk(motivo));
  if (r.err) return no(r.err);
  revalidatePath("/admin/eventos");
  return { ok: true, mensaje: paso === "reenviar" ? "Le llegó un aviso con sus boletos." : paso === "reemitir" ? "QR nuevo. El anterior ya no entra; le avisamos." : "Boleto anulado. Le avisamos con el motivo." };
}
