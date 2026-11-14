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
  // 9j · 9-4.1: todo el equipo activo tiene su segundo factor de verdad (la app de códigos o una llave; el camino de las pruebas no cuenta).
  const sinFactor = (await db().query<{ n: number; total: number }>(
    `select count(*) filter (where not exists (select 1 from staff_mfa f where f.user_id = m.user_id and f.revoked_at is null and f.enrolled_at is not null)
                               and not exists (select 1 from passkeys p where p.user_id = m.user_id and p.revoked_at is null))::int as n, count(*)::int as total
       from staff_members m where m.status = 'active'`)).rows[0] ?? { n: 0, total: 0 };
  const equipoConFactor = { ok: sinFactor.total > 0 && sinFactor.n === 0, por: sinFactor.n
    ? { es: `${sinFactor.n} de ${sinFactor.total} del equipo todavía sin segundo factor.`, en: `${sinFactor.n} of ${sinFactor.total} on the team still without a second step.` }
    : { es: "Todo el equipo tiene su segundo factor.", en: "The whole team has their second step." } };
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
    // 9j · Los paquetes de la Fase 9 (fase9-apertura.md §10): cada uno con su paso a paso; el sistema marca lo que puede ver (la llave real de cada
    // proveedor en los secretos del entorno, sin mostrarla; el equipo con su segundo factor). Lo demás lo marca el fundador.
    { k: "9-1", t: { es: "Paquete 9-1 · Pagos y mensajes", en: "Package 9-1 · Payments and messages" }, s: { es: "Stripe, Telnyx, WhatsApp, Amazon SES y Anthropic. Las llaves van al formulario seguro de los secretos del entorno, nunca al chat.", en: "Stripe, Telnyx, WhatsApp, Amazon SES and Anthropic. Keys go to the environment's secure secrets form, never the chat." }, pasos: [
      P("9-1.1", { es: "Stripe: cuenta de la empresa y Connect", en: "Stripe: company account and Connect" }, { es: "Verificación del negocio y del dueño, banco de la plataforma, perfil de Connect (mercado, Express); primero en modo prueba, después en vivo.", en: "Business and owner verification, platform bank, Connect profile (marketplace, Express); test mode first, then live." }, "https://dashboard.stripe.com/register", proveedor("stripe")),
      P("9-1.2", { es: "Telnyx: número y registro 10DLC", en: "Telnyx: number and 10DLC registration" }, { es: "La cuenta, el número de To'Latino y el registro de la marca y las campañas (los textos los dejamos listos para tocar «Enviar»).", en: "The account, To'Latino's number and the brand and campaign registration (we leave the texts ready to tap «Submit»)." }, "https://portal.telnyx.com/", proveedor("telnyx")),
      P("9-1.3", { es: "Meta: WhatsApp Business verificado", en: "Meta: verified WhatsApp Business" }, { es: "El número, la app y el token permanente. Las plantillas las manda Claude por la API.", en: "The number, the app and the permanent token. Claude submits the templates through the API." }, "https://business.facebook.com/"),
      P("9-1.4", { es: "Amazon SES: salir del modo de prueba", en: "Amazon SES: leave the sandbox" }, { es: "La cuenta y el formulario de AWS (el texto del uso lo dejamos listo). El DNS lo pone Claude por Cloudflare.", en: "The account and the AWS form (we leave the use-case text ready). Claude sets the DNS through Cloudflare." }, "https://console.aws.amazon.com/ses/", proveedor("ses")),
      P("9-1.5", { es: "Anthropic: cuenta, facturación y retención cero", en: "Anthropic: account, billing and zero retention" }, { es: "Para El Compa en producción, con el tope de gasto de PLAN §8.", en: "For El Compa in production, with the spending cap in PLAN §8." }, "https://console.anthropic.com/"),
    ] },
    { k: "9-2", t: { es: "Paquete 9-2 · Abogado y contador", en: "Package 9-2 · Lawyer and accountant" }, s: { es: "Sin su revisión no se publica nada legal en producción ni se abre (su costo es decisión tuya: no está en PLAN §8).", en: "Without their review nothing legal is published in production and nothing opens (their cost is your decision: it is not in PLAN §8)." }, pasos: [
      P("9-2.1", { es: "Contratar un abogado de Pennsylvania", en: "Hire a Pennsylvania lawyer" }, { es: "Una consulta con la lista que generamos (docs/legal/para-el-abogado.md).", en: "One consultation with the list we generate (docs/legal/para-el-abogado.md)." }, null),
      P("9-2.2", { es: "Contratar un contador", en: "Hire an accountant" }, { es: "Para los impuestos (docs/legal/para-el-contador.md).", en: "For taxes (docs/legal/para-el-contador.md)." }, null),
      P("9-2.3", { es: "Reenviarles los dos documentos", en: "Forward them the two documents" }, { es: "Desde el teléfono; sus respuestas llegan como documento y Claude las aplica.", en: "From the phone; their answers come back as a document and Claude applies them." }, null),
      P("9-2.4", { es: "Registrar el agente DMCA", en: "Register the DMCA agent" }, { es: "El formulario en línea de la Copyright Office y su pago.", en: "The Copyright Office online form and its fee." }, "https://dmca.copyright.gov/"),
    ] },
    { k: "9-3", t: { es: "Paquete 9-3 · Producción", en: "Package 9-3 · Production" }, s: { es: "Para encender producción en acceso anticipado (OK-1).", en: "To turn on production in early access (OK-1)." }, pasos: [
      P("9-3.1", { es: "Cuenta y proyecto del proveedor de producción", en: "Production provider account and project" }, { es: "Proyecto aparte del de pruebas, con forma de pago; el token de la API al formulario seguro.", en: "A project separate from the test one, with a payment method; the API token to the secure form." }, "https://console.hetzner.cloud/"),
      P("9-3.2", { es: "El almacén de los respaldos", en: "The backup storage" }, { es: "Del mismo proveedor, en otra región (lo crea Claude con el token si el proveedor lo permite).", en: "From the same provider, in another region (Claude creates it with the token if the provider allows it)." }, null),
      P("9-3.3", { es: "Dónde llegan las alertas críticas y el reporte diario", en: "Where critical alerts and the daily report arrive" }, { es: "Un correo y un teléfono.", en: "An email and a phone." }, null),
      P("9-3.4", { es: "Borrar Vercel y Supabase de la v1", en: "Delete the v1 Vercel and Supabase" }, { es: "El día que tolatino.com apunte a producción; dos toques cada uno.", en: "The day tolatino.com points to production; two taps each." }, "https://vercel.com/dashboard"),
    ] },
    { k: "9-4", t: { es: "Paquete 9-4 · Personas y contenido", en: "Package 9-4 · People and content" }, s: { es: "Va llegando mientras se construye.", en: "It arrives while things are built." }, pasos: [
      P("9-4.1", { es: "Quién entra al Super Admin y con qué rol", en: "Who enters the Super Admin and with what role" }, { es: "Cada persona da de alta su segundo factor (llave de acceso o app de códigos) al entrar.", en: "Each person sets up their second step (passkey or code app) when they enter." }, null, equipoConFactor),
      P("9-4.2", { es: "El equipo local de cada ciudad", en: "The local team of each city" }, { es: "City manager y verificador (paso 4 del asistente de apertura).", en: "City manager and verifier (step 4 of the opening wizard)." }, null),
      P("9-4.3", { es: "Las fotos de portada del muro y de la cuenta oficial", en: "The wall and official account cover photos" }, { es: "Una por ciudad.", en: "One per city." }, null),
      P("9-4.4", { es: "Las listas de moderación revisadas con vecinos", en: "Moderation lists reviewed with neighbors" }, { es: "Los términos de cada ciudad.", en: "Each city's terms." }, null),
      P("9-4.5", { es: "Las plantillas de estimado de Auto y Hogar", en: "Auto and Home estimate templates" }, { es: "Las que se quedan en producción.", en: "The ones that stay in production." }, null),
      P("9-4.6", { es: "Negocios reales que dan permiso para las capturas", en: "Real businesses that allow the screenshots" }, { es: "Para las fichas de las tiendas.", en: "For the store listings." }, null),
      P("9-4.7", { es: "Los invitados de la beta de Hazleton", en: "The Hazleton beta guests" }, { es: "Unos 50 vecinos y 20 negocios.", en: "About 50 neighbors and 20 businesses." }, null),
      P("9-4.8", { es: "El contacto para la revisión de Apple y Google", en: "The contact for Apple and Google review" }, { es: "Nombre, teléfono y correo.", en: "Name, phone and email." }, null),
    ] },
    { k: "9-5", t: { es: "Paquete 9-5 · La revisión y los tres OK", en: "Package 9-5 · The review and the three OKs" }, s: { es: "Cada OK se escribe en el chat; queda anotado con su fecha.", en: "Each OK is written in the chat; it is logged with its date." }, pasos: [
      P("9-5.1", { es: "La revisión por lista (docs/REVISION.md)", en: "The checklist review (docs/REVISION.md)" }, { es: "Paso a paso, en tu teléfono.", en: "Step by step, on your phone." }, null),
      P("9-5.2", { es: "OK-1 · Producción en acceso anticipado", en: "OK-1 · Production in early access" }, { es: "«Enciende producción en acceso anticipado».", en: "«Turn on production in early access»." }, null),
      P("9-5.3", { es: "OK-2 · Las apps a revisión y la beta de Hazleton", en: "OK-2 · The apps to review and the Hazleton beta" }, { es: "«Manda las apps a revisión y empieza la beta de Hazleton».", en: "«Send the apps to review and start the Hazleton beta»." }, null),
      P("9-5.4", { es: "OK-3 · Abrir las cinco ciudades", en: "OK-3 · Open the five cities" }, { es: "«Abre las cinco ciudades».", en: "«Open the five cities»." }, null),
    ] },
  ];
  return out;
}

