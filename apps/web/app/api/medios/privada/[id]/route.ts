import { NextResponse, type NextRequest } from "next/server";
import { auditar, staff } from "@/lib/admin";
import { colasVisibles } from "@/lib/admin-colas";
import { yo } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { anchoServido, llaveVariantePrivada, permisoFotoPrivada, type EquipoFoto } from "@/lib/fotos-privadas";
import { entregarPrivado } from "@/lib/entrega-privada";
import { vidrioVigente } from "@/lib/sistema/vidrio";

/* Fotos a la medida · F3 · Ver una foto de destino PRIVADO (la de una cita, visita, viaje o mudanza, presupuesto, pre-estimado, emergencia, el recibo
   de «Ayuda con…», la balanza del mercado, el daño de una renta o la línea de un estimado). Su archivo vive solo en privado/o/ (nginx nunca la sirve).
   La ven (lib/fotos-privadas.ts permisoFotoPrivada, desde la fila y su operación):
   - quien la subió; el cliente de esa operación; el negocio que la recibe (dueño o equipo activo con «Pedidos»);
   - el equipo de To'Latino solo con un caso abierto de esa operación en una cola que ve y en su ciudad («Ayuda con…» o el daño de una renta; una
     ayuda de Salud además pide el motivo de «vidrio roto»). Cada vez queda en la auditoría («fotos.privada.ver»).
   `?w=` (320, 640, 1080 o 1600): la variante WebP de ese ancho, con el MISMO permiso, si el navegador acepta WebP y existe; si no, la maestra JPEG.
   Nunca se cachea (private, no-store), nosniff. A quien no puede, o si no existe: 404 (no se dice si existe).
   9t · En flujo desde el almacén, con ETag y 304 a If-None-Match, siempre DESPUÉS del permiso (lib/entrega-privada.ts). */
export const dynamic = "force-dynamic";
const no = () => new NextResponse(null, { status: 404 });
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return no();
  const me = await yo();
  if (!me) return no();
  const equipo = async (): Promise<EquipoFoto | null> => {
    const s = await staff();
    return s ? { id: s.id, colas: colasVisibles(s), ciudades: s.cities, vidrio: (ayuda: string) => vidrioVigente(s.id, ayuda) } : null;
  };
  const p = await permisoFotoPrivada(db(), id, { userId: me.id, equipo });
  if (!p.ok) return no();
  if (p.por === "equipo")
    await tx((c) => auditar(c, { actor: p.staff, action: "fotos.privada.ver", targetKind: "media", targetId: id, city: p.caso.ciudad, after: { cola: p.caso.cola, caso: `${p.caso.kind}:${p.caso.ref}` } }));
  const wq = Number(req.nextUrl.searchParams.get("w") ?? ""), w = Number.isInteger(wq) && wq > 0 ? wq : null;
  const a = anchoServido(p.anchos, w, /image\/webp/i.test(req.headers.get("accept") ?? ""));
  const maestra = { clave: p.llave, tipo: "image/jpeg" };
  const cab = { "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-disposition": "inline", vary: "Accept, Cookie" };
  const llaves = a ? [{ clave: llaveVariantePrivada(id, a), tipo: "image/webp" }, maestra] : [maestra];
  // Si la variante falla en el almacén, se intenta la maestra; si tampoco, 404 (como antes).
  return entregarPrivado(req, llaves, cab, no).catch(() => entregarPrivado(req, [maestra], cab, no)).catch(() => no());
}
