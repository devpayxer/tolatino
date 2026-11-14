"use client";
/* 9m · «Entra para pedir» (AuthSheet 2m del sistema, L240, L1538): la hoja sobre lo que estabas viendo (tu pedido se queda igual), bilingüe y con los
   errores que manda el servidor (role="alert"). Teléfono → código por SMS → «Verificar y seguir». Quien ya tenía cuenta sigue directo a donde iba;
   una cuenta nueva pasa por «Tú» (solo el nombre, como el prototipo) y vuelve. En el sandbox se ve el código de prueba (como en Entra). Escape cierra. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { AuthSheet } = UI as unknown as Record<"AuthSheet", ComponentType<any>>;
type R = { ok: boolean; mensaje?: { es: string; en: string }; codigoPrueba?: string; nombre?: unknown };
const enviar = async (url: string, cuerpo: unknown): Promise<R> => (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) })).json();

export function HojaEntrar({ es, destino, titulo, sub, onClose }: { es: boolean; destino: string; titulo?: string; sub?: string; onClose: () => void }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [paso, setPaso] = useState<"phone" | "code">("phone"), [tel, setTel] = useState(""), [cod, setCod] = useState("");
  const [error, setError] = useState<string | null>(null), [prueba, setPrueba] = useState<string | null>(null), [desk, setDesk] = useState(false), [ocupado, setOcupado] = useState(false);
  useEffect(() => { const f = () => setDesk(window.innerWidth >= 1024); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const fmt = (d: string) => { d = d.replace(/\D/g, "").slice(0, 10); return d.length < 4 ? d : d.length < 7 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`; };
  const msg = (r: R) => setError(r.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("Algo falló. Prueba de nuevo.", "Something failed. Try again."));
  const pedir = async () => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await enviar("/api/cuenta/codigo", { telefono: tel.replace(/\D/g, "") }).catch(() => ({ ok: false } as R));
    setOcupado(false);
    if (!r.ok) return msg(r);
    setPrueba(r.codigoPrueba ?? null); setCod(""); setPaso("code");
  };
  const verificar = async () => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await enviar("/api/cuenta/verificar", { telefono: tel.replace(/\D/g, ""), codigo: cod }).catch(() => ({ ok: false } as R));
    setOcupado(false);
    if (!r.ok) return msg(r);
    // Con nombre: sigue a donde iba. Cuenta nueva: «Tú» (solo el nombre) y vuelve aquí (Entra lo hace con ?volver=).
    if (r.nombre) { router.push(destino); router.refresh(); return; }
    router.push(`/entrar?volver=${encodeURIComponent(destino)}`);
  };
  return (
    <div data-pieza="hoja-entrar" className="fixed inset-0 z-[80] flex flex-col justify-end lg:items-center lg:justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-ink/45" />
      <div role="dialog" aria-modal="true" aria-label={titulo ?? E2("Entra para pedir", "Sign in to order")} className="relative">
        <AuthSheet step={paso} desktop={desk} title={titulo ?? E2("Entra para pedir", "Sign in to order")} sub={sub ?? E2("Te mandamos un código por SMS. Tu pedido se queda igual.", "We text you a code. Your order stays the same.")}
          phone={fmt(tel)} code={cod} onPhone={(e: { target?: { value?: string } }) => setTel(String(e?.target?.value ?? "").replace(/\D/g, "").slice(0, 10))} onCode={(e: { target?: { value?: string } }) => setCod(String(e?.target?.value ?? "").replace(/\D/g, "").slice(0, 6))}
          onSend={pedir} onVerify={verificar} onChange={() => { setPaso("phone"); setError(null); }} onClose={onClose} error={error ?? undefined}
          phoneLabel={E2("Tu teléfono", "Your phone")} codeLabel={E2("Código de 6 dígitos", "6-digit code")} closeLabel={E2("Cerrar", "Close")}
          phoneKicker={E2("TU TELÉFONO", "YOUR PHONE")} codeKicker={E2("CÓDIGO DE 6 DÍGITOS", "6-DIGIT CODE")} sendLabel={E2("Enviar código", "Send code")}
          verifyLabel={E2("Verificar y seguir", "Verify and continue")} changeLabel={E2("Cambiar número", "Change number")} resendLabel={E2("REENVIAR EN 30 S", "RESEND IN 30 S")}
          terms={E2("Al seguir aceptas los Términos y la Privacidad de To'Latino.", "By continuing you accept To'Latino's Terms and Privacy.")} />
        {prueba && paso === "code" ? <div data-codigo-prueba={prueba} className="absolute left-0 right-0 top-0 -translate-y-full px-4 pb-2 text-center font-mono text-[11px] font-bold tracking-[0.1em] text-white">{E2(`MODO PRUEBAS · CÓDIGO ${prueba}`, `TEST MODE · CODE ${prueba}`)}</div> : null}
      </div>
    </div>
  );
}