/* 9j · Lo que el sistema puede ver de los proveedores del Paquete 9-1: que la llave REAL está en los secretos del entorno (nunca cuál es) y que no
   apunta a un simulador. En el sandbox de hoy dicen «pendiente»: se usan los simuladores. WhatsApp y Anthropic los marca el fundador: sus llaves solo las leen
   lib/compa/canales-proveedor.ts y lib/compa/modelo-claude.ts (guardianes canalConFirma, compaSoloServidor y compaSinRutaCritica). */
function proveedor(k: "stripe" | "telnyx" | "ses"): { ok: boolean; por: Bi } {
  const e = process.env, hay = (x: string | undefined) => (x ?? "").trim().length >= 8;
  const ok = k === "stripe" ? (e.STRIPE_SECRET_KEY ?? "").startsWith("sk_") && !e.STRIPE_API_BASE && !e.TOLATINO_PAGOS_SIMULADOR
    : k === "telnyx" ? e.TOLATINO_SMS_MODO === "telnyx" && hay(e.TELNYX_API_KEY) && !e.TELNYX_API_BASE
      : hay(e.SES_ACCESS_KEY_ID) && hay(e.SES_SECRET_ACCESS_KEY) && e.TOLATINO_CORREO_MODO !== "pruebas";
  return ok ? { ok, por: { es: "La llave real está en los secretos del entorno.", en: "The real key is in the environment secrets." } }
    : { ok, por: { es: "Se ve hecho cuando la llave real llegue a los secretos del entorno (hoy: el simulador).", en: "Shows done when the real key reaches the environment secrets (today: the simulator)." } };
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
