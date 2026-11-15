"use client";
import { useActionState, useState } from "react";
import type { Resultado } from "../acciones";
import { A } from "../ui";
import { useE } from "../idioma-admin";

export function AgregarMiembro({ roles, accion }: { roles: { key: string; name: string }[]; accion: (p: Resultado | null, f: FormData) => Promise<Resultado> }) {
  const E = useE();
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, pendiente] = useActionState(accion, null);
  if (!abierto)
    return (
      <div className="flex flex-col gap-1">
        <div className="flex"><A.Button size="sm" variant="soft" icon="plus" onClick={() => setAbierto(true)}>{E("Agregar al equipo", "Add to team")}</A.Button></div>
        {estado?.ok && <span className="text-[12px] font-semibold text-open-text">{estado.mensaje}</span>}
      </div>
    );
  const campo = "h-12 w-full rounded-input border-[1.5px] border-line-strong bg-white px-3.5 text-[15px] font-semibold text-ink outline-none focus:border-ink";
  return (
    <form action={async (f) => { await enviar(f); }} className="flex flex-col gap-3 rounded-card border border-line bg-white p-4">
      <span className="font-display text-[17px] font-extrabold tracking-[-0.02em]">{E("Agregar al equipo", "Add to team")}</span>
      <p className="text-[13px] text-text-2">{E("La persona ya debe tener cuenta (entró con su teléfono). Su acceso depende del rol.", "The person must already have an account (signed in with their phone). Their access depends on the role.")}</p>
      <label className="flex flex-col gap-1.5"><span className="font-mono text-[10px] font-bold tracking-[0.14em] text-text-muted">{E("TELÉFONO", "PHONE")}</span>
        <input name="telefono" inputMode="numeric" placeholder="(570) 555-0134" className={campo} /></label>
      <label className="flex flex-col gap-1.5"><span className="font-mono text-[10px] font-bold tracking-[0.14em] text-text-muted">{E("ROL", "ROLE")}</span>
        <select name="rol" defaultValue="soporte" className={campo}>{roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</select></label>
      <label className="flex flex-col gap-1.5"><span className="font-mono text-[10px] font-bold tracking-[0.14em] text-text-muted">{E("MOTIVO", "REASON")}</span>
        <textarea name="motivo" rows={2} placeholder={E("Por qué entra al equipo", "Why they are joining the team")} className="w-full rounded-input border-[1.5px] border-line-strong bg-white px-3.5 py-3 text-[14px] text-ink outline-none focus:border-ink" /></label>
      {estado && !estado.ok && <A.AdminNote tone="bad">{estado.mensaje}</A.AdminNote>}
      <div className="flex gap-2">
        <button type="submit" disabled={pendiente} className="h-11 flex-1 rounded-button bg-ink text-[14px] font-bold text-white disabled:opacity-50">{pendiente ? E("Guardando…", "Saving…") : E("Agregar", "Add")}</button>
        <button type="button" onClick={() => setAbierto(false)} className="h-11 rounded-button border-[1.5px] border-line-strong px-4 text-[14px] font-bold">{E("Cancelar", "Cancel")}</button>
      </div>
    </form>
  );
}
