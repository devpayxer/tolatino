import { redirect } from "next/navigation";

/* /ciudad abre el selector de ciudad (APP-CIUDAD) sobre Inicio; /ciudad?pedir abre «Avísame cuando llegue a mi zona». */
export default async function Page({ searchParams }: { searchParams: Promise<{ pedir?: string }> }) {
  const sp = await searchParams;
  redirect(sp.pedir !== undefined ? "/?ciudad=pedir" : "/?ciudad");
}
