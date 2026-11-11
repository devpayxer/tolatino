"use client";
/* 8d · Llaves de acceso (Face ID / huella) en el teléfono (fase8-apps.md §3.4). En las apps, el plugin TLLlave usa la API del sistema
   (iOS: ASAuthorizationPlatformPublicKeyCredentialProvider; Android: Credential Manager) porque WebAuthn dentro del WebView no es seguro de
   asumir. Sin el plugin (la web, una cáscara de antes, o un marco) se usa navigator.credentials del navegador. Las dos devuelven lo mismo: el
   JSON estándar de WebAuthn que el servidor verifica (lib/llaves/llaves.ts). Nada aquí decide nada: el servidor verifica cada firma.
   Se ofrece solo donde de verdad se puede: contexto seguro (HTTPS o localhost) y el navegador con WebAuthn; en el sandbox por HTTP en una IP
   no aparece ningún botón. */
import { esApp, plugin } from "./puente";

type J = Record<string, unknown>;
type TLLlave = {
  disponible(): Promise<{ entrar: boolean; plataforma: boolean }>;
  crear(o: { opciones: string }): Promise<{ respuesta: string }>;
  obtener(o: { opciones: string }): Promise<{ respuesta: string }>;
};

const aBytes = (s: string): ArrayBuffer => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u.buffer;
};
const aTexto = (x: ArrayBuffer | null | undefined): string | undefined => {
  if (!x) return undefined;
  const u = new Uint8Array(x);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]!);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

function webPosible(): boolean {
  try {
    return typeof window !== "undefined" && window.isSecureContext === true && typeof window.PublicKeyCredential === "function" && !!navigator.credentials;
  } catch { return false; }
}

/* ¿Qué ofrece este dispositivo? `entrar`: puede entrar con una llave (la del teléfono o, en la computadora, la de un teléfono cercano);
   `plataforma`: el propio dispositivo guarda llaves con Face ID, Touch ID, la huella o el PIN (para la hoja «Entra la próxima vez…»). */
export async function llaveDisponible(): Promise<{ entrar: boolean; plataforma: boolean }> {
  const p = plugin<TLLlave>("TLLlave");
  if (!p) {
    // Dentro de una cáscara sin TLLlave (una de antes de 8d): WebAuthn en el WebView no es seguro de asumir → no se ofrece.
    if (esApp() || !webPosible()) return { entrar: false, plataforma: false };
    const PK = window.PublicKeyCredential as typeof PublicKeyCredential & { isConditionalMediationAvailable?: () => Promise<boolean> };
    const plataforma = await PK.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
    const cond = plataforma ? true : await (PK.isConditionalMediationAvailable?.() ?? Promise.resolve(false)).catch(() => false);
    return { entrar: plataforma || cond, plataforma };
  }
  return p.disponible().catch(() => ({ entrar: false, plataforma: false }));
}

/* Crear una llave (registro). `o` = PublicKeyCredentialCreationOptionsJSON del servidor. */
export async function crearLlave(o: J): Promise<J> {
  const p = plugin<TLLlave>("TLLlave");
  if (!p) {
    const user = o.user as J;
    const pk: PublicKeyCredentialCreationOptions = {
      ...(o as unknown as PublicKeyCredentialCreationOptions),
      challenge: aBytes(String(o.challenge)),
      user: { ...(user as unknown as PublicKeyCredentialUserEntity), id: aBytes(String(user.id)) },
      excludeCredentials: ((o.excludeCredentials as J[] | undefined) ?? []).map((c) => ({ ...(c as unknown as PublicKeyCredentialDescriptor), id: aBytes(String(c.id)) })),
    };
    const c = (await navigator.credentials.create({ publicKey: pk })) as PublicKeyCredential | null;
    if (!c) throw new Error("cancelado");
    const r = c.response as AuthenticatorAttestationResponse;
    return {
      id: c.id, rawId: aTexto(c.rawId), type: c.type, authenticatorAttachment: c.authenticatorAttachment ?? undefined,
      clientExtensionResults: c.getClientExtensionResults?.() ?? {},
      response: { clientDataJSON: aTexto(r.clientDataJSON), attestationObject: aTexto(r.attestationObject), transports: r.getTransports?.() ?? [] },
    };
  }
  // Una cáscara de antes sin el método lanza «no implementado»: quien llama lo atrapa y sigue con el código por SMS.
  try { const r = await p.crear({ opciones: JSON.stringify(o) }); return JSON.parse(r.respuesta) as J; } catch (e) { throw e instanceof Error ? e : new Error(String(e)); }
}

