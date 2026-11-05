"use client";
import { useActionState, useState } from "react";
import type { Resultado } from "../acciones";
import { A } from "../ui";

export function AgregarMiembro({ roles, accion }: { roles: { key: string; name: string }[]; accion: (p: Resultado | null, f: FormData) => Promise<Resultado> }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, pendiente] = useActionState(accion, null);
  if (!abierto)
    return (
      <div className="flex flex-col gap-1">
        <div className="flex"><A.Button size="sm" variant="soft" icon="plus" onClick={() => setAbierto(true)}>Agregar al equipo</A.Button></div>
        {estado?.ok && <span className="text-[12px] font-semibold text-open-text">{estado.mensaje}</span>}
      </div>
    );
  const campo = "h-12 w-full rounded-input border-[1.5px] border-line-strong bg-white px-3.5 text-[15px] font-semibold text-ink outline-none focus:border-ink";
  return (
    <form action={async (f) => { await enviar(f); }} className="flex flex-col gap-3 rounded-card border border-line bg-white p-4">
      <span className="font-display text-[17px] font-extrabold tracking-[-0.02em]">Agregar al equipo</span>
      <p className="text-[13px] text-text-2">La persona ya debe tener cuenta (entró con su teléfono). Su acceso depende del rol.</p>
      <label className="flex flex-col gap-1.5"><span className="font-mono text-[10px] font-bold tracking-[0.14em] text-text-muted">TELÉFONO</span>
        <input name="telefono" inputMode="numeric" placeholder="(570) 555-0134" className={campo} /></label>
      <label className="flex flex-col gap-1.5"><span className="font-mono text-[10px] font-bold tracking-[0.14em] text-text-muted">ROL</span>
        <select name="rol" defaultValue="soporte" className={campo}>{roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</select></label>
      <label className="flex flex-col gap-1.5"><span className="font-mono text-[10px] font-bold tracking-[0.14em] text-text-muted">MOTIVO</span>
        <textarea name="motivo" rows={2} placeholder="Por qué entra al equipo" className="w-full rounded-input border-[1.5px] border-line-strong bg-white px-3.5 py-3 text-[14px] text-ink outline-none focus:border-ink" /></label>
      {estado && !estado.ok && <A.AdminNote tone="bad">{estado.mensaje}</A.AdminNote>}
      <div className="flex gap-2">
        <button type="submit" disabled={pendiente} className="h-11 flex-1 rounded-button bg-ink text-[14px] font-bold text-white disabled:opacity-50">{pendiente ? "Guardando…" : "Agregar"}</button>
        <button type="button" onClick={() => setAbierto(false)} className="h-11 rounded-button border-[1.5px] border-line-strong px-4 text-[14px] font-bold">Cancelar</button>
      </div>
    </form>
  );
}
