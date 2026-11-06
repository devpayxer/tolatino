import { NextResponse, type NextRequest } from "next/server";

/* Identificador del dispositivo (cookie tl_dev, la misma de lib/cuenta.ts): se crea en la primera visita para que la
   analítica propia cuente visitantes y días activos sin cuenta. Aleatorio, solo lo lee el servidor; nada personal. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function middleware(req: NextRequest) {
  if (UUID.test(req.cookies.get("tl_dev")?.value ?? "")) return NextResponse.next();
  const id = crypto.randomUUID();
  const h = new Headers(req.headers);
  h.set("cookie", `${req.headers.get("cookie") ? `${req.headers.get("cookie")}; ` : ""}tl_dev=${id}`);
  const res = NextResponse.next({ request: { headers: h } });
  res.cookies.set("tl_dev", id, { path: "/", maxAge: 5 * 365 * 86400, sameSite: "lax", httpOnly: true, secure: req.headers.get("x-forwarded-proto") === "https" });
  return res;
}
export const config = { matcher: ["/((?!_next/|api/|medios/|assets/|favicon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|json|js|css|woff2?)$).*)"] };
