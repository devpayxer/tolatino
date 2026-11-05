"use server";
import { cookies } from "next/headers";

export async function cambiarIdioma(lang: "es" | "en") {
  (await cookies()).set("tl_lang", lang === "en" ? "en" : "es", { path: "/", maxAge: 365 * 86400, sameSite: "lax" });
}
