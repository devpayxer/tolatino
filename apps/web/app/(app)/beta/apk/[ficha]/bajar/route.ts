import { NextResponse, type NextRequest } from "next/server";
import { bajarApk } from "@/lib/beta";
import { mismoOrigen, yo } from "@/lib/cuenta";

/* 8f · Bajar el APK de prueba con el enlace de un uso: SOLO por POST (el formulario de la página; un GET —una vista previa, un rastreador— no
   gasta nada), desde nuestra página, con la sesión del tester. lib/beta.ts comprueba la huella sha256 y gasta el enlace en una sola escritura. */
export const dynamic = "force-dynamic";
export async function POST(_req: NextRequest, { params }: { params: Promise<{ ficha: string }> }) {
  const { ficha } = await params;
  const volver = (e: number) => new NextResponse(null, { status: 303, headers: { location: `/beta/apk/${encodeURIComponent(ficha)}?e=${e}`, "cache-control": "no-store" } });
  if (!(await mismoOrigen())) return new NextResponse(null, { status: 403 });
  const u = await yo();
  if (!u) return new NextResponse(null, { status: 404 });
  const r = await bajarApk(ficha, u.id);
  if (!r.ok) return r.status === 404 ? new NextResponse(null, { status: 404 }) : volver(r.status);
  return new NextResponse(new Uint8Array(r.archivo), { status: 200, headers: {
    "content-type": "application/vnd.android.package-archive", "content-disposition": `attachment; filename="${r.nombre}"`, "content-length": String(r.archivo.length),
    "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}
