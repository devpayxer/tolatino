import { ErrorCuenta, mismoOrigen, yo } from "@/lib/cuenta";

/* 8d · Lo común de las rutas de las llaves: solo desde nuestra página (mismo origen, además de SameSite), cuerpo JSON acotado y, donde va,
   la sesión. Nada de lo que manda el cliente decide la cuenta: la decide la sesión (registrar) o la llave verificada (entrar). */
export async function cuerpo(req: Request): Promise<unknown> {
  if (!(await mismoOrigen())) throw new ErrorCuenta("origen");
  const t = await req.text();
  if (t.length > 24_000) throw new ErrorCuenta("llave_invalida");
  try { return t ? JSON.parse(t) : {}; } catch { throw new ErrorCuenta("llave_invalida"); }
}
export async function conSesion() {
  const u = await yo();
  if (!u) throw new ErrorCuenta("sin_sesion");
  return u;
}
