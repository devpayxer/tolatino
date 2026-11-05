import "server-only";
import { cookies } from "next/headers";

/* Idioma de la interfaz (español primero). Se guarda en la cookie tl_lang; el botón ES/EN del header la cambia. */
export type Lang = "es" | "en";
export async function idioma(): Promise<Lang> {
  return (await cookies()).get("tl_lang")?.value === "en" ? "en" : "es";
}
