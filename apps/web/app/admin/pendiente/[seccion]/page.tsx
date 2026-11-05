import { AdminNote } from "@tolatino/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { FASE } from "@/lib/admin-nav";
import { db } from "@/lib/db";
import {Titulo } from "../../ui";

/* Secciones del Super Admin que todavía no existen: se dice cuándo entran, sin pantallas falsas. */
export default async function Pendiente({ params }: { params: Promise<{ seccion: string }> }) {
  const { seccion } = await params;
  if (!FASE[seccion]) notFound();
  await requerir(seccion, "ver");
  const r = await db().query<{ name: string }>("select name->>'es' as name from admin_sections where key = $1", [seccion]);
  return (
    <>
      <Link href="/admin" className="text-[13px] font-bold">← Inicio</Link>
      <Titulo eyebrow="SUPER ADMIN" titulo={r.rows[0]?.name ?? seccion} />
      <AdminNote tone="info">Esta sección se construye en la {FASE[seccion]}, junto con lo que administra. Así nunca hay una pantalla del admin sin datos reales detrás.</AdminNote>
    </>
  );
}