/* Usar una llave (entrar). `o` = PublicKeyCredentialRequestOptionsJSON del servidor. */
export async function usarLlave(o: J): Promise<J> {
  const p = plugin<TLLlave>("TLLlave");
  if (!p) {
    const pk: PublicKeyCredentialRequestOptions = {
      ...(o as unknown as PublicKeyCredentialRequestOptions),
      challenge: aBytes(String(o.challenge)),
      allowCredentials: ((o.allowCredentials as J[] | undefined) ?? []).map((c) => ({ ...(c as unknown as PublicKeyCredentialDescriptor), id: aBytes(String(c.id)) })),
    };
    const c = (await navigator.credentials.get({ publicKey: pk })) as PublicKeyCredential | null;
    if (!c) throw new Error("cancelado");
    const r = c.response as AuthenticatorAssertionResponse;
    return {
      id: c.id, rawId: aTexto(c.rawId), type: c.type, authenticatorAttachment: c.authenticatorAttachment ?? undefined,
      clientExtensionResults: c.getClientExtensionResults?.() ?? {},
      response: { clientDataJSON: aTexto(r.clientDataJSON), authenticatorData: aTexto(r.authenticatorData), signature: aTexto(r.signature), userHandle: aTexto(r.userHandle) },
    };
  }
  try { const r = await p.obtener({ opciones: JSON.stringify(o) }); return JSON.parse(r.respuesta) as J; } catch (e) { throw e instanceof Error ? e : new Error(String(e)); }
}

/* Flujo completo contra el servidor (las rutas /api/cuenta/llave/*). Devuelve lo que contestó el servidor; si la persona cerró el diálogo del
   sistema, { ok: false, cancelado: true } sin mensaje (no es un error). */
type Res = { ok: boolean; cancelado?: boolean; mensaje?: { es: string; en: string } } & Record<string, unknown>;
async function post(url: string, cuerpo: unknown): Promise<Res> {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo ?? {}) });
  return (await r.json().catch(() => ({ ok: false }))) as Res;
}
const cancelado = (e: unknown) => /NotAllowedError|AbortError|cancel/i.test(String((e as Error)?.name ?? "") + String((e as Error)?.message ?? e));
export async function entrarConLlave(): Promise<Res> {
  const a = await post("/api/cuenta/llave/entrar/reto", {});
  if (!a.ok) return a;
  let respuesta: J;
  try { respuesta = await usarLlave(a.opciones as J); } catch (e) { return cancelado(e) ? { ok: false, cancelado: true } : { ok: false }; }
  return post("/api/cuenta/llave/entrar", { respuesta });
}
export async function agregarLlave(): Promise<Res> {
  const a = await post("/api/cuenta/llave/registro/reto", {});
  if (!a.ok) return a;
  let respuesta: J;
  try { respuesta = await crearLlave(a.opciones as J); } catch (e) {
    if (/InvalidStateError/.test(String((e as Error)?.name))) return { ok: false, mensaje: { es: "Este dispositivo ya tiene una llave de tu cuenta.", en: "This device already has a passkey for your account." } };
    return cancelado(e) ? { ok: false, cancelado: true } : { ok: false };
  }
  return post("/api/cuenta/llave/registro", { respuesta });
}
