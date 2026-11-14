"use client";
/* 9n-3 · Buscador global del Super Admin (⌘K): una caja y los resultados por grupo, con los bloques del sistema (search + rows). */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Resultados } from "@/lib/admin-buscar";

const RUTA = "/admin/buscar";
const destino = (q: string) => (q.trim() ? RUTA + "?q=" + encodeURIComponent(q.trim()) : RUTA);

export function Buscar({ r }: { r: Resultados }) {
  const router = useRouter();
  const [q, setQ] = useState(r.q);
  useEffect(() => setQ(r.q), [r.q]);
  // Con la caja quieta 300 ms busca sola; Enter busca al momento.
  useEffect(() => {
    if (q.trim() === r.q) return;
    const t = setTimeout(() => router.replace(destino(q)), 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const grupo = (k: string, l: { t: string; s: string; href: string; icon: string }[]): Bloque | null =>
    l.length ? { type: "rows", k, items: l.map((x) => ({ t: x.t, s: x.s, icon: x.icon, onClick: () => router.push(x.href) })) } : null;
  const n = r.negocios.length + r.usuarios.length + r.operaciones.length + r.secciones.length;
  const bloques: (Bloque | null)[] = [
    { type: "head", eye: "BUSCAR EN TODO", t: "Buscador", s: "Negocio, usuario, # de operación o sección. Solo lo de tus ciudades y lo que tu rol puede ver.", h1: 24 },
    { type: "search", val: q, ph: "Buscar negocio, usuario, # de operación…", onChange: setQ, onClear: () => { setQ(""); router.replace(RUTA); } },
    r.q.length < 2 ? { type: "empty", icon: "search", t: "Escribe al menos 2 letras", s: "Atajo: ⌘K (o Ctrl K) desde cualquier pantalla del Super Admin." }
      : !n ? { type: "empty", icon: "search", t: "No encontré nada", s: `Nada con «${r.q}» en tus ciudades. Prueba con otro nombre, un teléfono o el número de la operación.` } : null,
    grupo("NEGOCIOS", r.negocios), grupo("USUARIOS", r.usuarios), grupo("OPERACIONES", r.operaciones), grupo("SECCIONES", r.secciones),
  ];
  return (
    <form onSubmit={(e) => { e.preventDefault(); router.replace(destino(q)); }} style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
      <PanelBloques bloques={bloques} h1={24} />
    </form>
  );
}
