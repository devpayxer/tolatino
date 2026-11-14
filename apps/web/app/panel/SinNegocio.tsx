"use client";
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";

/* 9n-2 · To'Latino Negocios sin un negocio (L1466): ni a Publica tu negocio (fuera del alcance de esta app; la cáscara la abre fuera) ni a una pantalla en blanco.
   Compuesta con el sistema (head, note, rows). Siempre llega a Mi cuenta › Ajustes › Borrar mi cuenta. */
export function SinNegocio({ es, nombre, tel }: { es: boolean; nombre: string; tel: string }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter();
  const tl = tel.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");
  const filasCuenta: Fila[] = [{ icon: "shield", t: E2("Mi cuenta y ajustes", "My account and settings"), s: E2("Idioma, privacidad y borrar tu cuenta.", "Language, privacy and deleting your account."), onClick: () => router.push("/cuenta/ajustes") }];
  const B: Bloque[] = [
    { type: "head", eye: "TO'LATINO NEGOCIOS", t: E2(`Hola, ${nombre}`, `Hi, ${nombre}`), s: E2("Todavía no tienes un negocio en To'Latino.", "You do not have a business on To'Latino yet.") },
    { type: "rows", k: E2("QUÉ PUEDES HACER", "WHAT YOU CAN DO"), items: [
      { icon: "store", t: E2("Publicar mi negocio", "List my business"), s: E2("Es gratis. Se abre en tu navegador, fuera de esta app.", "It is free. It opens in your browser, outside this app."), onClick: () => router.push("/publica") },
      { icon: "users", t: E2("Entrar al equipo de un negocio", "Join a business team"), s: E2(`Abre el enlace de la invitación que te mandó el negocio. Solo sirve con ${tl}.`, `Open the invite link the business sent you. It only works with ${tl}.`), chev: false },
    ] },
    { type: "rows", items: filasCuenta },
    { type: "note", tone: "ink", icon: "shield", t: E2(`Entraste con ${tl}.`, `Signed in as ${tl}.`) },
  ];
  return (
    <div className="min-h-dvh bg-paper pb-10" data-screen-label="Negocios · sin negocio">
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-[calc(20px+env(safe-area-inset-top))]">
        <PanelBloques bloques={B} h1={24} />
      </div>
    </div>
  );
}
