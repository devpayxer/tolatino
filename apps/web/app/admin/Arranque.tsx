"use client";
/* Primer Admin: solo aparece mientras no exista ningún Admin. El código es de un solo uso. */
import { Wordmark } from "@tolatino/ui";
import { useActionState, useState } from "react";
import { accionArranque } from "./acciones";
import { A } from "./ui";

export function Arranque({ nombre }: { nombre: string }) {
  const [codigo, setCodigo] = useState("");
  const [estado, enviar, pendiente] = useActionState(accionArranque, null);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-5 bg-white px-5 pt-10">
      <Wordmark size={22} />
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] font-extrabold tracking-[0.12em] text-text-muted">SUPER ADMIN · PRIMERA VEZ</span>
        <h1 className="font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em]">Activa tu acceso de Admin, {nombre}</h1>
        <p className="text-[14px] font-medium leading-normal text-text-2">
          Todavía no hay nadie en el equipo. Escribe el código de arranque que te dio Claude. Sirve una sola vez: después, los
          demás entran porque tú los agregas.
        </p>
      </div>
      <form action={enviar} className="flex flex-col gap-3">
        <label className="flex flex-col gap-[7px]">
          <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-text-muted">CÓDIGO DE ARRANQUE</span>
          <input
            name="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            autoComplete="off"
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
            className="h-[52px] w-full rounded-input border-[1.5px] border-line-strong bg-white px-3.5 font-mono text-[15px] font-bold tracking-[0.08em] text-ink outline-none focus:border-ink"
          />
        </label>
        {estado && !estado.ok && <A.AdminNote tone="bad">{estado.mensaje}</A.AdminNote>}
        <button
          type="submit"
          disabled={codigo.replace(/[^A-Z0-9]/g, "").length < 20 || pendiente}
          className="flex h-[52px] items-center justify-center rounded-button bg-ink text-[14.5px] font-bold text-white disabled:bg-fill disabled:text-text-faint"
        >
          {pendiente ? "Activando…" : "Activar acceso de Admin"}
        </button>
      </form>
    </main>
  );
}
