#!/usr/bin/env node
/* Guardianes del build (decisión N). Cada uno vigila una CLASE de problema y rompe el build si la encuentra.
   Regla de oro: un guardián se prueba al revés (se inyecta el defecto y debe fallar) antes de confiar en él.
   Uso: node guardianes/run.mjs   (corre todos)   ·   node guardianes/run.mjs --solo secretos */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const solo = process.argv.includes("--solo") ? process.argv[process.argv.indexOf("--solo") + 1] : null;
import { existsSync } from "node:fs";
// Incluye los archivos nuevos que todavía no están en git (5 nov, 1l: corrían limpios en local y la CI los cazó).
const archivos = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" }).split("\n").filter((f) => f && existsSync(f));
// .github/ también: un flujo de CI podría apuntar la semilla o un secreto a producción (5 nov: no se revisaba).
const codigo = archivos.filter((f) => /^(apps|packages|services|guardianes|infra|scripts|\.github)\//.test(f) && /\.(tsx?|jsx?|mjs|cjs|css|sh|ya?ml|json)$/.test(f));
const fallos = [];
const falla = (g, f, linea, msg) => fallos.push(`[${g}] ${f}${linea ? ":" + linea : ""} — ${msg}`);

const guardianes = {
  /* 1. Ningún secreto en el repo (regla Q y U). */
  secretos() {
    const patrones = [
      [/sk-ant-[A-Za-z0-9_-]{20,}/, "clave de Anthropic"],
      [/sk_(live|test)_[A-Za-z0-9]{16,}/, "clave de Stripe"],
      [/AKIA[0-9A-Z]{16}/, "clave de AWS"],
      [/-----BEGIN (RSA|OPENSSH|EC|PGP) PRIVATE KEY-----/, "llave privada"],
      [/(password|contrasena|secret|token|api[_-]?key)\s*[:=]\s*["'][^"'\s]{12,}["']/i, "secreto escrito a mano"],
    ];
    for (const f of archivos) {
      if (/\.(png|jpe?g|gif|webp|svg|woff2?|ico|lock)$/.test(f) || f.startsWith("docs/diseno/")) continue;
      const lineas = readFileSync(f, "utf8").split("\n");
      lineas.forEach((l, i) => {
        for (const [re, que] of patrones) if (re.test(l) && !/GUARDIAN-OK/.test(l)) falla("secretos", f, i + 1, que);
      });
    }
  },

  /* 2. Colores solo por tokens: ningún hex a pelo fuera de packages/ui/src/tokens.css (regla 7 del CLAUDE.md). */
  tokens() {
    for (const f of codigo) {
      if (f === "packages/ui/src/tokens.css" || !/\.(tsx?|jsx?|css)$/.test(f)) continue;
      const lineas = readFileSync(f, "utf8").split("\n");
      lineas.forEach((l, i) => {
        if (/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/.test(l) && !/GUARDIAN-OK/.test(l) && !/^\s*(\/\/|\/\*|\*)/.test(l))
          falla("tokens", f, i + 1, "color hex a pelo; usar un token del sistema");
      });
    }
  },

  /* 3. Nada de datos de ejemplo apuntando a producción. */
  semilla() {
    for (const f of codigo) {
      const t = readFileSync(f, "utf8");
      if (/TOLATINO_ENTORNO\s*[:=]\s*["']?produccion/.test(t) && /seed|semilla/i.test(t)) falla("semilla", f, 0, "semilla configurada contra producción");
      // La semilla de pruebas solo la puede invocar el despliegue del sandbox (y la define migrar.sh). El CI la aplica en una
      // base desechable (proyecto «ci») para probar que se puede volver a aplicar.
      if (/(--semilla-pruebas|infra\/pruebas\/semilla)/.test(t) && !/^(infra\/pruebas\/|packages\/db\/migrar\.sh$|scripts\/semilla\/|guardianes\/|\.github\/workflows\/ci\.yml$)/.test(f))
        falla("semilla", f, 0, "la semilla de pruebas se llama desde fuera del sandbox");
    }
  },

  /* 3b. El código de entrada en «modo pruebas» jamás en producción (decisión E2). */
  modoPruebas() {
    for (const f of archivos) {
      if (!/(^|\/)(infra\/produccion|\.env\.produccion)/.test(f) && !/produccion/.test(f)) continue;
      if (/TOLATINO_SMS_MODO\s*[:=]\s*["']?pruebas/.test(readFileSync(f, "utf8"))) falla("modoPruebas", f, 0, "modo pruebas del código en un archivo de producción");
    }
    const ent = readFileSync("apps/web/lib/entorno.ts", "utf8");
    if (!/ENTORNO === "produccion" && MODO_SMS === "pruebas"[\s\S]{0,40}throw/.test(ent)) falla("modoPruebas", "apps/web/lib/entorno.ts", 0, "falta el candado de tiempo de ejecución");
  },

  /* 3c. Un componente de servidor no puede usar piezas del sistema a través de un objeto del navegador
     (p. ej. <A.KpiRow>): en el servidor llegan vacías y React falla (error #130, 5 nov). Importarlas directo. */
  servidorCliente() {
    for (const f of codigo) {
      if (!/^apps\/web\/app\/.*\.tsx$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      if (/^\s*["']use client["']/.test(t)) continue;
      t.split("\n").forEach((l, i) => { if (/<[A-Z][A-Za-z]*\.[A-Z]/.test(l)) falla("servidorCliente", f, i + 1, "componente de servidor usando <Objeto.Pieza>: importa la pieza directo de @tolatino/ui"); });
    }
  },

  /* 3d. Ningún enlace a una pantalla que no existe (5 nov: «/ciudad» del encabezado no tenía página).
     Toda ruta literal en router.push/replace, href o Link debe casar con un page.tsx de apps/web/app
     (los grupos «(app)» no cuentan en la URL; «[slug]» acepta cualquier segmento). */
  rutasVivas() {
    const paginas = archivos.filter((f) => /^apps\/web\/app\/.*page\.tsx$/.test(f) || f === "apps/web/app/page.tsx")
      .map((f) => f.replace(/^apps\/web\/app/, "").replace(/\/page\.tsx$/, "").split("/").filter((s) => s && !/^\(.*\)$/.test(s)))
      // «[[...r]]» (opcional, cualquier cantidad de segmentos) casa con nada o con /lo/que/sea.
      .map((seg) => new RegExp("^/" + seg.map((s) => (/^\[\[\.\.\..*\]\]$/.test(s) ? "\u0000" : /^\[.*\]$/.test(s) ? "[^/]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/").replace(/\/?\u0000/, "(?:/.*)?") + "/?$"));
    const apis = archivos.filter((f) => /^apps\/web\/app\/.*route\.ts$/.test(f)).map((f) => f.replace(/^apps\/web\/app/, "").replace(/\/route\.ts$/, ""));
    for (const f of codigo) {
      if (!/^apps\/web\/(app|lib)\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        for (const m of l.matchAll(/(?:\.push|\.replace|redirect|href[=:]\s*\{?)\s*\(?\s*[`"'](\/[^`"'?#\s]*)/g)) {
          let r = m[1].split("${")[0];
          if (m[0].includes("`") && m[1].includes("${")) r = r.replace(/\/[^/]*$/, "/x"); // `/c/${slug}` → /c/x
          // Archivos de apps/web/public (fuentes, logos): existen como archivo o, si la ruta lleva ${…}, su carpeta.
          if (existsSync("apps/web/public" + r) || (m[1].includes("${") && existsSync("apps/web/public" + r.replace(/\/[^/]*$/, "")) && r.replace(/\/[^/]*$/, "") !== "")) continue;
          if (!r || r === "/" ? false : r.startsWith("/api/") ? !apis.some((a) => r.startsWith(a)) : !paginas.some((re) => re.test(r.replace(/\/$/, ""))))
            falla("rutasVivas", f, i + 1, `enlace a «${m[1]}» y no existe esa pantalla`);
        }
      });
    }
  },

  /* 3e. El build no descarga nada de terceros (5 nov: next/font/google falló y tumbó el CI). Fuentes = archivos
     del repo con next/font/local. */
  buildSinRed() {
    for (const f of codigo) {
      if (!/\.(tsx?|jsx?|mjs|css)$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/next\/font\/google|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(l) && !/GUARDIAN-OK/.test(l) && !/^\s*(\/\/|\/\*|\*)/.test(l))
          falla("buildSinRed", f, i + 1, "fuente descargada de Google en el build; usar next/font/local con app/fuentes");
      });
    }
  },

  /* 3f. Panel del negocio: toda acción del servidor revisa en el servidor que la persona sea miembro activo con acceso
     a esa parte (5 nov, 1h). Cada «export async function» de app/panel/acciones*.ts debe pasar por entrar(…) /
     accesoPanel(…) antes de tocar la base. */
  accionesConAcceso() {
    for (const f of codigo) {
      const admin = /^apps\/web\/app\/admin\/acciones[^/]*\.ts$/.test(f);
      if (!admin && !/^apps\/web\/app\/panel\/acciones[^/]*\.ts$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      if (!/^\s*["']use server["']/.test(t)) falla("accionesConAcceso", f, 0, "las acciones del panel van en un archivo «use server»");
      const partes = t.split(/\nexport async function /).slice(1);
      for (const p of partes) {
        const nombre = p.slice(0, p.indexOf("(")), cuerpo = p.slice(0, 1500);
        // Super Admin (5 nov, 1i): requerir()/staff()/quien() o el envoltorio hacer() que los llama.
        const iAcc = cuerpo.search(admin ? /await (requerir|staff|quien|arrancar|hacer)\(|return hacer\(/ : /await (entrar|accesoPanel)\(|(return|await) hacer\(/), iDb = cuerpo.search(/db\(\)|tx\(/);
        if (iAcc < 0 || (iDb >= 0 && iDb < iAcc)) falla("accionesConAcceso", f, 0, `«${nombre}» no revisa ${admin ? "el permiso del equipo" : "el acceso al panel"} antes de usar la base`);
      }
    }
  },

  /* 3f-bis. Las acciones del lado del cliente (app/(app)/…/acciones*.ts) revisan que la llamada venga de nuestra página
     (mismoOrigen) antes de escribir (6 nov, 2e: enviarPedido, retenerMesa y enviarMesa no lo hacían). Una acción que
     solo lee lleva «// solo lectura» justo encima. */
  clienteMismoOrigen() {
    for (const f of codigo) {
      if (!/^apps\/web\/app\/\(app\)\/(.*\/)?acciones[^/]*\.ts$/.test(f)) continue;
      const t = readFileSync(f, "utf8"), partes = t.split(/\nexport async function /);
      for (let i = 1; i < partes.length; i++) {
        const p = partes[i], nombre = p.slice(0, p.indexOf("(")), cuerpo = p.slice(0, p.indexOf("\n}") + 1 || 1500);
        if (/\/\/ solo lectura\s*$/.test(partes[i - 1])) continue;
        // Vale también un ayudante del archivo que lo revisa primero (p. ej. entrar() en recuperar).
        const ayudantes = [...t.matchAll(/\nasync function (\w+)\([^)]*\)[^{]*\{\n\s*if \(!\(await mismoOrigen\(\)\)\)/g)].map((m) => m[1]);
        if (ayudantes.some((h) => new RegExp(`await ${h}\\(`).test(cuerpo))) continue;
        if (!/await mismoOrigen\(\)/.test(cuerpo)) falla("clienteMismoOrigen", f, 0, `«${nombre}» escribe sin revisar mismoOrigen() (o marcarla «// solo lectura»)`);
      }
    }
  },

  /* 3f-ter. Nunca una fecha en crudo (2026-11-07) como texto para la gente (6 nov, 2e: Hoy mostraba «2026-11-07»).
     Un texto bilingüe { es, en } no toma un campo ymd/day/fecha tal cual: se formatea («sáb 7 nov»). */
  fechaEnCrudo() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\b(es|en):\s*[\w.]*\b(ymd|day|fecha)\s*[,}]/.test(l)) falla("fechaEnCrudo", f, i + 1, "fecha en crudo en un texto para la gente; formatéala (p. ej. fechaCorta)"); });
    }
  },

  /* 3f-sexies. Una fecha que viaja al navegador va en ISO completo (…Z o ±hh:mm). to_char con «OF» da «-05», que
     Chrome no lee: new Date() sale inválida y Intl revienta la pantalla (6 nov, 2g: «Tu reseña» quedó en blanco). */
  fechaIsoNavegador() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/to_char\([^)]*SSOF/.test(l)) falla("fechaIsoNavegador", f, i + 1, "to_char con OF no es ISO para el navegador; usa at time zone 'UTC' y \"Z\""); });
    }
  },

  /* 3f-quinquies. Un pedido aceptado y aún no entregado está en cocina, listo o en camino (6 nov, 2f: el delivery «en
     camino» desaparecía de Hoy porque la agenda solo miraba ok/ready). Ningún filtro enumera esos estados a mano: usa enCurso. */
  pedidoEnCurso() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/st === "ok"\s*\|\|\s*\w+\.st === "ready"/.test(l) && !/"out"/.test(l)) falla("pedidoEnCurso", f, i + 1, "filtro de pedidos en curso sin «en camino»; usa enCurso()");
      });
    }
  },

  /* 3f-octies. El id se convierte al tipo de su tabla (6 nov, 2h: «Cerrar» una sesión no cerraba nada porque el id de
     sessions es uuid y la consulta lo pasaba como bigint). Los tipos salen de las migraciones. */
  idSegunTipo() {
    const tipo = new Map();
    for (const f of archivos.filter((x) => /^packages\/db\/migrations\/.*\.sql$/.test(x)))
      for (const m of readFileSync(f, "utf8").matchAll(/create table if not exists (\w+) \(\s*\n?\s*id\s+(uuid|bigint)/g)) tipo.set(m[1], m[2]);
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        for (const m of l.matchAll(/\b(?:from|update)\s+(\w+)(?:\s+\w+)?\s+(?:set\s[^`]*?)?where\s+(?:\w+\.)?id\s*=\s*\$\d+::(bigint|uuid)/g)) {
          const t = tipo.get(m[1]);
          if (t && t !== m[2]) falla("idSegunTipo", f, i + 1, `el id de «${m[1]}» es ${t} y la consulta lo pasa como ${m[2]}`);
        }
      });
    }
  },

  /* 3f-sexies. Nada promete un SMS que no sale (6 nov, 2g-3: el prototipo de Jobs decía «Te avisamos por SMS» y aún no hay
     proveedor de SMS). Las promesas que ya existen están anotadas en LAUNCH-CHECKLIST con su archivo; un archivo nuevo no
     puede sumar otra: di dónde lo ve la persona dentro de To'Latino. */
  promesaSms() {
    const ANOTADOS = new Set(["apps/web/app/(app)/reserva/[num]/Estado.tsx", "apps/web/app/(app)/CiudadSelector.tsx", "apps/web/app/(app)/n/[id]/reservar/Detalles.tsx",
      "apps/web/app/panel/Equipo.tsx", "apps/web/app/panel/acciones-equipo.ts", "apps/web/lib/textos.ts", "apps/web/app/panel/Menu.tsx"]);
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || ANOTADOS.has(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/["'`][^"'`]*(por SMS|by SMS|We will text|we text you|We text you|te llega un SMS|Le llegó por SMS|Sent by text)/i.test(l) && !/c[oó]digo|code/i.test(l)) falla("promesaSms", f, i + 1, "promete un SMS que todavía no sale; di dónde lo ve en To'Latino o anótalo en LAUNCH-CHECKLIST");
      });
    }
  },

  /* 3f-octies. La distancia de un negocio a domicilio (sin local) es null: nunca se pinta tal cual (6 nov, 2j: «null MI» en
     Abierto ahora del inicio). Se usa ?? o se pregunta antes (!= null). */
  distanciaNula() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/\$\{\s*[\w.]+\.mi\s*\}\s*MI/.test(l) && !/\.mi\s*!=\s*null/.test(l)) falla("distanciaNula", f, i + 1, "distancia que puede ser null pintada tal cual; usa ?? o pregunta != null");
      });
    }
  },

  /* 3f-septies. Un Button «block» del sistema de diseño va dentro de una fila (display:flex), nunca suelto en una columna
     (6 nov, 2g-3: «Aplicar» en la barra de la vacante salía aplastado dentro de un flex-col). */
  botonEnColumna() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/className="[^"]*\bflex-col\b[^"]*">\s*(\{boton\}|<Button[^>]*\bblock\b)/.test(l)) falla("botonEnColumna", f, i + 1, "Button block dentro de un flex-col; envuélvelo en <div className=\"flex\">");
      });
    }
  },

  /* 3f-quater. Pedidos y reservaciones viven en la misma tabla (operations). Toda consulta que cuente, liste o cambie
     operaciones dice de qué tipo (kind) o va a una sola por su número / id / clave (6 nov, 2e: el vencer de pedidos cerraba
     reservaciones, y el tope de 3 pedidos pendientes contaba mesas). */
  operacionesConTipo() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = readFileSync(f, "utf8"), re = /(from|update) operations\b/g;
      let m;
      while ((m = re.exec(t))) {
        const fin = t.indexOf("`", m.index), q = t.slice(m.index, fin < 0 ? m.index + 600 : fin);
        if (/\bkind\b|\bnumber = |\bid = \$|\.id = \$|client_key|operation_id|where id = /.test(q)) continue;
        falla("operacionesConTipo", f, t.slice(0, m.index).split("\n").length, "consulta sobre operations sin kind (pedido o mesa) ni número/id");
      }
    }
  },

  /* 3g. Un archivo «use server» solo exporta funciones async (5 nov, 1k: una lista exportada desde acciones rompe Next).
     Las constantes compartidas van a lib/. */
  servidorSoloFunciones() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      if (!/^\s*["']use server["']/.test(t)) continue;
      t.split("\n").forEach((l, i) => { if (/^export\s+(const|let|var|class|default\s+(?!async))/.test(l)) falla("servidorSoloFunciones", f, i + 1, "un archivo «use server» solo puede exportar funciones async (y tipos)"); });
    }
  },

  /* 3h. Documentos privados (reclamos, 1j): nginx nunca sirve /medios/privado/, y nada en la app arma una URL pública
     con «privado/». */
  documentosPrivados() {
    const ng = "infra/pruebas/nginx-pruebas.conf";
    if (existsSync(ng) && !/^\s*location \^~ \/medios\/privado\/ \{ return 404; \}/m.test(readFileSync(ng, "utf8"))) falla("documentosPrivados", ng, 0, "falta el bloqueo de /medios/privado/");
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/urlPublica\([^)]*privado|["'`]\/medios\/privado/.test(l)) falla("documentosPrivados", f, i + 1, "un documento privado no se sirve por /medios"); });
    }
  },

  /* El historial del admin lo lee una persona: nada de valores internos (estado en inglés, ids) en el antes → después.
     Lo interno va dentro de `ref: { … }` (se guarda, no se muestra). Clase cazada en 1l: «active → Silencio 7 días». */
  auditoriaLegible() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.ts$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        const x = l.replace(/ref: \{[^}]*\}/g, "");
        if (/(before|after): \{[^}]*:\s*[a-z]\w*\.(status|estado|kind|owner|device|user_id|owner_user_id)\s*[,}]/.test(x)) falla("auditoriaLegible", f, i + 1, "valor interno en el historial: tradúcelo o muévelo a ref");
      });
    }
  },

  /* Lo que ve el público solo lee subcategorías vivas (vista subcategorias_vivas): una que el equipo quitó en Catálogo
     no puede seguir saliendo en tarjetas, ficha, mapa o Buscar (1m). El admin y sus libs sí leen la tabla. */
  subcategoriasVivas() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || /^apps\/web\/app\/admin\//.test(f) || /^apps\/web\/lib\/admin[-.]/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\b(from|join)\s+subcategories\b/.test(l)) falla("subcategoriasVivas", f, i + 1, "usa la vista subcategorias_vivas"); });
    }
  },

  /* Analítica: un evento que la base no acepta se pierde en silencio (evento() nunca rompe la pantalla). La lista del
     tipo Evento (lib/eventos.ts) y el check de app_events en la última migración que lo define deben ser idénticas (1n). */
  eventosEnLista() {
    const lib = "apps/web/lib/eventos.ts";
    if (!existsSync(lib)) return;
    const tipo = (readFileSync(lib, "utf8").match(/export type Evento = ([^;]+);/) || [])[1];
    const migs = archivos.filter((f) => /^packages\/db\/migrations\/.*\.sql$/.test(f)).sort().reverse();
    const sql = migs.map((f) => readFileSync(f, "utf8").match(/(?:name\s+text not null|app_events_name_check)\s+check \(name in \(([^)]+)\)\)/)).find(Boolean);
    if (!tipo || !sql) { falla("eventosEnLista", lib, 0, "no encuentro la lista de eventos en el código o en la base"); return; }
    const a = [...tipo.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort().join(","), b = [...sql[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort().join(",");
    if (a !== b) falla("eventosEnLista", lib, 0, `la lista del código (${a}) no es la de la base (${b})`);
  },

  /* 3l. La tarjeta nunca toca el servidor (6 nov, 2d): el número y el código de seguridad los toma Stripe (o, en el sandbox,
     se quedan en el navegador). Ningún archivo de servidor (lib/, acciones "use server", app/api) nombra un número de
     tarjeta ni un CVC. */
  tarjetaEnServidor() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      const servidor = /^apps\/web\/(lib|app\/api)\//.test(f) || /^["']use server["']/.test(t.trimStart());
      if (!servidor) continue;
      t.split("\n").forEach((l, i) => {
        if (/\b(cvc|cvv|card_?number|numero_?tarjeta|numeroTarjeta|cardNumber)\b/i.test(l) && !/GUARDIAN-OK/.test(l)) falla("tarjetaEnServidor", f, i + 1, "un dato de tarjeta (número o CVC) en código de servidor; lo toma Stripe, nunca To'Latino");
      });
    }
  },

  /* 3l-bis. La clave idempotente de una retención incluye la tarjeta (6 nov, 2d: después de un rechazo, al cambiar de
     tarjeta se reusaba la clave del pedido y Stripe devolvía el mismo rechazo). Misma tarjeta = mismo intento; otra = otro. */
  retencionPorTarjeta() {
    const f = "apps/web/lib/cobros.ts", t = readFileSync(f, "utf8");
    t.split("\n").forEach((l, i) => {
      if (/pasarela\.retener\(/.test(l) && !/idem:\s*`[^`]*\$\{x\.pm/.test(l)) falla("retencionPorTarjeta", f, i + 1, "la clave idempotente de la retención debe incluir la tarjeta (x.pm)");
    });
  },

  /* 3m. El simulador de pagos vive en un solo lugar (6 nov, 2d): solo lib/pagos/pasarela.ts toca sim_intents, y esa
     pasarela no corre el simulador en producción (candado). Ningún otro archivo «cobra» por su cuenta. */
  simuladorAislado() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || f === "apps/web/lib/pagos/pasarela.ts") continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/\bsim_intents\b/.test(l)) falla("simuladorAislado", f, i + 1, "el simulador de pagos solo se toca desde lib/pagos/pasarela.ts");
      });
    }
    const pas = readFileSync("apps/web/lib/pagos/pasarela.ts", "utf8");
    if (!/ENTORNO === "produccion" \? "apagado" : "simulador"/.test(pas)) falla("simuladorAislado", "apps/web/lib/pagos/pasarela.ts", 1, "sin clave de Stripe, producción debe quedar «apagado», nunca en simulador");
  },

  /* 3k. El dinero lo decide el servidor (6 nov, 2b): lo que manda el teléfono para un pedido (los tipos …In de
     lib/pedir.ts) nunca trae precios, impuestos ni totales; el servidor los calcula del menú al enviar. */
  dineroDelServidor() {
    const f = "apps/web/lib/pedir.ts";
    if (!existsSync(f)) return;
    const t = readFileSync(f, "utf8");
    for (const m of t.matchAll(/export type (\w+In) = \{([^}]*)\}/g)) {
      if (/\b(cents|price|precio|total|tax|impuesto|subtotal)\w*\??:/i.test(m[2])) falla("dineroDelServidor", f, 0, `«${m[1]}» trae un precio o total desde el teléfono; lo calcula el servidor`);
    }
  },

  /* 3l. Debajo del encabezado de la app (sticky, 57 px en el teléfono) nada se pega con «sticky top-0»: queda tapado
     (6 nov, 2b: chips del menú y barra del checkout). Excepción: pantallas sin encabezado (Buscar, Licencia). */
  pegadoBajoEncabezado() {
    for (const f of codigo) {
      if (!/^apps\/web\/app\/\(app\)\/.*\.tsx$/.test(f) || /AppShell\.tsx$|\/buscar\/|\/licencia\//.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\bsticky top-0\b/.test(l)) falla("pegadoBajoEncabezado", f, i + 1, "«sticky top-0» queda debajo del encabezado; usar top-[57px] en el teléfono"); });
    }
  },

  /* 3m. Una conexión en transacción (el cliente «c») no recibe dos consultas a la vez (6 nov, 2b: pg lo deja de aceptar en
     su versión 9 y el orden dentro de la transacción deja de estar garantizado). Prohibido Promise.all con «c» dentro. */
  transaccionEnFila() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/Promise\.all\(.*(\(c[,)]|\bc\.query\b)/.test(l)) falla("transaccionEnFila", f, i + 1, "consultas en paralelo sobre el cliente de una transacción; van una tras otra"); });
    }
  },

  /* 4. Toda cadena visible nace en español: prohibido `lang="en` en layouts. */
  idioma() {
    for (const f of codigo) {
      if (!/layout\.tsx$/.test(f)) continue;
      if (/lang=["']en/.test(readFileSync(f, "utf8"))) falla("idioma", f, 0, "el idioma por defecto es es-US");
    }
  },
};

const lista = solo ? { [solo]: guardianes[solo] } : guardianes;
for (const [n, g] of Object.entries(lista)) {
  if (!g) { console.error(`guardián desconocido: ${n}`); process.exit(2); }
  g();
}
if (fallos.length) {
  console.error(`\n✗ ${fallos.length} fallo(s) de guardianes:\n` + fallos.map((x) => "  " + x).join("\n") + "\n");
  process.exit(1);
}
console.log(`✓ guardianes: ${Object.keys(lista).join(", ")} — sin fallos (${archivos.length} archivos revisados)`);
