# Paquete de terceros para abrir To'Latino (23 nov 2026)

> Lo que solo el fundador puede hacer con cada tercero, en orden, con sus pasos para el teléfono. Los números de línea son los de
> `docs/LAUNCH-CHECKLIST.md` del 23 nov y se mueven: cada línea va citada por sus primeras palabras. El tablero vivo es Super Admin › Sistema ›
> Apps › «Lo que te toca»; si algo difiere, manda el tablero.

Resumen
- 12 terceros: Cloudflare/dominio · Telnyx · Meta · Apple+Google+Firebase (LAUNCH no los separa) · abogado · contador · Copyright Office (agente DMCA) · Stripe · Amazon SES · Anthropic · proveedor de producción · GitHub (token de administración).
- Líneas abiertas de LAUNCH que esperan a terceros, recontadas hoy por su texto (las 181 de la Clase C de ayer siguen abiertas): Tiendas Apple/Google 53 · Abogado 36 (+1 línea DMCA que ayer no estaba en C) · Dominio/Cloudflare 22 · Telnyx 18 · Proveedor de producción 17 (+1, Supabase viejo) · Stripe 9 · Anthropic 9 · Contador 5 · Meta 1 · SES 1 · token GitHub 1. Más 9 líneas de «otro» (teléfono/iPad tuyo 5, revisor externo 2, servicios reales en el sandbox 2). Total 181, más 3 líneas sueltas que ayer no estaban en C (12 Supabase viejo, 1279 Grupo de Google, 1630 agente DMCA) = 184.
- Hay líneas compartidas: 1150 y 1816 (SMS) también piden a Meta; 1816 también a SES; 1199 (tiendas) también al abogado; 1055, 1135 y 1175 (abogado) nombran a Anthropic, Telnyx y Meta. Cada una está contada una sola vez, en su tercero principal.
- Orden recomendado: 1 Cloudflare/dominio → 2 Telnyx (10DLC) → 3 Meta → 4 Apple/Google/Firebase → 5 abogado → 6 contador → 7 Copyright Office → 8 Stripe → 9 Amazon SES → 10 Anthropic → 11 proveedor de producción → 12 token GitHub.
- Por qué: sin dominio con HTTPS no hay passkeys, Web Push en iPhone, Wallet, enlaces de las apps, ni la tubería que entrega llaves a las tiendas (LAUNCH 26, 1247, 1334, 1368, 1386); SES y Apple lo piden (el DNS de SES lo pone Claude por Cloudflare; Apple pide un sitio web en el dominio, fase8-apps.md §10). Después van los que más tardan según el repo: 10DLC «tarda semanas» (REVISION.md:16), D-U-N-S «de días a dos semanas» (paquete.ts 8-1.1). Producción va al final porque necesita dominio, un SMS real y la revisión del abogado (fase9-apertura.md §3.9 y §6 #13: sin abogado y contador no abre).
- Plazos que trae el repo: D-U-N-S días a dos semanas; 10DLC semanas; Apple y Google «días»; Apple revisión pública «7 días» y Google 10 % → 50 % → 100 % (fase9-apertura.md §6 #19, es un supuesto del plan). Todo lo demás (Meta, SES, Stripe, Anthropic ZDR, abogado, contador, Copyright Office, Google Wallet): no lo sé.
- Precios: el repo trae solo Apple $99/año y Google $25 (una vez, DECISIONES B; PLAN §8) y el sandbox ≈ $12/mes. Todo lo demás: precio: verlo en el momento. Abogado, contador y agente DMCA no están en PLAN §8: es decisión tuya (fase9-apertura.md §6 #13).
- Al final: las 7 cosas que no pude determinar y las 9 contradicciones entre documentos.

## Dónde se guarda todo (vale para todos los bloques)

El repo ya prevé tres sitios. Nunca el chat.
- **A. Secretos del entorno de Claude.** CLAUDE.md regla 1. Hay dos clases y no son lo mismo (comprobado el 23 nov):
  - *Secreto de red* (el formulario seguro): la plataforma lo pone sola en cada llamada a ese servicio y Claude nunca ve el valor. Así está hoy el
    token del servidor de pruebas. Sirve para lo que Claude llama por API (Cloudflare, el proveedor de producción, GitHub).
  - *Variable de entorno*: Claude sí la lee. Es lo que `scripts/produccion/sellar.sh` necesita para cifrar una llave para un servidor.
  - **Hueco abierto:** las llaves que debe tener el SERVIDOR (Stripe, Telnyx, WhatsApp, SES, Anthropic) no pueden llegar por el formulario seguro,
    porque Claude no las ve y no puede sellarlas. El camino se está cerrando (REVISION, «Cómo llegan las llaves de terceros al servidor»); hasta
    entonces no guardes ninguna de esas llaves: abre las cuentas y deja las llaves para el final.
- **B. Llavero del Super Admin: Sistema › Integraciones › Llaves.** Para archivos que Apple y Google entregan al dueño de la cuenta (fase8-apps.md §10; paquete.ts 8-2). Se sube con «Subir archivo» desde la app Archivos del teléfono. Tipos que el sistema reconoce: asc_api_key, apns_key, play_service_account, fcm_service_account, github_token, pass_type_cert.
- **C. GitHub, entornos «ensayo» y «produccion».** Los pone Claude con `gh secret set` desde los secretos de su entorno (LAUNCH 1797 y 1799; sellar.sh recuperacion). Tú solo das el token en el sitio A.
- El tablero de seguimiento ya existe: Super Admin › Sistema › Apps › «Lo que te toca» (apps/web/lib/tiendas/paquete.ts, función loQueTeToca), con los pasos 8-0 a 9-5, su estado y el botón que abre la consola de cada tercero. Marca solo lo que el sistema no puede ver. Los pasos de este paquete coinciden con él; si algo difiere, manda el tablero (es código) y se anota.

---

## 1. Cloudflare y el dominio tolatino.com — Paquete 8-0 (22 líneas)

**Qué desbloquea**
- «Vercel (5 nov 2026): el fundador desconectó el repo» (l. 7)
- «Passkeys (Face ID / huella): necesitan HTTPS y un dominio» (26)
- «Paquete 8-0 (dominio) — bloqueado en el fundador» (1207)
- «Web Push en el iPhone del fundador (W, paso 1)» (1247) · «Web Push en Chromium de verdad» (1263)
- «Web sin HTTPS: el sandbox se sirve por HTTP en la IP» (1310)
- Los pases de Wallet y las llaves en el sandbox: «Solo después del Paquete 8-0» (1334, 1368), «TLLlave en las apps» (1371), «Paquete 8-0 (dominio con HTTPS): sin él la tubería no entrega» (1386), «Dar el segundo paso con la llave dentro de una sesión de SMS» (1709)
- «nat8a completo en emulador», «App-Bound Domains en iOS», «Abrir en la web desde una app en pausa», «Teselas en las capturas», «Capturas definitivas», «Face ID en las fichas», «Analítica › Apps · enlaces» (1227, 1230, 1236, 1321, 1417, 1434, 1445)
- «Cloudflare por la API» (1800) · «Una foto borrada sigue en el borde de Cloudflare» (2571) · «La foto oculta por reportes sigue en el borde» (2626) · «Límite sin cuenta: es por cookie» (725)
- Los números de línea son los de hoy (las de 1707 en adelante se movieron entre +2 y +11 desde ayer).

**Qué necesitas a mano**
- Acceso a la cuenta donde está registrado tolatino.com (el registrador). El repo no dice cuál es: por confirmar.
- Un correo para la cuenta de Cloudflare. Plan gratis (DECISIONES D).
- Un administrador de contraseñas o Face ID para firmar. Nada más lo dicen el repo.

**Pasos desde el teléfono**
1. Abre https://dash.cloudflare.com/sign-up y crea la cuenta gratis. Acepta los términos.
2. Agrega el sitio tolatino.com en el plan gratis. Cloudflare te muestra dos servidores de nombres. Déjalos abiertos (el nombre exacto del botón: por confirmar).
3. Abre la página de tu registrador de tolatino.com. Busca «servidores de nombres» (DNS/nameservers).
4. Cambia los servidores de nombres por los dos de Cloudflare. Guarda. Es el único paso fuera de Cloudflare; la lista de toques «llega con capturas» (fase8-apps.md §10), aún no existe: pídela a Claude antes de empezar.
5. Vuelve a Cloudflare y toca «Comprobar servidores de nombres».
6. Abre https://dash.cloudflare.com/profile/api-tokens y crea un token. Permisos que pide el script: Zone:DNS, Zone:Settings, Zone:WAF/Rulesets, Zone:Cache Rules y SSL:Origin CA, solo para la zona tolatino.com (scripts/produccion/cloudflare.sh:6; el plan solo dice «DNS y SSL»: ver Contradicciones nº 1).
7. Guarda el token como CLOUDFLARE_API_TOKEN en los secretos del entorno (sitio A). No lo copies al chat.

**Qué sale de ahí y dónde se guarda**
- CLOUDFLARE_API_TOKEN → sitio A (secreto del entorno de Claude Code; cloudflare.sh:6).
- CLOUDFLARE_ZONA_ID (no es secreto) → variable de entorno o del repo (cloudflare.sh:7). Si Claude puede leerlo con el token: por confirmar.
- Más adelante, ORIGEN_CERT lo crea Claude: firma la solicitud que publica la app y la sella (infra/comun/secretos.json; LAUNCH 1800).

**Qué hago yo después, solo**
- `scripts/produccion/cloudflare.sh dns | ajustes | reglas | origen` y `infra/produccion/cloudflare/reglas.json`: DNS de pruebas.tolatino.com, «Full (strict)», HTTPS siempre, WAF que no desafía a Apple/Google/Stripe, límite por IP, caché.
- `infra/pruebas/deploy.sh`: Let's Encrypt, nginx en 443, TOLATINO_URL y cookies secure (LAUNCH 1207).
- Lanzar el workflow «Tiendas» (`.github/workflows/tiendas.yml`) y verlo en Integraciones › Lecturas del CI (LAUNCH 1386).
- El paso 8-0.2 del tablero se marca solo cuando pruebas.tolatino.com contesta por HTTPS (paquete.ts).
- Desbloquea 9p (fase9-apertura.md §9p): enlaces universales, llaves en iPhone, Web Push, pase de Wallet.

**Qué puede salir mal**
- Mientras no haya HTTPS, las cuatro apps abren su página «Sin señal» y los pasos de passkeys/Web Push/Wallet no se pueden probar (LAUNCH 1207, 1310, 1334).
- Cloudflare gratis corta cuerpos en 100 MB: un .aab o dSYM mayor no pasaría (LAUNCH 1407).
- Cloudflare gratis no separa la caché por Accept: afecta a WebP (LAUNCH 2583); fotos borradas pueden seguir en el borde (2571, 2626).
- Vercel (l. 7) y Supabase viejo (l. 12) se borran solo el día que tolatino.com apunte a producción, no antes (fase9-apertura.md §6 #31).

---

## 2. Telnyx — SMS y registro 10DLC — Paquete 9-1.2 (18 líneas)

**Qué desbloquea**
- «Proveedor de SMS (decisión E/E2): cuenta en Telnyx» (23) · «Teléfono verificado del negocio» (164) · «Proveedor de SMS en producción para el código del reclamo» (179)
- «SMS de verdad: con la clave de Telnyx» (360) · «Avisos por SMS del apartado» (480) · «4ie · SMS de visitas» (579) · «6d · SMS de verdad para «Te mandaron un boleto»» (837) · «6g · SMS de verdad para «Te invitaron a la puerta»» (927) · «6i · SMS del evento privado» (967)
- «7h · Cuentas de los proveedores (el fundador, en persona)» (1150) · «7h · Hosts de salida para el sandbox» (1154) · «Respuesta de STOP de los proveedores» (1157)
- «El SMS de respaldo sale de verdad cuando haya Telnyx» (1257) · «El mensaje de texto que promete la landing» (1725)
- «El SMS crítico cuando la app está caída» (1801) · «Telnyx, Meta y SES de verdad» (1816) · «Los códigos de error permanentes de Telnyx» (1820) · «Una sola respuesta de STOP» (1822)

**Qué necesitas a mano**
- Datos de la empresa para el registro de la marca 10DLC. El repo no los lista: por confirmar. (Fase8-apps.md:713 deja pendiente «¿existe To'Latino como empresa (LLC)?»: por confirmar.)
- Tarjeta para el pago del número y del registro. Precio: verlo en el momento (DECISIONES E dice ~$0.005–0.008 por SMS; el registro y el número no tienen cifra en el repo).
- Dominio ya con HTTPS (bloque 1), porque Claude deja listos los textos y ejemplos del registro, y algunos pedirán el sitio. Por confirmar.

**Pasos desde el teléfono**
1. Abre https://portal.telnyx.com/ y crea la cuenta. Acepta los términos.
2. Compra o asigna un número para To'Latino (DECISIONES E; el repo no dice qué código de área: por confirmar).
3. Abre el registro 10DLC: marca (brand) y campaña(s). Claude te deja los textos y ejemplos en una pantalla; toca «Enviar» (fase9-apertura.md §10, Paquete 9-1.2).
4. Incluye STOP y HELP en la campaña (LAUNCH 1150).
5. En el perfil del número, apaga la respuesta automática de STOP de Telnyx, o dile a Claude que apague la nuestra (Configuración › Avisos y canales), para que salga solo una (LAUNCH 1157, 1822).
6. Crea la llave de la API de Telnyx y copia también la llave pública del webhook.
7. Guarda en los secretos del entorno (sitio A): TELNYX_API_KEY, TELNYX_PUBLIC_KEY y TELNYX_FROM (el número, no es secreto).

**Qué sale de ahí y dónde se guarda**
- TELNYX_API_KEY, TELNYX_PUBLIC_KEY, TELNYX_FROM → sitio A. Claude los sella para el servidor (infra/comun/secretos.json, origen «sellado»). Para producción hace falta el mismo juego en el entorno de producción (LAUNCH 360).
- TOLATINO_SMS_MODO=telnyx lo pone Claude (apps/web/lib/entorno.ts; paquete.ts `proveedor("telnyx")`).
- Dirección de salida a abrir en el sandbox: api.telnyx.com (LAUNCH 1154; hace la edición del entorno el propio Claude con tu OK).

**Qué hago yo después, solo**
- `apps/web/lib/sms` (sms_outbox con reintentos) y `apps/web/lib/avisos.ts`: los avisos salen solos con la llave.
- Webhook de Telnyx: `apps/web/app/api/compa/entrada/[proveedor]/route.ts` (con firma).
- Probar una vez cada camino con un teléfono real, confirmar los códigos de error permanentes 40300/40310/40311 y el costo por SMS (LAUNCH 1816, 1820).
- Poner `compa.channel.sms` en pausa en producción (LAUNCH 1155; fase9 §6 #33).
- Guion de contrato: `scripts/contrato-canales/correr.sh`.
- El paso 9-1.2 del tablero se marca solo cuando la llave real llega (paquete.ts `proveedor`).

**Qué puede salir mal**
- Sin proveedor, producción responde «Los mensajes de texto todavía no están disponibles. Usa un documento» (LAUNCH 179) y el código de entrada no llega.
- Telnyx y Meta pueden mandar su propia respuesta de STOP, duplicada con la nuestra (1157).
- Si falla el SMS crítico con la app caída, no hay plan: ese camino no se construyó (1801).

---

## 3. Meta — WhatsApp Business — Paquete 9-1.3 (1 línea propia; 1150 y 1816 son compartidas)

**Qué desbloquea**
- «Mandar las 8 plantillas de WhatsApp a Meta con la cuenta real» (1819)
- Compartidas: «7h · Cuentas de los proveedores» (1150), «Telnyx, Meta y SES de verdad» (1816), «7h · Fase 9: WhatsApp encendido» (1155).

**Qué necesitas a mano**
- Un número para WhatsApp Business y datos de la empresa para verificarla. El repo no lista documentos: por confirmar.
- Tarjeta/facturación de Meta: por confirmar. Precio: verlo en el momento.

**Pasos desde el teléfono**
1. Abre https://business.facebook.com/ y entra con tu cuenta (o crea el portafolio de negocio).
2. Verifica la empresa (lo que pida Meta; el repo no detalla).
3. Crea la cuenta de WhatsApp Business (WABA) y registra el número.
4. Crea la app en Meta y genera el token permanente.
5. Guarda en los secretos del entorno (sitio A): WHATSAPP_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN (lo inventas tú o lo propone Claude; el repo no lo dice: por confirmar) y WHATSAPP_WABA_ID (no es secreto).
6. No mandes las plantillas tú: las manda Claude por la API (fase9-apertura.md §10).

**Qué sale de ahí y dónde se guarda**
- WHATSAPP_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN, WHATSAPP_WABA_ID → sitio A, sellados por Claude (infra/comun/secretos.json).
- Dirección de salida: graph.facebook.com (LAUNCH 1154).

**Qué hago yo después, solo**
- `apps/web/lib/compa/canales-proveedor.ts` y el webhook GET/POST en `apps/web/app/api/compa/entrada/[proveedor]/route.ts` (el GET resuelve el reto de verificación, `retoWhatsApp`).
- Super Admin › Notificaciones › Plantillas de WhatsApp: mandar las 8 a Meta y corregir las que rechace (LAUNCH 1819).
- Reporte diario por WhatsApp cuando Meta apruebe la plantilla (fase9 §6 #30).

**Qué puede salir mal**
- Meta puede rechazar plantillas (1819). Plazo de verificación y de aprobación: no lo sé.
- Respuesta de STOP duplicada (1157, 1822).
- El tablero no ve esta llave: este paso lo marcas tú (paquete.ts, comentario de `proveedor`).

---

## 4. Apple, Google y Firebase — Paquetes 8-1, 8-2, 8-3 (53 líneas + 1 decisión)

**Qué desbloquea (53 líneas, agrupadas)**
- Cuentas y llaves: «Paquete 8-2 (llaves): subir en Integraciones la llave de la API» (1389) · «La llave de subida de Android la crea el primer job» (1393) · «La huella de la firma de Google» (1401) · «La configuración de Firebase de la app» (1403) · «Certificado del Pass Type ID» (1338, 1341) · «Cuenta de emisor de Google Wallet» (1347) · «Arte oficial de los botones» (1350)
- Primeros builds reales: «TestFlight interno de verdad» (1274) · «Retroalimentación de TestFlight a Soporte» (1277) · «APK propio de verdad» (1281) · «Primer TestFlight real en el iPhone del fundador» (1396) · «APNs y FCM de verdad» (1249) · «Firebase en la cáscara de Android» (1252) · «iOS: aps-environment» (1255) · «Símbolos nativos» (1284, 1399) · «Compilar lo nativo de 8f» (1287) · «XCUITest de iOS más hondo» (1553)
- Declaraciones y fichas: «Privacidad en las tiendas: declarar Crash data» (1290) · «Ubicación precisa» (1327) · «Apple App Privacy no está en la API» (1426) · «Clasificación por edad de Apple» (1427) · «Subir las fichas de verdad» (1415) · «Tamaños de captura» (1422) · «Capturas de iPhone en el simulador real» (1420) · «Novedades de Google» (1439)
- Dispositivo real: «La ruta en un teléfono real» (1307) · «El aviso fijo en Android 13+» (1312) · «Linterna en iPhone» (1314) · «Fijar la pantalla en Android real» (1316) · «Humo de iOS más hondo» (1225) · «Presupuesto de velocidad de las apps» (1243) · «Ritmo: un escaneo en la puerta» (1363) · «6h · Safari borra lo guardado» (939) · «6h · Velocidad con la base de carga» (944)
- Envío: «Build de producción apuntando a tolatino.com» (1198) · «Cuentas de revisión en producción» (1199) · «Ninguna pantalla Pronto alcanzable» (1200) · «Enviar a revisión y lanzamiento por fases» (1201) · «Apple Pay / Google Pay nativos» (1202) · «El día del envío: revisar de nuevo las reglas» (1204) · «Fase 9: encender app.tiendas.publico» (1411) · «Cuentas de revisión de producción» (1429) · «Puerta de revisión» (1432) · «Smart App Banner de iOS» (1756)
- Otras: «App de tienda (Capacitor) To'Latino Repartidor» (390), «5e · Aviso Hoy en un negocio que sigues» (676), «El JS de Capacitor en el origen local de Android» (1217), «La red en la WebView» (1219), «Islas más livianas» (1232), «Cloudflare corta los cuerpos en 100 MB» (1407), «Dentro de la app iOS: el botón abre el .pkpass» (1357).
- Suelta (no estaba en C ayer): «Play interno: la API no acepta correos (solo Grupos de Google)» (1279): decisión tuya.

**Qué necesitas a mano**
- Empresa y D-U-N-S. El repo no confirma que exista: «Pendiente saber: ¿existe To'Latino como empresa (LLC) y su D-U-N-S?» (fase8-apps.md:713). Por confirmar antes de empezar. Si no existe, el plan dice «se dice y se espera; mientras, simuladores, emuladores y APK propio».
- Un Apple ID con dos factores y el sitio web de la empresa en el dominio (la página de acceso anticipado, fase8 §6 #26).
- Un documento de identidad (foto desde el teléfono) para Google, y teléfono y correo de contacto verificados (paquete.ts 8-1.3).
- Pagos: Apple $99/año (con Apple Pay) y Google $25 una vez (DECISIONES B). No hace falta contrato de apps pagadas, datos fiscales ni banco en ninguna tienda (fase8-apps.md §10).
- La lista de «apps» a crear: 4 (To'Latino, Negocios, Repartidor, Puerta) con los ID que Claude ya te muestra.

**Pasos desde el teléfono**
Paquete 8-1 (cuentas; empiezan primero porque tardan):
1. Abre https://developer.apple.com/enroll/duns-lookup/ y busca el D-U-N-S de la empresa. Si no tiene, pídelo (gratis; de días a dos semanas).
2. Instala la app «Apple Developer» en el iPhone. Inscríbete como organización: datos de la empresa, D-U-N-S, sitio web, pago de $99 con Apple Pay. Apple puede llamar para verificar: contesta (https://developer.apple.com/programs/enroll/).
3. Abre https://play.google.com/console/signup. Elige cuenta de organización. Paga $25, pon el D-U-N-S, sube foto de tu documento y verifica teléfono y correo. Haz la verificación de desarrollador de Android que Google pida ese día (por confirmar).
4. Abre https://console.firebase.google.com/. Crea el proyecto «tolatino» y acepta los términos.

Paquete 8-2 (cuando Apple y Google aprueben; unos 15 minutos según el repo):
5. App Store Connect › Usuarios y acceso › Integraciones: genera la llave de la API con rol Admin y descárgala. Súbela en Super Admin › Sistema › Integraciones › Llaves (sitio B). Anota también el Issuer ID.
6. https://developer.apple.com/account/resources/authkeys/list: crea la llave de APNs, descárgala y súbela (sitio B).
7. https://appstoreconnect.apple.com/apps: toca «Nueva app» cuatro veces. Nombre, idioma Español (México) y el ID que ya aparece en la lista. (fase8 §10 dice «a verificar si la API ya lo permite»: si Claude puede, lo hace él.)
8. Firebase › Configuración › Cuentas de servicio › Generar llave privada. Súbela (sitio B).
9. https://play.google.com/console/: «Crear app» cuatro veces (nombre, idioma, gratis, aceptar declaraciones).
10. Play Console › Usuarios y permisos: invita el correo de la cuenta de servicio con permiso de publicar en las cuatro apps. El tablero muestra ese correo para copiarlo; es el único dato que se escribe a mano (paquete.ts 8-2.6).
11. Play Console › Prueba interna: pon la lista de testers con tu correo y los de las personas de confianza. Si prefieres un Grupo de Google (LAUNCH 1279), dilo.
12. Token de GitHub para «Pedir un build»: https://github.com/settings/personal-access-tokens/new, de grano fino, solo este repositorio, permiso «Actions: write», vence como máximo en un año. Anota el vencimiento. Súbelo (sitio B, tipo github_token).
13. Opcional, Wallet: crea el Pass Type ID `pass.com.tolatino.boletos` en https://developer.apple.com/account/resources/identifiers/list/passTypeId, genera la solicitud en Super Admin › Sistema › Integraciones › Wallet, súbela a Apple, baja el .cer y súbelo ahí (LAUNCH 1338). Para Google Wallet: crea la cuenta de emisor en Google Pay & Wallet Console y sube la cuenta de servicio con el ID del emisor en Integraciones › Llaves (1347). Sin esto solo sale Apple, y sin ninguno el boleto no entra a Wallet.

Paquete 8-3 (declaraciones; con la pantalla lado a lado de Sistema › Apps › Declaraciones):
14. Apple: «Privacidad de la app» de las cuatro (las respuestas salen del inventario). No está en la API (LAUNCH 1426).
15. Google, por app: Seguridad de los datos (importar el CSV que genera Claude o tocar las mismas respuestas), clasificación de contenido (IARC), público objetivo 18+, anuncios no, noticias/gobierno no, finanzas y salud con lo que salga del inventario, servicio en primer plano de ubicación del Repartidor (texto y video que genera Claude), URL de privacidad (/privacidad) y de borrar la cuenta (/cuenta/ajustes/borrar).
16. Aceptar las licencias de marketing de Apple Wallet y Google Wallet para el arte oficial de los botones (fase9 §10, 8-1…8-3; LAUNCH 1350).

**Qué sale de ahí y dónde se guarda**
- Archivos y llaves → sitio B (Super Admin › Sistema › Integraciones › Llaves): asc_api_key (con Issuer ID), apns_key, play_service_account, fcm_service_account, github_token, pass_type_cert, emisor de Google Wallet. Los guarda cifrados el servidor (store_secrets; apps/web/lib/tiendas/llavero.ts).
- La llave de subida de Android la crea el primer job del CI y se guarda en el llavero si no existe (LAUNCH 1393, aún sin construir el pedido OIDC).
- Para producción hace falta APNs y proyecto de Firebase aparte de los del sandbox (decisión M; LAUNCH 1198).

**Qué hago yo después, solo**
- `.github/workflows/tiendas.yml`: build firmado, TestFlight interno, .aab a Play interno, registro en app_builds, símbolos; el tablero (`apps/web/lib/tiendas/paquete.ts`) comprueba que las 4 apps existan en App Store Connect (`appsEnAsc`).
- `scripts/tiendas/` y simuladores `scripts/tiendas-sim`, `scripts/contrato-tiendas`, `scripts/push-sim`, `scripts/contrato-push`, `scripts/contrato-wallet`.
- Fichas y capturas: `apps/mobile/tiendas/fichas.json`, `capturas.json`, `declaraciones.json`; Sistema › Apps › Fichas y revisión › Subir como borrador (LAUNCH 1415); job «capturas» de tiendas.yml con `capturas=si`.
- Data safety por la API de Google la sube Claude con tu OK (fase9 §6 #29); la clasificación por edad de Apple sale de declaraciones.json (1427).
- Con producción: `app.tiendas.publico`, rama produccion, envío a revisión (LAUNCH 1411, 1201) con tu OK-2.
- Las cuentas de revisión de producción las crea Claude a mano con tu OK (1429).

**Qué puede salir mal**
- Apple puede llamar para verificar la organización (fase8 §10).
- Si no hay empresa o D-U-N-S, la cuenta personal de Google exige prueba cerrada de 12 personas por 14 días; la de organización no (fase8-apps.md:711).
- Android: «Fijar apps» apagado, Doze con la pantalla apagada y Android 13+ sin permiso de avisos pueden romper la ruta del Repartidor (1307, 1312, 1316).
- Safari puede borrar lo guardado de la web si no se abre en 7 días (939).
- Reglas de EE. UU. sobre enlaces a compras externas: revisarlas el día del envío (1204, 1437).
- Google Wallet deja las clases «UNDER_REVIEW» hasta que Google las apruebe: plazo no lo sé (1347).

---

## 5. Abogado de Pennsylvania — Paquete 9-2.1 y 9-2.3 (36 líneas)

**Qué desbloquea**
- Textos legales: «El texto final de las 14 páginas de docs/legal/» (1625) · «Dónde más se anota la aceptación» (1632) · «Abogado: aviso de IA en Términos y Privacidad» (1055) · «7f · Para el abogado: respuestas automáticas» (1116) · «7g · Para el abogado y Privacidad» (1135) · «7h · Para el abogado: TCPA / 10DLC» (1175)
- Comunidad y fotos: «5a · Comunidad, abogado (§3): Sección 230» (613) · «5c · Revisión de seguridad con abogado: 18+» (649) · «5d · Abogado: Sección 230 y DMCA §512» (651) · «5d · Licencia del modelo de fotos» (654) · «5d · NCMEC» (667) · «5g · Abogado: monedas sin valor y cupones» (704) · «5h · Abogado: LibreTranslate es AGPL-3.0» (720)
- Eventos y dinero: «6c · Abogado: ley de reventa» (822) · «6d · Abogado: política de cancelación» (858) · «6e · Abogado: To'Latino como comerciante del cobro» (878) · «6i · Términos y políticas» (969) · «Layaway (4r)» (521) · «Pro · cobrar en la app (4l)» (501)
- Sectores: «Ley HIC de PA» (445) · «Salud · HIPAA» (502) · «Noche · licencia de licor» (528) · «Niños · ChildLine» (535) · «Cuidado de niños · protocolo» (541) · «4ia · Iglesias · sellos y ley» (544) · «4ib · Vivienda justa» (547) · «4ib · Depósitos en PA» (550) · «4ib · Cuota estimada» (552) · «4ib · Licencias de Bienes Raíces» (554) · «4ic · Tope del cargo del dealer» (557) · «4ic · Buyers Guide» (561) · «4ic · Regulation Z» (563) · «4ic · Licencias de Venta de Autos» (568) · «4id · Pie de vivienda justa» (575) · «4ie · Prueba de manejo en casa» (582) · «4ig · Colas › Vivienda justa» (606)

**Qué necesitas a mano**
- Presupuesto: abogado, contador y agente DMCA están fuera de PLAN §8; es decisión tuya (fase9 §6 #13). No hay cifra en el repo: precio: verlo en el momento.
- Un abogado de Pennsylvania (el default es uno solo para todo el paquete: una consulta con la lista generada).
- El documento `docs/legal/para-el-abogado.md`: HOY NO EXISTE. Lo arma Claude en el bloque 9s; no se lo puedes mandar todavía (ver Contradicciones nº 6).

**Pasos desde el teléfono**
1. Dile a Claude: «arma para-el-abogado.md». Cuando esté, te llega con cada pregunta ligada a su línea de LAUNCH.
2. Elige y contrata a un abogado de Pennsylvania. El repo no recomienda ninguno: por confirmar.
3. Reenvíale el documento desde el teléfono (correo o mensaje).
4. Cuando conteste, reenvíale a Claude su respuesta como documento (no la copies al chat; adjúntala). Claude la aplica.
5. Aprueba (con tu OK en el chat) la publicación de los textos revisados.

**Qué sale de ahí y dónde se guarda**
- Respuestas del abogado: documento recibido; Claude lo aplica a `docs/legal/` (archivos es/en bajo `docs/legal/us/` y `docs/legal/us-pa/`) y las `LegalPage` versionadas. El guardián `legalRevisado` impide publicar en producción sin esa revisión (fase9 §9s y §6 #11).
- No hay secretos.

**Qué hago yo después, solo**
- Escribir `docs/legal/para-el-abogado.md` agrupando cada línea con su pregunta (fase9-apertura.md:742, 9s) y aplicar sus respuestas.
- Cambiar las constantes y los textos señalados (por ejemplo `lib/vivienda-justa.ts`, `lib/inmuebles.ts`, `platform_config.dealer_doc_fee_cap_cents`) cuando el abogado conteste.
- Ayuda de El Compa en `docs/ayuda/`: ES/EN de cada cambio (CLAUDE.md regla 9).

**Qué puede salir mal**
- Sin su revisión no se abre (guardián `legalRevisado`).
- Hay textos con huecos «[pendiente: …]» (nombre del agente DMCA, etc., dmca.es.md).
- Plazo de respuesta de un abogado: no lo sé.
- Si el modelo de fotos (NudeNet, pesos entrenados con YOLOv8) resulta AGPL, hay que cambiar de modelo antes de producción (654; HERRAMIENTAS «Por agregar», 7 nov).

---

## 6. Contador — Paquete 9-2.2 (5 líneas)

**Qué desbloquea**
- «Recibo por correo de cada cobro de Pro e impuesto» (405)
- «Impuesto de Auto y Hogar (validar con contador)» (442)
- «Validar con el contador: impuesto de PA solo sobre piezas/materiales» (458)
- «6i · Impuesto de la comida preparada (6 % PA)» (961)
- «El impuesto de cada ciudad lo confirma el contador» (1787)

**Qué necesitas a mano**
- Presupuesto (fuera de PLAN §8; precio: verlo en el momento).
- Nada más lo dice el repo: por confirmar.

**Pasos desde el teléfono**
1. Dile a Claude: «arma para-el-contador.md». Hoy no existe.
2. Elige y contrata a un contador. El repo no recomienda ninguno.
3. Reenvíale el documento desde el teléfono.
4. Cuando conteste, reenvía la respuesta como documento.

**Qué sale de ahí y dónde se guarda**
- Sus respuestas como documento. Las cifras (impuesto por ciudad y categoría) van a datos: `tax_rules` y Super Admin › Ciudades (LAUNCH 1787: «Ciudades deja cambiarlo, con motivo»).
- No hay secretos.

**Qué hago yo después, solo**
- Dejar la regla en datos por ciudad y categoría (bloque 4d; LAUNCH 442) y cambiar la tasa en Ciudades.
- Aplicar «recibo por correo» con impuesto si aplica (405).

**Qué puede salir mal**
- Hoy las cinco ciudades nacen en 6 % (PA, migración 0005) y todo el subtotal de comida paga impuesto (961).
- En PA la mano de obra de reparación de vehículos suele ser gravable y en mejoras a inmuebles el contratista paga el impuesto de los materiales (442): la regla actual puede estar mal.
- Plazo: no lo sé.

---

## 7. Copyright Office — agente DMCA — Paquete 9-2.4 (1 línea que ayer no estaba en C)

**Qué desbloquea**
- «Agente designado DMCA registrado en la Copyright Office (tiene costo)» (1630) y, en parte, 651 y la página /dmca (docs/legal/us/dmca.es.md, hoy con el hueco «[pendiente: el agente designado…]»).

**Qué necesitas a mano**
- Nombre, dirección y correo del agente (el repo no dice quién: por confirmar; pedirlo al abogado). Tarjeta para el pago: precio: verlo en el momento.

**Pasos desde el teléfono**
1. Abre https://dmca.copyright.gov/.
2. Registra el agente designado de To'Latino con el formulario en línea.
3. Paga la tarifa.
4. Dile a Claude el nombre y el correo del agente que quedó registrado (no son secretos).

**Qué sale de ahí y dónde se guarda**
- Nombre y correo del agente → texto de `docs/legal/us/dmca.*.md` y la página /dmca. No hay secretos.

**Qué hago yo después, solo**
- Reemplazar el hueco «[pendiente: …]» en dmca.es.md y dmca.en.md y quitar el «mientras no esté registrado, escríbenos en Soporte».

**Qué puede salir mal**
- No hay cola propia de avisos DMCA: el equipo oculta con las herramientas de moderación de siempre (LAUNCH 1630).
- Plazo y vigencia del registro: no lo sé.

---

## 8. Stripe — Paquete 9-1.1 (9 líneas)

**Qué desbloquea**
- «Cuenta de Stripe (modo prueba y luego real) + Connect Express» (375)
- «6e · Costo de la tarjeta absorbido» (873) · «6e · Payouts de Stripe al banco del organizador» (875) · «6i · El depósito llega directo al restaurante» (964)
- «Pagar la recompensa del promotor a la Wallet» (1734) · «Rentas: 3-D Secure al recogerlas» (1762)
- «El webhook de Stripe de verdad» (1768) · «La conciliación y 3-D Secure con Stripe de verdad» (1771) · «0175 (devoluciones, 3-D Secure, pausa) en la corrida completa» (1944)

**Qué necesitas a mano**
- Datos de la empresa y del dueño para la verificación; cuenta bancaria de la plataforma (fase9 §10, 9-1.1). El repo no lista documentos concretos: por confirmar.
- Precio de Stripe: verlo en el momento (el repo solo dice «Radar incluido», HERRAMIENTAS #9).

**Pasos desde el teléfono**
1. Abre https://dashboard.stripe.com/register y crea la cuenta de la empresa.
2. Verifica el negocio y al dueño (lo que Stripe pida).
3. Agrega el banco de la plataforma.
4. Activa Connect: perfil de plataforma de mercado, cuentas Express.
5. En MODO PRUEBA, copia las tres llaves: secreta, publicable y el secreto del webhook. Guárdalas en los secretos del entorno (sitio A) con estos nombres: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET.
6. Cuando Claude te lo diga, repite lo mismo en MODO EN VIVO para producción (otro juego de las tres llaves).
7. El endpoint del webhook es `/api/stripe/webhook` (apps/web/app/api/stripe/webhook/route.ts). Quién lo crea en el panel de Stripe: por confirmar. La lista de eventos y el calendario de pagos al banco (martes) están en LAUNCH 375 y 1768.

**Qué sale de ahí y dónde se guarda**
- STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET → sitio A; Claude las sella para el servidor (infra/comun/secretos.json). Un juego para pruebas y otro para producción.
- Sin clave, el sandbox usa el simulador; producción deja la tarjeta apagada (candado + guardián `simuladorAislado`, LAUNCH 375).

**Qué hago yo después, solo**
- `scripts/contrato-stripe/` (prueba de contrato contra Stripe real), la conciliación diaria y 3-D Secure (tarjeta de prueba 4000 0027 6000 3184; LAUNCH 1771).
- Fijar el calendario de pagos de las cuentas conectadas (martes) y confirmar que no atrasa una semana (875, 1768).
- Revisar el saldo negativo de cuentas conectadas (964).
- Marcado automático del paso 9-1.1 del tablero cuando la llave real llega (`proveedor("stripe")`).

**Qué puede salir mal**
- Si el restaurante cancela y su saldo en Stripe no alcanza, la devolución depende de Stripe (964); cae en la alerta «devolución atascada».
- Rentas: si el banco pide 3-D Secure al recoger, hoy se le pide cambiar la tarjeta (1762).
- La verificación de la empresa o del dueño: plazo no lo sé.

---

## 9. Amazon SES — Paquete 9-1.4 (1 línea propia; 1816 compartida)

**Qué desbloquea**
- «Correo (2q) · para encender en producción: cuenta de Amazon SES» (428)
- Compartida: «Telnyx, Meta y SES de verdad» (1816).

**Qué necesitas a mano**
- Una cuenta de Amazon (AWS) y tarjeta. Precio: verlo en el momento.
- Dominio ya en Cloudflare (bloque 1): el DNS lo pone Claude.
- La dirección que enviará los recibos (ejemplo del repo: recibos@tolatino.com) y la dirección de Soporte para el correo entrante.

**Pasos desde el teléfono**
1. Abre https://console.aws.amazon.com/ses/ y crea la cuenta de AWS.
2. Pide salir del «sandbox» de SES. El formulario pide describir el uso: Claude te deja el texto listo para pegarlo en ese formulario de AWS (es el único pegado, y es un texto no secreto).
3. Crea una llave de acceso (access key) para SES.
4. Guarda en los secretos del entorno (sitio A): SES_ACCESS_KEY_ID y SES_SECRET_ACCESS_KEY.
5. Dile a Claude la región y la dirección de envío. No son secretos.

**Qué sale de ahí y dónde se guarda**
- SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY → sitio A, sellados.
- No secretos: SES_REGION, CORREO_DE (p. ej. recibos@tolatino.com), TOLATINO_URL, CORREO_SNS_TEMA → config/variables (infra/comun/secretos.json: «config» o «sellado»).

**Qué hago yo después, solo**
- DNS de verificación, DKIM, SPF y DMARC por Cloudflare (`scripts/produccion/cloudflare.sh dns`).
- Tema de SNS suscrito a `/api/correo/entrada` (`apps/web/app/api/correo/entrada`) y regla de recepción de SES con la dirección de Soporte; rebotes y quejas por `/api/correo/baja` (LAUNCH 428, 1816).
- Probar una vez el camino con un correo real (1816). Hay `scripts/prueba-firma-ses/`.

**Qué puede salir mal**
- Mientras SES siga en sandbox, solo manda a direcciones verificadas. Plazo de AWS para salir del sandbox: no lo sé.
- El reloj de reintentos es perezoso (al usar la app) hasta que se construya uno propio (428).

---

## 10. Anthropic — cuenta, facturación y retención cero — Paquete 9-1.5 (9 líneas)

**Qué desbloquea**
- «Cuenta de Anthropic (el fundador, en persona: términos y facturación)» (1043)
- «Retención cero (ZDR) pedida a Anthropic para la cuenta de producción» (1046)
- «Primera llamada real con la llave en el sandbox» (1047) · «Batería del modelo real (≥ 150 preguntas ES/EN)» (1049) · «7e · Calidad con el modelo real» (1087) · «7f · Calidad con el modelo real» (1105) · «7g · Calidad del copiloto con el modelo real (Sonnet)» (1120) · «7i · Batería del modelo real» (1186)
- «Publica tu negocio — lo que falta (bloque 1g-2)»: parte (4) «Tómale foto a tu lista: El Compa la lee» y (8) precios reales (49)

**Qué necesitas a mano**
- Tarjeta para la facturación. Precio: verlo en el momento (el repo fija un TOPE de gasto mensual desde Super Admin › ADM-COMPA, DECISIONES F; el valor del tope: por confirmar).
- Decidir si «El Compa» corre en el sandbox con una llave de pruebas aparte de la de producción: por confirmar.

**Pasos desde el teléfono**
1. Abre https://console.anthropic.com/ y crea la cuenta. Acepta los términos y activa la facturación.
2. Crea una llave de API para pruebas y otra para producción.
3. Guarda cada una como variable de entorno ANTHROPIC_API_KEY en los ajustes del entorno que corresponda (sitio A): para esta clave no sirve «Network secrets»; solo la variable de entorno (la plataforma lo dice así). Cualquiera que use ese entorno puede leerla: decide si es aceptable.
4. Escribe a Anthropic (o usa el formulario de tu cuenta) para pedir retención cero (ZDR) en la cuenta de producción. Si te la niegan, dile a Claude: se anota en Privacidad (`privacidad-de-el-compa`, LAUNCH 1046).

**Qué sale de ahí y dónde se guarda**
- ANTHROPIC_API_KEY → sitio A como variable de entorno (infra/comun/secretos.json, origen «sellado»); Claude la sella para cada servidor.
- TOLATINO_COMPA=encendido lo pone Claude en producción solo con tu OK-1 (LAUNCH 1051). `TOLATINO_COMPA_MOTOR` es una variable prohibida en producción (simulador).

**Qué hago yo después, solo**
- Primera llamada real con la llave: formato de respuesta, `stop_reason`, `usage`, p95 ≤ 4 s y costo por turno (`apps/web/lib/compa/modelo-claude.ts`, LAUNCH 1047).
- La batería de ≥ 150 preguntas con meta ≥ 95 %: LAUNCH la cita en `scripts/compa/bateria/`, pero ese directorio NO existe hoy en el repo (ver Contradicciones nº 7). Habría que construirla (Sonnet) antes de poder correrla.
- Medir el presupuesto de velocidad con la base de carga (`compa-1m`, 1186).

**Qué puede salir mal**
- Sin llave de Anthropic no corre nada de 7a–7i con el modelo real (1186).
- La batería gasta dinero: va dentro del tope (1049).
- Si no dan ZDR, hay que decirlo en Privacidad (1046).
- Plazo para la ZDR: no lo sé.

---

## 11. Proveedor de producción — Paquete 9-3 (17 líneas + 1 Supabase)

**Qué desbloquea**
- «Servidor de producción en Hetzner: no se enciende hasta aprobarlo» (14) · «Código de arranque del primer Admin» (39)
- «Fotos privadas de ayuda: confirmar en el servidor real que Garage borra el objeto» (511) · «5d · Imagen del servicio de fotos sin construir aquí» (658) · «5b · Velocidad del hilo con 1 M publicaciones» (630)
- «Encender en producción (fase 9): TOLATINO_COMPA=encendido» (1051) · «7h · Fase 9: WhatsApp encendido y SMS apagado» (1155)
- «Vuelta atrás por «Errores en vivo»» (1294) · «Mapas de fuente y CPU» (1302) · «Ritmo y carga: guardar una posición ≤ 30 ms» (1318) · «Lo de una sola vuelta varía en el runner de GitHub» (1561)
- «El ensayo completo en máquinas desechables NO corrió» (1797) · «Lo que producción necesita del fundador para nacer» (1799) · «Reconstruir la base o la réplica en máquinas» (1802) · «Vía urgente (DECISIONES AE)» (1804)
- «Direcciones de todo EE. UU. en producción» (1836) · «Mapa base de todo EE. UU.» (1840)
- Suelta: «Supabase viejo: borrar los dos proyectos de la v1» (12) y, ya contada en el bloque 1, «Vercel».

**Qué necesitas a mano**
- Tarjeta para el proveedor. Hetzner por defecto; DECISIONES C2 dice que el día de encender se elige el más barato entre Hetzner Ashburn, DigitalOcean (NY) y Vultr (NJ) y que el empate es Hetzner (fase9 §6 #2). El precio de ese día: verlo en el momento.
- Una decisión tuya sobre los respaldos: Hetzner no tiene almacén de objetos en EE. UU.; elegir otra región del mismo proveedor en la UE u otro proveedor S3 en EE. UU. (LAUNCH 1799; REVISION 9o).
- Un correo y un teléfono para alertas críticas y reporte diario (paquete.ts 9-3.3).
- Haber terminado el bloque 1 (dominio) y, al menos, Telnyx (para el código de entrada) y la revisión legal (fase9 §9t).

**Pasos desde el teléfono**
1. Dime qué proveedor (Hetzner Ashburn, DigitalOcean NY o Vultr NJ) o di «el más barato ese día». Claude te da los precios del día.
2. Abre https://console.hetzner.cloud/ (o el que elijas) y crea el proyecto «tolatino-real», aparte del de pruebas, con forma de pago.
3. Crea un token de API del proyecto con permisos de lectura y escritura.
4. Guárdalo como HCLOUD_TOKEN_PRODUCCION en los secretos del entorno (sitio A). Claude lo pasa al entorno de GitHub «produccion» (con aprobación tuya) con `gh secret set` (LAUNCH 1799).
5. Dime el correo y el teléfono de las alertas (no son secretos).
6. Decide dónde van los respaldos (ver arriba). Si el proveedor lo permite, Claude crea el almacén con el mismo token; si no, te pido un toque.
7. Cuando tolatino.com ya apunte a producción: borra el proyecto de Vercel y los dos proyectos de Supabase de la v1 (dos toques cada uno; LAUNCH 7 y 12; https://vercel.com/dashboard).

**Qué sale de ahí y dónde se guarda**
- HCLOUD_TOKEN_PRODUCCION → sitio A y entorno de GitHub «produccion» (sitio C). (El de pruebas, HCLOUD_TOKEN, ya está en los secretos del entorno, solo para pruebas: CLAUDE.md.)
- RESPALDO_S3_KEY_ID y RESPALDO_S3_SECRET (almacén de respaldos) → «sellado», sitio A (infra/comun/secretos.json).
- ALERTA_CORREO, ALERTA_SMTP_USUARIO, ALERTA_SMTP_CLAVE (alertas desde la réplica) → «sellado», sitio A; el correo de destino no es secreto.
- TOLATINO_DOMINIO_PRODUCCION (variable del repo, no secreto) para el testigo (LAUNCH 1799; `.github/workflows/testigo.yml`).
- Las llaves de recuperación las crea Claude (`sellar.sh recuperacion produccion`); la privada va al entorno de GitHub, nunca a ti.

**Qué hago yo después, solo**
- `scripts/produccion/hetzner.sh`, `maquinas.sh`, `firewall.sh`, `ensayo.sh`, `reconstruir.sh`, `promover.sh`; `infra/produccion/deploy.sh` y los compose (`compose-app.yml`, `compose-base.yml`, `compose-replica.yml`); `.github/workflows/ensayo.yml`, `reconstruir.yml`, `testigo.yml`.
- El ensayo completo en máquinas desechables (primer despliegue, vuelta atrás, PITR, RPO/RTO, Garage borra) con su cifra en `docs/incidentes/simulacros.md` (1797).
- Carga de direcciones y mapa de EE. UU. (1836, 1840: ≈ 20 GB y ≥ 32 GB de RAM, 1–2 h).
- Producción no se enciende hasta tu OK-1: `scripts/produccion/promover.sh COMMIT "frase del OK" "fecha"` (cabecera del script).
- Código de arranque nuevo del primer Admin (39).

**Qué puede salir mal**
- El ensayo en máquinas desechables cobra centavos y no ha corrido (1797). La base y la réplica se ensayan sobre producción en acceso anticipado, antes del OK-3 (1802).
- Un sobre cifrado para otro servidor no abre: se dice en /estado/sobres.txt (infra/comun/sellado.sh).
- Si sube el mapa a EE. UU. completo, la máquina necesita ≥ 32 GB de RAM (1840).

---

## 12. GitHub — token con permiso de administración (1 línea)

**Qué desbloquea**
- «El entorno «tiendas» de GitHub: hoy lo creó GitHub al primer uso, sin reglas» (1405): ponerle «solo la rama pruebas» (y produccion en la Fase 9).

**Qué necesitas a mano**
- Nada más que tu cuenta de GitHub, que ya es la dueña del repo.

**Pasos desde el teléfono**
1. Abre https://github.com/settings/personal-access-tokens/new.
2. Crea un token de grano fino solo para este repositorio con permiso de administración (el repo no dice el nombre exacto del permiso: por confirmar). Pon vencimiento corto.
3. Guárdalo en los secretos del entorno (sitio A). El nombre de la variable no está en el repo: por confirmar con Claude antes de crearlo.

**Qué sale de ahí y dónde se guarda**
- Un token de administración → sitio A (secreto del entorno). No va al llavero del Super Admin: ese guarda el otro token (github_token, solo Actions: write) del bloque 4.

**Qué hago yo después, solo**
- Poner las reglas del entorno «tiendas» por la API de GitHub (1405) y luego borrar la parte que ya no se use.

**Qué puede salir mal**
- Hay que no mezclarlo con el token de «Pedir un build», que es otro y de menor poder (1389).

---

## Lo que no es de un tercero, pero también espera por ti (para no olvidarlo)

- Paquete 9-4: «Plantillas del estimado para producción» (450), «Foto de portada del muro» (622), «Revisar las listas de términos» (656), «Foto propia de la cuenta oficial por ciudad» (683), «El equipo local de cada ciudad» (1783; Reading tiene a Raúl de ficción; las otras tres, nadie).
- Los tres OK, en el chat, con fecha: OK-1 enciende producción (con «Encender la landing en producción», 1754), OK-2 apps a revisión y beta de Hazleton (1789), OK-3 abre las cinco ciudades (1792). Los escribe Claude en `deploy_releases.founder_ok_ref`.
- Tu teléfono y tu iPad, sin tercero: «QR sin señal» (807), «Cámara en teléfonos reales» (912), «Teléfonos de verdad sin señal» (936), «dir9m en el iPad» (1961), «La foto que llega vacía desde WebKit» (1985). Los cuatro primeros dependen de Apple/Google (bloque 4) para instalar la app; los cinco los haces tú, uno por uno, con REVISION.md.
- Revisores externos: «La lista de términos de PRIVADO» la revisa alguien de salud (509); «Los barrios y los pueblos de Allentown, Wilkes-Barre, Scranton y Reading» los confirma el equipo local en Super Admin › Ciudades › Barrios (1785).
- Servicios reales en el sandbox, sin ti: LibreTranslate (714) y las cargas TIGER/NHTSA (1843) corren en `tolatino-pruebas-1`; las bloquea la red de la sesión de Claude, no un tercero.

---

## Lo que NO pude determinar

1. El registrador de tolatino.com y si el dominio está a nombre de la empresa o del fundador. No está en el repo.
2. Si To'Latino existe como empresa (LLC) y tiene D-U-N-S: fase8-apps.md:713 lo deja «pendiente saber». Define si Apple y Google se pueden pedir como organización.
3. Plazos de Meta, Stripe, SES, Anthropic ZDR, Copyright Office, Google Wallet, abogado y contador; precios de todo salvo Apple $99, Google $25 y el sandbox ≈ $12/mes.
4. Documentos concretos que cada tercero pide (Stripe, Meta, 10DLC): el repo solo dice «verificación del negocio y del dueño».
5. El nombre exacto de dónde se pegan los secretos en la interfaz («Network secrets» o «variable de entorno»), y si los secretos que van por la herramienta de credenciales (que el proxy inyecta) llegan como variable legible que `sellar.sh` pueda cifrar. `sellar.sh` pide «variable con su mismo nombre».
6. Quién crea el webhook de Stripe (tú o Claude por API) y el nombre de la variable del token de administración de GitHub.
7. Si el paso «Nueva app» ya puede hacerlo Claude por la API de Apple (fase8 §10: «a verificar»).

## Contradicciones entre documentos

> Estado al 23 nov: la 1, la 5 y la 9 ya están corregidas en sus documentos; la 6 y la 7 se están construyendo (las dos listas y la batería); la 2 y
> el punto 5 de «Lo que NO pude determinar» son el hueco de las llaves, anotado en REVISION. Las demás son de orden y no cambian nada servido.

1. Token de Cloudflare: `docs/diseno/plan/fase8-apps.md` §10 (Paquete 8-0.3) y `apps/web/lib/tiendas/paquete.ts` 8-0.3 piden «permisos de DNS y SSL de la zona». `scripts/produccion/cloudflare.sh:6` necesita además Zone:Settings, Zone:WAF/Rulesets y Zone:Cache Rules y SSL:Origin CA. Este paquete usa la lista del script (la que de verdad hace falta).
2. Dónde va la clave de Anthropic: LAUNCH-CHECKLIST.md:1043 y REVISION.md:15-16 dicen «formulario seguro de los secretos del entorno»; la documentación de la plataforma dice que una llave de la API de Claude solo puede ir como variable de entorno (no como Network secret) y que queda legible para todos los que usen el entorno. Choca con la idea de «secreto sellado» (infra/comun/secretos.json: ANTHROPIC_API_KEY, origen «sellado»).
3. Orden: REVISION.md:14-22 pone «Proveedores» (9-1) antes que «Tiendas» (8-1…8-3); `apps/web/lib/tiendas/paquete.ts` (subtítulo de 8-1: «Apple y Google tardan días en aprobar: se piden primero») y fase9-apertura.md:889 («Los paquetes se piden al empezar 9a») dicen que se piden todos al inicio. Y PLAN.md:252-253 dice «cada una llega… en su fase, nunca antes». Aquí: dominio primero, luego lo que más tarda.
4. REVISION.md:25-31 (Decisiones pendientes, nº 3, 6 nov) propone que pegues la clave de Stripe en GitHub › Settings › Secrets › Actions como `STRIPE_SECRET_KEY_PRUEBAS`. Lo reemplazan la regla 1 de CLAUDE.md y la nota «Hecho» del mismo punto (`STRIPE_SECRET_KEY`… «por el formulario seguro»). La propuesta vieja sigue escrita.
5. LAUNCH-CHECKLIST.md:360 dice «Sin reintentos todavía: un SMS que falla queda «falló»…»; ya existe el camino con reintentos (`apps/web/lib/avisos.ts:18`, `lib/sms`, guardián smsConReintento). La línea sigue abierta por la clave real, no por el reintento.
6. REVISION.md:19, fase9-apertura.md:978 y `paquete.ts` 9-2.1/9-2.2 dicen «reenviarles docs/legal/para-el-abogado.md y para-el-contador.md». Esos archivos no existen (`find` sin resultados; el bloque 9s los va a escribir).
7. LAUNCH-CHECKLIST.md:1049, 1087, 1105, 1120, 1186 citan `scripts/compa/bateria/`. Ese directorio no existe en el repo.
8. DECISIONES.md fila C (Hetzner Ashburn) vs fila C2 (pruebas en Alemania; producción «eligiendo ese día» entre Hetzner, DigitalOcean y Vultr). Pero `paquete.ts` 9-3.1 y fase9-apertura.md §10 («Paquete 9-3») ya dan por hecho Hetzner «tolatino-real». Manda C2.
9. HERRAMIENTAS.md (#7) dice SMS «(Twilio)»; DECISIONES E/E2 dicen «Telnyx recomendado» y el código lee `TELNYX_*`. PLAN.md §9 lista además «Pexels (clave nueva)» como cuenta en persona (y DECISIONES Y), pero ningún LAUNCH abierto la pide y ningún código lee una variable de Pexels.
