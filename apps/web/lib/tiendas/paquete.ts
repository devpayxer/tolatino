import "server-only";
import { auditar, type Staff } from "../admin";
import { CLAVES_APP, defApp } from "../app-nativa-comun";
import { db, tx } from "../db";
import APPS from "../../../mobile/apps.json";
import * as asc from "./asc";
import { URL_ASC } from "./direcciones";
import { leer } from "./llavero";

/* 8i · Sistema › Apps › «Lo que te toca»: los pasos del fundador de fase8-apps.md §10 (Paquetes 8-0 a 8-3), cada uno con su estado y el botón
   que abre la consola del tercero. El estado sale del SISTEMA donde se puede (el dominio contesta por HTTPS, la llave está en el llavero, la app
   existe en App Store Connect); lo que el sistema no puede saber (el D-U-N-S, la cuenta de Cloudflare, las declaraciones de Play Console) lo
   marca el fundador con un toque (founder_steps, solo inserción, con auditoría). Ningún secreto se pide ni se muestra aquí. */
type Bi = { es: string; en: string };
export type EstadoPaso = "hecho" | "pendiente" | "espera";
export type Paso = { k: string; paquete: string; t: Bi; s: Bi; estado: EstadoPaso; fuente: "sistema" | "manual"; por: Bi | null; consola: string | null; copiar: string | null; marcadoAt: string | null };
export type Paquete = { k: string; t: Bi; s: Bi; pasos: Paso[] };

