import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { llavesAqui } from "@/lib/llaves/config";
import { ubicacion } from "@/lib/ubicacion";
import { datosBienvenida } from "@/lib/vecinos";
import { Entrar } from "./Entrar";

export const metadata: Metadata = { title: "Entra · To'Latino" };
export const dynamic = "force-dynamic";

/* ?volver=/c/comida → al terminar regresa ahí. Solo rutas del mismo sitio (nada de «//otro.com» ni «/\\»).
   ?bienvenida=1 (la manda la Comunidad): quien ya tiene nombre pero no hizo los pasos 3–5 de 2au (Tu zona · Lo que te gusta ·
   El barrio) los hace aquí; si ya los hizo, sigue a donde iba; si declaró ser menor, ve el aviso de 18 años. */
const destinoSeguro = (v: unknown) => (typeof v === "string" && /^\/(?![/\\])[\w\-./?=&%,+]*$/.test(v) && v.length <= 300 ? v : "/cuenta");

export default async function Page({ searchParams }: { searchParams: Promise<{ volver?: string; bienvenida?: string }> }) {
  const [u, sp, lang, rp] = await Promise.all([yo(), searchParams, idioma(), llavesAqui()]);
  // 8d · ¿Se ofrecen llaves de acceso aquí? (entorno + interruptor + este origen). El dispositivo lo decide después la página (contexto seguro).
  const llaves = !!rp;
  const destino = destinoSeguro(sp.volver);
  if (u?.first_name) {
    if (sp.bienvenida !== "1") redirect(destino);
    const loc = await ubicacion(u);
    const d = await datosBienvenida(u.id, loc.c.id);
    if (d.hecha) redirect(destino);
    return <Entrar destino={destino} lang0={lang} inicial={{ paso: d.menor ? 7 : 3 }} bv={d} llaves={llaves} />;
  }
  return <Entrar destino={destino} lang0={lang} inicial={u ? { paso: 2, telefono: u.phone } : { paso: 1 }} llaves={llaves} />;
}
