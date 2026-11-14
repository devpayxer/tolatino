"use server";
/* 9h · Super Admin › Crecimiento · acciones. El permiso lo revisa cada función de lib/crecimiento/* (mkt:editar, mkt:aprobar; la ciudad de quien mira),
   con motivo y auditoría en la misma transacción. Los avisos salen en el idioma de quien usa el admin. */
import { staff } from "@/lib/admin";
import { aprobarCampana, contarSegmento, crearCampana, retirarCampana, segmentoDe } from "@/lib/crecimiento/campanas";
import type { Res } from "@/lib/crecimiento/comun";
import { buscarNegocio, fijarDestacado, retirarDestacado } from "@/lib/crecimiento/destacados";
import { crearEnlace, escaneosDe, retirarEnlace } from "@/lib/crecimiento/enlaces";
import { nombrarPromotor, retirarCodigo } from "@/lib/crecimiento/promotores";
import { ponerFechaLanding } from "@/lib/crecimiento/admin";
import { idioma } from "@/lib/idioma";
import type { ResAdm } from "./acciones-colas";

const S = (x: unknown, n = 300) => String(x ?? "").slice(0, n);
const sal = async (r: Res): Promise<ResAdm> => { const l = await idioma(); return r.ok ? { ok: true, mensaje: r.msg[l] } : { ok: false, mensaje: r.msg[l] }; };
const sin = async (): Promise<ResAdm> => ({ ok: false, mensaje: (await idioma()) === "en" ? "No team session." : "Sin sesión del equipo." });

export async function enlaceCrear(p: { label?: unknown; target?: unknown; ciudad?: unknown; tipo?: unknown; campana?: unknown }, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return sin();
  return sal(await crearEnlace(s, { label: S(p?.label, 100), target: S(p?.target, 220), ciudad: S(p?.ciudad, 10), tipo: S(p?.tipo, 20), campana: p?.campana ? S(p.campana, 20) : null, motivo: S(motivo) }));
}
export async function enlaceRetirar(code: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return sin();
  return sal(await retirarEnlace(s, S(code, 10), S(motivo)));
}
// solo lectura
export async function enlaceEscaneos(code: string) {
  const s = await staff(); if (!s || !s.puede("mkt", "ver")) return null;
  return escaneosDe(s, S(code, 10));
}

export async function campanaCrear(p: Record<string, unknown>, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return sin();
  return sal(await crearCampana(s, { nombre: S(p?.nombre, 100), ciudad: S(p?.ciudad, 10), tipo: S(p?.tipo, 20), canal: S(p?.canal, 10), segmento: p?.segmento,
    tituloEs: S(p?.tituloEs, 80), tituloEn: S(p?.tituloEn, 80), textoEs: S(p?.textoEs, 320), textoEn: S(p?.textoEn, 320), href: S(p?.href, 220), cuando: S(p?.cuando, 20), motivo: S(motivo) }));
}
// solo lectura
export async function campanaContar(ciudad: string, segmento: unknown): Promise<number | null> {
  const s = await staff(); if (!s || !s.puede("mkt", "ver")) return null;
  const c = S(ciudad, 10);
  if (s.cities.length && !s.cities.includes(c)) return null;
  return contarSegmento(c, segmentoDe(segmento));
}
export async function campanaAprobar(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return sin();
  return sal(await aprobarCampana(s, S(id, 20), S(motivo)));
}
export async function campanaRetirar(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return sin();
  return sal(await retirarCampana(s, S(id, 20), S(motivo)));
}

export async function destacadoFijar(ciudad: string, negocio: string, modo: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return sin();
  return sal(await fijarDestacado(s, { ciudad: S(ciudad, 10), negocio: S(negocio, 90), modo: S(modo, 10), motivo: S(motivo) }));
}
export async function destacadoRetirar(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return sin();
  return sal(await retirarDestacado(s, S(id, 20), S(motivo)));
}
// solo lectura
export async function destacadoBuscar(ciudad: string, q: string) {
  const s = await staff(); if (!s || !s.puede("mkt", "ver")) return [];
  return buscarNegocio(s, S(ciudad, 10), S(q, 40));
}

export async function promotorNombrar(telefono: string, ciudad: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return sin();
  return sal(await nombrarPromotor(s, { telefono: S(telefono, 20), ciudad: S(ciudad, 10), motivo: S(motivo) }));
}
export async function codigoRetirar(code: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return sin();
  return sal(await retirarCodigo(s, S(code, 14), S(motivo)));
}

export async function landingFecha(visible: boolean, fecha: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s) return sin();
  return sal(await ponerFechaLanding(s, visible === true, S(fecha, 12), S(motivo)));
}