const ISO = (c: string) => `to_char((${c}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
let sondeo: { at: number; ok: boolean; motivo: string } | null = null;
/* ¿El sandbox contesta por HTTPS en su dominio? (5 min de caché por proceso; sin el dominio: ENOTFOUND). */
async function dominioHttps(): Promise<{ ok: boolean; motivo: string }> {
  if (sondeo && Date.now() - sondeo.at < 300_000) return sondeo;
  const url = (APPS.servidor as Record<string, string>).pruebas!;
  let r: { ok: boolean; motivo: string };
  try { const x = await fetch(`${url}/`, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(4000) }); r = { ok: x.status > 0 && x.status < 500, motivo: `HTTP ${x.status}` }; }
  catch (e) { const c = (e as { cause?: { code?: string } })?.cause?.code ?? (e as Error)?.name ?? "error"; r = { ok: false, motivo: String(c).slice(0, 40) }; }
  sondeo = { at: Date.now(), ...r };
  return r;
}
let appsAsc: { at: number; n: number } | null = null;
/* Cuántas de las cuatro apps existen ya en App Store Connect (solo con la llave de la API; 10 min de caché). */
async function appsEnAsc(): Promise<number | null> {
  if (appsAsc && Date.now() - appsAsc.at < 600_000) return appsAsc.n;
  const m = (await db().query<{ meta: Record<string, string> }>(`select meta from store_secrets where kind = 'asc_api_key' and retired_at is null`)).rows[0]?.meta;
  if (!m?.id_llave || !m.emisor) return null;
  const b = await leer("asc_api_key", "lo que te toca · apps en App Store Connect").catch(() => null);
  if (!b) return null;
  const cred = { llavePem: b.toString("utf8"), idLlave: m.id_llave, emisor: m.emisor };
  let n = 0;
  for (const k of CLAVES_APP) if (await asc.appPorBundle(URL_ASC(), cred, defApp(k).ios).catch(() => null)) n++;
  appsAsc = { at: Date.now(), n };
  return n;
}

export async function loQueTeToca(): Promise<Paquete[]> {
  const [ll, marcas, https, nAsc] = await Promise.all([
    db().query<{ kind: string; meta: Record<string, string> }>(`select kind, meta from store_secrets where retired_at is null`),
    db().query<{ step: string; state: string; at: string }>(`select distinct on (step) step, state, ${ISO("at")} as at from founder_steps order by step, at desc`),
    dominioHttps(),
    appsEnAsc().catch(() => null),
  ]);
  const tiene = (k: string) => ll.rows.some((x) => x.kind === k), meta = (k: string) => ll.rows.find((x) => x.kind === k)?.meta ?? {};
  const marca = (k: string) => marcas.rows.find((x) => x.step === k);
  // Un paso del sistema: hecho si el sistema lo ve; si no, lo que el fundador marcó (o pendiente).
  const P = (k: string, t: Bi, s: Bi, consola: string | null, sistema?: { ok: boolean; por: Bi }, copiar: string | null = null): Paso => {
    const m = marca(k);
    if (sistema?.ok) return { k, paquete: k.slice(0, 3), t, s, estado: "hecho", fuente: "sistema", por: sistema.por, consola, copiar, marcadoAt: null };
    return { k, paquete: k.slice(0, 3), t, s, estado: m?.state === "hecho" ? "hecho" : "pendiente", fuente: sistema ? "sistema" : "manual", por: sistema ? sistema.por : null, consola, copiar, marcadoAt: m?.at ?? null };
  };
  const llave = (k: string): { ok: boolean; por: Bi } => ({ ok: tiene(k), por: tiene(k) ? { es: "La llave está en el llavero.", en: "The key is in the keychain." } : { es: "Todavía no está en el llavero.", en: "Not in the keychain yet." } });
  const correoPlay = meta("play_service_account").correo ?? null;
  const out: Paquete[] = [
    { k: "8-0", t: { es: "Paquete 8-0 · El dominio", en: "Package 8-0 · The domain" }, s: { es: "Para que el sandbox tenga https y las apps puedan hablar con él.", en: "So the sandbox has https and the apps can talk to it." }, pasos: [
      P("8-0.1", { es: "Crear la cuenta de Cloudflare", en: "Create the Cloudflare account" }, { es: "Plan gratis; aceptar los términos.", en: "Free plan; accept the terms." }, "https://dash.cloudflare.com/sign-up"),
      P("8-0.2", { es: "Cambiar los servidores de nombres", en: "Change the nameservers" }, { es: "En el registrador de tolatino.com, poner los dos que da Cloudflare.", en: "At the tolatino.com registrar, set the two Cloudflare gives you." }, "https://dash.cloudflare.com/",
        { ok: https.ok, por: https.ok ? { es: "pruebas.tolatino.com contesta por https.", en: "pruebas.tolatino.com answers over https." } : { es: `pruebas.tolatino.com no contesta por https (${https.motivo}).`, en: `pruebas.tolatino.com does not answer over https (${https.motivo}).` } }),
      P("8-0.3", { es: "Token de la API de Cloudflare", en: "Cloudflare API token" }, { es: "Con permisos de DNS y SSL de la zona, en el formulario seguro de los secretos del entorno (nunca en el chat).", en: "With DNS and SSL permissions for the zone, in the environment's secure secrets form (never in the chat)." }, "https://dash.cloudflare.com/profile/api-tokens",
        { ok: https.ok, por: https.ok ? { es: "El dominio ya contesta: el token se usó.", en: "The domain answers: the token was used." } : { es: "Se ve hecho cuando el dominio conteste por https.", en: "Shows done when the domain answers over https." } }),
    ] },
    { k: "8-1", t: { es: "Paquete 8-1 · Las cuentas", en: "Package 8-1 · The accounts" }, s: { es: "Apple y Google tardan días en aprobar: se piden primero.", en: "Apple and Google take days to approve: ask first." }, pasos: [
      P("8-1.1", { es: "D-U-N-S de la empresa", en: "Company D-U-N-S" }, { es: "Gratis con la herramienta de Apple; tarda de días a dos semanas.", en: "Free with Apple's tool; takes days to two weeks." }, "https://developer.apple.com/enroll/duns-lookup/"),
      P("8-1.2", { es: "Apple Developer Program como organización", en: "Apple Developer Program as an organization" }, { es: "Desde la app Apple Developer del iPhone: datos de la empresa, D-U-N-S, sitio web y el pago de $99.", en: "From the Apple Developer app on the iPhone: company details, D-U-N-S, website and the $99 payment." }, "https://developer.apple.com/programs/enroll/",
        { ok: tiene("asc_api_key") || tiene("apns_key"), por: tiene("asc_api_key") || tiene("apns_key") ? { es: "Ya hay llaves de Apple en el llavero: la cuenta existe.", en: "Apple keys are in the keychain: the account exists." } : { es: "Se ve hecho cuando subas la primera llave de Apple.", en: "Shows done when you upload the first Apple key." } }),
      P("8-1.3", { es: "Google Play Console como organización", en: "Google Play Console as an organization" }, { es: "Pago de $25, D-U-N-S, documento de identidad y la verificación que pida Google ese día.", en: "$25 payment, D-U-N-S, ID document and whatever verification Google asks for that day." }, "https://play.google.com/console/signup",
        { ok: tiene("play_service_account"), por: tiene("play_service_account") ? { es: "La cuenta de servicio de Play está en el llavero.", en: "The Play service account is in the keychain." } : { es: "Se ve hecho cuando subas la cuenta de servicio de Play.", en: "Shows done when you upload the Play service account." } }),
      P("8-1.4", { es: "Proyecto de Firebase «tolatino»", en: "Firebase project «tolatino»" }, { es: "Crear el proyecto y aceptar los términos (avisos de Android).", en: "Create the project and accept the terms (Android notifications)." }, "https://console.firebase.google.com/",
        { ok: tiene("fcm_service_account"), por: tiene("fcm_service_account") ? { es: "La cuenta de servicio de Firebase está en el llavero.", en: "The Firebase service account is in the keychain." } : { es: "Se ve hecho cuando subas la cuenta de servicio de Firebase.", en: "Shows done when you upload the Firebase service account." } }),
    ] },
    { k: "8-2", t: { es: "Paquete 8-2 · Llaves y registros", en: "Package 8-2 · Keys and registrations" }, s: { es: "Cuando Apple y Google aprueben; unos 15 minutos. Cada archivo se sube en Sistema › Integraciones › Llaves.", en: "When Apple and Google approve; about 15 minutes. Each file is uploaded in System › Integrations › Keys." }, pasos: [
      P("8-2.1", { es: "Llave de la API de App Store Connect (rol Admin)", en: "App Store Connect API key (Admin role)" }, { es: "Generarla, descargarla y subirla al llavero.", en: "Generate it, download it and upload it to the keychain." }, "https://appstoreconnect.apple.com/access/integrations/api", llave("asc_api_key")),
      P("8-2.2", { es: "Llave de APNs", en: "APNs key" }, { es: "developer.apple.com › Keys: descargarla y subirla.", en: "developer.apple.com › Keys: download it and upload it." }, "https://developer.apple.com/account/resources/authkeys/list", llave("apns_key")),
      P("8-2.3", { es: "«Nueva app» cuatro veces en App Store Connect", en: "«New app» four times in App Store Connect" }, { es: "Nombre, idioma principal Español (México) y el ID que ya aparece en la lista.", en: "Name, primary language Spanish (Mexico) and the ID already in the list." }, "https://appstoreconnect.apple.com/apps",
        { ok: nAsc === 4, por: nAsc == null ? { es: "Se comprueba cuando esté la llave de la API.", en: "Checked once the API key is there." } : { es: `${nAsc} de 4 apps existen en App Store Connect.`, en: `${nAsc} of 4 apps exist in App Store Connect.` } }),
      P("8-2.4", { es: "Llave privada de Firebase", en: "Firebase private key" }, { es: "Configuración › Cuentas de servicio › Generar llave privada; subirla.", en: "Settings › Service accounts › Generate private key; upload it." }, "https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk", llave("fcm_service_account")),
      P("8-2.5", { es: "«Crear app» cuatro veces en Play Console", en: "«Create app» four times in Play Console" }, { es: "Nombre, idioma, gratis y aceptar las declaraciones.", en: "Name, language, free and accept the declarations." }, "https://play.google.com/console/"),
      P("8-2.6", { es: "Invitar el correo de la cuenta de servicio en Play Console", en: "Invite the service account email in Play Console" }, { es: "Usuarios y permisos › invitar, con permiso de publicar en las cuatro apps. Es el único dato que se escribe (choque con «nada de copiar y pegar»: se dice).", en: "Users and permissions › invite, with publishing permission on the four apps. It is the only thing typed (clash with «no copy and paste»: stated)." }, "https://play.google.com/console/users-and-permissions", undefined, correoPlay),
      P("8-2.7", { es: "Lista de testers de Play interno", en: "Play internal testers list" }, { es: "Prueba interna › lista con tu correo y los de las personas de confianza.", en: "Internal testing › list with your email and trusted people's." }, "https://play.google.com/console/"),
      P("8-2.8", { es: "Token de GitHub para «Pedir un build»", en: "GitHub token for «Request a build»" }, { es: "Permiso «Actions: write» solo en este repositorio; subirlo al llavero.", en: "«Actions: write» permission on this repository only; upload it to the keychain." }, "https://github.com/settings/personal-access-tokens/new", llave("github_token")),
      P("8-2.9", { es: "Opcional · Wallet (Pass Type ID y emisor de Google Wallet)", en: "Optional · Wallet (Pass Type ID and Google Wallet issuer)" }, { es: "El certificado del pase (dos archivos) y la cuenta de emisor de Google Wallet.", en: "The pass certificate (two files) and the Google Wallet issuer account." }, "https://developer.apple.com/account/resources/identifiers/list/passTypeId",
        { ok: tiene("pass_type_cert"), por: tiene("pass_type_cert") ? { es: "El certificado del pase está en el llavero.", en: "The pass certificate is in the keychain." } : { es: "Opcional: sin él, el boleto no se agrega a Wallet.", en: "Optional: without it, tickets are not added to Wallet." } }),
    ] },
    { k: "8-3", t: { es: "Paquete 8-3 · Las declaraciones", en: "Package 8-3 · The declarations" }, s: { es: "Antes de cualquier revisión, con la pantalla lado a lado (Declaraciones). Son declaraciones legales del dueño de la cuenta.", en: "Before any review, with the side-by-side screen (Declarations). They are the account owner's legal declarations." }, pasos: [
      P("8-3.1", { es: "Apple · Privacidad de la app de las cuatro", en: "Apple · App Privacy for the four" }, { es: "Las respuestas salen del inventario de datos.", en: "The answers come from the data inventory." }, "https://appstoreconnect.apple.com/apps"),
      P("8-3.2", { es: "Google · Seguridad de los datos", en: "Google · Data safety" }, { es: "Importar el CSV que generamos o tocar las mismas respuestas.", en: "Import the CSV we generate or tap the same answers." }, "https://play.google.com/console/"),
      P("8-3.3", { es: "Google · Clasificación de contenido (IARC)", en: "Google · Content rating (IARC)" }, { es: "El cuestionario, con las respuestas de la pantalla lado a lado.", en: "The questionnaire, with the answers from the side-by-side screen." }, "https://play.google.com/console/"),
      P("8-3.4", { es: "Google · Público objetivo, anuncios, noticias y gobierno, finanzas y salud", en: "Google · Target audience, ads, news and government, financial and health" }, { es: "18+, sin anuncios, no, no, y lo que sale del inventario.", en: "18+, no ads, no, no, and what comes from the inventory." }, "https://play.google.com/console/"),
      P("8-3.5", { es: "Google · Servicio en primer plano de ubicación (Repartidor)", en: "Google · Location foreground service (Repartidor)" }, { es: "El texto y el video que generamos.", en: "The text and video we generate." }, "https://play.google.com/console/"),
      P("8-3.6", { es: "Google · URL de privacidad y de borrar la cuenta", en: "Google · Privacy and account deletion URLs" }, { es: "/privacidad y /cuenta/ajustes/borrar.", en: "/privacidad and /cuenta/ajustes/borrar." }, "https://play.google.com/console/"),
    ] },
  ];
  return out;
}

/* El fundador marca un paso que el sistema no puede ver (o lo vuelve a pendiente). Solo un Admin, con nota opcional y auditoría. */
export async function marcarPaso(s: Staff, k: string, hecho: boolean, nota: string): Promise<{ ok: boolean; msg: string }> {
  const pasos = (await loQueTeToca()).flatMap((p) => p.pasos), p = pasos.find((x) => x.k === k);
  if (!p) return { ok: false, msg: "Ese paso no existe." };
  if (p.fuente === "sistema" && p.estado === "hecho") return { ok: false, msg: "Este paso lo ve el sistema: ya está hecho." };
  const n = String(nota ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300);
  await tx(async (c) => {
    await c.query(`insert into founder_steps (step, state, note, by) values ($1, $2, $3, $4)`, [k, hecho ? "hecho" : "pendiente", n || null, s.id]);
    await auditar(c, { actor: s.id, action: hecho ? "paquete.hecho" : "paquete.pendiente", targetKind: "founder_step", targetId: k, after: { estado: hecho ? "hecho" : "pendiente" }, reason: n || null });
  });
  return { ok: true, msg: hecho ? `${p.t.es}: hecho.` : `${p.t.es}: otra vez pendiente.` };
}
