"use client";
/* Primer Admin: solo aparece mientras no exista ningún Admin. El código es de un solo uso. */
import { Wordmark } from "@tolatino/ui";
import { useActionState, useState } from "react";
import { accionArranque } from "./acciones";
import { A } from "./ui";

export function Arranque({ nombre, lang = "es" }: { nombre: string; lang?: "es" | "en" }) {
  const E = (es: string, en: string) => (lang === "en" ? en : es);
  const [codigo, setCodigo] = useState("");
  const [estado, enviar, pendiente] = useActionState(accionArranque, null);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-5 bg-white px-5 pt-10">
      <Wordmark size={22} />
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] font-extrabold tracking-[0.12em] text-text-muted">{E("SUPER ADMIN · PRIMERA VEZ", "SUPER ADMIN · FIRST TIME")}</span>
        <h1 className="font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em]">{E(`Activa tu acceso de Admin, ${nombre}`, `Turn on your Admin access, ${nombre}`)}</h1>
        <p className="text-[14px] font-medium leading-normal text-text-2">
          {E("Todavía no hay nadie en el equipo. Escribe el código de arranque que te dio Claude. Sirve una sola vez: después, los demás entran porque tú los agregas.",
            "There’s nobody on the team yet. Enter the start code Claude gave you. It works only once: after that, others get in because you add them.")}
        </p>
      </div>
      <form action={enviar} className="flex flex-col gap-3">
        <label className="flex flex-col gap-[7px]">
          <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-text-muted">{E("CÓDIGO DE ARRANQUE", "START CODE")}</span>
          <input
            name="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            autoComplete="off"
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
            className="h-[52px] w-full rounded-input border-[1.5px] border-line-strong bg-white px-3.5 font-mono text-[15px] font-bold tracking-[0.08em] text-ink outline-none focus:border-ink"
          />
        </label>
        {estado && !estado.ok && <A.AdminNote tone="bad">{E(estado.mensaje ?? "", "That code doesn’t work, or there’s already an Admin.")}</A.AdminNote>}
        <button
          type="submit"
          disabled={codigo.replace(/[^A-Z0-9]/g, "").length < 20 || pendiente}
          className="flex h-[52px] items-center justify-center rounded-button bg-ink text-[14.5px] font-bold text-white disabled:bg-fill disabled:text-text-faint"
        >
          {pendiente ? E("Activando…", "Turning on…") : E("Activar acceso de Admin", "Turn on Admin access")}
        </button>
      </form>
    </main>
  );
}
