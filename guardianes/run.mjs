#!/usr/bin/env node
/* Guardianes del build (decisión N). Cada uno vigila una CLASE de problema y rompe el build si la encuentra.
   Regla de oro: un guardián se prueba al revés (se inyecta el defecto y debe fallar) antes de confiar en él.
   Uso: node guardianes/run.mjs   (corre todos)   ·   node guardianes/run.mjs --solo secretos */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const solo = process.argv.includes("--solo") ? process.argv[process.argv.indexOf("--solo") + 1] : null;
import { existsSync } from "node:fs";
// Incluye los archivos nuevos que todavía no están en git (5 nov, 1l: corrían limpios en local y la CI los cazó).
const archivos = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" }).split("\n").filter((f) => f && existsSync(f));
// .github/ también: un flujo de CI podría apuntar la semilla o un secreto a producción (5 nov: no se revisaba).
const codigo = archivos.filter((f) => /^(apps|packages|services|guardianes|infra|scripts|\.github)\//.test(f) && /\.(tsx?|jsx?|mjs|cjs|css|sh|ya?ml|json)$/.test(f));
const fallos = [];
const falla = (g, f, linea, msg) => fallos.push(`[${g}] ${f}${linea ? ":" + linea : ""} — ${msg}`);

/* Texto de un archivo sin comentarios (los guardianes de la Comunidad miran código, no prosa) y el cuerpo de una función de primer nivel. */
const sinComent = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/.*$/gm, "$1");
/* La última definición de una función de la base en las migraciones (una migración nueva puede reemplazarla). */
const ultimaFn = (nombre) => { let b = ""; for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql")).sort()) { const t = readFileSync(`packages/db/migrations/${x}`, "utf8"); const re = new RegExp(`create or replace function ${nombre}\\([\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$`, "g"); for (const m of t.matchAll(re)) b = m[1]; } return b; };
/* Las filas del catálogo config_keys en todas las migraciones que lo amplían (0105 Comunidad, 0106 Eventos…). */
const catalogoConfig = () => { const out = []; for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql")).sort()) { const t = readFileSync(`packages/db/migrations/${x}`, "utf8"); if (!/insert into config_keys/.test(t)) continue; for (const m of t.matchAll(/^\s*\('([a-z0-9_]+)', (-?\d+), (-?\d+), (-?\d+), '\{/gm)) out.push({ k: m[1], a: +m[2], b: +m[3], d: +m[4], f: `packages/db/migrations/${x}` }); } return out; };
const cuerpoFn = (t, nombre) => { const i = t.search(new RegExp(`\\n(?:export )?(?:async )?function ${nombre}\\(`)); if (i < 0) return ""; const j = t.indexOf("\n}", i + 1); return t.slice(i, j < 0 ? undefined : j + 2); };

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

  /* 4id. Un componente de cliente («use client») no importa VALORES de un módulo del servidor (import "server-only"): solo tipos
     (7 nov: Dealer.tsx importó una función de lib/autos-publico.ts y el build se cayó). Lo que el navegador necesita vive en *-comun.ts. */
  clienteSinServidor() {
    const srv = new Set(codigo.filter((f) => /^apps\/web\/lib\/.*\.ts$/.test(f) && /^import "server-only";/m.test(readFileSync(f, "utf8"))).map((f) => f.replace(/^apps\/web\/lib\//, "").replace(/\.ts$/, "")));
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      if (!/^\s*["']use client["']/.test(t)) continue;
      for (const m of t.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s+from\s+"@\/lib\/([^"]+)"/g)) {
        if (m[1] || !srv.has(m[3])) continue;
        const valores = m[2].split(",").map((x) => x.trim()).filter((x) => x && !/^type\s/.test(x));
        if (valores.length) falla("clienteSinServidor", f, t.slice(0, m.index).split("\n").length, `importa ${valores.join(", ")} de lib/${m[3]}.ts (server-only): en el cliente solo tipos; lo demás va en un *-comun.ts`);
      }
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

  /* 4e. Ninguna emergencia sin la línea del 911 (plan 4e): «Si huele a gas, hay chispas o humo, sal de la casa y llama al
     911.» La línea vive en lib/solicitudes.ts (LINE911) y la muestran el formulario y el estado de la emergencia. */
  emergencia911() {
    const L = "apps/web/lib/solicitudes.ts", F = "apps/web/app/(app)/emergencia/Emergencia.tsx", S = "apps/web/app/(app)/pre/[num]/Solicitud.tsx";
    if (!existsSync(L)) return;
    if (!/LINE911[^;]*llama al 911/.test(readFileSync(L, "utf8"))) falla("emergencia911", L, 1, "LINE911 debe decir «…sal de la casa y llama al 911.»");
    if (existsSync(F) && !/linea911\.es/.test(readFileSync(F, "utf8"))) falla("emergencia911", F, 1, "el formulario de emergencia debe mostrar la línea del 911");
    if (existsSync(S) && !/em && <div role="note"[^\n]*linea911/.test(readFileSync(S, "utf8"))) falla("emergencia911", S, 1, "el estado de la emergencia debe mostrar la línea del 911");
    // 5a · Comunidad: «Una emergencia no se pregunta aquí: llama al 911.» al escribir (si parece emergencia) y el aviso de Salud en la publicación.
    const CF = "apps/web/lib/comunidad-filtro.ts", CT = "apps/web/app/(app)/comunidad/Tarjeta.tsx", CN = "apps/web/app/(app)/comunidad/nuevo/Nuevo.tsx", CM = "packages/db/migrations/0097_comunidad_base.sql";
    if (existsSync(CF)) {
      const f = readFileSync(CF, "utf8");
      if (!/LINEA911: Bi = \{ es: "[^"]*llama al 911\."/.test(f) || !/EMERGENCIA911: Bi = \{ es: "Una emergencia no se pregunta aquí: llama al 911\."/.test(f)) falla("emergencia911", CF, 1, "LINEA911 y EMERGENCIA911 deben decir «…llama al 911.»");
      if (existsSync(CT) && !/p\.salud && \([\s\S]{0,800}LINEA911\.es/.test(readFileSync(CT, "utf8"))) falla("emergencia911", CT, 1, "una publicación de Salud debe mostrar la línea del 911");
      if (existsSync(CN) && !/emergencia && <div role="note"[^\n]*EMERGENCIA911\.es/.test(readFileSync(CN, "utf8"))) falla("emergencia911", CN, 1, "Publicar debe mostrar la línea del 911 si el texto parece una emergencia");
      if (existsSync(CM) && !/new\.health_notice := [^;]*new\.topic = 'salud'/.test(readFileSync(CM, "utf8"))) falla("emergencia911", CM, 1, "el tema Salud debe encender el aviso del 911 en la base");
    }
  },

  /* 4e. to_char con nombres de día o mes (Dy, Day, Mon, Month) los escribe en inglés aunque la pantalla esté en español
     (6 nov, 4e: «Válido 7 días: hasta el Fri 13 Nov»). Se manda la fecha y se formatea en los dos idiomas (Intl). */
  fechaEnInglesSQL() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      if (/Jan: "ene"/.test(t)) continue; // el archivo traduce el mes (publica/page.tsx)
      t.split("\n").forEach((l, i) => { if (/to_char\(.{0,200}?'[^']*\b(Dy|Day|Mon|Month|DAY|DY|MON|MONTH)\b[^']*'/.test(l)) falla("fechaEnInglesSQL", f, i + 1, "to_char con nombre de día o mes sale en inglés: formatea la fecha en los dos idiomas"); });
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
      "apps/web/app/panel/Equipo.tsx", "apps/web/app/panel/acciones-equipo.ts", "apps/web/lib/textos.ts", "apps/web/app/panel/Menu.tsx", "apps/web/app/(app)/n/[id]/apartar/Apartar.tsx"]);
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
    // El cobro de Pro: la clave lleva el inicio exacto del período (no solo la fecha), la tarjeta y el intento.
    const s2 = "apps/web/lib/suscripcion.ts";
    readFileSync(s2, "utf8").split("\n").forEach((l, i) => {
      if (/idem = `sub-/.test(l) && !(/toISOString\(\)\}/.test(l) && /card_pm/.test(l) && /failed_attempts/.test(l))) falla("retencionPorTarjeta", s2, i + 1, "la clave del cobro de Pro debe llevar el inicio exacto del período, la tarjeta y el intento");
    });
  },

  /* 3n. El botón del sistema de diseño es un botón de verdad (6 nov, 2l: era un <div> sin rol ni teclado). */
  botonAccesible() {
    for (const f of ["packages/ui/src/ds/core/Button.js", "packages/ui/src/ds/core/IconButton.js"]) {
      const t = readFileSync(f, "utf8");
      if (!/role: "button"/.test(t) || !/onKeyDown/.test(t) || !/tabIndex/.test(t)) falla("botonAccesible", f, 1, "botón sin rol, foco o teclado; se arregla en scripts/portar-sistema.mjs (parches Button / IconButton)");
    }
    if (!/"aria-label"/.test(readFileSync("packages/ui/src/ds/core/IconButton.js", "utf8"))) falla("botonAccesible", "packages/ui/src/ds/core/IconButton.js", 1, "IconButton sin nombre (aria-label)");
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
    // 6c · Boletos: lo que manda el teléfono para apartar (BoletosIn) y las acciones de compra traen ids y cantidades, nunca montos.
    const B6 = "apps/web/lib/boletos.ts", A6 = "apps/web/app/(app)/eventos/acciones-boletos.ts";
    if (existsSync(B6)) { const m = /export type BoletosIn = \{([^\n]*)\};/.exec(readFileSync(B6, "utf8")); if (!m) falla("dineroDelServidor", B6, 0, "falta BoletosIn"); else if (/\b(cents|price|precio|total|tax|impuesto|subtotal|descuento|unit|monto)\w*\??:/i.test(m[1])) falla("dineroDelServidor", B6, 0, "BoletosIn trae un monto desde el teléfono; lo calcula el servidor"); }
    // 6d · Cancelar, devolver y las cortesías: el teléfono y el panel mandan códigos y números de orden, nunca cuánto se devuelve.
    for (const A of [A6, "apps/web/app/(app)/eventos/acciones-despues.ts", "apps/web/app/panel/acciones-eventos.ts"])
      if (existsSync(A)) for (const m of readFileSync(A, "utf8").matchAll(/export async function (\w+)\(([^)]*)\)/g)) if (/\b(cents|price|precio|total|monto|descuento|devuelve|refund)\w*\s*:/i.test(m[2])) falla("dineroDelServidor", A, 0, `«${m[1]}» recibe un monto desde el teléfono`);
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
      // También cuando el Promise.all ocupa varias líneas (6 nov, 3b: servicios() y contexto() de citas lo hacían así).
      const txt = readFileSync(f, "utf8");
      for (const m of txt.matchAll(/Promise\.all\(\[[\s\S]{0,1600}?\]\)/g))
        if (/(\(c[,)]|\bc\.query\b)/.test(m[0])) falla("transaccionEnFila", f, txt.slice(0, m.index).split("\n").length, "consultas en paralelo sobre el cliente de una transacción; van una tras otra");
    }
  },

  /* 3n. Toda acción auditada sobre un negocio (negocio.* y plan.*) tiene su verbo en el historial del 360° (6 nov, 2o: el
     historial mostraba «plan.cortesia» crudo). Las que no apuntan a un negocio (targetKind distinto) no cuentan. */
  verboEnHistorial() {
    const n360 = "apps/web/app/admin/N360.tsx";
    if (!existsSync(n360)) return;
    const verbos = new Set([...readFileSync(n360, "utf8").matchAll(/"((?:negocio|plan)\.[a-z_.]+)":/g)].map((m) => m[1]));
    for (const f of codigo) {
      if (!/^apps\/web\/(app\/admin\/acciones[^/]*|lib\/[^/]*)\.ts$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/targetKind: "(?!business")/.test(l)) return;
        for (const m of l.matchAll(/"((?:negocio|plan)\.[a-z_]+(?:\.[a-z_]+)*)"/g))
          if (!verbos.has(m[1])) falla("verboEnHistorial", f, i + 1, `«${m[1]}» no tiene verbo en el historial del 360° (VERBO en N360.tsx)`);
      });
    }
  },

  /* 3o-quater. Una pantalla de la app del vecino con su propia barra fija abajo («fixed inset-x-0 bottom-0») tiene que
     ser «compacta» en AppShell (sin la barra de pestañas del teléfono); si no, la barra de pestañas la tapa y no se puede
     enviar (6 nov, 3e: «Ayuda con la cita» y todo /cita/ quedaban debajo de Inicio · Negocios · …). */
  barraFijaCompacta() {
    const shell = "apps/web/app/(app)/AppShell.tsx";
    const m = /const compacto = [^\n]*\/\^\\\/\(([^)]*)\)\//.exec(readFileSync(shell, "utf8"));
    if (!m) { falla("barraFijaCompacta", shell, 1, "no encuentro la lista «compacto» de AppShell"); return; }
    const pref = m[1].split("|").map((x) => x.replace(/\\\//g, "/"));
    // 4s: también la barra de un componente importado de otra carpeta (/mercado/{num}/ayuda usa la pantalla de /cita/…).
    const conBarra = (f) => {
      const t = readFileSync(f, "utf8");
      if (/fixed inset-x-0 bottom-0/.test(t)) return true;
      for (const m of t.matchAll(/from "(\.{1,2}\/[^"]+)"/g)) { const p = join(dirname(f), m[1]) + ".tsx"; if (existsSync(p) && /fixed inset-x-0 bottom-0/.test(readFileSync(p, "utf8"))) return true; }
      return false;
    };
    for (const f of codigo) {
      const r = /^apps\/web\/app\/\(app\)\/([^/]+)\/.*\.tsx$/.exec(f);
      if (!r || !conBarra(f)) continue;
      const seg = r[1];
      if (!pref.some((p) => p === seg || p === `${seg}/` || seg.startsWith(p))) falla("barraFijaCompacta", f, 1, `/${seg}/ tiene barra fija abajo pero no es «compacto» en AppShell: la barra de pestañas la tapa`);
    }
  },

  /* 4d. Los montos de una línea del estimado (mano de obra, impuesto, total) los calcula la base con su disparador; el
     código nunca los escribe (6 nov, 4d: el panel y el cliente solo muestran). Y lo que se cobra al liquidar sale de
     capture_target_cents, que solo fija planLiquidar dentro del candado. */
  derivadosDelEstimado() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.(ts|tsx)$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      for (const m of t.matchAll(/(insert into|update)\s+estimate_lines\b[^`]*/gi)) if (/\b(labor_cents|tax_cents|line_total_cents)\b/.test(m[0])) falla("derivadosDelEstimado", f, t.slice(0, m.index).split("\n").length, "los montos de la línea los calcula la base (disparador): no se escriben desde el código");
      if (!f.endsWith("lib/estimados.ts")) for (const m of t.matchAll(/capture_target_cents\s*=/g)) falla("derivadosDelEstimado", f, t.slice(0, m.index).split("\n").length, "capture_target_cents solo lo fija lib/estimados.ts (planLiquidar) dentro del candado");
    }
  },

  /* 4d. Un comentario «//» al final de una línea se traga el código que sigue en esa misma línea (6 nov, 4d: en la
     pasarela, «// tarjeta y billeteras… transfer_data: {…}, metadata, expand» dejaba el cobro real de Stripe sin destino:
     el dinero no iba al negocio, y el simulador no lo veía). Si el texto del comentario parece código (dos «clave: valor,»
     o «clave: {»), falla. */
  comentarioTragaCodigo() {
    for (const f of codigo) {
      if (!/^(apps|packages)\/.*\.(ts|tsx|mjs|cjs|js)$/.test(f) || f.includes("/ds/") || f.includes("node_modules")) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        const k = l.indexOf(", // "); if (k < 0) return;
        const t = l.slice(k + 5);
        if (/\b[a-z_]\w*: (\{|\[|x\.|"[^"]*",)/i.test(t) && /, [a-z_]\w*: /i.test(t)) falla("comentarioTragaCodigo", f, i + 1, "el «//» se traga código de la misma línea: pon el comentario en su propia línea");
      });
    }
  },

  /* 3o-ter. «.find(...)!.» supone que siempre encuentra: si los datos no traen ese elemento, la pantalla se cae entera
     (6 nov, 3d: la página de la silla de Andy daba error 500 por un servicio que él no hace). Se usa «?.» con un valor. */
  findSeguro() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\.find\([^;]*\)!\./.test(l)) falla("findSeguro", f, i + 1, "«.find(...)!.» puede no encontrar: usa «?.» y un valor por defecto"); });
    }
  },

  /* 4g-2. Un rubro que siempre trae valor («belleza» | «auto» | «hogar») usado como verdadero/falso: «rub ? …» es verdad
     también en Belleza y la ayuda de Belleza mostraba el texto de Hogar/Auto. Donde el tipo es RubroAyuda se compara con el
     valor («rub !== "belleza"»). */
  rubroComoBooleano() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const src = readFileSync(f, "utf8");
      if (!/RubroAyuda|CitaAyudaVista/.test(src)) continue;
      src.split("\n").forEach((l, i) => { if (/\b(rub|rubro)\s*(\?(?!\.)|&&)/.test(l)) falla("rubroComoBooleano", f, i + 1, "el rubro siempre tiene valor («belleza» también): compáralo («rub !== \"belleza\"»)"); });
    }
  },

  /* 4f-3. Un parámetro de SQL sin tipo sumado a un intervalo («$5 + interval '48 hours'», «greatest(now(), $5 - …)») hace que
     Postgres no sepa el tipo y la consulta se cae (42804): apartar no se podía mandar. Siempre «$n::timestamptz».
     Prueba de punta a punta no lo ve si nadie toca ese camino; esto sí. */
  parametroSinTipo() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/(?<!time zone )\$\d+\s*[-+]\s*interval/.test(l)) falla("parametroSinTipo", f, i + 1, "parámetro de SQL sin tipo junto a un interval: escribe $n::timestamptz (o ::date)"); });
    }
  },

  /* 4j. Privacidad de Salud (fase4-salud-pro.md §3): (1) ningún aviso de Doctores (sal_*, biz_sal_*) lleva el nombre del
     consultorio ni del servicio: en la pantalla bloqueada ya diría demasiado; (2) la nota cifrada (op_private.note_enc) solo
     se escribe o se lee donde toca (crear la cita, el detalle del panel, el borrado a los 30 días): nunca en avisos, correos,
     logs ni el Super Admin. */
  privacidadSalud() {
    for (const f of readdirSync("packages/db/migrations").map((x) => `packages/db/migrations/${x}`)) {
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\('(sal_|biz_sal_)[a-z_]+'/.test(l) && /\{(negocio|servicio|svc|cliente)\}/.test(l)) falla("privacidadSalud", f, i + 1, "un aviso de Salud no lleva {negocio}, {servicio} ni {cliente}: tiene que ser neutro"); });
    }
    const PERMITIDOS = new Set(["apps/web/lib/citas-salud.ts", "apps/web/lib/citas-panel.ts", "apps/web/lib/citas-flujo.ts", "apps/web/lib/citas-pro.ts", "apps/web/lib/cifrado.ts", "apps/web/lib/viajes.ts", "apps/web/lib/envios.ts", "apps/web/lib/ninos-privado.ts", "apps/web/lib/visitas-inm.ts"]); // 4ie: la dirección cifrada de la prueba en casa (crear y ver confirmada) · crear · ver en el panel · borrar a los 30 d · 4y-2: el destinatario de la caja (crear en viajes, ver en envios)
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || PERMITIDOS.has(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/note_enc|descifrar\(/.test(l)) falla("privacidadSalud", f, i + 1, "la nota cifrada de una cita (op_private) solo se toca en lib/citas-salud o lib/citas-pro (crear), lib/citas-panel (ver) o lib/citas-flujo (borrar a los 30 d)"); });
    }
  },

  /* 4m-1. Una reseña pública de Doctores o Profesionales no lleva datos de salud ni del caso (§3): el servidor filtra con
     PRIVADO (lib/resenas-filtro.ts) además de PII, el filtro caza lo que tiene que cazar y deja pasar una reseña normal, nadie
     copia la regla en otro archivo (se desincroniza), y el dato de la cita guardado en la reseña nunca lleva el plan ni el número
     del seguro. */
  resenaPrivada() {
    const F = "apps/web/lib/resenas-filtro.ts", R = "apps/web/lib/resenas.ts";
    if (!existsSync(F) || !existsSync(R)) return;
    const m = /export const PRIVADO = \/(.+)\/([a-z]*);/.exec(readFileSync(F, "utf8"));
    if (!m) { falla("resenaPrivada", F, 1, "falta la regla PRIVADO"); return; }
    const re = new RegExp(m[1], m[2]);
    for (const x of ["Mi A-number es A123456789", "caso IOE1234567890", "me dieron metformina", "tomo 500 mg", "el diagnóstico fue malo", "por la depresión"])
      if (!re.test(x)) falla("resenaPrivada", F, 1, `PRIVADO deja pasar «${x}»`);
    for (const x of ["La doctora habló español y me explicó todo con calma.", "Cobraron lo del total por escrito, sin sorpresas.", "Me atendieron a la hora."])
      if (re.test(x)) falla("resenaPrivada", F, 1, `PRIVADO bloquea una reseña normal: «${x}»`);
    const src = readFileSync(R, "utf8"), L = src.split("\n");
    if (!/if \(PRIVADO\.test\(body\)\) return no\(/.test(src)) falla("resenaPrivada", R, 1, "guardarResena tiene que rechazar el texto con PRIVADO (el servidor decide)");
    L.forEach((l, i) => { if (/seguro\??\.(nombre|last4|plan)|member_last4/.test(l)) falla("resenaPrivada", R, i + 1, "el dato de una reseña no lleva el plan ni el número del seguro: solo si tenía y si lo aceptaron"); });
    for (const f of codigo) {
      if (f === F || !/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/const (PII|PRIVADO) = \//.test(l)) falla("resenaPrivada", f, i + 1, "la regla de lo que una reseña no lleva vive solo en lib/resenas-filtro.ts: impórtala"); });
    }
  },

  /* 4m-2. Las fotos de una ayuda de Salud o Pro son privadas (factura médica, recibo de un trámite): se suben por
     /api/ayuda/foto (bajo «privado/»), se ven solo por /api/ayuda/foto/{id} con permiso, y toda consulta de fotos de ayuda
     pasa por FOTO_AYUDA_SQL (nunca m.url a pelo, que para una privada es la clave del almacenamiento). Y los nombres de
     los motivos de ayuda viven en una sola lista (lib/ayuda-motivos.ts): había dos copias (panel y Super Admin). */
  fotoAyudaPrivada() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/select m\.url from media m where m\.owner_kind = 'help'/.test(l)) falla("fotoAyudaPrivada", f, i + 1, "las fotos de una ayuda se leen con FOTO_AYUDA_SQL (las privadas van por /api/ayuda/foto/{id})");
        if (f !== "apps/web/lib/ayuda-motivos.ts" && /(MOT_C|QUI_C)\b.*=|win: \[?"No llegó en la franja"/.test(l) && !/app\/\(app\)\/cita/.test(f)) falla("fotoAyudaPrivada", f, i + 1, "los nombres de los motivos de ayuda salen de lib/ayuda-motivos.ts (motivoAyuda / quiereAyuda)");
      });
    }
    const A = "apps/web/app/(app)/cita/[num]/ayuda/AyudaCita.tsx";
    if (existsSync(A) && !/sp( \|\| rub === "ninos")? \? await subirFotoPrivada\(file\)/.test(readFileSync(A, "utf8"))) falla("fotoAyudaPrivada", A, 1, "en Salud y Pro la foto de la ayuda se sube privada (subirFotoPrivada)");
    const L = "apps/web/lib/ayuda-cita.ts";
    if (existsSync(L) && !/\$4::boolean = false or private/.test(readFileSync(L, "utf8"))) falla("fotoAyudaPrivada", L, 1, "el servidor tiene que rechazar una foto pública en una ayuda de Salud o Pro");
    // 4if · Iglesias, Bienes Raíces y Autos: el recibo o el contrato llevan nombres y direcciones → privadas en el servidor y en la pantalla.
    if (existsSync(L)) {
      const pr = readFileSync(L, "utf8").split("\n").find((l) => /export const PRIVADA = \(r: RubroAyuda\) =>/.test(l)) ?? "";
      for (const r of ["fe", "inm", "dealer"]) if (!pr.includes(`r === "${r}"`)) falla("fotoAyudaPrivada", L, 0, `las fotos de una ayuda de ${r} tienen que ser privadas (PRIVADA)`);
    }
    if (existsSync(A)) {
      const t = readFileSync(A, "utf8");
      if (!/const sd = rub === "fe" \|\| rub === "inm" \|\| rub === "dealer";/.test(t) || !/const x = sd \? await subirFotoPrivada\(file\)/.test(t)) falla("fotoAyudaPrivada", A, 0, "en Iglesias, Bienes Raíces y Autos la foto de la ayuda se sube privada (subirFotoPrivada)");
    }
  },

  /* 4n-2. El constructor del Menú también arma los Productos de Mercados y Tiendas (module 'shop'). Antes tenía
     module = 'menu' escrito en cada consulta y un mercado no podía tener secciones ni productos. El módulo sale de la categoría
     (moduloDe en acciones-menu.ts; menuPanel(negocio, mod)): ninguna consulta de esos dos archivos lo escribe a mano. */
  productosModulo() {
    for (const f of ["apps/web/app/panel/acciones-menu.ts", "apps/web/lib/menu.ts"]) {
      if (!existsSync(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/module = 'menu'/.test(l)) falla("productosModulo", f, i + 1, "el módulo (menu o shop) sale de la categoría: usa moduloDe / el parámetro mod, no 'menu' a mano"); });
    }
  },

  /* 4p. Pedido del mercado: lo retenido (estimado + 10 %) NUNCA se captura completo. Se cobra lo que pesó (≤ lo retenido) y se
     libera el resto. Antes, repararPagos capturaba todo lo retenido de cualquier pedido aceptado: con un pedido por peso eso
     cobraba el estimado. La línea pesada lleva su foto (la base lo exige) y el teléfono nunca manda precios. */
  capturaMercado() {
    const C = "apps/web/lib/cobros.ts", M = "apps/web/lib/mercado.ts";
    if (!existsSync(C) || !existsSync(M)) return;
    const c = readFileSync(C, "utf8"), m = readFileSync(M, "utf8");
    // 4q-2: lo mismo para el envío de la tienda (apartado con tarjeta): se cobra lo que se envía (cobrarApartado), nunca todo lo retenido.
    if (!/o\.status not in \('pending', 'change_proposed'\) and o\.kind not in \('market_order', 'hold'(, 'tickets')?\)/.test(c)) falla("capturaMercado", C, 1, "repararPagos no puede capturar completo lo retenido de un pedido del mercado ni de un envío de la tienda");
    const A = existsSync("apps/web/lib/apartados.ts") ? readFileSync("apps/web/lib/apartados.ts", "utf8") : "";
    if (A && !/Math\.min\(p\.tot, p\.held\)/.test(A)) falla("capturaMercado", "apps/web/lib/apartados.ts", 1, "cobrarApartado cobra lo que se envía y nunca más de lo retenido (Math.min(p.tot, p.held))");
    A.split("\n").forEach((l, i) => { if (/cobrarOperacion\(/.test(l)) falla("capturaMercado", "apps/web/lib/apartados.ts", i + 1, "un envío de la tienda no usa cobrarOperacion (captura todo): usa cobrarApartado"); });
    if (!/Math\.min\(t\.real, p\.held\)/.test(m)) falla("capturaMercado", M, 1, "liquidarMercado cobra lo real y nunca más de lo retenido (Math.min(t.real, p.held))");
    m.split("\n").forEach((l, i) => { if (/cobrarOperacion\(/.test(l)) falla("capturaMercado", M, i + 1, "un pedido del mercado no usa cobrarOperacion (captura todo): usa liquidarMercado"); });
    for (const x of m.matchAll(/export type (\w+In) = \{([^}]*)\}/g)) if (/\b(cents|price|precio|total|tax|impuesto|subtotal)\w*\??:/i.test(x[2])) falla("capturaMercado", M, 0, `«${x[1]}» trae un precio o total desde el teléfono; lo calcula el servidor`);
    const mig = readdirSync("packages/db/migrations").find((f) => f.startsWith("0065_"));
    if (mig && !/operation_lines_peso_foto check \(weight_final is null or \(weigh_photo_id is not null/.test(readFileSync(`packages/db/migrations/${mig}`, "utf8"))) falla("capturaMercado", mig, 1, "una línea pesada sin foto de la balanza tiene que estar prohibida en la base");
  },

  /* 4p. Un detalle del panel que nadie puede abrir: Panel.tsx sabía abrir «merc:…» pero la lista de ?det= permitidos de la
     página no lo tenía y el detalle no salía (ni desde el aviso). Cada prefijo que abre detalle() tiene que estar en DET. */
  detalleEnRuta() {
    const P = "apps/web/app/panel/Panel.tsx", G = "apps/web/app/panel/[id]/[[...r]]/page.tsx";
    if (!existsSync(P) || !existsSync(G)) return;
    const det = /const DET = \/(.+)\/;/.exec(readFileSync(G, "utf8"))?.[1] ?? "";
    const src = readFileSync(P, "utf8"), ini = src.indexOf("function detalle(c: Ctx)"), cuerpo = ini < 0 ? "" : src.slice(ini, src.indexOf("\n}\n", ini));
    for (const m of cuerpo.matchAll(/id\.startsWith\("([a-z]+):"\)/g)) if (!det.includes(`${m[1]}:`)) falla("detalleEnRuta", G, 1, `el detalle «${m[1]}:» existe en Panel.tsx pero ?det=${m[1]}:… no está permitido en DET`);
  },

  /* 4q. Las horas de un apartado eran 48 fijas en el texto y en el SQL; las Tiendas guardan 24, 48 o 72 (Tu herramienta). El
     motor y las pantallas del apartado no escriben «48» a mano: usan horas/hold_hours. Y una línea con talla devuelve su
     existencia a item_variants (devolverStock lo hace por las dos vías). */
  horasApartado() {
    const F = ["apps/web/lib/apartados.ts", "apps/web/app/(app)/n/[id]/apartar/Apartar.tsx", "apps/web/app/(app)/apartado/[num]/ApartadoEstado.tsx", "apps/web/app/panel/Apartados.tsx"];
    for (const f of F) {
      if (!existsSync(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\*|\*|\/\/)/.test(l) || /coalesce\([^)]*, 48\)/.test(l)) return;
        if (/interval '48 hours'|\b48 (horas|hours|h)\b|48 \* 3600000/.test(l)) falla("horasApartado", f, i + 1, "las horas del apartado salen de la tienda (24/48/72): usa horas / hold_hours, no 48 escrito a mano");
      });
    }
    const A = existsSync(F[0]) ? readFileSync(F[0], "utf8") : "";
    const dev = A.slice(A.indexOf("async function devolverStock"), A.indexOf("\n}\n", A.indexOf("async function devolverStock")));
    if (A && !/update item_variants/.test(dev)) falla("horasApartado", F[0], 1, "devolverStock tiene que devolver también la talla (item_variants)");
  },

  /* 4q-2. «Could not choose a best candidate operator»: en SQL, sumar dos parámetros sin tipo ($7 + $8) falla en Postgres en
     tiempo de ejecución (el tipo no se deduce) y el pedido con envío no se guardaba. Toda cuenta entre parámetros lleva ::tipo. */
  sumaSinTipo() {
    for (const f of codigo) {
      if (!/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { for (const m of l.matchAll(/\$\d+(::\w+)? [-+*\/] \$\d+(::\w+)?/g)) if (!m[1] || !m[2]) falla("sumaSinTipo", f, i + 1, `«${m[0]}»: una cuenta entre parámetros SQL sin ::tipo falla en Postgres; escribe $n::int`); });
    }
  },

  /* 4r. Layaway: el acuerdo aceptado no cambia (disparador), lo que se lee antes de aceptar es lo mismo que se guarda (terminos()
     de layaway-comun en el teléfono y en el servidor), Σ pagos = total, la devolución es lo cobrado menos el cargo y nada se cobra
     solo (los pagos se pagan con la persona presente o en la tienda). */
  layawayAceptado() {
    const M = readdirSync("packages/db/migrations").find((f) => f.startsWith("0068_")), L = "apps/web/lib/layaway.ts", C = "apps/web/lib/layaway-comun.ts", A = "apps/web/app/(app)/n/[id]/apartar/Apartar.tsx";
    if (!M || !existsSync(L) || !existsSync(C)) return;
    const m = readFileSync(`packages/db/migrations/${M}`, "utf8"), l = readFileSync(L, "utf8"), c = readFileSync(C, "utf8");
    if (!/create trigger layaway_plans_inmutable before update/.test(m) || !/new\.terms is distinct from old\.terms/.test(m)) falla("layawayAceptado", M, 1, "el acuerdo del plan aceptado tiene que ser inmutable en la base");
    if (!/i === r\.n - 1 \? resto - base \* \(r\.n - 1\)/.test(c)) falla("layawayAceptado", C, 1, "cuotas(): el último pago lleva lo que sobra para que Σ pagos = total");
    if (!/objetivo = Math\.max\(0, cobrado - p\.kept\)/.test(l)) falla("layawayAceptado", L, 1, "reembolsarPlan devuelve lo cobrado en la app menos el cargo, nunca más");
    if (/off_session|offSession|cobrarSolo/.test(l)) falla("layawayAceptado", L, 1, "los pagos del plan no se cobran solos (Preguntas #11): con la persona presente o en la tienda");
    if (existsSync(A) && !/terminos\(o\.negocio\.nombre, sub, o\.plan!\)/.test(readFileSync(A, "utf8"))) falla("layawayAceptado", A, 1, "el acuerdo que se lee antes de aceptar sale de terminos() (el mismo texto que se guarda)");
    if (!/terminos\(x\.negocio, x\.total, x\.r\)/.test(l)) falla("layawayAceptado", L, 1, "crearPlan guarda el texto de terminos() (el mismo que se leyó)");
  },

  /* 4w. «Quedan 4 asientos» se deriva (asientos − vendidos en la oficina − reservados en la app). Si alguna pantalla o acción
     escribe seats_booked por su cuenta, la app vende asientos que no existen. Solo el motor de Transporte lo toca. */
  /* 4ea. Una matrícula igual o mayor que el precio del curso no aparta nada: el cliente pagaría todo «para apartar». La base lo
     impide (items_matricula_check) y el servidor lo valida al guardar el curso y en la herramienta. */
  /* 4eb. «Con licencia» en una guardería sin licencia es lo más grave que puede decir la app a una familia. «lic» de Niños sale SOLO de
     una licencia del DHS verificada: la pone y la quita la base (licencias_refrescar, 0086); ningún código ni semilla lo escribe. */
  /* 4ec. «¿Me puedo salir cuando quiera?» es lo que más preguntan en Deporte. Una membresía siempre se puede cancelar (con contrato, lo
     que cuesta se dice antes de firmar; sin contrato, $0): ningún texto ni ajuste de Deporte o de inscripciones dice que no se puede, y
     «sin contrato» (filtro y tarjeta) nunca sale con un contrato o una penalidad (check en la base). */
  cancelarSiempreSePuede() {
    for (const f of codigo) {
      if (!/^apps\/web\/(lib\/(deporte|inscripciones)[^/]*\.ts|app\/panel\/Deporte\.tsx)$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/no (se )?puedes? (cancelar|salirte)|sin cancelaci[oó]n|cannot cancel|can.t cancel|no cancellations?\b/i.test(l)) falla("cancelarSiempreSePuede", f, i + 1, "una membresía siempre se puede cancelar: con contrato se dice lo que cuesta, sin contrato es $0"); });
    }
    const dir = "packages/db/migrations";
    if (!readdirSync(dir).some((x) => /insc_settings_contrato_check check \(contract_m > 0 or cancel_fee_cents = 0\)/.test(readFileSync(`${dir}/${x}`, "utf8")))) falla("cancelarSiempreSePuede", dir, 0, "falta el check: sin contrato, salirse cuesta $0");
    const dep = "apps/web/lib/deporte.ts";
    if (existsSync(dep) && !/if \(h\.memb && !h\.contrato\) F\.add\("sincontrato"\)/.test(readFileSync(dep, "utf8"))) falla("cancelarSiempreSePuede", dep, 0, "«sin contrato» tiene que salir solo de contract_m = 0");
  },

  /* 4ed. El enlace de una clase en línea es solo para inscritos confirmados (fase4-edu-ninos-deporte.md §6 #21): nada público lo lee.
     Solo lib/edu.ts (el panel) y lib/inscripciones.ts (el inscrito, 4ee) pueden tocar join_url. */
  enlaceSoloInscritos() {
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f) || /^apps\/web\/lib\/(edu|inscripciones)\.ts$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\bjoin_?url\b|\bjoinUrl\b/i.test(l)) falla("enlaceSoloInscritos", f, i + 1, "el enlace de la clase en línea solo lo ve el inscrito confirmado; la ficha y lo público nunca lo leen"); });
    }
  },

  /* 4ee · Dinero de las inscripciones (fase4-edu-ninos-deporte.md §3). En la app solo pasa la matrícula de un curso; se cobra solo al
     confirmar; ningún cobro fuera de sesión; el cupo nunca se pasa; lo enviado es una copia que la herramienta no cambia. */
  soloMatriculaEnLaApp() {
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/inscripciones[^/]*\.ts$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      t.split("\n").forEach((l, i) => { if (/pasarela\.cobrar|off_session|fueraDeSesion|cobrarGuardada/.test(l)) falla("soloMatriculaEnLaApp", f, i + 1, "una inscripción nunca se cobra fuera de sesión: solo la matrícula retenida al enviar y cobrada al confirmar"); });
      if (f.endsWith("/inscripciones.ts") && !/const mat = (x\.rubro === "fe" \? 0 : )?s\.k === "curso" && s\.mat > 0 && x\.cuenta \? s\.mat : 0;/.test(t)) falla("soloMatriculaEnLaApp", f, 0, "lo que se retiene en la app tiene que salir solo de la matrícula de un curso");
    }
  },
  matriculaInscripcion() {
    const f = "apps/web/lib/inscripciones.ts";
    if (!existsSync(f)) return;
    const L = readFileSync(f, "utf8").split("\n");
    L.forEach((l, i) => {
      if (!/cobrarOperacion\(/.test(l) || /^import /.test(l)) return;
      if (!L.slice(Math.max(0, i - 8), i).some((x) => /status = 'confirmed'/.test(x))) falla("matriculaInscripcion", f, i + 1, "la matrícula solo se cobra en el mismo paso que deja la inscripción confirmada");
    });
    if (!/async function devolverMat[\s\S]{0,400}o\.amount - \(o\.refunded \?\? 0\)/.test(L.join("\n"))) falla("matriculaInscripcion", f, 0, "la devolución de la matrícula tiene que ser exacta (todo lo cobrado menos lo ya devuelto)");
  },
  gruposSinSobreventa() {
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/(inscripciones[^/]*|visitas-inm)\.ts$/.test(f)) continue; // 4ie: las horas de visita y de prueba también
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/seats_booked = seats_booked \+/.test(l) && !/seats_total - seats_outside - seats_booked >= /.test(l)) falla("gruposSinSobreventa", f, i + 1, "sumar un cupo al grupo sin comprobar en la misma consulta que queda uno libre");
        if (/openings = openings - /.test(l) && !/openings >= 1/.test(l)) falla("gruposSinSobreventa", f, i + 1, "restar un cupo de la banda sin comprobar que queda uno");
      });
    }
  },
  copiaDelPrecio() {
    const f = "apps/web/lib/inscripciones.ts";
    if (!existsSync(f)) return;
    const t = readFileSync(f, "utf8");
    for (const k of ["price_cents: s.cents", "mat_cents:", "contract_m:", "cancel_fee_cents:", "cert: s.cert", "starts_on: modoFecha ? String(f.fecha) : g?.inicio"]) if (!t.includes(k)) falla("copiaDelPrecio", f, 0, `la inscripción no copia «${k}» al enviar`);
    const v = /async function vista\([\s\S]*?\n}\n/.exec(t)?.[0] ?? "";
    if (/from items|svc_attrs|insc_settings/.test(v)) falla("copiaDelPrecio", f, 0, "la vista de una inscripción lee la herramienta o el servicio de hoy en vez de lo copiado al enviar");
    // 4ie · Una visita o prueba de manejo copia al enviar lo de mudarse, el total en la puerta, el cargo del dealer y el pago de ejemplo; la vista
    // y el panel leen esa copia (copiaDe(o.det)), nunca la propiedad o el carro de hoy.
    const V = "apps/web/lib/visitas-inm.ts";
    if (existsSync(V)) {
      const x = readFileSync(V, "utf8");
      for (const k of ["move_in_cents: cp.moveIn", "otd_cents: cp.puerta?.otd", "doc_fee_cents: cp.puerta?.fee", "est_payment: cp.est", "rent_cents: cp.rent", "price_cents: cp.price"]) if (!x.includes(k)) falla("copiaDelPrecio", V, 0, `la visita no copia «${k}» al enviar`);
      const vv = /async function vista\([\s\S]*?\n}\n/.exec(x)?.[0] ?? "";
      if (!/copia: copiaDe\(o\.det\)/.test(vv) || /property_listings|vehicle_listings|dealer_settings|inm_settings/.test(vv.replace(/direccionCliente\([^)]*\)/g, ""))) falla("copiaDelPrecio", V, 0, "la vista de una visita muestra lo copiado al enviar (copiaDe), nunca los montos de hoy");
    }
  },

  /* 4ef · Niños: ninguna foto pública de un niño. La reseña de un lugar de niños no lleva fotos (el servidor la rechaza) y la foto de una
     ayuda de Niños (el recibo) es privada, como en Salud y Pro. */
  ninosSinFotoPublica() {
    const r = "apps/web/lib/resenas.ts", a = "apps/web/lib/ayuda-cita.ts", ui = "apps/web/app/(app)/cita/[num]/ayuda/AyudaCita.tsx", esc = "apps/web/app/(app)/n/[id]/resena/Escribir.tsx";
    if (existsSync(r) && !/if \(rubro === "ninos" && fotos\.length\) return no\(/.test(readFileSync(r, "utf8"))) falla("ninosSinFotoPublica", r, 0, "una reseña de un lugar de niños no puede guardar fotos");
    if (existsSync(a) && !/PRIVADA = \(r: RubroAyuda\) => [^\n]*r === "ninos"/.test(readFileSync(a, "utf8"))) falla("ninosSinFotoPublica", a, 0, "las fotos de una ayuda de Niños tienen que ser privadas");
    if (existsSync(ui) && !/rub === "ninos" \? await subirFotoPrivada/.test(readFileSync(ui, "utf8"))) falla("ninosSinFotoPublica", ui, 0, "la ayuda de Niños sube la foto como privada");
    if (existsSync(esc) && !/rub === "ninos" \? null : fotosB/.test(readFileSync(esc, "utf8"))) falla("ninosSinFotoPublica", esc, 0, "la reseña de Niños no ofrece subir fotos");
    for (const f of codigo) if (/^apps\/web\//.test(f)) readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/owner_kind\s*=\s*'(nino|child|kid)'/.test(l)) falla("ninosSinFotoPublica", f, i + 1, "no existe media de un niño"); });
  },

  /* 4ef · Cada número que tiene Ayuda (hrefAyuda: C-, M-, A-, F-, V-, N-, I-…) se reconoce también en el panel: la lista de Hoy lleva a su
     detalle y el bloque de la ayuda dice su rubro. Se cazó con la noche (N-) cayendo en «Cita» y la inscripción (I-) sin nombre. */
  prefijosAyuda() {
    const a = "apps/web/lib/ayuda-cita.ts", p = "apps/web/app/panel/Citas.tsx";
    if (!existsSync(a) || !existsSync(p)) return;
    const h = readFileSync(a, "utf8").split("\n").find((l) => /export const hrefAyuda/.test(l)) ?? "";
    const pref = [...h.matchAll(/startsWith\("([A-Z]{1,3})-"\)/g)].map((m) => m[1]); // 6i: prefijos de más de una letra (EP-)
    const P = readFileSync(p, "utf8"), tipo = P.split("\n").find((l) => /const tipo = \(n: string\)/.test(l)) ?? "", rub = P.split("\n").find((l) => /const rub = c\.citas\?\.det\?\.prof/.test(l)) ?? "";
    for (const x of pref) {
      if (!tipo.includes(`n.startsWith("${x}-")`)) falla("prefijosAyuda", p, 0, `la lista de ayudas de Hoy no reconoce los números ${x}- (llevan a «Cita»)`);
      if (!rub.includes(`numero.startsWith("${x}-")`)) falla("prefijosAyuda", p, 0, `el bloque de ayuda del panel no sabe el rubro de los números ${x}-`);
    }
  },

  /* 4eg · Una ayuda que pasa a To'Latino entra a la cola de su motivo («Cuidado de niños», «No me dejan cancelar» o Soporte): nadie
     escribe la cola a mano al insertar un help_request (se usa COLA_AYUDA_SQL de lib/colas.ts). */
  colaAyudaRuteada() {
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/[^/]+\.ts$/.test(f) || f.endsWith("/colas.ts")) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/'(sop|cuidado|salir|estafa)',\s*'help_request'/.test(l)) falla("colaAyudaRuteada", f, i + 1, "la cola de una ayuda sale de su motivo (COLA_AYUDA_SQL), no se escribe a mano"); });
    }
    // 4if · «Me cobraron por ver», «Pidieron más para mudarme» y «Me pidieron dinero por la ayuda» (Iglesias) van a «Posible estafa».
    const C = "apps/web/lib/colas.ts";
    if (existsSync(C)) {
      const t = readFileSync(C, "utf8"), sql = t.split("\n").find((l) => /export const COLA_AYUDA_SQL/.test(l)) ?? "";
      if (!/when h\.reason in \('ver', 'mudar'\) or \(h\.reason = 'cobro' and b\.category_id = 'NEG-FE'\) then 'estafa'/.test(sql)) falla("colaAyudaRuteada", C, 0, "COLA_AYUDA_SQL tiene que mandar ver, mudar y el cobro de Iglesias a la cola «Posible estafa»");
      if (!/export const COLAS_AYUDA: Cola\[\] = \[[^\]]*"estafa"/.test(t)) falla("colaAyudaRuteada", C, 0, "«Posible estafa» muestra una ayuda: tiene que estar en COLAS_AYUDA");
    }
  },

  /* 4ia. «La ayuda de la iglesia es gratis; nunca se cobra por despensa, ropa ni oración.» Iglesias no cobra nada en la app: ningún
     depósito (trigger en la base + limpiarFe lo rechaza + el guardado lo pone en 0), «gratis» es $0, el donativo y el total son > 0 y el
     total solo en funerarias; la línea fija y «si no puedes, no se cobra» están verbatim; ningún texto de Iglesias dice que se cobra; la
     semilla no siembra un depósito; y una misa o un culto nunca se queda sin horario. */
  ayudaGratisIglesia() {
    const G = "ayudaGratisIglesia", dir = "packages/db/migrations";
    if (!readdirSync(dir).some((x) => /create trigger items_fe_sin_deposito[\s\S]*category_id = 'NEG-FE'|category_id = 'NEG-FE'[\s\S]*create trigger items_fe_sin_deposito/.test(readFileSync(`${dir}/${x}`, "utf8"))))
      falla(G, dir, 0, "falta el trigger items_fe_sin_deposito: ningún ítem de NEG-FE lleva depósito");
    const sv = "apps/web/lib/servicios.ts";
    if (existsSync(sv)) {
      const s = readFileSync(sv, "utf8"), f = /export function limpiarFe[\s\S]*?\n}\n/.exec(s)?.[0] ?? "";
      if (!f) falla(G, sv, 0, "falta limpiarFe (el servidor valida los servicios de Iglesias)");
      else {
        if (!/if \(Number\(x\.dep\) > 0\) return \{ ok: false/.test(f)) falla(G, sv, 0, "limpiarFe tiene que rechazar cualquier depósito");
        if (!/forma === "gratis"\) \{ if \(cents\) return \{ ok: false/.test(f)) falla(G, sv, 0, "«gratis» tiene que ser $0");
        if (!/forma === "don"\) \{ if \(!cents\) return \{ ok: false/.test(f)) falla(G, sv, 0, "el donativo sugerido tiene que tener monto (si no, es gratis)");
        if (!/forma === "tot"\) \{\s*if \(!funeraria\) return \{ ok: false/.test(f)) falla(G, sv, 0, "el precio total es solo de las funerarias");
        if (/deposit_cents|a\.dep\s*=/.test(f)) falla(G, sv, 0, "limpiarFe no pone depósito");
      }
    }
    const ac = "apps/web/app/panel/acciones-servicios.ts";
    if (existsSync(ac) && !/if \(rub === "fe"\) await c\.query\(`update items set deposit_cents = 0/.test(readFileSync(ac, "utf8"))) falla(G, ac, 0, "al guardar un servicio de Iglesias el depósito queda en 0");
    const co = "apps/web/lib/fe-comun.ts";
    if (existsSync(co)) {
      const s = readFileSync(co, "utf8");
      if (!s.includes("La ayuda de la iglesia es gratis; nunca se cobra por despensa, ropa ni oración.")) falla(G, co, 0, "la línea fija de Iglesias (§1c) va verbatim");
      if (!/DONATIVO: Bi = \{ es: "Donativo sugerido · si no puedes, no se cobra\."/.test(s)) falla(G, co, 0, "el donativo siempre dice «si no puedes, no se cobra»");
    }
    // Ningún texto de Iglesias dice que se cobra: «cobra», «charge» solo negados.
    for (const f of codigo) {
      if (!/^apps\/web\/(lib\/fe(-comun|-publico)?\.ts|app\/panel\/(Fe\.tsx|acciones-fe\.ts)|app\/\(app\)\/n\/\[id\]\/Fe\.tsx)$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\/?\*)/.test(l)) return;
        for (const m of l.matchAll(/"[^"\n]*(cobr|charg)[^"\n]*"/gi)) if (!/(no|nunca|nada)( se| lo)? cobr|no cobran|not charge|never charged|no charge|nothing is charged/i.test(m[0])) falla(G, f, i + 1, `texto de Iglesias que habla de cobrar sin negarlo: ${m[0].slice(0, 80)}`);
      });
    }
    const fe = "apps/web/lib/fe.ts";
    if (existsSync(fe) && !/if \(pideUnHorario\(h\.kind\) && !quedan\(/.test(readFileSync(fe, "utf8"))) falla(G, fe, 0, "una misa o un culto no se queda sin horario (al menos uno)");
    const sem = "infra/pruebas/semilla/0027_fe.sql";
    if (existsSync(sem)) readFileSync(sem, "utf8").split("\n").forEach((l, i) => {
      if (/insert into items/.test(l) && !/::jsonb, 0, '\{[^']*\}'::text\[\], \d+\) returning id into it;$/.test(l)) falla(G, sem, i + 1, "la semilla de Iglesias no siembra depósitos");
      if (/"dep":/.test(l)) falla(G, sem, i + 1, "la semilla de Iglesias no siembra depósitos");
    });
  },

  licenciaNoSeFinge() {
    const dir = "packages/db/migrations";
    const ult = readdirSync(dir).filter((x) => x.endsWith(".sql")).sort().filter((x) => /function licencias_refrescar/.test(readFileSync(`${dir}/${x}`, "utf8"))).pop();
    if (!ult || !/pa_dhs_childcare/.test(readFileSync(`${dir}/${ult}`, "utf8"))) falla("licenciaNoSeFinge", `${dir}/${ult ?? ""}`, 0, "licencias_refrescar no deriva «lic» de Niños de la licencia del DHS");
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
        if (/\.add\(\s*["']lic["']\s*\)|filter_values\s*\|\|\s*'\{?lic|array_append\([^)]*'lic'\)/.test(l)) falla("licenciaNoSeFinge", f, i + 1, "«lic» lo pone la base desde una licencia verificada (licencias_refrescar), nunca el código");
      });
    }
    // 4id · Los sellos de las fichas de Iglesias, Bienes Raíces y Autos salen SOLO de una licencia «valid».
    for (const f of ["apps/web/lib/fe-publico.ts", "apps/web/lib/inmuebles-publico.ts", "apps/web/lib/autos-publico.ts"]) {
      if (!existsSync(f)) continue;
      for (const m of readFileSync(f, "utf8").matchAll(/from licenses l[^`]*`/g)) if (!/l\.status = 'valid'/.test(m[0])) falla("licenciaNoSeFinge", f, 0, "un sello público sale solo de una licencia verificada (l.status = 'valid')");
    }
    const sem = "infra/pruebas/semilla/0025_ninos.sql";
    if (existsSync(sem) && !/select licencias_refrescar\(id\) from businesses where category_id = 'NEG-NINOS'/.test(readFileSync(sem, "utf8"))) falla("licenciaNoSeFinge", sem, 0, "la semilla de Niños no rehace «lic» desde las licencias al final");
  },

  /* 4eb. Datos de menores: la app nunca guarda fecha de nacimiento, alergias, medicinas, diagnósticos, vacunas, número de Medicaid
     ni seguro social de un niño (fase4-edu-ninos-deporte.md §3). Ninguna columna ni campo con esos nombres en el esquema de
     inscripciones y niños ni en su código. */
  ninosSinDatosSensibles() {
    const MAL = /\b(birth_?date|date_of_birth|dob|fecha_?nac\w*|alergias?|allerg\w*|medicat\w*|medicinas?|diagnos\w*|vacunas?|vaccin\w*|medicaid_(id|num|number)|ssn|seguro_social)\b/i;
    const dir = "packages/db/migrations";
    const F = [...readdirSync(dir).filter((x) => x.endsWith(".sql") && x >= "0085").map((x) => `${dir}/${x}`), ...codigo.filter((f) => /^apps\/web\/lib\/(ninos|inscripciones|edu)[^/]*\.ts$|^apps\/web\/app\/panel\/(Ninos|Edu|acciones-ninos|acciones-edu)\.tsx?$/.test(f))];
    // Sin comentarios (de bloque y de línea, conservando los saltos para que el número de línea siga siendo el del archivo).
    for (const f of F) readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).split("\n").forEach((l, i) => {
      if (/^\s*(--|\/\/)/.test(l)) return;
      const sinTexto = l.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""');
      const m = MAL.exec(sinTexto); if (m) falla("ninosSinDatosSensibles", f, i + 1, `«${m[0]}»: la app no guarda datos médicos ni de identidad de un niño`);
    });
  },

  /* 4eb. El nombre y la nota de un niño solo se tocan en lib/ninos-privado.ts (cifrados en op_private con motivo 'nino'). */
  ninosNotaCifrada() {
    const solo = "apps/web/lib/ninos-privado.ts";
    if (!existsSync(solo)) return falla("ninosNotaCifrada", solo, 0, "falta el único módulo que toca los datos de los niños");
    if (!/cifrar\(/.test(readFileSync(solo, "utf8"))) falla("ninosNotaCifrada", solo, 0, "los datos del niño se guardan sin cifrar");
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f) || f === solo) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/op_private[^;]*'nino'|reason\s*=\s*'nino'/.test(l)) falla("ninosNotaCifrada", f, i + 1, "los datos de un niño solo se tocan en lib/ninos-privado.ts"); });
    }
  },

  /* 4eb. Un SMS o una notificación se ve con el teléfono bloqueado: ningún aviso de inscripción lleva el nombre del niño ni la nota. */
  avisoNinosNeutro() {
    const dir = "packages/db/migrations";
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql"))) readFileSync(`${dir}/${x}`, "utf8").split("\n").forEach((l, i) => {
      if (/\('(biz_)?insc_\w+'/.test(l) && /\{(nino|nina|hijo|nota)\}/.test(l)) falla("avisoNinosNeutro", `${dir}/${x}`, i + 1, "un aviso de inscripción no lleva el nombre del niño ni la nota");
    });
    for (const f of codigo) {
      if (!/^apps\/web\/lib\//.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/avisar\w*\([^)]*["'](biz_)?insc_/.test(l) && /\b(nino|nota)\s*:/.test(l)) falla("avisoNinosNeutro", f, i + 1, "un aviso de inscripción no lleva el nombre del niño ni la nota"); });
    }
  },

  matriculaMenor() {
    const dir = "packages/db/migrations";
    const hay = readdirSync(dir).some((x) => /items_matricula_check[\s\S]*svc_kind is distinct from 'curso' or deposit_cents < price_cents/.test(readFileSync(`${dir}/${x}`, "utf8")));
    if (!hay) falla("matriculaMenor", dir, 0, "falta el check items_matricula_check (la matrícula de un curso < su precio)");
    for (const f of ["apps/web/lib/servicios.ts", "apps/web/lib/edu.ts"]) if (existsSync(f) && !/(dep|v) >= (cents|it\.cents)|v < it\.cents|dep >= cents/.test(readFileSync(f, "utf8"))) falla("matriculaMenor", f, 0, "el servidor no valida que la matrícula sea menos que el precio");
  },

  asientosDerivados() {
    for (const f of codigo) {
      // 4ea: también los cupos de los grupos (class_groups.seats_booked): solo el motor de inscripciones (lib/inscripciones*.ts).
      if (!/^apps\/web\//.test(f) || /^apps\/web\/lib\/(transporte|viajes|inscripciones)[^/]*\.ts$/.test(f) || f === "apps/web/lib/visitas-inm.ts") continue; // 4ie: las horas de visita y de prueba (lib/visitas-inm.ts, con su candado)
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/seats_booked\s*=(?!=)/.test(l)) falla("asientosDerivados", f, i + 1, "«seats_booked» es derivado: solo lo escriben los motores de Transporte (lib/transporte*.ts, lib/viajes*.ts) e Inscripciones (lib/inscripciones*.ts)"); });
    }
  },

  /* 4y. El panel decía «ESPERAN TU RESPUESTA 0 · Nada pendiente» con un viaje esperando: cada categoría con su propio bloque
     «… QUE ESPERAN TU RESPUESTA» (fiestas, viajes…) debe sumar en la cifra de Hoy (Pedidos.tsx, const otros). */
  esperanCuentan() {
    const ped = "apps/web/app/panel/Pedidos.tsx";
    if (!existsSync(ped)) return;
    const otros = readFileSync(ped, "utf8").split("\n").find((l) => /const otros =/.test(l)) ?? "";
    for (const f of codigo) {
      if (!/^apps\/web\/app\/panel\/[^/]+\.tsx$/.test(f) || f === ped) continue;
      const t = readFileSync(f, "utf8");
      if (!/QUE ESPERAN TU RESPUESTA/.test(t)) continue;
      const keys = [...new Set([...t.matchAll(/c\.(\w+)\?\.hoy/g)].map((m) => m[1]))];
      for (const k of keys) if (!otros.includes(`c.${k}?.hoy`)) falla("esperanCuentan", f, 0, `lo que espera en «c.${k}?.hoy» no suma en «ESPERAN TU RESPUESTA» de Hoy (Pedidos.tsx, const otros)`);
    }
  },

  /* 4y-3. Super Admin › Transacciones mostraba «Devolver» en fiestas y viajes, pero el servidor solo devolvía pedidos y citas
     («Ese pedido no existe»). Los tipos que la pantalla deja devolver (DEVUELVE) son exactamente los que devolverTx acepta. */
  /* 4ne. Una cola nueva en lib/colas.ts que la base no acepta (queue_items_queue_check) revienta al abrir el primer caso, y
     nadie lo ve hasta que pasa de verdad. Toda cola del tipo Cola está en el check de la última migración que lo redefine. */
  colasEnLaBase() {
    const f = "apps/web/lib/colas.ts";
    if (!existsSync(f)) return;
    const m = /export type Cola = ([^;]+);/.exec(readFileSync(f, "utf8"));
    if (!m) return falla("colasEnLaBase", f, 0, "no encuentro el tipo Cola");
    const colas = [...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1]);
    const dir = "packages/db/migrations", migs = readdirSync(dir).filter((x) => x.endsWith(".sql")).sort();
    let check = null, donde = null;
    for (const x of migs) { const t = readFileSync(`${dir}/${x}`, "utf8"), c = [...t.matchAll(/add constraint queue_items_queue_check check \(([^;]+)\);/g)].pop(); if (c) { check = c[1]; donde = x; } }
    if (!check) return falla("colasEnLaBase", dir, 0, "ninguna migración define queue_items_queue_check");
    const base = new Set([...check.matchAll(/'(\w+)'/g)].map((x) => x[1]));
    for (const k of colas) if (!base.has(k)) falla("colasEnLaBase", `${dir}/${donde}`, 0, `la cola «${k}» está en lib/colas.ts pero queue_items_queue_check no la acepta`);
  },

  /* 4ne. Transacciones lista un tipo de operación nuevo pero la pantalla no tiene su nombre: la fila sale «undefined N-…».
     Cada kind que lee lib/admin-tx.ts tiene su etiqueta en el título de app/admin/Transacciones.tsx. */
  txConNombre() {
    const srv = "apps/web/lib/admin-tx.ts", ui = "apps/web/app/admin/Transacciones.tsx";
    if (!existsSync(srv) || !existsSync(ui)) return;
    const m = /const DESDE = `[^`]*o\.kind in \(([^)]*)\)/.exec(readFileSync(srv, "utf8"));
    if (!m) return falla("txConNombre", srv, 0, "no encuentro la lista de tipos de DESDE");
    const t = /title: `\$\{\(\{ ([^}]*) \} as Record<string, string>\)\[x\.k\]\}/.exec(readFileSync(ui, "utf8"));
    if (!t) return falla("txConNombre", ui, 0, "no encuentro el mapa de nombres del título");
    const nombres = new Set([...t[1].matchAll(/(\w+): /g)].map((x) => x[1]));
    for (const k of [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1])) if (!nombres.has(k)) falla("txConNombre", ui, 0, `Transacciones lee «${k}» pero el título no tiene su nombre`);
  },

  devolverCoincide() {
    const ui = "apps/web/app/admin/Transacciones.tsx", srv = "apps/web/app/admin/acciones-tx.ts";
    if (!existsSync(ui) || !existsSync(srv)) return;
    const m = /const DEVUELVE = new Set\(\[([^\]]*)\]\)/.exec(readFileSync(ui, "utf8"));
    if (!m) return falla("devolverCoincide", ui, 0, "falta la lista DEVUELVE de lo que se puede devolver");
    const a = new Set([...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1]));
    const f = readFileSync(srv, "utf8"), i = f.indexOf("export async function devolverTx"), cuerpo = f.slice(i, f.indexOf("\n}", i));
    const b = new Set([...cuerpo.matchAll(/o\.kind (?:= '(\w+)'|in \(([^)]*)\))/g)].flatMap((x) => x[1] ? [x[1]] : [...x[2].matchAll(/'(\w+)'/g)].map((y) => y[1])));
    for (const k of a) if (!b.has(k)) falla("devolverCoincide", ui, 0, `la pantalla deja devolver «${k}» pero devolverTx no lo acepta`);
    for (const k of b) if (!a.has(k)) falla("devolverCoincide", srv, 0, `devolverTx acepta «${k}» pero la pantalla no muestra «Devolver»`);
    // 6d · Boletos: devolver por monto desde Transacciones dejaría boletos vivos y la existencia sin volver. Los boletos se devuelven solo por
    // lib/boletos-despues.ts (el comprador, el panel); lo de un caso de ayuda B- es dinero sin tocar los boletos (decidirSop).
    if (a.has("tickets") || b.has("tickets")) falla("devolverCoincide", srv, 0, "Transacciones no devuelve boletos por monto: se devuelven por boleto (lib/boletos-despues.ts)");
    const pe = "apps/web/app/panel/EventosPanel.tsx", ae = "apps/web/app/panel/acciones-eventos.ts";
    if (existsSync(pe) && existsSync(ae)) {
      const ui6 = readFileSync(pe, "utf8"), sv6 = readFileSync(ae, "utf8");
      if (/evtDevolver\(/.test(ui6) !== /export async function evtDevolver[\s\S]*?devolverDesdePanel\(/.test(sv6)) falla("devolverCoincide", pe, 0, "«Devolver» del panel de eventos y su acción (devolverDesdePanel) tienen que ir juntos");
      // 6e: dentro del cuerpo de cada acción (otra acción más abajo que también pide «pay» no cuenta).
      for (const fn of ["evtDevolver", "evtCancelar"]) if (/export async function evtCancelar/.test(sv6) || fn === "evtDevolver") if (!/if \(!\(await accesoPanel\(a\.negocio\.id, "pay"\)\)\) return no\(/.test(cuerpoFn(sinComent(ae), fn))) falla("devolverCoincide", ae, 0, `«${fn}» devuelve dinero: pide la parte de Cobros`);
    }
  },

  /* Barrido central (0078). Los vencimientos solo corrían al abrir una página: una retención podía quedarse sin liberar si
     nadie miraba. Todo barrido exportado (vencer*, barrer*, escalar*) de lib/ tiene que estar en lib/barrido.ts. */
  barridoCompleto() {
    const B = "apps/web/lib/barrido.ts";
    if (!existsSync(B)) return falla("barridoCompleto", B, 0, "falta el barrido central");
    const t = readFileSync(B, "utf8");
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/[^/]+\.ts$/.test(f) || f === B) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        const m = /^export async function ((?:vencer|barrer|escalar)\w*)\(/.exec(l);
        if (m && !t.includes(`.${m[1]}(`)) falla("barridoCompleto", f, i + 1, `«${m[1]}» no corre en el barrido central (lib/barrido.ts): sin él, solo vence cuando alguien abre una página`);
      });
    }
  },

  /* 4z-2. /fiesta/… y /viaje/… pintaban la barra inferior de la app encima de su propia barra (no se podía tocar «Enviar»).
     Toda pantalla de detalle /X/[num] de la app va en la lista «compacto» de AppShell (sin barra inferior en el teléfono). */
  detalleSinBarra() {
    const A = "apps/web/app/(app)/AppShell.tsx";
    if (!existsSync(A)) return;
    const m = /const compacto = [^\n]*\/\^\\\/\(([^)]*)\)/.exec(readFileSync(A, "utf8"));
    if (!m) return falla("detalleSinBarra", A, 0, "no encuentro la lista «compacto»");
    const lista = m[1];
    for (const d of readdirSync("apps/web/app/(app)")) {
      if (!existsSync(`apps/web/app/(app)/${d}/[num]`)) continue;
      if (!lista.includes(`${d}\\/`)) falla("detalleSinBarra", A, 0, `/${d}/[num] no está en «compacto»: la barra inferior tapa su pantalla en el teléfono`);
    }
  },

  /* 4z-3. La pestaña «Fiestas y Transporte» de Analítica se veía pero el servidor no la tenía en su lista (TABS) y mostraba el
     Resumen. Cada pestaña de la pantalla está en la lista del servidor. */
  pestanasAnalitica() {
    const ui = "apps/web/app/admin/Analitica.tsx", pg = "apps/web/app/admin/analitica/page.tsx";
    if (!existsSync(ui) || !existsSync(pg)) return;
    const m = /type: "tabs", items: \(\[([\s\S]*?)\] as const\)/.exec(readFileSync(ui, "utf8")), t = /const TABS = new Set\(\[([^\]]*)\]\)/.exec(readFileSync(pg, "utf8"));
    if (!m || !t) return falla("pestanasAnalitica", ui, 0, "no encuentro las pestañas o la lista TABS");
    const srv = new Set([...t[1].matchAll(/"(\w+)"/g)].map((x) => x[1]));
    for (const k of [...m[1].matchAll(/\["(\w+)", "/g)].map((x) => x[1])) if (!srv.has(k)) falla("pestanasAnalitica", pg, 0, `la pestaña «${k}» se ve en la pantalla pero el servidor no la tiene en TABS`);
  },

  /* 4v. Dos clientes piden el mismo sábado: si dos funciones confirman a la vez sin el candado del día, quedan dos fiestas
     donde cabe una. Toda función que ocupa un día (insert into party_days … 'booking') toma antes el candado
     «fiesta:{negocio}:{día}». */
  candadoFiesta() {
    const f = "apps/web/lib/fiestas-reservas.ts";
    if (!existsSync(f)) return;
    for (const p of readFileSync(f, "utf8").split(/\nexport async function /).slice(1)) {
      const nombre = p.slice(0, p.indexOf("(")), i = p.search(/insert into party_days/), j = p.search(/pg_advisory_xact_lock\(hashtext\('fiesta:'/);
      if (i >= 0 && (j < 0 || j > i)) falla("candadoFiesta", f, 0, `«${nombre}» ocupa un día sin tomar antes el candado del día (fiesta:{negocio}:{día})`);
    }
  },

  /* 4v. La reparación de pagos liberaba el depósito de una solicitud con otra hora propuesta (change_proposed) mientras el
     cliente decidía: luego aceptaba y quedaba confirmada sin dinero. Una consulta que libera o cobra lo «retenido» de
     operaciones que «ya no siguen» tiene que dejar fuera las vivas: pending Y change_proposed. */
  reparaVivas() {
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/.*\.ts$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/status = 'held'/.test(l) && /o\.status <> 'pending'/.test(l)) falla("reparaVivas", f, i + 1, "trata como muerta una solicitud con otra hora propuesta: excluye también 'change_proposed'");
      });
    }
  },

  /* 4u. «Se cobra al enviar»: el prototipo de Fiestas lo decía y Belleza y Hogar lo copiaron, pero el depósito de una
     solicitud se RETIENE al enviar y se cobra cuando confirman (citas.ts, visitas.ts). Un texto que diga que se cobra al
     enviar le miente al cliente sobre su dinero. («Se cobra al enviarlo», del envío de una tienda, sí es cierto.) */
  depositoRetenido() {
    const MAL = /se cobra al enviar(?!lo)|charged (when you send|on sending|when sending)/i;
    const ver = (f) => readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (MAL.test(l)) falla("depositoRetenido", f, i + 1, "dice que el depósito se cobra al enviar: se retiene al enviar y se cobra cuando confirman"); });
    for (const f of archivos) if ((/^apps\/web\/(app|lib)\/.*\.tsx?$/.test(f) && !/(lib\/pedir\.ts|pagar\/Pagar\.tsx)$/.test(f)) || /^docs\/ayuda\/.*\.md$/.test(f)) ver(f);
  },

  /* 4t. «Libre el 3 oct» y «Libre este sábado (26 sep)»: la página de Fiestas traía las fechas del día de la demo del
     prototipo, fijas para siempre. Un texto de la taxonomía no lleva una fecha del calendario: la fecha sale de los datos. */
  fechaFijaTaxonomia() {
    const f = "packages/taxonomy/paginas.json";
    if (!existsSync(f)) return;
    const M = "(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
    readFileSync(f, "utf8").split("\n").forEach((l, i) => {
      if (/"(es|en)":/.test(l) && new RegExp(`\\b\\d{1,2} ${M}\\b|\\b${M} \\d{1,2}\\b`).test(l)) falla("fechaFijaTaxonomia", f, i + 1, "un texto de la taxonomía trae una fecha fija (del prototipo); la fecha tiene que salir de los datos");
    });
  },

  /* 4h-3. «LO PONE DRA.»: el primer nombre de un profesional se sacaba con split(" ")[0] y salía el título (Dra., Lcdo.).
     El nombre corto de quien atiende (equipo, «quien» de una cita o solicitud) sale de primerNombre (lib/nombre.ts). */
  nombreConTitulo() {
    for (const f of codigo) {
      if (!/^apps\/web\/app\/(\(app\)\/|panel\/Equipo\.tsx)/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/(quien|\bname)\??( \?\? "")?\)?\??\.split\(" "\)\[0\]|first = \(n: string\) => n\.split/.test(l)) falla("nombreConTitulo", f, i + 1, "el nombre de un profesional puede empezar con su título (Dra., Lcdo.): usa primerNombre de lib/nombre.ts"); });
    }
  },

  /* 4h-2. La pestaña «Lo que vende» del 360 solo salía para Comida, Belleza y Profesionales: lo de Auto, Hogar y Doctores
     estaba construido pero nadie llegaba (solo escribiendo la dirección). La pestaña y su contenido salen de la misma lista
     (VENDE); ninguna rama «tab === "vende"» nombra una categoría que la lista no tenga, y la línea de pestañas no compara
     categorías a mano. */
  pestanaVende() {
    const F = "apps/web/app/admin/N360.tsx";
    if (!existsSync(F)) return;
    const src = readFileSync(F, "utf8"), L = src.split("\n");
    const lista = (n) => { const m = new RegExp(`const ${n} = \\[([^\\]]*)\\]`).exec(src); return m ? m[1].split(",").map((x) => x.trim()) : null; };
    // Cualquier sub-lista (...VENDE_SVC, ...VENDE_RET) se abre: antes solo se abría la de Salud/Pro.
    const todo = (lista("VENDE") ?? []).flatMap((x) => (x.startsWith("...") ? lista(x.slice(3)) ?? [] : [x])).map((x) => x.replace(/"/g, ""));
    if (!todo.length) { falla("pestanaVende", F, 1, "falta la lista VENDE de categorías con «Lo que vende»"); return; }
    L.forEach((l, i) => {
      if (/\["vende", "Lo que vende"\]/.test(l) && !/VENDE\.includes\(n\.cat_id\)/.test(l)) falla("pestanaVende", F, i + 1, "la pestaña «Lo que vende» tiene que salir de VENDE.includes(n.cat_id)");
      if (/tab === "vende"/.test(l)) for (const c of l.matchAll(/"(NEG-[A-Z]+)"/g)) if (!todo.includes(c[1])) falla("pestanaVende", F, i + 1, `«Lo que vende» de ${c[1]} existe pero su pestaña no sale: agrégalo a VENDE`);
    });
  },

  /* 4f-3. Dos barras fijas abajo en la misma pantalla: la pestaña Tienda trae su barra «Tu apartado» y la barra de Booking
     de la ficha la tapaba (no se podía tocar). Cada pestaña cuyo componente pinta su propia barra fija tiene que quedar fuera
     de las barras generales de la ficha (`tab !== "id"`). */
  barraDoble() {
    const F = "apps/web/app/(app)/n/[id]/Ficha.tsx";
    if (!existsSync(F)) return;
    const src = readFileSync(F, "utf8"), L = src.split("\n");
    const imp = Object.fromEntries([...src.matchAll(/import \{([^}]+)\} from "\.\/(\w+)"/g)].flatMap((m) => m[1].split(",").map((x) => [x.trim().replace(/^type /, ""), m[2]])));
    const propias = [];
    L.forEach((l, i) => { const t = /tab === "(\w+)"/.exec(l); if (!t) return; const sig = `${l}\n${L[i + 1] ?? ""}`; for (const c of sig.matchAll(/<(\w+Tab)\b/g)) { const file = imp[c[1]]; if (!file) continue; const p = `apps/web/app/(app)/n/[id]/${file}.tsx`; if (existsSync(p) && /fixed inset-x-0 bottom-0/.test(readFileSync(p, "utf8"))) propias.push(t[1]); } });
    L.forEach((l, i) => { const b = /<(\w+)Barra\b/.exec(l); if (!b || /tab === "/.test(l)) return; for (const id of new Set(propias)) if (!l.includes(`tab !== "${id}"`)) falla("barraDoble", F, i + 1, `la barra ${b[1]}Barra se pinta también en la pestaña «${id}», que tiene su propia barra fija: agrega tab !== "${id}"`); });
  },

  /* 4d. Lo mismo en los bloques del panel (packages/ui/src/panel): un «role=button» sin foco ni teclado. Los −/+ ya son
     botones de verdad; el resto va al bloque de accesibilidad (LAUNCH-CHECKLIST). Trinquete: no puede subir. */
  panelClicMudo() {
    const TOPE = 18, f = "packages/ui/src/panel/Bloques.tsx";
    if (!existsSync(f)) return;
    const n = readFileSync(f, "utf8").split("\n").reduce((k, l) => k + [...l.matchAll(/role="button"(?![^>]*tabIndex)/g)].length, 0);
    if (n > TOPE) falla("panelClicMudo", f, 1, `${n} «role=button» sin foco en los bloques del panel (tope ${TOPE}): usa <button type="button">`);
  },

  /* 3o-bis. Clics mudos del sistema de diseño portado: un onClick en un <div>/<span> sin rol no lo usa ni el teclado ni un
     lector de pantalla (6 nov, 3b: día, hora, persona, opción y extra del Booking). Los de reserva y Chip ya se corrigieron en
     scripts/portar-sistema.mjs; los demás (fondos de hojas, cruces, filas) van en el bloque de accesibilidad del sistema
     (LAUNCH-CHECKLIST). Trinquete: el número no puede subir; cuando baja, se baja el tope aquí. */
  sistemaClicMudo() {
    const TOPE = 190;
    let n = 0;
    const recorrer = (d) => { for (const x of readdirSync(d)) { const p = join(d, x); if (statSync(p).isDirectory()) recorrer(p); else if (p.endsWith(".js")) {
      const L = readFileSync(p, "utf8").split("\n");
      L.forEach((l, i) => { if (/^\s*onClick:/.test(l) && !/role:|\.\.\.btn\(|\.\.\.\(on[A-Z]\w* \? \{ role/.test(L.slice(i, i + 3).join("\n"))) n++; });
    } } };
    if (existsSync("packages/ui/src/ds")) recorrer("packages/ui/src/ds");
    if (n > TOPE) falla("sistemaClicMudo", "packages/ui/src/ds", 1, `${n} clics sin rol en el sistema portado (tope ${TOPE}): dale rol, foco y teclado en scripts/portar-sistema.mjs`);
    else if (n < TOPE) console.log(`  (sistemaClicMudo: bajó a ${n}; baja el TOPE en guardianes/run.mjs)`);
  },

  /* 3o. Todo interruptor (role="switch") se usa con teclado: si no es un <button>, lleva tabIndex y onKeyDown; si es un
     <span> suelto, además su nombre (aria-label). 6 nov, 2p: el de «Respuesta automática» y otros cuatro no tenían. */
  interruptorAccesible() {
    for (const f of codigo) {
      if (!/\.tsx$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        const m = l.match(/<(\w+) [^>]*role="switch"[^>]*>/);
        if (!m || m[1] === "button") return;
        if (!/tabIndex=/.test(l) || !/onKeyDown=/.test(l)) falla("interruptorAccesible", f, i + 1, "interruptor sin tabIndex u onKeyDown (no se puede usar con teclado)");
        else if (m[1] === "span" && !/aria-label/.test(l)) falla("interruptorAccesible", f, i + 1, "interruptor sin nombre (aria-label)");
      });
    }
  },

  /* 3p. Correo (6 nov, 2q): los colores del correo (hex, porque los clientes de correo no leen variables) son los mismos
     que los tokens; y el modo «pruebas» (el correo no sale) nunca puede existir en producción. */
  correo() {
    const f = "apps/web/lib/correo/colores.ts";
    if (existsSync(f)) {
      const tok = readFileSync("packages/ui/src/tokens.css", "utf8");
      for (const m of readFileSync(f, "utf8").matchAll(/(\w+): "(#[0-9A-Fa-f]{6})"/g)) {
        const t = tok.match(new RegExp(`--tl-${m[1]}:\\s*(#[0-9A-Fa-f]{6})`));
        if (!t || t[1].toUpperCase() !== m[2].toUpperCase()) falla("correo", f, 0, `el color «${m[1]}» del correo no es igual a --tl-${m[1]} de tokens.css`);
      }
    }
    const i = "apps/web/lib/correo/index.ts";
    if (existsSync(i) && !/if \(ENTORNO !== "produccion" && process\.env\.TOLATINO_CORREO_MODO !== "ses"\) return "pruebas";/.test(readFileSync(i, "utf8")))
      falla("correo", i, 0, "el modo pruebas del correo debe depender de ENTORNO !== \"produccion\" (nunca en producción)");
  },

  /* 4na. El cover que vio el cliente tiene que poder probarse («el cover que publicó esa noche a esa hora»): cada cambio de «Esta
     noche» deja su fila en night_posts en la misma transacción, y night_posts no se edita ni se borra. Nadie más escribe el cover,
     la edad, la lista, la fila, la música o la vestimenta de noche_settings que lib/noche.ts (guardarNoche). */
  coverConHistoria() {
    const L = "apps/web/lib/noche.ts", M = "packages/db/migrations/0081_noche_servicios.sql";
    if (!existsSync(L)) return;
    const t = readFileSync(L, "utf8"), i = t.indexOf("export async function guardarNoche"), g = t.slice(i, t.indexOf("\n}\n", i));
    if (i < 0 || !/insert into night_posts/.test(g)) falla("coverConHistoria", L, 0, "guardarNoche no deja su fila en night_posts");
    if (existsSync(M) && !/before update or delete on night_posts/.test(readFileSync(M, "utf8"))) falla("coverConHistoria", M, 0, "night_posts debe ser solo inserción (trigger)");
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, n) => {
        if (/(update|delete from)\s+night_posts/i.test(l)) falla("coverConHistoria", f, n + 1, "night_posts es solo inserción");
        if (f !== L && /update noche_settings set/i.test(l) && /(cover|after_|min_age|list_|line_|music|dress)/.test(l)) falla("coverConHistoria", f, n + 1, "«Esta noche» solo se cambia con guardarNoche (deja su historia en night_posts)");
      });
    }
  },

  /* 4na. «Fila ahora» solo si el local la puso hace 60 minutos o menos (Preguntas #4); después sale con su hora. El prototipo decía
     «HACE 4 MIN» fijo: ningún texto de «ahora» fuera de filaTexto (lib/noche-comun.ts), y «viva» sale de FILA_VIVA_MIN. */
  filaNoFalsa() {
    const C = "apps/web/lib/noche-comun.ts", L = "apps/web/lib/noche.ts";
    if (!existsSync(C)) return;
    const t = readFileSync(C, "utf8");
    // 5i: el valor vive en Configuración (config_keys · noche_fila_viva_min, 60 de fábrica); la base y lib/noche.ts lo leen de ahí.
    const K = "packages/db/migrations/0105_configuracion_comunidad.sql";
    if (!existsSync(K) || !/\('noche_fila_viva_min', 15, 240, 60,/.test(readFileSync(K, "utf8"))) falla("filaNoFalsa", K, 0, "la fila «ahora» vale 60 minutos de fábrica (config_keys · noche_fila_viva_min)");
    if (!/if \(f\.viva\) return f\.min \? E2\(`Fila ahora/.test(t) || !/if \(f\.viva\) return E2\(`Ahora · lo puso/.test(t) || !/f\.viva \? \(es \? "FILA AHORA"/.test(t)) falla("filaNoFalsa", C, 0, "«Fila ahora» solo dentro de if (f.viva)");
    if (existsSync(L) && !/s\.line_at > now\(\) - make_interval\(mins => \$\{cfgSql\("noche_fila_viva_min"\)\}\)/.test(readFileSync(L, "utf8"))) falla("filaNoFalsa", L, 0, "«viva» se calcula en el servidor con el valor de Configuración (noche_fila_viva_min)");
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f) || f === C) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, n) => { if (/Fila ahora|Line now|(?<!LA )FILA AHORA|LINE NOW|Ahora · lo puso|HACE \d+ MIN/.test(l)) falla("filaNoFalsa", f, n + 1, "la fila «ahora» solo la dice filaTexto (con su hora real)"); });
    }
  },

  /* 4na. La app no vende tragos, botellas ni hookah, ni cobra el cover (Mercados 0064, fase4-noche §3): Noche solo tiene estas
     formas de servicio, y el alta no le ofrece Menú, Tienda ni Pedidos. */
  alcoholNoSeVende() {
    const S = "apps/web/lib/servicios.ts", O = "apps/web/lib/onb/datos.ts";
    if (existsSync(S)) {
      const m = /export const KINDS_NOCHE = \[([^\]]*)\]/.exec(readFileSync(S, "utf8"));
      const k = m ? [...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1]).sort().join(",") : "";
      if (k !== "cover,evento,fecha,lista,mesa,vip") falla("alcoholNoSeVende", S, 0, `Noche vende solo entrada, lista, mesa, VIP, noche especial y por fecha (hay: ${k || "nada"})`);
    }
    if (existsSync(O)) {
      const m = /'NEG-NOCHE': \[([^\]]*)\]/.exec(readFileSync(O, "utf8"));
      if (m && /'(menu|shop|pedidos)'/.test(m[1])) falla("alcoholNoSeVende", O, 0, "el alta de Noche no ofrece Menú, Tienda ni Pedidos (la app no vende tragos)");
    }
    // 6a · Extras de eventos (fase6 §3 y §6 #4): solo detalle · material · servicio · otro, nunca alcohol, botellas ni hookah. La misma
    // lista en lib/evt-comun.ts y en la base (evt_extras_ok, en el check de events.addons_cfg); el servidor rechaza antes de guardar;
    // el editor no sugiere botellas.
    const G = "alcoholNoSeVende", EC = "apps/web/lib/evt-comun.ts", EV = "apps/web/lib/evt.ts", M6 = "packages/db/migrations/0106_eventos_base.sql", ED = "apps/web/app/panel/EventosPanel.tsx";
    if (existsSync(EC) && existsSync(M6)) {
      const ec = sinComent(EC), m6 = readFileSync(M6, "utf8");
      const k = [.../export const EXTRA_KINDS: ExtraKind\[\] = \[([^\]]*)\]/.exec(ec)?.[1]?.matchAll(/"(\w+)"/g) ?? []].map((x) => x[1]).sort().join(",");
      if (k !== "detalle,material,otro,servicio") falla(G, EC, 0, `los extras de un evento son solo detalle, material, servicio u otro (hay: ${k || "nada"})`);
      const re = /export const ALCOHOL = \/(.+)\/;/.exec(ec)?.[1] ?? "";
      for (const w of ["botell", "bottle", "hookah", "trago", "cerveza", "licor", "vino"]) if (!re.includes(w)) falla(G, EC, 0, `ALCOHOL no reconoce «${w}»`);
      const fn = /create or replace function evt_extras_ok\(a jsonb\)[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(m6)?.[1] ?? "";
      if (!fn.includes(`~ '${re}'`)) falla(G, M6, 0, "evt_extras_ok (base) y ALCOHOL (lib/evt-comun.ts) deben ser la misma lista");
      if (!/not in \('detalle', 'material', 'servicio', 'otro'\)/.test(fn)) falla(G, M6, 0, "evt_extras_ok debe rechazar tipos fuera de detalle · material · servicio · otro");
      if (!/addons_cfg\s+jsonb not null default '\[\]' check \(evt_extras_ok\(addons_cfg\)\)/.test(m6)) falla(G, M6, 0, "events.addons_cfg sin el check evt_extras_ok");
    }
    if (existsSync(EV)) { const b = cuerpoFn(sinComent(EV), "normalizar"), iA = b.search(/if \(extras\.some\(esAlcohol\)\) return no\(/), iR = b.search(/return \{ ok: true, d:/);
      if (iA < 0 || iR < 0 || iA > iR) falla(G, EV, 0, "normalizar debe rechazar un extra de alcohol, botellas o hookah antes de guardar"); }
    if (existsSync(ED)) sinComent(ED).split("\n").forEach((l, i) => { if (/ph: [^}]*(Botella|Bottle|[Hh]ookah|Trago|Cubeta)/.test(l)) falla(G, ED, i + 1, "el editor de eventos no sugiere botellas, tragos ni hookah"); });
  },

  /* 4nc. Noche · dinero. To'Latino nunca cobra cover ni lista (solo el depósito de la mesa): la lista va con $0 y el cover no se
     vende; el depósito solo se cobra con la mesa confirmada; el cupo se cuenta dentro del candado de esa mesa y esa noche. */
  coverNuncaEnLaApp() {
    const L = "apps/web/lib/noche-reservas.ts";
    if (!existsSync(L)) return;
    const t = readFileSync(L, "utf8");
    if (!/const dep = lista \|\| !pro \|\| !x\.cuenta \? 0 : s\.dep;/.test(t)) falla("coverNuncaEnLaApp", L, 0, "la lista se anota con $0 (dep = 0 si es lista)");
    if (!/svc_kind in \('lista', 'mesa', 'vip'\)/.test(t)) falla("coverNuncaEnLaApp", L, 0, "solo se reservan lista, mesa y VIP: la entrada (cover) nunca se vende en la app");
    if (/svc_kind in \([^)]*'cover'/.test(t)) falla("coverNuncaEnLaApp", L, 0, "el cover no se vende en la app");
  },
  depositoNoche() {
    const L = "apps/web/lib/noche-reservas.ts";
    if (!existsSync(L)) return;
    const t = readFileSync(L, "utf8");
    for (const m of t.matchAll(/export async function (\w+)\([\s\S]*?\n}\n/g)) {
      const cuerpo = m[0];
      if (/cobrarOperacion\(/.test(cuerpo) && !/set status = 'confirmed'/.test(cuerpo)) falla("depositoNoche", L, 0, `«${m[1]}» cobra el depósito sin confirmar la mesa`);
    }
    if (!/if \(o\.pay === "held"\) await liberarOperacion/.test(t)) falla("depositoNoche", L, 0, "cancelar libera lo retenido");
    if (!/aTiempo = lista \|\| !conf \|\| o\.nowN < Number\(o\.det\.cut \?\? 360\)/.test(t)) falla("depositoNoche", L, 0, "el corte para cancelar se mide con la hora real de esa noche (det.cut)");
  },
  mesasSinSobreventa() {
    const L = "apps/web/lib/noche-reservas.ts";
    if (!existsSync(L)) return;
    const t = readFileSync(L, "utf8"), i = t.indexOf("export async function reservarNoche"), f = t.slice(i, t.indexOf("\n}\n", i));
    const lk = f.indexOf("pg_advisory_xact_lock(hashtext('noche:'"), cu = f.indexOf("await noches(c, x, s)");
    if (i < 0 || lk < 0 || cu < 0 || lk > cu) falla("mesasSinSobreventa", L, 0, "el cupo de mesas se cuenta DENTRO del candado noche:{negocio}:{noche}:{item}");
  },
  /* 4nc. Noche · privacidad. El código de la puerta solo lo ve quien reservó (y la mesa, ya confirmada) y el local; nunca va en un
     SMS. La app no pide fecha de nacimiento ni guarda imágenes de identificación (el 21+ lo revisa la puerta). La noche corta a las 6 AM. */
  codigoPuerta() {
    const L = "apps/web/lib/noche-reservas.ts", M = "packages/db/migrations/0082_noche_reservas.sql";
    if (existsSync(L) && !/code: o\.status === "confirmed" \? o\.code : null/.test(readFileSync(L, "utf8"))) falla("codigoPuerta", L, 0, "el código sale solo con la reserva viva y confirmada");
    if (existsSync(M) && /\{(codigo|code|door)\}/i.test(readFileSync(M, "utf8"))) falla("codigoPuerta", M, 0, "el código de la puerta nunca va en un aviso por SMS");
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f) || f === L || /^apps\/web\/app\/panel\//.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, n) => { if (/door_code/.test(l)) falla("codigoPuerta", f, n + 1, "door_code solo lo leen lib/noche-reservas.ts y el panel"); });
    }
    // 6g: la puerta (lib/puerta*, /puerta, /api/puerta) lee y marca la lista de la noche SOLO por lib/noche-reservas.ts; la lista que le da
    // nunca trae el código, el teléfono ni lo que se paga en el local.
    for (const f of codigo) {
      if (!(/^apps\/web\/lib\/puerta[^/]*\.ts$/.test(f) || /^apps\/web\/app\/(\(puerta\)|api\/puerta)\//.test(f))) continue;
      for (const q of sinComent(f).match(/`[^`]*`/g) ?? []) if (/kind = 'night'/.test(q) && !/^`select [^`]*from operations where id = p_op/.test(q)) falla("codigoPuerta", f, 0, "la puerta lee la lista de la noche solo por lib/noche-reservas.ts");
    }
    if (existsSync(L)) {
      const t = sinComent(L), b = cuerpoFn(t, "listaEnLaPuerta");
      if (!b || /door_code as|o\.door_code\s*,|\bphone\b|_cents/.test(b.replace(/o\.door_code = \$3/, ""))) falla("codigoPuerta", L, 0, "listaEnLaPuerta: busca por el código pero nunca lo devuelve (ni teléfono ni montos)");
      if (!/marcarLlegada/.test(t)) falla("codigoPuerta", L, 0, "falta marcarLlegada (la puerta marca la lista por aquí)");
    }
    const PU = "apps/web/lib/puerta.ts";
    if (existsSync(PU) && (!/import\("\.\/noche-reservas"\)\)\.listaEnLaPuerta\(/.test(readFileSync(PU, "utf8")) || !/const \{ marcarLlegada \} = await import\("\.\/noche-reservas"\);/.test(readFileSync(PU, "utf8")))) falla("codigoPuerta", PU, 0, "la puerta usa listaEnLaPuerta / marcarLlegada de lib/noche-reservas.ts");
  },
  sinImagenDeID() {
    for (const f of [...codigo, ...archivos.filter((x) => /^packages\/db\/migrations\/00(8[1-9]|9\d)_.*\.sql$/.test(x))]) {
      if (!/noche|night/i.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, n) => {
        if (/(birth_?date|date_of_birth|\bdob\b|fecha_nac|fecha de nacimiento["'`]?\s*[:=]|id_photo|foto del id|owner_kind\s*=\s*'id')/i.test(l) && !/no pide fecha de nacimiento|nunca guarda|ni guarda|sin imagen/i.test(l))
          falla("sinImagenDeID", f, n + 1, "la app no pide fecha de nacimiento ni guarda imágenes de identificación (la puerta revisa el ID)");
      });
    }
  },
  nocheCruzaMedianoche() {
    const L = "apps/web/lib/noche.ts";
    if (existsSync(L) && !/export const NOCHE_SQL = \(ts: string, tz: string\) => `\(\(\$\{ts\} at time zone \$\{tz\}\) - interval '6 hours'\)::date`;/.test(readFileSync(L, "utf8")))
      falla("nocheCruzaMedianoche", L, 0, "la noche corta a las 6 AM: una llegada a la 1 AM es de la noche anterior (NOCHE_SQL)");
  },

  /* 4nd. Postgres pasa a minúsculas los nombres sin comillas: «as ${k}» con k = "coverOk" llegaba como «coverok» y la pantalla no
     veía «Lo que importa» (también «fechaOk», «fotosOk» de Fiestas). Un alias que se arma con ${…} dentro de SQL va entre comillas. */
  aliasConComillas() {
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/.*\.ts$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/(::\w+|\)) as \$\{/.test(l)) falla("aliasConComillas", f, i + 1, "alias de SQL armado con ${…} sin comillas: Postgres lo pasa a minúsculas (usa as \"${k}\")"); });
    }
  },

  /* 4. Toda cadena visible nace en español: prohibido `lang="en` en layouts. */
  /* 4ib. Vivienda justa (Fair Housing Act y PHRA · fase4-iglesias-inmuebles-autos.md §3): ningún filtro ni campo de una clase protegida
     (niños o familia, religión, raza, origen, sexo, discapacidad, edad); la lista de frases vive SOLO en lib/vivienda-justa.ts y el
     servidor la pasa al guardar una propiedad; toda propiedad que se pinta lleva el pie de igualdad y la nota de animales de servicio. */
  viviendaJusta() {
    const G = "viviendaJusta", V = "apps/web/lib/vivienda-justa.ts", I = "apps/web/lib/inmuebles.ts", C = "apps/web/lib/inmuebles-comun.ts", dir = "packages/db/migrations";
    const PROT = /\b(familias?|ni[nñ]os?|kids|children|famil(y|ies)|religi[oó]n|religion|cristian[oa]s?|cat[oó]lic[oa]s?|raza|race|color|sexo|sex|genero|g[eé]nero|gender|nacionalidad|national|origen|origin|inmigrantes?|immigrants?|hispan[oa]s?|latin[oa]s?|discapacidad|disability|disabled|parejas?|couples?|solter[oa]s?|singles?|adultos|adults|edad|age)\b/i;
    if (!existsSync(V)) return falla(G, V, 0, "falta lib/vivienda-justa.ts (la lista de frases y revisarTexto)");
    const v = readFileSync(V, "utf8");
    if (!/export async function revisarTexto\(/.test(v)) falla(G, V, 0, "falta revisarTexto(es, en)");
    if (!/\["no niños", "es"\]/.test(v) || !/\["no kids", "en"\]/.test(v)) falla(G, V, 0, "la lista de fábrica tiene que frenar «no niños» y «no kids»");
    // La lista solo aquí: ninguna otra pieza de la app escribe esas frases (ni para mostrarlas ni para decidir).
    const MARCA = ["no niños", "sin niños", "solo adultos", "no se aceptan niños", "no kids", "no children", "adults only", "solo cristianos", "para inmigrantes", "solo hispanos", "no section 8", "no se acepta section 8"];
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f) || f === V) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { for (const m of MARCA) if (l.toLowerCase().includes(m)) falla(G, f, i + 1, `la frase «${m}» vive solo en lib/vivienda-justa.ts`); });
    }
    if (existsSync(I)) {
      const s = readFileSync(I, "utf8"), der = /const DER = \[([^\]]*)\]/.exec(s)?.[1] ?? "";
      if (!der) falla(G, I, 0, "falta la lista DER de filtros derivados de Bienes Raíces");
      for (const k of der.matchAll(/"([^"]+)"/g)) if (PROT.test(k[1])) falla(G, I, 0, `filtro de una clase protegida: «${k[1]}» (los filtros son de la propiedad y de los papeles que se aceptan)`);
      s.split("\n").forEach((l, i) => { for (const m of l.matchAll(/F\.add\("([^"]+)"\)/g)) if (PROT.test(m[1]) || !der.includes(`"${m[1]}"`)) falla(G, I, i + 1, `filtro «${m[1]}» fuera de la lista permitida o de una clase protegida`); });
      const g = /export async function guardarPropiedad[\s\S]*?\n}\n/.exec(s)?.[0] ?? "";
      if (!/await revisarTexto\(\[name\.es, desc\.es, papers\.es, lease\.es/.test(g)) falla(G, I, 0, "guardarPropiedad tiene que pasar nombre, descripción, lo que piden y contrato por revisarTexto");
      if (!/if \(fr\) \{[\s\S]*?return err\(/.test(g)) falla(G, I, 0, "si una frase salta, la propiedad no se guarda (return err antes de escribir)");
      if (g.indexOf("revisarTexto(") > g.indexOf("insert into items")) falla(G, I, 0, "revisarTexto corre ANTES de escribir la propiedad");
    }
    // Columnas de propiedades y de la herramienta: ninguna por quién vive.
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql") && y >= "0092")) {
      const t = readFileSync(`${dir}/${x}`, "utf8");
      for (const tb of ["property_listings", "inm_settings"]) {
        const body = new RegExp(`create table if not exists ${tb} \\(([\\s\\S]*?)\\n\\);`).exec(t)?.[1] ?? "";
        body.split("\n").forEach((l) => { const col = /^\s*([a-z_0-9]+)\s+(text|boolean|smallint|integer|bigint|numeric|date|jsonb|geography|timestamptz|uuid)/.exec(l)?.[1]; if (col && col.split("_").some((p) => PROT.test(p))) falla(G, `${dir}/${x}`, 0, `columna «${col}» de ${tb}: ningún campo por una clase protegida`); });
      }
    }
    if (existsSync(C)) {
      const s = readFileSync(C, "utf8");
      if (!s.includes('export const EHO: Bi = { es: "Igualdad de oportunidad en la vivienda", en: "Equal Housing Opportunity" }')) falla(G, C, 0, "el pie «Igualdad de oportunidad en la vivienda» / «Equal Housing Opportunity» va verbatim");
      if (!s.includes('export const ANIMALES_SERVICIO: Bi = { es: "Los animales de servicio y de apoyo no son mascotas: se aceptan siempre."')) falla(G, C, 0, "la nota de los animales de servicio va verbatim");
      if (!s.includes('export const NO_PAGUES: Bi = { es: "Nunca pagues un depósito antes de ver la propiedad y firmar el contrato."')) falla(G, C, 0, "la línea contra estafas de renta va verbatim");
      if (!s.includes("Lo que pagas para mudarte está completo aquí: nadie cobra por ver una propiedad.")) falla(G, C, 0, "la línea fija de Bienes Raíces (§1c) va verbatim");
    }
    // Quien pinta propiedades (el panel hoy; la ficha en 4id) pone el pie de igualdad y la nota de animales de servicio.
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx$/.test(f)) continue;
      const s = readFileSync(f, "utf8");
      if (!/from "@\/lib\/inmuebles-comun"/.test(s) || !/PropInm|mudarteTexto/.test(s)) continue;
      // El pie (pie()) lleva las dos frases y va detrás de cada propiedad que se pinta («Así se ve», mprev).
      const pie = /function pie\([\s\S]*?\n}\n/.exec(s)?.[0] ?? "";
      if (!/bi\(EHO, es\)/.test(pie) || !/bi\(ANIMALES_SERVICIO, es\)/.test(pie)) falla(G, f, 0, "pinta propiedades sin el pie de igualdad de oportunidad y la nota de animales de servicio (function pie)");
      if ((s.match(/type: "mprev"/g) ?? []).length > (s.match(/\.\.\.pie\(c, /g) ?? []).length) falla(G, f, 0, "cada propiedad que se pinta («Así se ve») va seguida de su pie (...pie(c, …))");
      // 4id · La ficha pública: toda función que pinta propiedades (la lista, el Resumen y la hoja) pone el pie; la hoja dice además
      // «Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.».
      if (/from "@\/lib\/inmuebles-publico"/.test(s)) {
        for (const fn of s.split(/\nexport function /).slice(1)) {
          const n = fn.slice(0, fn.indexOf("("));
          if (/mudarteTexto\(|<Lista |v\.primeros|primeros=\{/.test(fn) && !/pie\(/.test(fn)) falla(G, f, 0, `«${n}» pinta propiedades sin el pie de igualdad de oportunidad y la nota de animales de servicio`);
          if (/mudarteTexto\(/.test(fn) && !/bi\(NO_PAGUES, es\)/.test(fn)) falla(G, f, 0, `«${n}» (la hoja) no dice «Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.»`);
        }
      }
    }
  },

  /* 4id. El punto de un negocio en lo público (lista, ficha, mapa, Ciudad, relacionados) sale de PUNTO_PUBLICO (lib/punto.ts): quien trabaja desde
     casa (o renta un cuarto en su casa) sale como zona de ~500 m y su punto exacto nunca llega al navegador. Pedido, reserva y visita confirmada
     sí llevan el punto (la persona ya tiene la operación). Además, guardarPropiedad pasa a «desde casa» al negocio que renta en su dirección. */
  puntoPublico() {
    const G = "puntoPublico";
    const PUB = /^apps\/web\/lib\/([a-z-]*publico|ficha|categoria|buscar|mapa|directorio|ciudad|tarjeta)\.ts$/;
    for (const f of codigo) {
      if (!PUB.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/st_[xy]\(\s*[a-z]+\.geo\b|st_astext\(\s*[a-z]+\.geo\b|st_asgeojson\(\s*[a-z]+\.geo\b/i.test(l)) falla(G, f, i + 1, "el punto de un negocio en lo público sale de PUNTO_PUBLICO (lib/punto.ts): quien trabaja desde casa sale como zona");
      });
    }
    const P = "apps/web/lib/punto.ts";
    if (!/when \$\{x\}\.works_from_home then round\(st_y/.test(readFileSync(P, "utf8"))) falla(G, P, 0, "PUNTO_PUBLICO redondea el punto de quien trabaja desde casa");
    const I = "apps/web/lib/inmuebles.ts";
    if (existsSync(I) && !/update businesses b set works_from_home = true/.test(readFileSync(I, "utf8"))) falla(G, I, 0, "quien renta en su propia dirección (propiedad con la dirección oculta) pasa a «trabaja desde casa»");
    // 6b · El punto y la dirección de un evento en lo público: PUNTO_EVENTO (en el local de quien trabaja desde casa, la zona redondeada) y
    // DIRECCION_EVENTO (sin dirección si trabaja desde casa). lib/evt-publico.ts no lee el punto ni la dirección por su cuenta.
    const pt = readFileSync(P, "utf8");
    if (!/export const PUNTO_EVENTO = [\s\S]*?when \$\{b\}\.works_from_home then round\(st_y\(/.test(pt) || !/export const DIRECCION_EVENTO = [\s\S]*?when \$\{b\}\.works_from_home then null/.test(pt)) falla(G, P, 0, "PUNTO_EVENTO redondea y DIRECCION_EVENTO calla la casa de quien trabaja desde casa");
    const EP = "apps/web/lib/evt-publico.ts";
    if (existsSync(EP)) {
      const t = sinComent(EP);
      t.split("\n").forEach((l, i) => {
        if (/st_[xy]\(|st_astext|st_asgeojson/i.test(l)) falla(G, EP, i + 1, "el punto de un evento sale de PUNTO_EVENTO (lib/punto.ts)");
        if (/\bb\.address\b|\be\.venue_address\b/.test(l)) falla(G, EP, i + 1, "la dirección de un evento sale de DIRECCION_EVENTO (lib/punto.ts)");
      });
      if (!/\$\{PUNTO_EVENTO\("e", "b"\)\}/.test(t) || !/\$\{DIRECCION_EVENTO\("e", "b"\)\} as addr/.test(t)) falla(G, EP, 0, "la ficha del evento usa PUNTO_EVENTO y DIRECCION_EVENTO");
    }
  },
  /* 4ib. La dirección exacta de una propiedad (addr_line, geom) solo la lee lib/inmuebles.ts (el panel del negocio) y, en 4ie, lib/visitas-inm*.ts
     (al confirmar la visita). Ninguna consulta pública la ve; los cuartos y «solo la zona» muestran la zona (§3, §6 #15). */
  direccionAlConfirmar() {
    const G = "direccionAlConfirmar", OK = /^apps\/web\/lib\/(inmuebles|visitas-inm)\.ts$/; // 4ie: solo lib/visitas-inm.ts (no su -comun, que va al navegador)
    for (const f of codigo) {
      if (!/^(apps|services)\//.test(f) || OK.test(f)) continue;
      const s = readFileSync(f, "utf8");
      s.split("\n").forEach((l, i) => { if (/\baddr_line\b/.test(l)) falla(G, f, i + 1, "addr_line de una propiedad solo se lee en lib/inmuebles.ts (y al confirmar la visita, lib/visitas-inm*.ts)"); });
      if (/property_listings/.test(s) && /\b(pl|property_listings)\.geom\b|\bgeom\b[^\n]*from property_listings|st_[xy]\(\s*(pl\.)?geom/.test(s)) falla(G, f, 0, "la ubicación exacta (geom) de una propiedad no se lee fuera de lib/inmuebles.ts");
      // Lo público no importa la librería del panel (trae la dirección): solo inmuebles-comun o, en 4id, inmuebles-publico.
      if (/^apps\/web\/(lib\/([a-z-]*publico|ficha|categoria|buscar|mapa|directorio|ciudad)\.ts|app\/\(app\)\/)/.test(f) && /from "(\.\/|@\/lib\/)inmuebles"/.test(s)) falla(G, f, 0, "una pantalla o consulta pública importa lib/inmuebles.ts (la del panel, con la dirección exacta)");
    }
    // 4ie · En lib/visitas-inm.ts la dirección exacta se lee en UN solo lugar (direccionCliente) y le llega al cliente solo con la visita
    // confirmada o pasada; la dirección de la casa del cliente (prueba en casa) la lee el dealer solo confirmada y cada vista se audita.
    const VI = "apps/web/lib/visitas-inm.ts";
    if (existsSync(VI)) {
      const t = readFileSync(VI, "utf8"), dc = /async function direccionCliente\([\s\S]*?\n}\n/.exec(t)?.[0] ?? "";
      if ((t.match(/\baddr_line\b/g) ?? []).length !== (dc.match(/\baddr_line\b/g) ?? []).length || !dc) falla(G, VI, 0, "addr_line se lee solo en direccionCliente (una sola puerta)");
      if (!/const direccion = cliente && conf \? await direccionCliente/.test(t)) falla(G, VI, 0, "la dirección exacta le llega al cliente solo con la visita confirmada o pasada");
      if (!/p\.reason = 'casa' and o\.business_id = \$2 and o\.kind = 'visit' and o\.status in \('confirmed', 'done'\)/.test(t) || !/'vis\.ver_direccion'/.test(t)) falla(G, VI, 0, "la dirección de la casa del cliente: solo con la prueba confirmada, para ese negocio, y cada vista en la auditoría");
      if (!/const enCasa[^\n]*\n[^\n]*\n[^\n]*\n[\s\S]*cifrar\(JSON\.stringify\(\{ calle, zip \}\)\)/.test(t)) falla(G, VI, 0, "la dirección de la casa del cliente se guarda cifrada (op_private 'casa')");
    }
    const C = "packages/db/migrations/0092_inmuebles_propiedades.sql";
    if (existsSync(C) && !/check \(kind not in \('cuarto', 'compartida'\) or not addr_public\)/.test(readFileSync(C, "utf8"))) falla(G, C, 0, "los cuartos y la vivienda compartida nunca muestran la dirección exacta (check en la base)");
    const I = "apps/web/lib/inmuebles.ts";
    if (existsSync(I) && !/const zona = soloZona\(kind\) \|\| p\.soloZona === true/.test(readFileSync(I, "utf8"))) falla(G, I, 0, "guardarPropiedad fuerza «solo la zona» en cuartos");
    // 4id · La ficha pública: de cada propiedad solo la zona; un cuarto siempre «solo la zona»; la ficha de quien renta cuartos (en su casa)
    // nunca lleva la dirección ni el punto del negocio.
    const P = "apps/web/lib/inmuebles-publico.ts";
    if (existsSync(P)) {
      const t = readFileSync(P, "utf8");
      if (!/not pl\.addr_public as "soloZona"/.test(t) || !/soloZona: p\.soloZona \|\| soloZona\(p\.kind\)/.test(t)) falla(G, P, 0, "la ficha pública marca «solo la zona» con addr_public y siempre en cuartos");
      if (/\bpl\.\*|select \*/.test(t)) falla(G, P, 0, "la consulta pública de propiedades nombra cada columna (nunca select *: traería la dirección)");
    }
    const F = "apps/web/app/(app)/n/[id]/page.tsx";
    if (existsSync(F) && /inmPublica\(/.test(readFileSync(F, "utf8"))) {
      const t = readFileSync(F, "utf8");
      if (!/inm\?\.kind === "cuarto" \?/.test(t) || !/if \(sinLocal\) Object\.assign\(f, \{ direccion: null, lat: null, lng: null,/.test(t)) falla(G, F, 0, "la ficha de quien renta cuartos no lleva la dirección ni el punto del negocio (sinLocal)");
    }
  },

  /* 4ib. Toda cuota de venta (y en 4ic el pago de ejemplo) dice «estimada» / «estimated»: nunca una promesa (Regulation Z, §3). */
  cuotaEstimada() {
    const G = "cuotaEstimada", C = "apps/web/lib/inmuebles-comun.ts";
    if (existsSync(C)) {
      const f = /export function cuotaTexto[\s\S]*?\n}\n/.exec(readFileSync(C, "utf8"))?.[0] ?? "";
      if (!f.includes("`Cuota estimada ") || !f.includes("`Estimated payment ")) falla(G, C, 0, "cuotaTexto dice siempre «Cuota estimada» / «Estimated payment»");
    }
    const A = "apps/web/lib/autos-comun.ts";
    if (existsSync(A)) {
      const a = readFileSync(A, "utf8"), p = /export function pagoTexto[\s\S]*?\n}\n/.exec(a)?.[0] ?? "", b = /export function bhphTexto[\s\S]*?\n}\n/.exec(a)?.[0] ?? "";
      for (const [n, f] of [["pagoTexto", p], ["bhphTexto", b]]) if (!f.includes("APR (estimado, sujeto a aprobación)") || !f.includes("APR (estimated, subject to approval)")) falla(G, A, 0, `${n} dice siempre la tasa (APR) y «estimado, sujeto a aprobación» / «estimated, subject to approval»`);
      if (!/if \(!p \|\| p\.down == null \|\| p\.aprBp == null \|\| !p\.months \|\| !p\.pago\) return "";/.test(p)) falla(G, A, 0, "pagoTexto no escribe un pago sin enganche, tasa y meses (Regulation Z)");
      if (!/if \(!b \|\| b\.down == null \|\| !b\.week \|\| !b\.weeks \|\| b\.aprBp == null\) return "";/.test(b)) falla(G, A, 0, "bhphTexto no escribe un pago a la semana sin enganche, semanas y tasa");
    }
    // Lo que pinta carros (importa autos-comun o es de Autos): ningún pago suelto.
    const autos = new Set(codigo.filter((f) => /^apps\/web\/.*\.tsx?$/.test(f) && (/autos/i.test(f) || /from "(@\/lib\/|\.\/)autos(-comun)?"/.test(readFileSync(f, "utf8")))));
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || f === "apps/web/lib/inmuebles.ts" || f === "apps/web/lib/autos.ts") continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\/?\*)/.test(l)) return;
        if (/(usd|dinero|fp|money)\([^)]*\b(cuota|est_payment_cents|estPago)\b[^)]*\)/.test(l) && !/estimad|Estimated|cuotaTexto\(/.test(l)) falla(G, f, i + 1, "una cuota se muestra sin «estimada»: usa cuotaTexto() o dilo en la misma línea");
        if (autos.has(f) && /(usd|dinero|fp|money)\([^)]*\b(\w+\.pago|est_payment_cents|bhph_week_cents|\w+\.est\.\w+|\w+\.bhph\.week)\b[^)]*\)/.test(l) && !/pagoTexto\(|bhphTexto\(|sujeto a aprobación|subject to approval/.test(l)) falla(G, f, i + 1, "un pago de carro se muestra sin tasa, meses y enganche: usa pagoTexto() / bhphTexto()");
      });
    }
  },

  /* 4ib. Nada de datos de crédito ni de identidad en Bienes Raíces, Autos e Iglesias (§3): ninguna columna ni campo de seguro social,
     número de ITIN, ingresos, fecha de nacimiento, puntaje de crédito, cuenta de banco ni número de licencia de una persona. */
  sinDatosDeCredito() {
    const G = "sinDatosDeCredito", dir = "packages/db/migrations", MAL = "ssn|itin_number|income|dob|credit_score|bank_[a-z_]+|license_number";
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql") && y >= "0091")) readFileSync(`${dir}/${x}`, "utf8").split("\n").forEach((l, i) => {
      if (/^\s*--/.test(l)) return;
      if (new RegExp(`^\\s*(${MAL})\\s+[a-z]`).test(l) || new RegExp(`add column (if not exists )?(${MAL})\\b`).test(l)) falla(G, `${dir}/${x}`, i + 1, "columna de datos de crédito o de identidad: nunca se guarda (los papeles se llevan en persona)");
    });
    for (const f of codigo) {
      // 4ie: también las pantallas de pedir visita y su estado, y el panel de Visitas.
      const area = /^apps\/web\/(lib\/(inmuebles[a-z-]*|vivienda-justa|visitas-inm[a-z-]*|autos[a-z-]*|fe[a-z-]*)\.ts|app\/panel\/(Inmuebles\.tsx|acciones-inm\.ts|Autos\.tsx|acciones-autos\.ts|Visitas\.tsx|acciones-vis\.ts)|app\/\(app\)\/(n\/\[id\]\/ver|vis\/\[num\])\/[^/]+\.tsx?)$/.test(f);
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\/?\*)/.test(l)) return;
        if (area && new RegExp(`(\\b(${MAL})\\??\\s*:|\\.(${MAL})\\b)`).test(l)) falla(G, f, i + 1, "campo de datos de crédito o de identidad: nunca se pide ni se guarda");
        // El número de la licencia de conducir de una persona no existe en ningún lado (4ie: solo «Sí, tengo licencia vigente»).
        if (/^(apps|packages|services)\//.test(f) && /license_number|licenseNumber|driver_?license_?(no|num)|licencia_?de_?conducir_?(no|num)/i.test(l)) falla(G, f, i + 1, "número de licencia de conducir: nunca se pide ni se guarda (solo «tengo licencia vigente»)");
      });
    }
    // La prueba de manejo solo marca que la tiene (has_license), nunca un número ni una foto.
    const VI = "apps/web/lib/visitas-inm.ts";
    if (existsSync(VI) && !/has_license: it\.que === "prueba" \? true : null/.test(readFileSync(VI, "utf8"))) falla(G, VI, 0, "la prueba de manejo guarda solo «tiene licencia vigente» (has_license), nada más");
  },

  /* 4ib/4ie. Ver una propiedad es gratis: el código de Bienes Raíces (y las visitas de 4ie) no toca pasarela, pagos ni retenciones (§3). */
  sinDineroEnVisitas() {
    for (const f of codigo) {
      if (!/^apps\/web\/(lib\/(inmuebles[a-z-]*|vivienda-justa|visitas-inm[a-z-]*|autos[a-z-]*)\.ts|app\/panel\/(Inmuebles\.tsx|acciones-inm\.ts|Autos\.tsx|acciones-autos\.ts|Visitas\.tsx|acciones-vis\.ts)|app\/\(app\)\/(n\/\[id\]\/ver|vis\/\[num\])\/[^/]+\.tsx?)$/.test(f)) continue; // 4ie: las pantallas y el panel de visitas también
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\/?\*)/.test(l)) return;
        if (/pasarela|from "[^"]*pagos|stripe|insert into payments|update payments|retener\(|cobrar\(|capturar\(/i.test(l)) falla("sinDineroEnVisitas", f, i + 1, "Bienes Raíces y Venta de Autos no mueven dinero en la app: ver y la prueba de manejo son gratis (sin pasarela, pagos ni retenciones)");
      });
    }
    // 4ie · Una visita nace con $0 y sin pago (pay_mode 'none'); Iglesias por el motor de inscripciones nunca toca la tarjeta ni la matrícula.
    const VI = "apps/web/lib/visitas-inm.ts";
    if (existsSync(VI) && !/values \(\$1, 'visit', \$2, \$3, \$4, 'pending', \$5::timestamptz, nullif\(\$6, ''\), \$7::jsonb, 1, 0, 0, 0, 'none'/.test(readFileSync(VI, "utf8"))) falla("sinDineroEnVisitas", VI, 0, "una visita se guarda con total $0, depósito $0 y sin forma de pago (pay_mode 'none')");
    const I = "apps/web/lib/inscripciones.ts";
    if (existsSync(I)) {
      const t = readFileSync(I, "utf8");
      if (!/const mat = x\.rubro === "fe" \? 0 :/.test(t) || !/const tarjeta = !!x\.cuenta && x\.plan === "pro" && x\.rubro !== "fe";/.test(t)) falla("sinDineroEnVisitas", I, 0, "Iglesias (rubro 'fe') nunca cobra en la app: ni matrícula ni tarjeta");
    }
  },

  /* 4ib. Una propiedad es un ítem 'svc' (renta | venta) pero NO es un servicio: no sale en Servicios, no se reserva como cita (con su
     depósito) ni se edita por el editor de servicios. Solo por Propiedades (lib/inmuebles.ts). */
  propiedadNoEsServicio() {
    const G = "propiedadNoEsServicio", K = "coalesce(i.svc_kind, '') not in ('renta', 'venta', 'auto')", K2 = "coalesce(svc_kind, '') not in ('renta', 'venta', 'auto')"; // 4ic suma los vehículos
    const chk = (f, re, msg) => { if (existsSync(f) && !re.test(readFileSync(f, "utf8"))) falla(G, f, 0, msg); };
    chk("apps/web/lib/citas.ts", new RegExp(`i\\.sell and i\\.status <> 'hidden' and ${K.replace(/[()]/g, "\\$&")}`), "los servicios que se reservan (citas) dejan fuera las propiedades");
    chk("apps/web/lib/servicios.ts", new RegExp(`i\\.removed_at is null and ${K.replace(/[()]/g, "\\$&")}`), "la lista de Servicios del panel deja fuera las propiedades");
    const a = "apps/web/app/panel/acciones-servicios.ts";
    if (existsSync(a)) { const n = readFileSync(a, "utf8").split(K2).length - 1; if (n < 3) falla(G, a, 0, "guardar, mostrar u ocultar y quitar un servicio no tocan una propiedad (3 consultas con el filtro)"); }
  },

  /* 4ic. El precio en la puerta (§3): todo carro con otd_cents = precio + impuesto de la ciudad + placas + cargo del dealer, calculado por
     UNA función del servidor (enLaPuerta) y comprobado por la base; el cargo nunca pasa del tope de PA (platform_config + trigger); el pago
     de ejemplo nunca sin tasa, meses y enganche juntos (Regulation Z). Se prueba también la cuenta: Civic $11,900 → $13,163 en la puerta;
     $1,500 de enganche, 48 meses al 14.9 % → $324; compre aquí pague aquí $999 + $95 × 78 = $8,409. */
  totalEnLaPuerta() {
    const G = "totalEnLaPuerta", M = "packages/db/migrations/0093_autos_inventario.sql", A = "apps/web/lib/autos.ts", C = "apps/web/lib/autos-comun.ts";
    if (!existsSync(M) || !existsSync(A) || !existsSync(C)) return falla(G, A, 0, "faltan 0093, lib/autos.ts o lib/autos-comun.ts");
    const m = readFileSync(M, "utf8"), a = readFileSync(A, "utf8");
    if (!m.includes("check (otd_cents = price_cents + tax_cents + tags_cents + doc_fee_cents)")) falla(G, M, 0, "la base no comprueba otd = precio + impuesto + placas + cargo");
    if (!m.includes("check (tax_cents = (price_cents::bigint * tax_bp + 5000) / 10000)")) falla(G, M, 0, "la base no comprueba el impuesto sobre el precio");
    if (!/check \(\(est_payment_cents is null\) = \(est_down_cents is null\) and \(est_payment_cents is null\) = \(est_apr_bp is null\)\s+and \(est_payment_cents is null\) = \(est_months is null\)/.test(m)) falla(G, M, 0, "el pago de ejemplo va con enganche, tasa y meses o no va (check todo o nada)");
    if (!/create trigger vehicle_listings_tope before insert or update on vehicle_listings/.test(m) || !/new\.doc_fee_cents > tope then\s+raise exception/.test(m)) falla(G, M, 0, "falta el candado del tope del cargo del dealer en la base");
    // Una sola fórmula, y ninguna otra pieza escribe el total ni el impuesto de un carro.
    const f = /export function enLaPuerta\([^)]*\): Puerta \{\n([\s\S]*?)\n\}/.exec(a)?.[1] ?? "";
    if (!f.includes("const tax = Math.floor((price * taxBp + 5000) / 10000);") || !f.includes("otd: price + tax + tags + fee")) falla(G, A, 0, "enLaPuerta: impuesto redondeado como la base y otd = precio + impuesto + placas + cargo");
    if (!/from tax_rules t where t\.city_id = b\.city_id and t\.category_id = 'NEG-DEALER'/.test(a)) falla(G, A, 0, "el impuesto sale de tax_rules de la ciudad, nunca escrito a mano");
    if (!/\$\{cfgSql\(TOPE_KEY\)\} as tope/.test(a) || !/const TOPE_KEY = "dealer_doc_fee_cap_cents"/.test(a)) falla(G, A, 0, "el tope del cargo sale de Configuración (cfgSql: platform_config acotado por config_keys)");
    if ((a.match(/Math\.min\(h\.fee, h\.tope\)/g) ?? []).length < 2 || !/if \(v > h\.tope\) return err\(/.test(a) || !/const fee = Math\.min\(s\.fee, h\.tope\);/.test(a)) falla(G, A, 0, "el cargo del dealer nunca pasa del tope (al cotizar, al guardar, en la herramienta y al recalcular)");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      readFileSync(x, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\/?\*)/.test(l)) return;
        if (x !== A && /\b(otd_cents|tax_cents)\s*=/.test(l)) falla(G, x, i + 1, "el total en la puerta y su impuesto solo los escribe lib/autos.ts");
        if (/^apps\/web\/(lib\/autos[a-z-]*\.ts|app\/panel\/(Autos\.tsx|acciones-autos\.ts))$/.test(x) && /\b0\.06\b|\* 6 \/ 100|\b(price|precio)\w* \* 6\b|\+ 150\b|15000 \+/.test(l)) falla(G, x, i + 1, "6 % o placas $150 escritos a mano: salen de tax_rules y de la herramienta");
      });
    }
    // 4id · Lo público solo LEE el total en la puerta que calculó el servidor: ningún carro sin total, ninguna suma propia, y el pago de
    // ejemplo solo con enganche, tasa y meses juntos.
    const PU = "apps/web/lib/autos-publico.ts";
    if (existsSync(PU)) {
      const t = readFileSync(PU, "utf8");
      if (!/v\.otd_cents is not null/.test(t)) falla(G, PU, 0, "la ficha pública no saca un carro sin su total en la puerta");
      if (!/est: x\.ep != null && x\.ed != null && x\.ea != null && x\.em != null \?/.test(t)) falla(G, PU, 0, "el pago de ejemplo público solo con pago, enganche, tasa y meses juntos");
      t.split("\n").forEach((l0, i) => { const l = l0.replace(/"[^"]*"|`[^`]*`/g, '""'); if (!/^\s*(\/\/|\/?\*)/.test(l) && /\b(price|tax|tags|fee|tagsC|feeC)\b\s*\+\s*\w|\+\s*x\.(tax|tagsC|feeC)\b/.test(l)) falla(G, PU, i + 1, "lo público no suma el total en la puerta: lo lee del servidor (otd_cents)"); });
    }
    const p = /export function pagoEjemplo\([\s\S]*?\n\}/.exec(a)?.[0] ?? "";
    if (!/if \(enganche == null \|\| aprBp == null \|\| meses == null/.test(p)) falla(G, A, 0, "pagoEjemplo no existe sin enganche, tasa y meses");
    // La cuenta, de verdad: se sacan las funciones del servidor sin sus tipos y se corren contra la tabla hecha a mano.
    try {
      const sinTipos = (s) => s.replace(/export /g, "").replace(/\): (Puerta|Pago \| null|Bhph \| null) \{/g, ") {").replace(/(\w+): (number \| null|number)/g, "$1").replace(/ as readonly number\[\]/g, "");
      const src = ["enLaPuerta", "pagoEjemplo", "totalBhph"].map((n) => sinTipos(new RegExp(`export function ${n}\\([\\s\\S]*?\\n\\}`).exec(a)?.[0] ?? ""));
      const T = new Function(`const MESES_PAGO = [12, 24, 36, 48, 60, 72], MESES_BHPH = [12, 18, 24, 36];\n${src.join("\n")}\nreturn { enLaPuerta, pagoEjemplo, totalBhph };`)();
      const civic = T.enLaPuerta(1190000, 600, 15000, 39900);
      if (civic.otd !== 1316300 || civic.tax !== 71400) falla(G, A, 0, `Civic $11,900 + 6 % + $150 + $399 tiene que dar $13,163 en la puerta (da ${civic.otd})`);
      const pe = T.pagoEjemplo(1316300, 150000, 1490, 48);
      if (!pe || pe.pago !== 32400 || pe.total !== 150000 + 32400 * 48) falla(G, A, 0, `$13,163 − $1,500 a 48 meses al 14.9 % tiene que dar $324 al mes (da ${pe?.pago})`);
      if (T.pagoEjemplo(1316300, null, 1490, 48) !== null || T.pagoEjemplo(1316300, 150000, null, 48) !== null || T.pagoEjemplo(1316300, 150000, 1490, null) !== null) falla(G, A, 0, "un pago de ejemplo sin enganche, tasa o meses tiene que ser null");
      const bh = T.totalBhph(766300, 99900, 9500, 18);
      if (!bh || bh.total !== 840900 || bh.weeks !== 78 || !(bh.aprBp > 0)) falla(G, A, 0, `compre aquí pague aquí $999 + $95 × 78 = $8,409 con su tasa (da ${bh?.total})`);
      if (T.totalBhph(900000, 99900, 9500, 18) !== null) falla(G, A, 0, "si los pagos no cubren el total en la puerta, no hay plan");
    } catch (e) { falla(G, A, 0, `no se pudo correr la cuenta del servidor: ${e.message}`); }
  },

  /* 4ic. El VIN (49 CFR 565): 17 caracteres sin I, O ni Q y el dígito verificador de la posición 9. La misma cuenta en el servidor
     (autos-comun vinValido, que se corre aquí contra VIN conocidos) y en la base (vin_valido en el check de vehicle_listings); la semilla
     de pruebas solo trae VIN válidos. */
  vinValido() {
    const G = "vinValido", C = "apps/web/lib/autos-comun.ts", A = "apps/web/lib/autos.ts", M = "packages/db/migrations/0093_autos_inventario.sql", S = "infra/pruebas/semilla/0029_autos.sql";
    if (!existsSync(C) || !existsSync(M)) return falla(G, C, 0, "faltan lib/autos-comun.ts o 0093");
    const c = readFileSync(C, "utf8"), m = readFileSync(M, "utf8");
    let fn = null;
    try {
      const k = ["VIN_PESOS", "VIN_LETRAS"].map((n) => new RegExp(`const ${n} = [^\\n]*`).exec(c)?.[0] ?? "").join("\n");
      const f = (/export function vinValido\(v: string\): boolean \{[\s\S]*?\n\}/.exec(c)?.[0] ?? "").replace("export function vinValido(v: string): boolean {", "function vinValido(v) {").replace(/!/g, (x, i, s) => (s[i + 1] === "." || s[i + 1] === "[" || s[i + 1] === ";" || s[i + 1] === ")" ? "" : x));
      fn = new Function(`${k}\n${f}\nreturn vinValido;`)();
    } catch (e) { falla(G, C, 0, `no se pudo correr vinValido: ${e.message}`); }
    if (fn) {
      for (const v of ["1HGCM82633A004352", "11111111111111111", "1M8GDM9AXKP042788", "5YJSA1E14FF087599"]) if (!fn(v)) falla(G, C, 0, `«${v}» es un VIN válido y vinValido lo rechaza`);
      for (const v of ["1HGCM82633A004353", "1HGCM82633A0O4352", "1HGCM82633A00435", "IHGCM82633A004352", "1hgcm82633a004352"]) if (fn(v)) falla(G, C, 0, `«${v}» no es un VIN válido y vinValido lo acepta`);
      if (existsSync(S)) for (const x of readFileSync(S, "utf8").matchAll(/insert into vehicle_listings[\s\S]*?select it, b, x\.city_id, '([^']*)'/g)) if (!fn(x[1])) falla(G, S, 0, `VIN de prueba inválido en la semilla: ${x[1]}`);
    }
    if (!/export function vinValido\(v: string\): boolean \{\n  if \(typeof v !== "string" \|\| !\/\^\[A-HJ-NPR-Z0-9\]\{17\}\$\/\.test\(v\)\) return false;/.test(c)) falla(G, C, 0, "vinValido: 17 caracteres sin I, O ni Q");
    if (!m.includes("if v !~ '^[A-HJ-NPR-Z0-9]{17}$' then return false; end if;")) falla(G, M, 0, "vin_valido de la base: 17 caracteres sin I, O ni Q");
    if (!m.includes("pesos constant int[] := array[8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];") || !m.includes("valores constant text := '12345678123457923456789';")) falla(G, M, 0, "vin_valido de la base no usa los pesos y valores del VIN");
    if (!c.includes("const VIN_PESOS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];") || !c.includes('VIN_VALORES = "12345678123457923456789"')) falla(G, C, 0, "vinValido del servidor no usa los pesos y valores del VIN");
    if (!/vin text check \(vin is null or vin_valido\(vin\)\)/.test(m)) falla(G, M, 0, "la base no revisa el VIN de cada vehículo");
    if (existsSync(A)) {
      const g = /export async function guardarCarro[\s\S]*?\n\}\n/.exec(readFileSync(A, "utf8"))?.[0] ?? "";
      if (!/if \(vin && !vinValido\(vin\)\) return err\(/.test(g) || g.indexOf("vinValido(vin)") > g.indexOf("insert into items")) falla(G, A, 0, "guardarCarro rechaza un VIN inválido antes de escribir");
    }
  },

  /* 4ic. Un título salvage dice SIEMPRE «Título salvage: no se maneja en la calle hasta pasar la inspección de PA» (faq L55): la línea vive
     en autos-comun, notasCarro la pone primero, todo lo que pinta carros llama a notasCarro, el servidor lo marca «no va por la calle» y la
     base no deja un salvage que vaya por la calle. */
  tituloSalvage() {
    const G = "tituloSalvage", C = "apps/web/lib/autos-comun.ts", A = "apps/web/lib/autos.ts", M = "packages/db/migrations/0093_autos_inventario.sql";
    if (!existsSync(C)) return falla(G, C, 0, "falta lib/autos-comun.ts");
    const c = readFileSync(C, "utf8");
    if (!c.includes('export const SALVAGE: Bi = { es: "Título salvage: no se maneja en la calle hasta pasar la inspección de PA.')) falla(G, C, 0, "la línea del título salvage va verbatim");
    const n = /export function notasCarro\([\s\S]*?\n\}/.exec(c)?.[0] ?? "";
    if (!/if \(x\.title === "salvage"\) L\.push\(b\(SALVAGE\)\);/.test(n) || n.indexOf("b(SALVAGE)") > n.indexOf("L.push(garantiaTexto")) falla(G, C, 0, "notasCarro pone la línea del salvage primero");
    if (existsSync(M) && !readFileSync(M, "utf8").includes("check (title <> 'salvage' or not street_legal)")) falla(G, M, 0, "la base no deja un salvage que vaya por la calle");
    if (existsSync(A) && !/const street = title === "salvage" \? false :/.test(readFileSync(A, "utf8"))) falla(G, A, 0, "guardarCarro marca un salvage como «no va por la calle»");
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx$/.test(f)) continue;
      const s = readFileSync(f, "utf8");
      if (!/from "@\/lib\/autos-comun"/.test(s) || !/CarroAuto|HerrAutos|CarroPub/.test(s)) continue;
      if (!/notasCarro\(/.test(s)) falla(G, f, 0, "pinta vehículos sin sus notas (notasCarro)");
      // Cada función que pinta un vehículo (su total, su vista previa) lleva la línea del salvage (notasCarro o SALVAGE).
      for (const fn of s.split(/\nexport function /).slice(1)) if (/puerta\.otd|\.puerta\b|puertaTexto\(|type: "mprev"/.test(fn) && !/notasCarro\(|bi\(SALVAGE, es\)/.test(fn)) falla(G, f, 0, `«${fn.slice(0, fn.indexOf("("))}» pinta vehículos sin la línea del título salvage`);
    }
  },

  /* 4ic. Un vehículo es un ítem 'svc' (auto) pero NO es un servicio: no sale en Servicios, no se reserva como cita (con su depósito) ni se
     edita por el editor de servicios. Solo por Inventario (lib/autos.ts). */
  carroNoEsServicio() {
    const G = "carroNoEsServicio", K = "not in ('renta', 'venta', 'auto')";
    const chk = (f, n, msg) => { if (existsSync(f) && readFileSync(f, "utf8").split(K).length - 1 < n) falla(G, f, 0, msg); };
    chk("apps/web/lib/citas.ts", 1, "los servicios que se reservan (citas) dejan fuera los vehículos");
    chk("apps/web/lib/servicios.ts", 1, "la lista de Servicios del panel deja fuera los vehículos");
    chk("apps/web/app/panel/acciones-servicios.ts", 3, "guardar, mostrar u ocultar y quitar un servicio no tocan un vehículo (3 consultas con el filtro)");
    const a = "apps/web/lib/admin-negocios.ts";
    if (existsSync(a) && !/x\.module === 'svc' && x\.k !== 'renta' && x\.k !== 'venta' && x\.k !== 'auto'/.test(readFileSync(a, "utf8"))) falla(G, a, 0, "el 360 no lista los vehículos como servicios");
  },

  /* 4id · Lo que dice una ficha de Iglesias, Bienes Raíces o Autos se puede hacer de verdad: en Free la fila no abre una hoja con un botón de
     pedir (se llama o se escribe, como 4ed antes de su inscripción); mientras «pedir en la app» no exista (booking: false hasta 4ie), ninguna
     hoja lleva a una ruta de solicitud; y nunca «AQUÍ NO SE PIDE CITA POR LA APP» (la decisión del 3 nov da a Free sus solicitudes, §6 #6). */
  freeNoPromete() {
    const G = "freeNoPromete";
    for (const f of ["apps/web/app/(app)/n/[id]/Fe.tsx", "apps/web/app/(app)/n/[id]/Inmueble.tsx", "apps/web/app/(app)/n/[id]/Dealer.tsx"]) {
      if (!existsSync(f)) continue;
      const s = readFileSync(f, "utf8");
      // 4ie: en Free la fila no abre la hoja; si se puede pedir en la app (10 al mes, §6 #6), va directo a la solicitud.
      if (!/abrir: \(id: string, ev\?: MouseEvent\) => \{ stop\(ev\); if \(pro\) setHoja\(id\);( else (if \(pide\) )?acc\.pedir\(pedirHref\(id\)\);)? \}/.test(s)) falla(G, f, 0, "en Free la fila no abre la hoja (solo Pro); si se puede pedir, va directo a la solicitud");
      if (!/const cta: Cta = !pro (\? \(fp\.negocio\.telefono \? llamarC|\|\| k === "derechos" \? llamarC|\? llamarC)/.test(s)) falla(G, f, 0, "en Free el botón es llamar o escribir");
      s.split("\n").forEach((l, i) => {
        if (/AQU[IÍ] NO SE PIDE CITA POR LA APP|NO IN-APP BOOKING HERE/i.test(l)) falla(G, f, i + 1, "Free sí pedirá en la app (§6 #6): no se escribe que aquí no se pide cita");
        if (/router\.push\(/.test(l)) falla(G, f, i + 1, "la ficha pide por acc.pedir (la ruta de la solicitud), nunca con router.push suelto");
      });
    }
    for (const f of ["apps/web/lib/fe-publico.ts", "apps/web/lib/inmuebles-publico.ts", "apps/web/lib/autos-publico.ts"]) if (existsSync(f) && !/booking: true/.test(readFileSync(f, "utf8"))) falla(G, f, 0, "4ie: pedir en la app ya existe (booking: true)");
    for (const r of ["apps/web/app/(app)/n/[id]/ver/page.tsx", "apps/web/app/(app)/vis/[num]/page.tsx", "apps/web/app/(app)/n/[id]/inscribirme/page.tsx"]) if (!existsSync(r)) falla(G, r, 0, "un botón de la ficha lleva a una ruta que no existe");
  },

  /* 4ie · La nota de una visita, una prueba de manejo o una fecha de Iglesias nunca guarda un seguro social o ITIN (9 cifras) ni un número de
     tarjeta o cuenta (13 a 19): el servidor los tapa ANTES de guardar (taparNumeros) y la base lo vuelve a comprobar. Se prueba de verdad:
     las expresiones del archivo se ejecutan contra ejemplos (lo que debe taparse y lo que no). */
  notaSinNumeros() {
    const G = "notaSinNumeros", C = "apps/web/lib/visitas-inm-comun.ts";
    if (!existsSync(C)) return falla(G, C, 0, "falta el filtro de la nota (taparNumeros)");
    const t = readFileSync(C, "utf8");
    const rx = (n) => { const m = new RegExp(`export const ${n} = /(.+)/g;`).exec(t); try { return m ? new RegExp(m[1], "g") : null; } catch { return null; } };
    const T = rx("NUM_TARJETA"), S = rx("NUM_SSN");
    if (!T || !S) return falla(G, C, 0, "NUM_TARJETA y NUM_SSN tienen que ser expresiones con /g");
    const tapa = (x) => x.replace(T, "••••").replace(S, (_m, pre) => `${pre}•••-••-••••`);
    const DEBE = ["mi seguro es 123-45-6789", "ITIN 912 70 1234 ok", "123456789", "tarjeta 4111 1111 1111 1111", "cuenta 4111-1111-1111-1111", "5500000000000004", "IBAN 1234567890123456789"];
    const NO = ["llego a las 5:30", "mi carro es 2015 con 88400 millas", "tengo 2 niños y 1 perro", "apartamento 3B"];
    for (const x of DEBE) if (/\d{3}[ -]?\d{2}[ -]?\d{4}(?!\d)|(\d[ -]?){12,18}\d/.test(tapa(x).replace(/(\d)(?=•)/g, "$1 "))) falla(G, C, 0, `el filtro deja pasar «${x}»`);
    for (const x of NO) if (tapa(x) !== x) falla(G, C, 0, `el filtro tapa algo que no es un número privado: «${x}»`);
    for (const [f, re] of [["apps/web/lib/visitas-inm.ts", /const nota = taparNumeros\(limpio\(f\.nota, 200\)\)\.texto;/], ["apps/web/lib/inscripciones.ts", /const nota = taparNumeros\(limpio\(f\.nota, 200\)\)\.texto;/]])
      if (existsSync(f) && !re.test(readFileSync(f, "utf8"))) falla(G, f, 0, "la nota pasa por taparNumeros antes de guardarse");
    const M = "packages/db/migrations/0094_visitas_ver.sql";
    if (existsSync(M) && !/customer_note !~ '\(\^\|\[\^0-9\]\)\[0-9\]\{3\}\[ -\]\?\[0-9\]\{2\}\[ -\]\?\[0-9\]\{4\}\(\[\^0-9\]\|\$\)' and customer_note !~ '\(\[0-9\]\[ -\]\?\)\{12,18\}\[0-9\]'/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "la base comprueba la nota (check operations_nota_sin_numeros)");
    // La pantalla avisa (el texto del diseño, verbatim).
    if (!/No escribas tu seguro social ni números de cuenta aquí\./.test(readFileSync("apps/web/lib/inmuebles-comun.ts", "utf8"))) falla(G, "apps/web/lib/inmuebles-comun.ts", 0, "falta el aviso «No escribas tu seguro social ni números de cuenta aquí.»");
    for (const f of ["apps/web/app/(app)/n/[id]/ver/Visita.tsx", "apps/web/app/(app)/n/[id]/inscribirme/Inscribirme.tsx"]) if (existsSync(f) && !/AVISO_NOTA/.test(readFileSync(f, "utf8"))) falla(G, f, 0, "la nota muestra el aviso de números (AVISO_NOTA)");
  },

  /* 4ie · Ir a consejería, a una capellanía, pedir oración o ir a recuperación son datos sensibles: los avisos de esas fechas (insc_fen_*) no
     dicen el lugar, el servicio, el motivo ni la nota (como privacidadSalud), y el motor los manda cuando el servicio o el lugar es de esos. */
  avisoFeNeutro() {
    const G = "avisoFeNeutro", dir = "packages/db/migrations";
    let n = 0;
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql"))) readFileSync(`${dir}/${x}`, "utf8").split("\n").forEach((l, i) => {
      if (!/\('insc_fen_\w+'/.test(l)) return;
      n++;
      if (/\{(negocio|servicio|svc|cliente|motivo|nota|item|nino)\}/.test(l)) falla(G, `${dir}/${x}`, i + 1, "un aviso de consejería, capellanía u oración es neutro: sin {negocio}, {servicio}, {motivo} ni {nota}");
    });
    if (n < 9) falla(G, dir, 0, "faltan avisos neutros insc_fen_* (ok, alt, no, exp, cx, biz_cx, grupo_cx, empieza, done)");
    const I = "apps/web/lib/inscripciones.ts";
    if (existsSync(I)) {
      const t = readFileSync(I, "utf8");
      if (!/export const tplFe = \(tpl: string, neutro: boolean\) => \(FE_TPL\.includes\(tpl\) \? `\$\{neutro \? "insc_fen_" : "insc_fe_"\}/.test(t)) falla(G, I, 0, "Iglesias manda insc_fen_* (neutros) cuando la fecha es de consejería u oración");
      if (!/kf === "consejo" \|\| kf === "oracion"/.test(t) || !/const NEUTRO_FE = \/consejer\|counsel\|capell\|chaplain\|oraci\[oó\]n\|prayer\|recuperaci\|recovery/.test(t)) falla(G, I, 0, "consejería, capellanía, oración y recuperación cuentan como neutras (por el lugar o por el servicio)");
      if (!/guardarNotaFe\(c, op, nota\)/.test(t)) falla(G, I, 0, "la nota de consejería va cifrada (guardarNotaFe), nunca en operations");
    }
  },

  /* 4if · En Iglesias, Bienes Raíces y Autos NADA se cobra en la app, así que ninguna ayuda de esas tres puede terminar en una devolución
     por la app («Que me devuelvan» lo hace el negocio fuera de la app y la persona confirma «Me lo devolvieron»; si no, To'Latino decide una
     sanción, nunca un reembolso). Toda búsqueda del pago de una ayuda (depositoDe) pasa por SIN_DINERO; lib/ayuda-estafa.ts y las decisiones
     de «Posible estafa» no tocan cobros ni la pasarela. */
  sinDineroEnAyuda() {
    const G = "sinDineroEnAyuda", A = "apps/web/lib/ayuda-cita.ts", E = "apps/web/lib/ayuda-estafa.ts", K = "apps/web/app/admin/acciones-colas.ts";
    if (existsSync(A)) {
      const t = readFileSync(A, "utf8");
      const sd = t.split("\n").find((l) => /export const SIN_DINERO = new Set<RubroAyuda>\(/.test(l)) ?? "";
      for (const r of ["fe", "inm", "dealer"]) if (!sd.includes(`"${r}"`)) falla(G, A, 0, `SIN_DINERO tiene que incluir ${r}`);
      t.split("\n").forEach((l, i) => { if (/await depositoDe\(/.test(l) && !/SIN_DINERO\.has\(/.test(l)) falla(G, A, i + 1, "buscar el pago de una ayuda pasa por SIN_DINERO (Iglesias, Bienes Raíces y Autos no tienen nada que devolver por la app)"); });
      if (!/if \(sinDinero\) \{[\s\S]{0,400}?outside_refund = 'pending'/.test(t)) falla(G, A, 0, "aceptar una propuesta sin dinero en la app deja «Me lo devolvieron» pendiente, nunca un reembolso");
    }
    if (existsSync(E) && /from "\.\/(cobros|pasarela|stripe)"|import\("\.\/(cobros|pasarela|stripe)"\)|devolverPago|insert into payments/.test(readFileSync(E, "utf8"))) falla(G, E, 0, "la pausa por posible estafa no toca cobros ni la pasarela");
    if (existsSync(K)) {
      const t = readFileSync(K, "utf8"), i = t.indexOf("export async function decidirEstafa"), j = t.indexOf("export async function", i + 10);
      const cuerpo = i < 0 ? "" : t.slice(i, j < 0 ? undefined : j), cuerpo2 = t.slice(t.indexOf("export async function pausaEstafa"));
      if (i < 0) falla(G, K, 0, "falta decidirEstafa");
      if (/devolverPago|cobros|pasarela|refunded_cents/.test(cuerpo) || /devolverPago|cobros|pasarela|refunded_cents/.test(cuerpo2.slice(0, 2500))) falla(G, K, 0, "«Posible estafa» nunca devuelve dinero: no pasó por la app");
    }
  },

  /* 4if · Iglesias: la reseña no lleva fotos (nadie sale en una foto sin saberlo en un lugar de culto, una despensa o un funeral): el servidor
     la rechaza y la pantalla no ofrece subirlas. Y a la persona, los avisos de una ayuda de Iglesias son neutros (puede ser consejería). */
  feSinFotoPublica() {
    const G = "feSinFotoPublica", r = "apps/web/lib/resenas.ts", esc = "apps/web/app/(app)/n/[id]/resena/Escribir.tsx", a = "apps/web/lib/ayuda-cita.ts", dir = "packages/db/migrations";
    if (existsSync(r) && !/if \(rubro === "fe" && fotos\.length\) return no\(/.test(readFileSync(r, "utf8"))) falla(G, r, 0, "una reseña de Iglesias no puede guardar fotos");
    if (existsSync(esc) && !/rub === "fe" \? null : rub === "ninos" \? null : fotosB/.test(readFileSync(esc, "utf8"))) falla(G, esc, 0, "la reseña de Iglesias no ofrece subir fotos");
    if (existsSync(a) && !/h\.cat === "NEG-FE" && \(tpl === "help_reply" \|\| tpl === "help_done"\)\) \{ await avisar\(h\.uid, tpl === "help_reply" \? "fe_help_reply" : "fe_help_done"/.test(readFileSync(a, "utf8"))) falla(G, a, 0, "a la persona, la ayuda de Iglesias le avisa con fe_help_* (neutros)");
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql"))) readFileSync(`${dir}/${x}`, "utf8").split("\n").forEach((l, i) => {
      if (/\('(fe_help_\w+|help_directo)'/.test(l) && /\{(negocio|servicio|svc|motivo|nota|item)\}/.test(l)) falla(G, `${dir}/${x}`, i + 1, "un aviso de ayuda de Iglesias (o el directo a To'Latino) es neutro: sin {negocio} ni {servicio}");
    });
  },

  /* 4if · El aviso de «To'Latino resolvió tu solicitud» enlaza a la pantalla de SU operación: solo la ayuda de un pedido de comida usa
     avisarAyuda (/pedido/…); todas las demás (citas, mercado, apartados, fiestas, viajes, noche, inscripciones y visitas) avisarAyudaCita.
     Se cazó: fiestas, viajes, noche e inscripciones resueltas por To'Latino llevaban a /pedido/{num}. */
  avisoAyudaPorTipo() {
    const K = "apps/web/app/admin/acciones-colas.ts";
    if (!existsSync(K)) return;
    const t = readFileSync(K, "utf8");
    if (/o\?\.k === "appointment"\) await \(await import\("@\/lib\/ayuda-cita"\)\)/.test(t) || !/if \(o\?\.k === "order"\) await \(await import\("@\/lib\/ayuda"\)\)\.avisarAyuda\(o\.num, "help_done"\);\s*else if \(o\) await \(await import\("@\/lib\/ayuda-cita"\)\)\.avisarAyudaCita\(o\.num, "help_done"\)/.test(t))
      falla("avisoAyudaPorTipo", K, 0, "al resolver una ayuda, solo la de un pedido de comida usa avisarAyuda; las demás avisan con avisarAyudaCita");
  },

  /* 4ig. Una cola nueva sin su vista caía en la rama por defecto de Colas («Recomendado por un vecino»): la tarjeta y el caso decían otra
     cosa. Toda cola de lib/colas.ts tiene su título en la lista (lib/admin-colas.ts `x.queue === "k"`) y su detalle en app/admin/Colas.tsx
     (`k.queue === "k"`). */
  colaConVista() {
    const f = "apps/web/lib/colas.ts", L = "apps/web/lib/admin-colas.ts", U = "apps/web/app/admin/Colas.tsx";
    if (!existsSync(f) || !existsSync(L) || !existsSync(U)) return;
    const m = /export type Cola = ([^;]+);/.exec(readFileSync(f, "utf8"));
    if (!m) return falla("colaConVista", f, 0, "no encuentro el tipo Cola");
    // 5d: los casos de la Comunidad (rep de publicaciones y comentarios, repUsr, apel, fotos) se pintan en ColasComunidad.tsx.
    const CC = "apps/web/app/admin/ColasComunidad.tsx", CE = "apps/web/app/admin/ColasEventos.tsx";
    // 6a: los eventos a revisar se pintan en ColasEventos.tsx.
    // Sin comentarios: un comentario que nombra la cola no es su vista (6a: lo cazó la prueba al revés).
    const tl = sinComent(L), tu = sinComent(U) + (existsSync(CC) ? sinComent(CC) : "") + (existsSync(CE) ? sinComent(CE) : "");
    for (const k of [...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1])) {
      if (!tl.includes(`x.queue === "${k}"`)) falla("colaConVista", L, 0, `la cola «${k}» no tiene su título en la lista (sale como otra cola)`);
      if (!tu.includes(`k.queue === "${k}"`)) falla("colaConVista", U, 0, `la cola «${k}» no tiene su detalle en Colas`);
    }
    // 6a: el plazo de una cola que lo toma de Configuración (slaCfg) se calcula siempre con ella: la lista, el contador, «Tomar siguiente» y
    // la Analítica usan slaCase(cfgSql); nadie arma el plazo con COLAS[…].sla a mano; la clave existe en ClaveConfig.
    const tc = readFileSync(f, "utf8"), cfg = existsSync("apps/web/lib/config.ts") ? readFileSync("apps/web/lib/config.ts", "utf8") : "";
    for (const m of tc.matchAll(/\n  (\w+): \{[^\n]*slaCfg: "([a-z0-9_]+)"/g)) if (!cfg.includes(`"${m[2]}"`)) falla("colaConVista", f, 0, `la cola «${m[1]}» toma su plazo de «${m[2]}», que no está en ClaveConfig`);
    if (/slaCfg:/.test(tc)) {
      if (!/export const SLA_SQL = slaCase\(cfgSql\);/.test(sinComent(L))) falla("colaConVista", L, 0, "el plazo de las colas se arma con slaCase(cfgSql) (Configuración)");
      if (!/espera\(x\.opened_at, x\.sla_h\)/.test(sinComent(L))) falla("colaConVista", L, 0, "la lista mide la espera con el plazo de la base (sla_h), no con COLAS[…].sla");
      for (const x of codigo) if (/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(x) && x !== f && /`case q\.queue \$\{Object\.entries\(COLAS\)/.test(sinComent(x))) falla("colaConVista", x, 0, "plazo de las colas armado a mano: usa SLA_SQL / slaCase(cfgSql)");
    }
  },

  /* 4ig. Un aviso con una clave que no está en notif_templates no sale (avisar() no encuentra la plantilla y calla). Toda clave escrita a
     mano en avisar / avisarNegocio / avisar… existe en una migración, con su texto en español e inglés. */
  avisoConPlantilla() {
    const dir = "packages/db/migrations", tpl = new Map();
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql")).sort()) {
      const t = readFileSync(`${dir}/${x}`, "utf8");
      if (!/notif_templates/.test(t)) continue;
      for (const m of t.matchAll(/\(\s*'([a-z0-9_]+)',\s*'(?:crit|tx|mod|biz|mkt)',[^\n]*'\{[^\n]*/g)) tpl.set(m[1], m[0]);
    }
    for (const [k, l] of tpl) if (!/"es"\s*:/.test(l) || !/"en"\s*:/.test(l)) falla("avisoConPlantilla", dir, 0, `la plantilla «${k}» no trae español e inglés en la misma línea`);
    for (const f of codigo) {
      if (!/^apps\/web\/(lib|app)\/.+\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        // 5d: avisarOculto / avisarSancion / avisarDecision eligen su plantilla adentro (su segundo argumento es lo oculto, no una plantilla).
        for (const m of l.matchAll(/\bavisar(?!Oculto|Sancion|Decision)\w*\([^()]*?,\s*"([a-z]+_[a-z0-9_]+)"/g)) if (!tpl.has(m[1])) falla("avisoConPlantilla", f, i + 1, `el aviso «${m[1]}» no existe en notif_templates`);
      });
    }
    // 5d: lib/apelaciones.ts elige la plantilla adentro (const tpl = …): toda clave de moderación escrita ahí existe.
    const AP = "apps/web/lib/apelaciones.ts";
    if (existsSync(AP)) for (const l of sinComent(AP).split("\n").filter((x) => /const tpl = |avisar\(/.test(x))) for (const m of l.matchAll(/"([a-z]+_[a-z0-9_]+)"/g)) if (!/^(com_post|com_comment|dm_message)$/.test(m[1]) && !tpl.has(m[1])) falla("avisoConPlantilla", AP, 0, `el aviso «${m[1]}» no existe en notif_templates`);
  },

  /* 4ig. Analítica muestra cifras, nunca personas por lo que creen ni datos de crédito: lib/admin-analitica.ts y la pantalla no leen la
     denominación (subcategorías de Iglesias) ni nada de crédito, seguro social, ingresos o fecha de nacimiento. */
  analiticaSinCreencias() {
    for (const f of ["apps/web/lib/admin-analitica.ts", "apps/web/app/admin/Analitica.tsx"]) {
      if (!existsSync(f)) continue;
      const t = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/.*$/gm, "$1");
      t.split("\n").forEach((l, i) => {
        const m = /subcategory_ids|cat[oó]lic|cristian|evang[eé]l|bautist|pentecost|jud[ií]|musulm|budist|religi|denominac|credit|cr[eé]dito|\bssn\b|seguro social|income|ingresos|birth|nacimiento/i.exec(l);
        if (m) falla("analiticaSinCreencias", f, i + 1, `Analítica no lee «${m[0]}»: nunca personas por religión ni datos de crédito`);
      });
    }
  },

  /* ── Fase 5 · Comunidad (5a) ── Utilidades: archivos de la Comunidad y su texto sin comentarios. */
  /* 5a. Teléfonos, correos y números privados nunca se guardan en lo que escribe un vecino: el filtro (lib/comunidad-filtro.ts) los
     revisa con PII y TEL, publicar/editar lo corren antes de escribir, y la base lo impone con com_sin_datos() en publicaciones,
     comentarios y bio (un insert directo también falla). Nadie fuera de lib/comunidad*.ts inserta publicaciones ni comentarios. */
  comunidadSinTelefonos() {
    const F = "apps/web/lib/comunidad-filtro.ts", L = "apps/web/lib/comunidad.ts", M = "packages/db/migrations/0097_comunidad_base.sql";
    if (!existsSync(F) || !existsSync(L) || !existsSync(M)) return;
    const f = sinComent(F), l = sinComent(L), m = readFileSync(M, "utf8");
    const rt = cuerpoFn(f, "revisarTexto"); // 5c: revisarMensaje también usa TEL; la regla vive en revisarTexto.
    if (!/TEL\.test\(t\)/.test(rt) || !/PII\.test\(t\)/.test(rt) || !/const TEL = \/\(\\d\[\\s\(\)\.-\]\*\)\{10\}/.test(f)) falla("comunidadSinTelefonos", F, 0, "revisarTexto debe probar TEL (10 dígitos) y PII antes de dejar pasar un texto");
    if (!/export function revisarPublicacion[\s\S]*?revisarTexto\(t\)/.test(f)) falla("comunidadSinTelefonos", F, 0, "revisarPublicacion no pasa el texto por revisarTexto");
    for (const fn of ["publicar", "editar"]) {
      const c = cuerpoFn(l, fn);
      const iF = c.search(/revisarPublicacion\(/), iW = c.search(/insert into com_posts|update com_posts set body/);
      if (iF < 0 || iW < 0 || iF > iW) falla("comunidadSinTelefonos", L, 0, `«${fn}» escribe sin pasar antes por revisarPublicacion()`);
    }
    // 5b: los comentarios y respuestas pasan por revisarComentario() (que corre revisarTexto) antes de guardarse.
    const H = "apps/web/lib/comunidad-hilo.ts";
    if (!/export function revisarComentario[\s\S]*?revisarTexto\(t\)/.test(f)) falla("comunidadSinTelefonos", F, 0, "revisarComentario no pasa el texto por revisarTexto");
    if (existsSync(H)) { const c = cuerpoFn(sinComent(H), "comentar"), iF = c.search(/revisarComentario\(/), iW = c.search(/insert into com_comments/);
      if (iF < 0 || iW < 0 || iF > iW) falla("comunidadSinTelefonos", H, 0, "«comentar» escribe sin pasar antes por revisarComentario()"); }
    if (!/t ~ '\(\\d\[\\s\(\)\.-\]\*\)\{10\}'/.test(m)) falla("comunidadSinTelefonos", M, 0, "com_sin_datos() no frena teléfonos de 10 dígitos");
    for (const [tabla, col] of [["com_posts", "body"], ["com_comments", "body"], ["community_profiles", "bio"]])
      if (!new RegExp(`alter table ${tabla} add constraint \\w+ check \\(com_sin_datos\\(${col}\\)`).test(m)) falla("comunidadSinTelefonos", M, 0, `${tabla}.${col} sin la restricción com_sin_datos()`);
    // 5e: la cuenta oficial (lib/oficial.ts) también escribe en com_posts, y también pasa antes por revisarPublicacion().
    const O = "apps/web/lib/oficial.ts";
    if (existsSync(O)) { const c = cuerpoFn(sinComent(O), "publicarOficial"), iF = c.search(/revisarPublicacion\(/), iW = c.search(/insert into com_posts/);
      if (iF < 0 || iW < 0 || iF > iW) falla("comunidadSinTelefonos", O, 0, "«publicarOficial» escribe sin pasar antes por revisarPublicacion()"); }
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || /^apps\/web\/lib\/comunidad[^/]*\.ts$/.test(x) || x === O) continue;
      readFileSync(x, "utf8").split("\n").forEach((t, i) => { if (/insert into com_(posts|comments)\b/i.test(t)) falla("comunidadSinTelefonos", x, i + 1, "solo lib/comunidad*.ts y lib/oficial.ts escriben publicaciones y comentarios (con el filtro)"); });
    }
  },

  /* 5a. La ubicación de una publicación es el centro del barrio (o de la ciudad): la pone la base al insertar y nadie la cambia; ninguna
     consulta de la Comunidad devuelve el punto (solo la distancia redondeada) ni lee dónde está la persona (viewing_center, GPS). */
  ubicacionDeBarrio() {
    const M = "packages/db/migrations/0097_comunidad_base.sql";
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      if (!/new\.geom := coalesce\(\(select z\.center from zones z[^;]*\), c\.center\)/.test(m)) falla("ubicacionDeBarrio", M, 0, "com_posts_antes debe poner geom = centro del barrio o de la ciudad");
      if (!/raise exception 'la ubicación de una publicación la pone la base/.test(m)) falla("ubicacionDeBarrio", M, 0, "com_posts_antes debe impedir cambiar geom a mano");
    }
    for (const x of codigo) {
      if (!/^apps\/web\/(lib\/comunidad[^/]*\.ts|app\/\(app\)\/comunidad\/.*\.tsx?|app\/admin\/acciones-comunidad\.ts)$/.test(x)) continue;
      sinComent(x).split("\n").forEach((t, i) => {
        const sinCalc = t.replace(/st_(distance|dwithin)\(p\.geom,/g, "");
        if (/\bgeom\b|viewing_center|\bst_[xy]\(|users?\.geo\b|\bgps\b/i.test(sinCalc)) falla("ubicacionDeBarrio", x, i + 1, "la Comunidad no devuelve puntos ni lee la ubicación de la persona: solo st_distance/st_dwithin redondeados contra el barrio");
      });
    }
  },

  /* 5a. Bloquear es mutuo e invisible: toda función de lib/comunidad*.ts que lee publicaciones o comentarios para alguien (recibe
     `viewer`) pasa por sinBloqueos(); sinBloqueos cubre las dos direcciones y los silenciados. */
  bloqueoMutuo() {
    for (const x of codigo) {
      if (!/^apps\/web\/lib\/comunidad[^/]*\.ts$/.test(x)) continue;
      const t = sinComent(x);
      if (/export const sinBloqueos/.test(t) && !/ub\.user_id = \$\{viewer\} and ub\.target_user_id = \$\{autor\}[\s\S]{0,120}ub\.kind = 'block' and ub\.user_id = \$\{autor\} and ub\.target_user_id = \$\{viewer\}/.test(t))
        falla("bloqueoMutuo", x, 0, "sinBloqueos debe excluir en los dos sentidos (lo que yo bloqueé o silencié y quien me bloqueó)");
      for (const m of t.matchAll(/\n(?:export )?async function (\w+)\(([^)]*)\)/g)) {
        if (!/\bviewer\b/.test(m[2])) continue;
        const c = cuerpoFn(t, m[1]), filtroW = /w: string\[\] = \[[^\]]*sinBloqueos\(/.test(c);
        // Cada consulta que lee publicaciones o comentarios lleva sinBloqueos (o las condiciones `w` que lo traen).
        for (const q of c.match(/`[^`]*`/g) ?? []) if (/from com_(posts|comments)\b/.test(q) && !/sinBloqueos\(/.test(q) && !(filtroW && /\$\{w\.join\(/.test(q)))
          falla("bloqueoMutuo", x, 0, `«${m[1]}» lista contenido para una persona sin sinBloqueos()`);
      }
    }
  },

  /* 5a. El muro pagina por cursor (hot, id) o (publish_at, id), sin offset, con los índices parciales que sirven a esa consulta. */
  feedConCursor() {
    const L = "apps/web/lib/comunidad.ts", M = "packages/db/migrations/0097_comunidad_base.sql";
    for (const x of codigo) {
      if (!/^apps\/web\/(lib\/comunidad[^/]*\.ts|app\/\(app\)\/comunidad\/.*\.tsx?)$/.test(x)) continue;
      sinComent(x).split("\n").forEach((t, i) => { if (/\boffset\b/i.test(t)) falla("feedConCursor", x, i + 1, "la Comunidad no pagina con offset: usa el cursor"); });
    }
    if (!existsSync(L)) return;
    const c = cuerpoFn(sinComent(L), "muro");
    if (!/\(p\.hot, p\.id\) < \(/.test(c) || !/\(p\.publish_at, p\.id\) < \(/.test(c) || !/limit \$\{POR_PAGINA \+ 1\}/.test(c)) falla("feedConCursor", L, 0, "muro() debe seguir con cursor (hot, id) / (publish_at, id) y pedir una de más");
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      if (!/on com_posts \(city_id, hot desc, id desc\) where status = 'visible'/.test(m) || !/on com_posts \(city_id, publish_at desc, id desc\) where status = 'visible'/.test(m)) falla("feedConCursor", M, 0, "faltan los índices del muro (city_id, hot|publish_at desc, id desc)");
    }
  },

  /* 5a. La Comunidad pide cuenta (salvo Hoy en el barrio, 5e): cada pantalla de /comunidad entra por conCuenta() (que manda a /entrar) o,
     el muro, muestra el muro de registro antes de leer nada de vecinos; las acciones piden sesión; el muro de registro no lee textos ni nombres. */
  comunidadSoloConCuenta() {
    const S = "apps/web/app/(app)/comunidad/sesion.ts", L = "apps/web/lib/comunidad.ts";
    if (existsSync(S) && !/if \(!u\?\.first_name\) redirect\(`\/entrar\?volver=/.test(readFileSync(S, "utf8"))) falla("comunidadSoloConCuenta", S, 0, "conCuenta() debe mandar a /entrar sin sesión");
    for (const x of codigo) {
      if (!/^apps\/web\/app\/\(app\)\/comunidad\/(.*\/)?page\.tsx$/.test(x)) continue;
      const t = sinComent(x), iDatos = t.search(/\b(muro|publicacion|paraEditar|hilo|respuestas)\(/), iCuenta = t.search(/await conCuenta\(/), iInv = t.search(/if \(!u\) \{[\s\S]*?return <Invitado/);
      if (iDatos >= 0 && (iCuenta < 0 || iCuenta > iDatos)) falla("comunidadSoloConCuenta", x, 0, "lee contenido de vecinos antes de pedir la cuenta (conCuenta)");
      if (iCuenta < 0 && iInv < 0) falla("comunidadSoloConCuenta", x, 0, "pantalla de la Comunidad sin conCuenta() ni muro de registro");
      if (/Invitado/.test(t) && iInv > iCuenta && iCuenta >= 0) falla("comunidadSoloConCuenta", x, 0, "el muro de registro va antes de conCuenta()");
    }
    const A = "apps/web/app/(app)/comunidad/acciones.ts";
    if (existsSync(A)) for (const p of readFileSync(A, "utf8").split(/\nexport async function /).slice(1)) if (!/await quien\(\)/.test(p.slice(0, 400))) falla("comunidadSoloConCuenta", A, 0, `«${p.slice(0, p.indexOf("("))}» no pide sesión (quien())`);
    if (existsSync(L)) { const c = cuerpoFn(sinComent(L), "resumenInvitado"); if (/p\.body|first_name|last_name|author_user_id|photo_url/.test(c)) falla("comunidadSoloConCuenta", L, 0, "resumenInvitado no puede leer textos ni nombres de vecinos"); }
  },

  /* 5a. Nadie se recomienda a sí mismo: publicar revisa, antes de guardar una recomendación, que el autor no sea dueño ni del equipo del
     negocio («Tu negocio publica en sus Novedades»). */
  noTePromuevas() {
    const L = "apps/web/lib/comunidad.ts";
    if (!existsSync(L)) return;
    const t = sinComent(L), c = cuerpoFn(t, "publicar"), s = cuerpoFn(t, "esSuNegocio");
    const iS = c.search(/\n\s*if \(await esSuNegocio\(c, userId, b\.id\)\) return no\(/), iW = c.search(/insert into com_posts/);
    if (iS < 0 || iW < 0 || iS > iW) falla("noTePromuevas", L, 0, "publicar guarda una recomendación sin revisar esSuNegocio() antes");
    if (!/owner_user_id = \$1/.test(s) || !/business_members m where m\.business_id = b\.id and m\.user_id = \$1 and m\.status = 'active'/.test(s)) falla("noTePromuevas", L, 0, "esSuNegocio debe mirar al dueño y al equipo activo del negocio");
    // 5b: recomendar un negocio en un comentario también pasa por esSuNegocio() antes de guardar.
    const H = "apps/web/lib/comunidad-hilo.ts";
    if (existsSync(H)) { const h = cuerpoFn(sinComent(H), "comentar"), iS = h.search(/\n\s*if \(await esSuNegocio\(c, userId, b\.id\)\) return no\(/), iW = h.search(/insert into com_comments/);
      if (iS < 0 || iW < 0 || iS > iW) falla("noTePromuevas", H, 0, "comentar guarda un negocio recomendado sin revisar esSuNegocio() antes"); }
  },

  /* ── Fase 5 · Comunidad (5b) ── */
  /* 5b. Un voto por persona y nada más: la llave (destino, persona) en com_votes y (encuesta, persona) en com_poll_votes; lo propio no se
     vota (la base lo rechaza y votar() lo revisa antes); dos cuentas del mismo dispositivo no suman (counted lo pone la base y los
     contadores solo cuentan los que cuentan); la app solo escribe votos con com_votar() desde lib/comunidad-hilo.ts. */
  votoUnico() {
    const M0 = "packages/db/migrations/0097_comunidad_base.sql", H = "apps/web/lib/comunidad-hilo.ts";
    if (!existsSync(M0)) return;
    const m0 = readFileSync(M0, "utf8");
    if (!/create table if not exists com_votes \([\s\S]*?primary key \(target_kind, target_id, user_id\)/.test(m0)) falla("votoUnico", M0, 0, "com_votes sin la llave (target_kind, target_id, user_id): una persona podría votar dos veces");
    if (!/create table if not exists com_poll_votes \([\s\S]*?primary key \(post_id, user_id\)/.test(m0)) falla("votoUnico", M0, 0, "com_poll_votes sin la llave (post_id, user_id)");
    const antes = ultimaFn("com_votes_antes"), despues = ultimaFn("com_votes_despues");
    if (!antes) return falla("votoUnico", "packages/db/migrations", 0, "falta com_votes_antes (lo propio y el mismo dispositivo los decide la base)");
    if (!/if autor = new\.user_id then raise exception 'lo propio no se vota'/.test(antes)) falla("votoUnico", "packages/db/migrations", 0, "com_votes_antes debe rechazar el voto a lo propio");
    if (!/new\.counted := not exists \(select 1 from com_votes o where [^;]*o\.device = new\.device and o\.user_id <> new\.user_id\)/.test(antes)) falla("votoUnico", "packages/db/migrations", 0, "com_votes_antes debe callar el voto de otra cuenta del mismo dispositivo (counted)");
    if (!/new\.counted := old\.counted/.test(antes)) falla("votoUnico", "packages/db/migrations", 0, "cambiar de signo no puede volver a contar un voto callado");
    if (!/old\.counted/.test(despues) || !/new\.counted/.test(despues)) falla("votoUnico", "packages/db/migrations", 0, "com_votes_despues debe sumar solo los votos que cuentan");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      sinComent(x).split("\n").forEach((t, i) => {
        if (/\b(insert into|update|delete from) com_votes\b/i.test(t)) falla("votoUnico", x, i + 1, "los votos solo se escriben con com_votar() (candado, mismo toque quita, otro signo cambia)");
        if (/com_votar\(/.test(t) && x !== H) falla("votoUnico", x, i + 1, "solo lib/comunidad-hilo.ts llama a com_votar() (después de revisar bloqueos y lo propio)");
      });
    }
    if (existsSync(H)) {
      const c = cuerpoFn(sinComent(H), "votar"), iP = c.search(/if \(t\.autor === userId\) return no\(/), iV = c.search(/com_votar\(/);
      if (iP < 0 || iV < 0 || iP > iV) falla("votoUnico", H, 0, "votar() debe rechazar lo propio antes de llamar a com_votar()");
      // 5f: los puntos del voto salen después de com_votar (con el voto que quedó y el dispositivo del toque).
      const iPts = c.search(/await puntosDelVoto\(c, \{ kind, id, voter: userId, device, mio \}\)/);
      if (iPts < 0 || iPts < iV) falla("votoUnico", H, 0, "votar() debe asentar los puntos con puntosDelVoto() después de com_votar() (con el dispositivo del toque)");
    }
    // 5f · Sin puntos entre cuentas del mismo dispositivo: un voto callado (counted = false) o de una cuenta que comparte dispositivo con
    // quien escribió no da puntos (y revierte lo que había dado); «Me sirvió» tampoco entre cuentas del mismo dispositivo.
    const PU = "apps/web/lib/puntos.ts";
    if (existsSync(PU)) {
      const t = sinComent(PU), v = cuerpoFn(t, "puntosDelVoto"), ms = cuerpoFn(t, "puntosMejorRespuesta"), pr = cuerpoFn(t, "primeraRecomendacion");
      const iG = v.search(/if \(o\.mio !== 1 \|\| !v\?\.counted \|\| \(await mismoDispositivo\(c, o\.voter, t\.autor, o\.device\)\)\) \{ await revertir\(c, t\.autor, ref, "voto"\); return null; \}/), iS = v.search(/await sumar\(/);
      if (iG < 0 || iS < 0 || iG > iS) falla("votoUnico", PU, 0, "puntosDelVoto: solo un voto + que cuenta y de otro dispositivo da puntos (si no, revierte) antes de sumar()");
      const iM = ms.search(/if \(await mismoDispositivo\(c, o\.asker, o\.autor, null\)\) return null;/), iMs = ms.search(/sumar\(/);
      if (iM < 0 || iMs < 0 || iM > iMs) falla("votoUnico", PU, 0, "«Me sirvió» no da puntos entre cuentas del mismo dispositivo");
      if (!/v\.counted and not pts_mismo_dispositivo\(v\.user_id, \$3::uuid, v\.device\)/.test(pr)) falla("votoUnico", PU, 0, "la primera recomendación cuenta solo votos que cuentan y de otro dispositivo");
      const md = ultimaFn("pts_mismo_dispositivo");
      if (!/from sessions s1 join sessions s2 on s2\.device = s1\.device where s1\.user_id = a and s2\.user_id = b/.test(md)) falla("votoUnico", "packages/db/migrations", 0, "pts_mismo_dispositivo debe cruzar las sesiones (dispositivos) de las dos cuentas");
    }
  },

  /* 5b. Los contadores, score, hot, los recomendados del hilo y los del perfil son derivados: solo los escriben sus triggers y funciones en
     la base. Ninguna línea de la app los asigna ni enciende la marca tl.derivados; la base rechaza el cambio a mano (y com_thread_recs
     solo lo escribe com_recs_recalcular). */
  saldoDerivado() {
    const COLS = /\b(up_n|down_n|score|hot|comments_n|replies_n|poll_counts|votes_n|recs_n|top_comment_id|followers_n|following_n|posts_n|answers_best_n|points_total|points_today|points_day|points_month|points_month_key|rank_level|rank_floor|coins)\s*=(?!=)/;
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      for (const q of t.match(/`[^`]*`|"[^"\n]*"/g) ?? []) {
        const u = /\bupdate\s+(com_posts|com_comments|community_profiles|com_thread_recs)\b[\s\S]*?\bset\b([\s\S]*?)(\bwhere\b|$)/i.exec(q);
        if (u && COLS.test(u[2])) falla("saldoDerivado", x, 0, `«${COLS.exec(u[2])[1]}» de ${u[1]} es derivado: solo lo escribe la base (triggers)`);
        if (/\binsert into com_thread_recs\b/i.test(q)) falla("saldoDerivado", x, 0, "com_thread_recs es derivado: solo lo escribe com_recs_recalcular()");
        // 5f: la Tabla del Barrio y el rango son derivados: la app solo llama a tabla_* y pts_* (excluir, cerrar, recalcular).
        if (/\b(insert into|update|delete from) (monthly_boards|board_closures)\b/i.test(q) && !(x === "apps/web/lib/tabla.ts" && /^`insert into board_closures \(city_id, month\)/.test(q))) falla("saldoDerivado", x, 0, "la Tabla del Barrio es derivada: solo la escriben el libro y tabla_excluir / tabla_cerrar");
        if (/\bpts_rango\(/.test(q) && x !== "apps/web/lib/puntos.ts") falla("saldoDerivado", x, 0, "el rango solo lo recalcula recalcularRango() (lib/puntos.ts)");
        if (/\bpts_piso\(/.test(q) && x !== "apps/web/app/admin/acciones-gam.ts") falla("saldoDerivado", x, 0, "el piso del rango solo lo cambia un Admin (acciones-gam.ts)");
        // 5g: el saldo de monedas solo se mueve con el libro: la bienvenida (lib/monedas.ts), el ajuste del equipo (acciones-gam.ts) y los
        // cupones (lib/cupones.ts → cup_*). Gastar y devolver viven dentro de cup_canjear / cup_vencer_uno: la app no los llama.
        if (/\bmon_bienvenida\(/.test(q) && x !== "apps/web/lib/monedas.ts") falla("saldoDerivado", x, 0, "la bienvenida en monedas solo la acredita acreditar() (lib/monedas.ts)");
        if (/\bmon_ajustar\(/.test(q) && x !== "apps/web/app/admin/acciones-gam.ts") falla("saldoDerivado", x, 0, "el ajuste de monedas solo lo hace el equipo (acciones-gam.ts)");
        if (/\bmon_(gastar|devolver|asentar|premios_mes)\(/.test(q)) falla("saldoDerivado", x, 0, "gastar, devolver y el premio del mes viven en la base (cup_canjear, cup_vencer_uno, cierre de la Tabla): la app no los llama");
      }
      if (/tl\.derivados|com_derivados_(on|entrar)\(/.test(t)) falla("saldoDerivado", x, 0, "la app no enciende la marca de derivados: los contadores son de la base");
    }
    const guardas = [["com_posts_antes", "los contadores de una publicación son derivados"], ["com_comments_antes", "los contadores de un comentario son derivados"],
      ["community_profiles_antes", "los contadores del perfil son derivados"], ["com_thread_recs_guardia", "com_thread_recs es derivado"],
      ["community_profiles_antes", "los puntos y el rango son derivados"], ["monthly_boards_guardia", "la Tabla del Barrio es derivada"]];
    for (const [fn, msg] of guardas) {
      const b = ultimaFn(fn);
      if (!b || !b.includes(`raise exception '${msg}`) || !/com_derivados_ok\(\)/.test(b)) falla("saldoDerivado", "packages/db/migrations", 0, `${fn} debe rechazar el cambio a mano («${msg}»)`);
    }
    const c = ultimaFn("com_posts_antes");
    if (c && !/new\.hot := com_hot\(new\.score, new\.publish_at\)/.test(c)) falla("saldoDerivado", "packages/db/migrations", 0, "hot debe recalcularse en la base con cada cambio de score");
    // 5f · rank_level lo escribe solo pts_rango (y la semilla de pruebas); los puntos del perfil, solo el libro (points_entries_despues).
    const R = ultimaFn("pts_rango"), D = ultimaFn("points_entries_despues");
    if (R && !/update community_profiles set rank_floor = fl, rank_level = nivel where user_id = uid/.test(R)) falla("saldoDerivado", "packages/db/migrations", 0, "pts_rango debe ser quien escribe rank_level");
    if (D && !/points_total = points_total \+ new\.delta/.test(D)) falla("saldoDerivado", "packages/db/migrations", 0, "points_total sale de sumar los asientos del libro");
    // 5g · el saldo de monedas (community_profiles.coins) es derivado: lo escribe solo el libro, nunca queda negativo y gastar bloquea el perfil.
    const CA = ultimaFn("community_profiles_antes"), CD = ultimaFn("coin_entries_despues"), MG = ultimaFn("mon_gastar"), M5 = "packages/db/migrations/0103_monedas_cupones.sql";
    if (existsSync(M5)) {
      if (!CA.includes("raise exception 'las monedas son derivadas") || !/new\.coins is distinct from old\.coins/.test(CA)) falla("saldoDerivado", M5, 0, "community_profiles_antes debe rechazar las monedas escritas a mano");
      if (!/update community_profiles set coins = coins \+ new\.delta where user_id = new\.user_id/.test(CD)) falla("saldoDerivado", M5, 0, "el saldo de monedas sale de sumar los asientos del libro (coin_entries_despues)");
      if (!/add constraint community_profiles_monedas check \(coins >= 0\)/.test(readFileSync(M5, "utf8"))) falla("saldoDerivado", M5, 0, "el saldo de monedas nunca es negativo (check coins >= 0)");
      if (!/pg_advisory_xact_lock\(hashtextextended\('mon:' \|\| uid::text, 0\)\);\s*select coins into saldo from community_profiles where user_id = uid for update;\s*if coalesce\(saldo, 0\) < n then raise exception/.test(MG)) falla("saldoDerivado", M5, 0, "mon_gastar: candado por persona, el perfil «for update» y el saldo revisado antes de gastar");
    }
    for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql") && y >= "0102")) {
      const t = readFileSync(`packages/db/migrations/${x}`, "utf8").replace(/create or replace function pts_rango\([\s\S]*?\$\$[\s\S]*?\$\$/g, "");
      if (/\brank_level\s*=\s*(?!.*least\(rank_level)/.test(t.replace(/--.*$/gm, "").replace(/rank_level\s*=\s*r\.level|cp\.rank_level\s*=/g, ""))) falla("saldoDerivado", `packages/db/migrations/${x}`, 0, "rank_level solo lo escribe pts_rango");
    }
  },

  /* 5f. Tope del día: nadie gana más de pts_tope() (100 de fábrica) puntos «regla» en un día local de su ciudad. Lo impone la base antes de
     insertar (101 en un día → se rechaza) y pts_sumar guarda solo lo que cabe (lo que pasa del tope no se guarda); el tope vive en
     platform_config y la app no cuenta puntos por su cuenta. */
  topeDiario() {
    const G = "topeDiario", A = ultimaFn("points_entries_antes"), S = ultimaFn("pts_sumar"), T = ultimaFn("pts_tope");
    if (!A || !S) return falla(G, "packages/db/migrations", 0, "falta el libro de puntos (points_entries_antes / pts_sumar)");
    if (!/if new\.motive = 'regla' then[\s\S]*?select coalesce\(sum\(delta\), 0\) into hoy from points_entries where user_id = new\.user_id and local_day = new\.local_day and motive = 'regla' and delta > 0;[\s\S]*?if hoy \+ new\.delta > pts_tope\(\) then raise exception 'tope diario/.test(A)) falla(G, "packages/db/migrations", 0, "points_entries_antes debe rechazar lo que pasa del tope del día");
    if (!/d := least\(r\.points, pts_tope\(\) - hoy\);\s*if d <= 0 then return 0; end if;/.test(S)) falla(G, "packages/db/migrations", 0, "pts_sumar debe guardar solo lo que cabe en el tope del día");
    if (!/dia := \(now\(\) at time zone tz\)::date;/.test(S)) falla(G, "packages/db/migrations", 0, "el día del tope es el día local de la ciudad de la persona");
    if (!/pg_advisory_xact_lock\(hashtextextended\('pts:' \|\| uid::text, 0\)\)/.test(S)) falla(G, "packages/db/migrations", 0, "pts_sumar sin candado por persona (dos a la vez se pasarían del tope)");
    if (!/key = 'pts_tope_dia'|cfg_int\('pts_tope_dia'\)/.test(T)) falla(G, "packages/db/migrations", 0, "el tope vive en Configuración (pts_tope_dia)");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      if (/points_today\s*[+-]|pts_tope_dia'\s*,\s*'\d/.test(sinComent(x))) falla(G, x, 0, "la app no cuenta los puntos del día por su cuenta (lo hace la base)");
    }
  },

  /* 5b. Con un bloqueo de por medio no se toca ni se avisa: comentar, votar, «Me sirvió», la encuesta y guardar pasan antes por tocable() o
     comentarioTocable() (que llevan sinBloqueos); a quién se avisa de un comentario (autor, contestado, «@Nombre») sale de una consulta con
     sinBloqueos en los dos sentidos, y solo a esas personas se les avisa; el resultado de una encuesta tampoco llega a quien tiene un bloqueo con su autor. */
  bloqueoAlEscribir() {
    const H = "apps/web/lib/comunidad-hilo.ts";
    if (!existsSync(H)) return;
    const t = sinComent(H);
    for (const fn of ["postPara", "comentarioTocable"]) if (!/sinBloqueos\(/.test(cuerpoFn(t, fn))) falla("bloqueoAlEscribir", H, 0, `${fn}() debe filtrar con sinBloqueos()`);
    const escrituras = [["comentar", /insert into com_comments/], ["votar", /com_votar\(/], ["meSirvio", /update com_posts set best_comment_id/], ["votarEncuesta", /insert into com_poll_votes/], ["guardar", /insert into com_saves/]];
    for (const [fn, w] of escrituras) {
      const c = cuerpoFn(t, fn), iT = c.search(/await (tocable|comentarioTocable)\(/), iW = c.search(w);
      if (iW < 0 || iT < 0 || iT > iW) falla("bloqueoAlEscribir", H, 0, `«${fn}» escribe sin pasar antes por tocable()/comentarioTocable() (bloqueos)`);
    }
    const a = cuerpoFn(t, "aQuienAvisar");
    if (!/sinBloqueos\("u\.id", "\$1"\)/.test(a) || !/sinBloqueos\("\$1", "u\.id"\)/.test(a)) falla("bloqueoAlEscribir", H, 0, "aQuienAvisar debe excluir bloqueos y silencios en los dos sentidos");
    const cm = cuerpoFn(t, "comentar");
    if (!/aQuienAvisar\(/.test(cm)) falla("bloqueoAlEscribir", H, 0, "comentar() debe sacar a quién avisar de aQuienAvisar()");
    for (const m of cm.matchAll(/\bavisar\((\w+(?:\.\w+)?)/g)) if (m[1] !== "a.id") falla("bloqueoAlEscribir", H, 0, `comentar() avisa a «${m[1]}» sin pasar por aQuienAvisar()`);
    const b = cuerpoFn(t, "barrerEncuestas");
    if (/from com_poll_votes/.test(b) && !/from com_poll_votes v where [^`]*sinBloqueos\(/.test(b)) falla("bloqueoAlEscribir", H, 0, "el resultado de una encuesta no se avisa a quien tiene un bloqueo con su autor");
  },

  /* 5b. Ningún aviso de la Comunidad sale por SMS (§3): toda plantilla com_* de notif_templates va con sms = false. */
  avisoComunidadSinSms() {
    const dir = "packages/db/migrations";
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql")).sort()) {
      const t = readFileSync(`${dir}/${x}`, "utf8");
      for (const m of t.matchAll(/\(\s*'((?:com|gam|dm)_[a-z0-9_]+)',\s*'[a-z]+',\s*(?:null|'[a-z]+'),\s*(true|false)\s*,/g)) if (m[2] !== "false") falla("avisoComunidadSinSms", `${dir}/${x}`, 0, `la plantilla «${m[1]}» de la Comunidad no puede ir por SMS`);
    }
  },

  /* ── Fase 5 · Comunidad (5c) ── */
  /* 5c. Bloquear es mutuo e invisible en TODAS las superficies, en los dos sentidos: el fragmento de personas (sinBloqueo) cubre las dos
     direcciones; el perfil, las listas, las sugerencias y los mensajes lo usan; la bandeja esconde los avisos de alguien con un
     bloqueo y todo aviso de la Comunidad dice quién lo provocó (actor); la base cierra la conversación, deja de seguir y rechaza
     seguir o escribir con un bloqueo de por medio. */
  bloqueoTodasLasSuperficies() {
    const G = "bloqueoTodasLasSuperficies", C = "apps/web/lib/comunidad.ts", V = "apps/web/lib/vecinos.ts", MV = "apps/web/lib/mensajes-vecinos.ts", AV = "apps/web/lib/avisos.ts", M = "packages/db/migrations/0099_vecinos_mensajes.sql";
    if (!existsSync(V) || !existsSync(MV)) return;
    const c = sinComent(C), v = sinComent(V), mv = sinComent(MV), av = sinComent(AV), m = readFileSync(M, "utf8");
    // El fragmento de personas: de ida y vuelta, solo bloqueos vivos.
    if (!/export const sinBloqueo = \(persona: string, viewer: string\) =>[\s\S]{0,200}ub\.kind = 'block' and \(\(ub\.user_id = \$\{viewer\} and ub\.target_user_id = \$\{persona\}\)\s*or \(ub\.user_id = \$\{persona\} and ub\.target_user_id = \$\{viewer\}\)\)/.test(c))
      falla(G, C, 0, "sinBloqueo debe excluir a la persona en los dos sentidos (yo la bloqueé · me bloqueó)");
    // Perfil, listas y sugerencias: toda persona pasa por VISIBLE (que lleva sinBloqueo).
    if (!/const VISIBLE = [\s\S]{0,400}\$\{sinBloqueo\(`\$\{u\}\.id`, viewer\)\}/.test(v)) falla(G, V, 0, "VISIBLE (persona que se puede ver) debe llevar sinBloqueo");
    for (const fn of ["perfilVecino", "siguiendo", "seguidores", "sugeridos", "personaVisible"]) if (!/\$\{VISIBLE\("u", "\$1"\)\}/.test(cuerpoFn(v, fn))) falla(G, V, 0, `«${fn}» devuelve personas sin VISIBLE() (bloqueos)`);
    if (!/sinBloqueos\("p\.author_user_id", "\$1"\)/.test(cuerpoFn(v, "publicacionesDe"))) falla(G, V, 0, "publicacionesDe (lo que publicó en su perfil) sin sinBloqueos");
    // Mensajes: la lista excluye a quien tiene un bloqueo; abrir, leer y escribir pasan antes por otraPersona() (que lleva sinBloqueo).
    if (!/\$\{sinBloqueo\("u\.id", "\$1"\)\}/.test(cuerpoFn(mv, "otraPersona"))) falla(G, MV, 0, "otraPersona() debe filtrar con sinBloqueo");
    if (!/t\.closed_at is null and \$\{sinBloqueo\(`t\.\$\{otro\}_user_id`, "\$1"\)\}/.test(cuerpoFn(mv, "misConversaciones"))) falla(G, MV, 0, "misConversaciones muestra conversaciones cerradas o con un bloqueo");
    for (const [fn, w] of [["conversacion", /dm_messages|MSJS\(/], ["nuevos", /MSJS\(/], ["enviar", /insert into dm_messages/]]) {
      const b = cuerpoFn(mv, fn), iO = b.search(/await otraPersona\(/), iW = b.search(w);
      if (iO < 0 || iW < 0 || iO > iW) falla(G, MV, 0, `«${fn}» lee o escribe mensajes sin pasar antes por otraPersona() (bloqueos)`);
    }
    // Avisos: la bandeja esconde los de alguien con un bloqueo (los dos sentidos) y todo aviso de la Comunidad dice quién lo provocó.
    if (!/const SIN_BLOQUEO_AVISO = `\(n\.actor_user_id is null or not exists \(select 1 from user_blocks ub where ub\.removed_at is null and ub\.kind = 'block'\s*and \(\(ub\.user_id = n\.user_id and ub\.target_user_id = n\.actor_user_id\) or \(ub\.user_id = n\.actor_user_id and ub\.target_user_id = n\.user_id\)\)\)\)`/.test(av))
      falla(G, AV, 0, "SIN_BLOQUEO_AVISO debe esconder los avisos de alguien con un bloqueo, en los dos sentidos");
    for (const fn of ["misAvisos", "noLeidos"]) if (!/\$\{SIN_BLOQUEO_AVISO\}/.test(cuerpoFn(av, fn))) falla(G, AV, 0, `«${fn}» muestra avisos sin SIN_BLOQUEO_AVISO`);
    for (const f of [V, MV, "apps/web/lib/comunidad-hilo.ts"]) {
      const t = sinComent(f);
      for (const x of t.matchAll(/\bavisar(?:Muchos)?\(([^;]*?)\);/g)) if (!/actor:/.test(x[1]) && !/com_votes_10/.test(x[1])) falla(G, f, 0, `un aviso de la Comunidad sin actor (la bandeja no podría esconderlo con un bloqueo): «${x[1].slice(0, 60)}»`);
    }
    // La base: seguir y escribir con un bloqueo se rechaza; bloquear deja de seguir en los dos sentidos y cierra la conversación.
    if (!/create or replace function follows_antes\(\)[\s\S]*?if com_bloqueados\(new\.follower_user_id, new\.target_id::uuid\) then raise exception/.test(m)) falla(G, M, 0, "follows_antes debe rechazar seguir con un bloqueo de por medio");
    if (!/create or replace function dm_messages_antes\(\)[\s\S]*?if com_bloqueados\(new\.sender_user_id, otro\) then raise exception/.test(m)) falla(G, M, 0, "dm_messages_antes debe rechazar un mensaje con un bloqueo de por medio");
    if (!/delete from follows where follower_user_id = new\.user_id[\s\S]{0,300}delete from follows where follower_user_id = new\.target_user_id[\s\S]{0,300}update dm_threads set closed_at = now\(\)/.test(m)) falla(G, M, 0, "user_blocks_despues: bloquear debe dejar de seguir en los dos sentidos y cerrar la conversación");
    if (!/select exists \(select 1 from user_blocks b where b\.kind = 'block' and b\.removed_at is null\s*and \(\(b\.user_id = x and b\.target_user_id = y\) or \(b\.user_id = y and b\.target_user_id = x\)\)\)/.test(m)) falla(G, M, 0, "com_bloqueados debe mirar los dos sentidos");
  },

  /* 5c. Toda función de la Comunidad que lee para una persona (recibe `viewer`) usa el fragmento compartido de bloqueos (sinBloqueos,
     sinBloqueo o VISIBLE) o pasa por una que lo usa (otraPersona, personaVisible). Las excepciones se nombran con su razón. */
  consultaConBloqueos() {
    const EXENTAS = {
      armar: "arma filas que ya pasaron por sinBloqueos", bloqueadosYSilenciados: "lista lo que la persona misma bloqueó o silenció (con Deshacer)",
      bloqueoMio: "solo responde a quien bloqueó (nunca a la persona bloqueada)", reportarConversacion: "se puede reportar la conversación propia aunque ya hayas bloqueado a la otra persona",
    };
    for (const x of codigo) {
      if (!/^apps\/web\/lib\/(comunidad[^/]*|vecinos|mensajes-vecinos)\.ts$/.test(x)) continue;
      const t = sinComent(x);
      for (const mm of t.matchAll(/\nexport async function (\w+)\(([^)]*)\)/g)) {
        if (!/\bviewer\b/.test(mm[2]) || EXENTAS[mm[1]]) continue;
        const b = cuerpoFn(t, mm[1]);
        if (!/db\(\)|tx\(|c\.query/.test(b)) continue;
        if (!/sinBloqueos?\(|VISIBLE\(|await otraPersona\(|personaVisible\(|await (postPara|tocable|comentarioTocable)\(/.test(b)) falla("consultaConBloqueos", x, 0, `«${mm[1]}» lee para una persona sin el fragmento de bloqueos (sinBloqueos / sinBloqueo / VISIBLE)`);
      }
    }
  },

  /* 5c. Los mensajes entre vecinos no los lee el equipo salvo con un reporte abierto (regla de `chat`): fuera de lib/mensajes-vecinos.ts
     (la persona, en sus conversaciones) y lib/admin-dm.ts, ninguna línea toca dm_messages; en admin-dm.ts cada consulta lleva
     CON_REPORTE, que exige el caso abierto de la cola y un reporte abierto de esa conversación. */
  dmSoloConReporte() {
    const A = "apps/web/lib/admin-dm.ts", MV = "apps/web/lib/mensajes-vecinos.ts";
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === A || x === MV) continue;
      sinComent(x).split("\n").forEach((t, i) => { if (/\bdm_messages\b/.test(t)) falla("dmSoloConReporte", x, i + 1, "solo lib/admin-dm.ts (con reporte abierto) y lib/mensajes-vecinos.ts tocan dm_messages"); });
    }
    if (!existsSync(A)) return;
    const a = sinComent(A);
    if (!/const CON_REPORTE = \(t: string\) => `exists \(select 1 from queue_items q where q\.queue = 'chat' and q\.subject_kind = 'dm_thread' and q\.subject_id = \$\{t\}::text and q\.status = 'open'\)\s*and exists \(select 1 from content_reports cr where cr\.target_kind = 'dm' and cr\.target_id = \$\{t\}::text and cr\.status = 'open'\)`/.test(a))
      falla("dmSoloConReporte", A, 0, "CON_REPORTE debe exigir el caso abierto (chat · dm_thread) y un reporte abierto ('dm')");
    // 5d: la otra llave es CON_APELACION (solo ESE mensaje y solo con su apelación abierta), para decidir y levantar la apelación.
    if (/CON_APELACION/.test(a) && !/const CON_APELACION = \(m: string\) => `exists \(select 1 from appeals ap where ap\.target_kind = 'dm_message' and ap\.target_id = \$\{m\}::text and ap\.status = 'open'\)`/.test(a))
      falla("dmSoloConReporte", A, 0, "CON_APELACION debe exigir una apelación abierta de ese mismo mensaje");
    for (const q of a.match(/`[^`]*`/g) ?? []) if ((/\b(from|update) dm_messages\b/.test(q) || /\blast_text\b/.test(q)) && !/\$\{CON_REPORTE\(/.test(q) && !/\$\{CON_APELACION\("m\.id"\)\}/.test(q)) falla("dmSoloConReporte", A, 0, `una consulta de mensajes sin CON_REPORTE ni CON_APELACION: «${q.slice(0, 70)}»`);
    const C = sinComent("apps/web/lib/admin-colas.ts");
    if (!/q\.status === "open" \? await \(await import\("\.\/admin-dm"\)\)\.dmReportado\(q\.subject_id\) : null/.test(C)) falla("dmSoloConReporte", "apps/web/lib/admin-colas.ts", 0, "el caso de mensajes entre vecinos solo se lee con el caso abierto");
  },

  /* 5c. Mensajes y perfil sin teléfonos ni datos: enviar() pasa el texto por revisarMensaje (que usa revisarTexto) antes de guardar;
     editarPerfil por revisarPerfil; la base lo impone con com_sin_datos(body) en dm_messages; solo lib/mensajes-vecinos.ts inserta mensajes. */
  mensajesSinTelefonos() {
    const F = "apps/web/lib/comunidad-filtro.ts", MV = "apps/web/lib/mensajes-vecinos.ts", V = "apps/web/lib/vecinos.ts", M = "packages/db/migrations/0099_vecinos_mensajes.sql";
    if (!existsSync(MV)) return;
    const f = sinComent(F);
    if (!/export function revisarMensaje[\s\S]*?const f = revisarTexto\(t\);/.test(f)) falla("mensajesSinTelefonos", F, 0, "revisarMensaje debe pasar el texto por revisarTexto (teléfonos, correos, números privados, direcciones)");
    if (!/export function revisarPerfil[\s\S]*?revisarTexto\(bio\)[\s\S]*?revisarTexto\(apodo\)/.test(f)) falla("mensajesSinTelefonos", F, 0, "revisarPerfil debe revisar la presentación y el apodo");
    const e = cuerpoFn(sinComent(MV), "enviar"), iF = e.search(/revisarMensaje\(/), iW = e.search(/insert into dm_messages/);
    if (iF < 0 || iW < 0 || iF > iW) falla("mensajesSinTelefonos", MV, 0, "enviar() guarda un mensaje sin pasar antes por revisarMensaje()");
    const p = cuerpoFn(sinComent(V), "editarPerfil"), iP = p.search(/revisarPerfil\(/), iU = p.search(/update community_profiles set bio/);
    if (iP < 0 || iU < 0 || iP > iU) falla("mensajesSinTelefonos", V, 0, "editarPerfil guarda la presentación sin pasar antes por revisarPerfil()");
    if (!/alter table dm_messages add constraint dm_messages_body_datos check \(com_sin_datos\(body\)\)/.test(readFileSync(M, "utf8"))) falla("mensajesSinTelefonos", M, 0, "dm_messages.body sin la restricción com_sin_datos()");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === MV) continue;
      readFileSync(x, "utf8").split("\n").forEach((t, i) => { if (/insert into dm_(messages|threads)\b/i.test(t)) falla("mensajesSinTelefonos", x, i + 1, "solo lib/mensajes-vecinos.ts escribe mensajes (con el filtro y los límites)"); });
    }
  },

  /* 5c. Mensaje nuevo solo a quien te sigue (o a quien ya te escribió) y 10 conversaciones nuevas al día: enviar() lo revisa antes de
     crear la conversación y la base lo impone (dm_messages_antes). Los no leídos y el último texto son derivados (solo triggers y
     dm_leido). */
  mensajeSoloAQuienTeSigue() {
    const MV = "apps/web/lib/mensajes-vecinos.ts", M = "packages/db/migrations/0099_vecinos_mensajes.sql";
    if (!existsSync(MV)) return;
    const e = cuerpoFn(sinComent(MV), "enviar"), m = readFileSync(M, "utf8");
    // 5d: el límite de conversaciones nuevas vive en lib/moderacion.ts limiteDia (Configuración; de fábrica 10).
    const iS = e.search(/if \(!o\.me_sigue && !t\?\.me_escribio\) return/), iL = e.search(/const lim = await limiteDia\(c, viewer, "conversaciones"\);\s*if \(!lim\.ok\) return lim;/), iT = e.search(/insert into dm_threads/);
    if (iS < 0 || iT < 0 || iS > iT) falla("mensajeSoloAQuienTeSigue", MV, 0, "enviar() crea la conversación sin revisar antes que la otra persona te sigue");
    if (iL < 0 || iT < 0 || iL > iT) falla("mensajeSoloAQuienTeSigue", MV, 0, "enviar() crea la conversación sin el límite de conversaciones nuevas al día");
    const K5 = "packages/db/migrations/0105_configuracion_comunidad.sql";
    if (!/conversaciones: \{ key: "com_lim_conversaciones",/.test(readFileSync("apps/web/lib/moderacion-comun.ts", "utf8")) || !existsSync(K5) || !/\('com_lim_conversaciones', 1, 100, 10,/.test(readFileSync(K5, "utf8")))
      falla("mensajeSoloAQuienTeSigue", K5, 0, "el límite de fábrica es 10 conversaciones nuevas al día (§4 5c; config_keys)");
    if (!/if not exists \(select 1 from follows f where f\.follower_user_id = otro and f\.target_kind = 'user' and f\.target_id = new\.sender_user_id::text\)\s*and not exists \(select 1 from dm_messages m where m\.thread_id = new\.thread_id and m\.sender_user_id = otro\) then\s*raise exception 'solo le escribes a quien te sigue'/.test(m))
      falla("mensajeSoloAQuienTeSigue", M, 0, "dm_messages_antes debe rechazar el mensaje a quien no te sigue (ni te escribió)");
    if (!/raise exception 'los contadores de una conversación son derivados'/.test(m)) falla("mensajeSoloAQuienTeSigue", M, 0, "dm_threads_antes debe rechazar el cambio a mano de los derivados");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\bupdate dm_threads\b[\s\S]*?\bset\b[\s\S]*?\b(a_unread|b_unread|last_text|last_at|last_from)\s*=/.test(q)) falla("mensajeSoloAQuienTeSigue", x, 0, "los no leídos y el último texto de una conversación son derivados (dm_leido y triggers)");
    }
  },

  /* 5c. 18 años o más es una declaración (sí/no + cuándo), nunca una fecha de nacimiento: ninguna migración ni pantalla guarda o pide
     una fecha de nacimiento; la bienvenida exige la declaración explícita y quien declara ser menor no entra (enComunidad). */
  sinFechaDeNacimiento() {
    for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql"))) {
      const t = readFileSync(`packages/db/migrations/${x}`, "utf8");
      // Columnas (nombre seguido de un tipo), no textos de catálogo («Fiestas de cumpleaños»).
      t.split("\n").forEach((l, i) => { if (/\b(birth_?date|birthday|dob|date_of_birth|fecha_nac\w*|nacimiento|edad|age)\s+(date|timestamptz?|smallint|integer|int|text)\b/i.test(l) && !/^\s*--/.test(l)) falla("sinFechaDeNacimiento", `packages/db/migrations/${x}`, i + 1, "no se guarda fecha de nacimiento ni edad: 18+ es una declaración"); });
    }
    const V = "apps/web/lib/vecinos.ts", C = "apps/web/lib/comunidad.ts";
    if (!existsSync(V)) return;
    if (!/if \(p\.adulto !== true && p\.adulto !== false\) return no\(/.test(sinComent(V))) falla("sinFechaDeNacimiento", V, 0, "la bienvenida debe exigir la declaración explícita de 18 años o más");
    if (!/if \(r\?\.adult === false\) return \{ ok: false, menor: true/.test(sinComent(C)) || !/const ok = !!r && r\.adult === true && r\.welcome && r\.rules;/.test(sinComent(C))) falla("sinFechaDeNacimiento", C, 0, "enComunidad: solo entra quien declaró 18+ y aceptó las reglas");
    for (const x of codigo) if (/^apps\/web\/(app\/(entrar|\(app\)\/comunidad)\/|lib\/(vecinos|comunidad[^/]*)\.ts)/.test(x) && /type="date"|autoComplete="bday|\bbirth_?date\b|\bdob\b|fecha_nac/i.test(sinComent(x))) falla("sinFechaDeNacimiento", x, 0, "la bienvenida no pide fecha de nacimiento");
  },

  /* 5c (clase cazada en la prueba): content_reports tiene una llave única (destino, quien reporta); todo insert lo dice con on conflict
     (no hacer nada en una reseña; volver a abrir en una conversación que sigue en el tiempo), o el segundo reporte revienta. */
  reporteConLlave() {
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\binsert into content_reports\b/i.test(q) && !/on conflict \(target_kind, target_id, reporter_user_id\)/.test(q)) falla("reporteConLlave", x, 0, "insert into content_reports sin on conflict (target_kind, target_id, reporter_user_id): el segundo reporte de la misma persona revienta");
    }
  },

  /* 5d. Toda acción que oculta algo de la Comunidad o sanciona a una persona avisa con el motivo y lleva a «Apelar»: la función que
     oculta (publicación, comentario, mensaje entre vecinos, foto de la Comunidad) o inserta una sanción a una persona llama en su cuerpo a
     avisarOculto() / avisarSancion(); si es un ayudante que corre dentro de una transacción (autoOcultar, ocultarDm, aplicarSancion), lo
     hace cada función que lo llama. Los avisos llevan el motivo y la ruta de la apelación; la pantalla de apelar existe. */
  ocultarAvisaYApela() {
    const G = "ocultarAvisaYApela", AP = "apps/web/lib/apelaciones.ts";
    if (!existsSync(AP)) return;
    const HELPERS = ["autoOcultar", "ocultarDm", "aplicarSancion"];
    const OCULTA = [/update (com_posts|com_comments|\$\{tabla\}) set status = ('hidden'|\$2)/, /update dm_messages m set hidden_at = now\(\)/, /insert into sanctions \([^)]*\) values \('user'/];
    const FOTO = /update media set status = 'removed', removed_reason = 'admin'/;
    const AVISA = /\bavisar(Oculto|Sancion)\(/;
    for (const x of codigo) {
      if (!/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      for (const mm of t.matchAll(/\n(?:export )?async function (\w+)\(/g)) {
        const b = cuerpoFn(t, mm[1]);
        const oculta = OCULTA.some((re) => re.test(b)) || (FOTO.test(b) && /["']com_post["']/.test(b));
        if (oculta && !HELPERS.includes(mm[1]) && !AVISA.test(b)) falla(G, x, 0, `«${mm[1]}» oculta o sanciona sin avisar con el motivo y la apelación (avisarOculto / avisarSancion)`);
        for (const h of HELPERS) if (mm[1] !== h && new RegExp(`\\b${h}\\(`).test(b) && !AVISA.test(b)) falla(G, x, 0, `«${mm[1]}» llama a ${h}() y no avisa después con avisarOculto / avisarSancion`);
      }
      // Una sola forma de sancionar a una persona (con su referencia y el aviso).
      if (x !== AP && /insert into sanctions \([^)]*\) values \('user'/.test(t)) falla(G, x, 0, "una sanción a una persona se aplica solo con aplicarSancion() (lib/apelaciones.ts)");
    }
    const a = sinComent(AP);
    if (!/export const RUTA_AVISO = \(k: Apelable, id: string\) => `\/cuenta\/moderacion\?k=\$\{k\}&id=/.test(a)) falla(G, AP, 0, "RUTA_AVISO debe llevar a la pantalla de apelar (/cuenta/moderacion?k=…&id=…)");
    for (const fn of ["avisarOculto", "avisarSancion"]) { const b = cuerpoFn(a, fn); if (!/motivo/.test(b) || !/href: RUTA_AVISO\(/.test(b)) falla(G, AP, 0, `${fn} debe avisar con el motivo y la ruta de la apelación`); }
    if (!existsSync("apps/web/app/(app)/cuenta/moderacion/page.tsx") || !/apelar\(/.test(sinComent("apps/web/app/(app)/cuenta/moderacion/acciones.ts"))) falla(G, "apps/web/app/(app)/cuenta/moderacion", 0, "falta la pantalla de apelar (Mi cuenta › Avisos de moderación)");
    // 6a · Eventos: ocultar un evento o bloquear a un organizador avisa al negocio con el motivo y la ruta para apelar (avisarEvtOculto /
    // avisarOrgBloqueado, después de guardar); los dos se pueden apelar (APELABLE, el check de appeals y appeals_antes) y levantar la
    // apelación lo deshace (decidirApelacion).
    const ER = "apps/web/lib/evt-revision.ts";
    if (existsSync(ER)) {
      for (const x of codigo) {
        if (!/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(x) || x === AP) continue;
        const t = sinComent(x);
        for (const mm of t.matchAll(/\n(?:export )?async function (\w+)\(/g)) {
          const b = cuerpoFn(t, mm[1]);
          if (/update events set hidden_at = now\(\)/.test(b) && !/\bavisarEvtOculto\(/.test(b)) falla(G, x, 0, `«${mm[1]}» oculta un evento sin avisar con el motivo y la apelación (avisarEvtOculto)`);
          if (/update event_organizers set blocked_at = now\(\)/.test(b) && !/\bavisarOrgBloqueado\(/.test(b)) falla(G, x, 0, `«${mm[1]}» bloquea a un organizador sin avisar con el motivo y la apelación (avisarOrgBloqueado)`);
        }
      }
      const er = sinComent(ER);
      for (const [fn, k] of [["avisarEvtOculto", "event"], ["avisarOrgBloqueado", "evt_org"]]) { const b = cuerpoFn(er, fn); if (!/motivo/.test(b) || !new RegExp(`href: RUTA_AVISO\\("${k}"`).test(b)) falla(G, ER, 0, `${fn} debe avisar con el motivo y la ruta de la apelación (RUTA_AVISO("${k}", …))`); }
      const mc = sinComent("apps/web/lib/moderacion-comun.ts");
      if (!/"event"/.test(/export type Apelable = [^;]+;/.exec(mc)?.[0] ?? "") || !/"evt_org"/.test(/export type Apelable = [^;]+;/.exec(mc)?.[0] ?? "")) falla(G, "apps/web/lib/moderacion-comun.ts", 0, "un evento oculto y un bloqueo de organizador se pueden apelar (Apelable: event, evt_org)");
      const ant = ultimaFn("appeals_antes");
      if (!/new\.target_kind = 'event'/.test(ant) || !/new\.target_kind = 'evt_org'/.test(ant)) falla(G, "packages/db/migrations", 0, "appeals_antes debe aceptar apelaciones de eventos y de organizadores (sanctioned_by desde la fuente)");
      const da = cuerpoFn(sinComent(AP), "decidirApelacion");
      if (!/a\.k === "event"/.test(da) || !/a\.k === "evt_org"/.test(da)) falla(G, AP, 0, "decidirApelacion debe deshacer lo de un evento o un organizador al levantar la apelación");
    }
  },

  /* 6a. Ningún evento sale al público sin revisión (fase6 §3 «Guardianes nuevos»; PLAN fila 6, decisión #3). En la base: `live` exige
     approved_at (check); pasar a live sin persona que apruebe (approved_by null) solo con el organizador verificado y un organizador
     bloqueado no envía ni publica (trigger events_antes); `listable` de una fecha lo calcula solo la base (evt_listable: publicado,
     aprobado, sin ocultar) y nadie lo escribe a mano. En la app: solo tres lugares ponen un evento en vivo y los tres ponen approved_at
     en la misma sentencia (enviarEn con el organizador verificado, decidirEvento al aprobar y la apelación levantada). Al revés: quitar
     una de estas revisiones → falla. */
  revisionAntesDePublicar() {
    const G = "revisionAntesDePublicar", M6 = "packages/db/migrations/0106_eventos_base.sql";
    if (!existsSync(M6)) return;
    const m = readFileSync(M6, "utf8");
    if (!/check \(status not in \('live', 'paused', 'done'\) or approved_at is not null\)/.test(m)) falla(G, M6, 0, "events debe exigir approved_at para estar en vivo (check)");
    const ea = ultimaFn("events_antes");
    if (!/if new\.approved_at is null then raise exception/.test(ea)) falla(G, M6, 0, "events_antes debe impedir publicar sin aprobar");
    if (!/if new\.approved_by is null and o\.verified_at is null then raise exception/.test(ea)) falla(G, M6, 0, "events_antes: sin revisión solo publica un organizador verificado");
    if ([...ea.matchAll(/o\.blocked_at is not null then\s*raise exception 'el organizador está bloqueado/g)].length < 2) falla(G, M6, 0, "events_antes: un organizador bloqueado no envía a revisión, no publica ni manda un cambio");
    if (!/create trigger events_antes before insert or update or delete on events/.test(m)) falla(G, M6, 0, "falta el trigger events_antes");
    const ls = ultimaFn("evt_listable");
    if (!/e\.status in \('live', 'paused'\)/.test(ls) || !/e\.approved_at is not null/.test(ls) || !/e\.hidden_at is null/.test(ls)) falla(G, M6, 0, "evt_listable: solo publicado, aprobado y sin ocultar");
    if (!/new\.listable := evt_listable\(e, new\.status\);/.test(ultimaFn("event_dates_antes"))) falla(G, M6, 0, "listable de una fecha lo pone solo la base (event_dates_antes)");
    const OK = new Set(["apps/web/lib/evt.ts", "apps/web/lib/evt-revision.ts", "apps/web/lib/apelaciones.ts"]);
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) {
        if (/\bevent_dates\b/.test(q) && /\blistable\s*=/.test(q) && /\b(update|insert)\b/.test(q)) falla(G, x, 0, "listable de una fecha no se escribe desde la app (lo decide la base)");
        // 6e · Reanudar la venta (lib/evt-cambios.ts) solo vuelve a 'live' un evento PAUSADO y ya aprobado: nunca publica algo sin revisión.
        // Lo que se ASIGNA (antes del where): «… where status = 'live'» no pone nada en vivo.
        const pone = /update events set[^`]*status = 'live'/.test(q.split(/\bwhere\b/)[0] ?? "");
        if (pone && x === "apps/web/lib/evt-cambios.ts" && /where id = \$1::bigint and status = 'paused' and approved_at is not null/.test(q)) continue;
        if (pone) {
          if (!OK.has(x)) falla(G, x, 0, "solo lib/evt.ts, lib/evt-revision.ts y la apelación ponen un evento en vivo");
          if (!/approved_at = now\(\)/.test(q)) falla(G, x, 0, "poner un evento en vivo pone approved_at en la misma sentencia");
        }
      }
    }
    const ev = existsSync("apps/web/lib/evt.ts") ? cuerpoFn(sinComent("apps/web/lib/evt.ts"), "enviarEn") : "";
    if (ev) { const iV = ev.search(/if \(verificado\) \{/), iL = ev.search(/status = 'live'/); if (iV < 0 || iL < 0 || iV > iL || !/approved_by = null/.test(ev)) falla(G, "apps/web/lib/evt.ts", 0, "enviarEn publica sin revisión solo con el organizador verificado (approved_by null)"); }
    const dr = existsSync("apps/web/lib/evt-revision.ts") ? cuerpoFn(sinComent("apps/web/lib/evt-revision.ts"), "decidirEvento") : "";
    if (dr && !/status = 'live', approved_at = now\(\), approved_by = \$2/.test(dr)) falla(G, "apps/web/lib/evt-revision.ts", 0, "aprobar pone approved_by = quien decide");
    // El libro de la revisión es de solo inserción y nadie lo cambia.
    if (!/create trigger event_review_log_no_cambia before update or delete on event_review_log/.test(m)) falla(G, M6, 0, "event_review_log sin el trigger de solo inserción");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x) && /\b(update|delete from) event_review_log\b/.test(sinComent(x))) falla(G, x, 0, "event_review_log es solo de inserción");
  },

  /* 6b. Lo público de Eventos sale solo de lo `listable` (lo decide la base): evt_listable suma el módulo del negocio (encendido, sin pausa
     de To'Latino, categoría que lo admite, negocio activo) y el organizador sin bloquear; la base vuelve a calcularlo cuando eso cambia
     (triggers en businesses, event_organizers y categories); y toda lectura de fechas en lib/evt-publico.ts (salvo ultimosRsvp, que es del
     panel y del admin) pasa por VIVO / listable. Al revés: quitar una condición, un trigger o el filtro de una consulta → falla. */
  eventosSoloListables() {
    const G = "eventosSoloListables", M = "packages/db/migrations/0107_eventos_publico.sql", L = "apps/web/lib/evt-publico.ts";
    if (!existsSync(M)) return;
    const m = readFileSync(M, "utf8"), ls = ultimaFn("evt_listable"), np = ultimaFn("evt_negocio_publico");
    if (!/evt_negocio_publico\(e\.business_id\)/.test(ls)) falla(G, M, 0, "evt_listable debe exigir el módulo Eventos del negocio (evt_negocio_publico)");
    for (const [re, que] of [[/b\.status = 'active'/, "negocio activo"], [/'eventos' = any\(b\.modules_on\)/, "módulo encendido por el negocio"], [/not \(coalesce\(b\.modules_off, '\{\}'::jsonb\) \? 'eventos'\)/, "sin pausa de To'Latino"],
      [/allowed_modules, '\[\]'::jsonb\) \? 'eventos'/, "categoría que admite Eventos"], [/o\.blocked_at is not null/, "organizador sin bloquear"]])
      if (!re.test(np)) falla(G, M, 0, `evt_negocio_publico sin «${que}»`);
    for (const t of ["businesses_evt_relistar after update on businesses", "event_organizers_relistar after insert or update on event_organizers", "categories_evt_relistar after update on categories"])
      if (!m.includes(`create trigger ${t}`)) falla(G, M, 0, `falta el trigger «${t.split(" ")[0]}» que vuelve a calcular listable`);
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/evt-publico.ts");
    const t = sinComent(L);
    if (!/const VIVO = `d\.listable and /.test(t)) falla(G, L, 0, "VIVO debe empezar por d.listable");
    for (const fn of [...t.matchAll(/\n(?:export )?async function (\w+)\(/g)].map((x) => x[1])) {
      if (fn === "ultimosRsvp" || fn === "diasCiudad" || fn === "generosFiltro") continue;
      const b = cuerpoFn(t, fn);
      if (/event_dates|DESDE_T/.test(b) && !/\$\{VIVO\}|VIVO, |\bd\.listable\b/.test(b)) falla(G, L, 0, `«${fn}» lee fechas de eventos sin VIVO / listable`);
    }
    // Lo demás que muestra eventos al público también pide listable (Noche, novedades, Mi cuenta, Hoy por post_en_vivo).
    for (const [f, re] of [["apps/web/lib/noche-publico.ts", /d\.listable and d\.ends_at > now\(\)/], ["apps/web/lib/novedades.ts", /where e\.id = p\.event_id and d\.listable/], ["apps/web/lib/rsvp.ts", /f\.kind = 'event' and d\.listable/]])
      if (existsSync(f) && !re.test(sinComent(f))) falla(G, f, 0, "muestra un evento al público sin pedir listable");
  },

  /* 6b. Eventos pagina con cursor (starts_at, id), 20 por página y una de más, sin offset, sobre el índice (city_id, starts_at, id) where
     listable. Al revés: offset, sin cursor o sin el índice → falla. */
  eventosConCursor() {
    const G = "eventosConCursor", L = "apps/web/lib/evt-publico.ts", M = "packages/db/migrations/0106_eventos_base.sql";
    for (const x of codigo) {
      if (!/^apps\/web\/(lib\/(evt-publico|rsvp)\.ts|app\/\(app\)\/eventos\/.*\.tsx?)$/.test(x)) continue;
      sinComent(x).split("\n").forEach((l, i) => { if (/\boffset\b/i.test(l)) falla(G, x, i + 1, "Eventos no pagina con offset: usa el cursor (starts_at, id)"); });
    }
    if (!existsSync(L)) return;
    const b = cuerpoFn(sinComent(L), "eventosCiudad");
    if (!/\(d\.starts_at, d\.id\) > \(\$\$\{v\.length - 1\}::timestamptz, \$\$\{v\.length\}::bigint\)/.test(b) || !/order by d\.starts_at, d\.id limit \$\{POR_PAGINA_EVT \+ 1\}/.test(b)) falla(G, L, 0, "eventosCiudad debe seguir con cursor (starts_at, id), en ese orden, y pedir una de más");
    if (!/export const POR_PAGINA_EVT = 20;/.test(readFileSync(L, "utf8"))) falla(G, L, 0, "20 eventos por página");
    if (existsSync(M) && !/create index if not exists event_dates_lista_idx on event_dates \(city_id, starts_at, id\) where listable;/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "falta el índice (city_id, starts_at, id) where listable");
  },

  /* 6b. El cupo del RSVP lo cuenta la base, sin sobreventa con personas a la vez: rsvps_antes bloquea la fila de la fecha (for update) ANTES
     de contar y compara con el cupo; rsvps_despues lleva el contador y vuelve a mirar el cupo; los derivados de una fecha solo los escribe
     un trigger con la marca tl.evt_derivado (la app no la enciende ni escribe rsvp_n / going_n); solo lib/rsvp.ts escribe rsvps; el cupo
     no baja de lo guardado. Al revés: quitar el bloqueo, un control o escribir el contador desde la app → falla. */
  rsvpConCupo() {
    const G = "rsvpConCupo", M = "packages/db/migrations/0107_eventos_publico.sql";
    if (!existsSync(M)) return;
    const m = readFileSync(M, "utf8"), a = ultimaFn("rsvps_antes"), d = ultimaFn("rsvps_despues"), ed = ultimaFn("event_dates_antes");
    const iL = a.search(/select \* into d from event_dates where id = new\.event_date_id for update;/), iC = a.search(/if e\.rsvp_capacity > 0 and d\.rsvp_n - antes \+ new\.party > e\.rsvp_capacity then raise exception 'evt_cupo_lleno/);
    if (iL < 0 || iC < 0 || iL > iC) falla(G, M, 0, "rsvps_antes: bloquear la fila de la fecha (for update) antes de contar el cupo");
    if (!/select \* into e from events where id = d\.event_id for share;/.test(a)) falla(G, M, 0, "rsvps_antes: el cupo del evento se lee con «for share»");
    if (!/if new\.party > e\.party_max then raise exception/.test(a) || !/if not d\.listable then raise exception/.test(a)) falla(G, M, 0, "rsvps_antes: personas por RSVP y solo fechas que salen al público");
    if (!/if dh > 0 and cap > 0 and n > cap then raise exception 'evt_cupo_lleno/.test(d)) falla(G, M, 0, "rsvps_despues: último control del cupo después de sumar");
    if (!/coalesce\(current_setting\('tl\.evt_derivado', true\), ''\) <> 'si' then\s*raise exception/.test(ed)) falla(G, M, 0, "event_dates_antes: los derivados solo con la marca de sus triggers");
    if (!/create unique index if not exists rsvps_vivo on rsvps \(event_date_id, user_id\) where status = 'going';/.test(m)) falla(G, M, 0, "un RSVP vivo por persona y fecha");
    if (!/create trigger rsvps_antes before insert or update or delete on rsvps/.test(m) || !/create trigger rsvps_despues after insert or update on rsvps/.test(m) || !/create trigger events_cupo before update of rsvp_capacity on events/.test(m)) falla(G, M, 0, "faltan los triggers del RSVP o del cupo");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      if (/tl\.evt_derivado/.test(t)) falla(G, x, 0, "la app no enciende la marca de los derivados de una fecha");
      for (const q of t.match(/`[^`]*`/g) ?? []) {
        if (/update event_dates[^`]*\b(rsvp_n|going_n|sold_n|inside_n|entered_n)\s*=/.test(q)) falla(G, x, 0, "los contadores de una fecha los lleva la base");
        if (/\b(insert into|update|delete from) rsvps\b/.test(q) && x !== "apps/web/lib/rsvp.ts") falla(G, x, 0, "solo lib/rsvp.ts escribe RSVP");
      }
    }
  },

  /* 5d. La apelación la decide otra persona: la base pone quién ocultó o sancionó (sanctioned_by, de la fuente) y rechaza que esa persona
     o quien apela la decida (trigger y check); decidirApelacion lo dice antes de tocar nada; solo lib/apelaciones.ts escribe appeals y
     nunca escribe sanctioned_by a mano. */
  apelacionOtraPersona() {
    const G = "apelacionOtraPersona", M = "packages/db/migrations/0100_moderacion_apelaciones.sql", AP = "apps/web/lib/apelaciones.ts";
    if (!existsSync(M) || !existsSync(AP)) return;
    const m = readFileSync(M, "utf8");
    if (!/if old\.sanctioned_by is not null and new\.decided_by = old\.sanctioned_by then raise exception/.test(m)) falla(G, M, 0, "appeals_antes debe rechazar que decida quien sancionó");
    if (!/if new\.decided_by = old\.user_id then raise exception/.test(m)) falla(G, M, 0, "appeals_antes debe rechazar que decida quien apela");
    if (!/new\.sanctioned_by := x\.por;/.test(m)) falla(G, M, 0, "appeals_antes debe poner sanctioned_by desde la fuente (no la app)");
    if (!/check \(decided_by is null or sanctioned_by is null or decided_by <> sanctioned_by\)/.test(m)) falla(G, M, 0, "appeals sin el check decided_by <> sanctioned_by");
    const b = cuerpoFn(sinComent(AP), "decidirApelacion"), iC = b.search(/if \(a\.por === staffId\) return \{ err:/), iU = b.search(/update appeals set status/);
    if (iC < 0 || iU < 0 || iC > iU) falla(G, AP, 0, "decidirApelacion debe rechazar a quien sancionó antes de decidir");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) {
        if (/\b(insert into|update|delete from) appeals\b/.test(q) && x !== AP) falla(G, x, 0, "solo lib/apelaciones.ts escribe apelaciones");
        if (/\binsert into appeals\b/.test(q) && /sanctioned_by|decided_by/.test(q)) falla(G, x, 0, "una apelación nueva no trae sanctioned_by ni decided_by (los pone la base)");
      }
    }
  },

  /* 5d. Libros de solo inserción: mod_flags (lo que marcó cada regla) y com_edits no se cambian ni se borran (trigger); una apelación no se
     borra y, decidida, no cambia; un término no se borra (se apaga). Y ningún código lo intenta. */
  libroSoloInsercion() {
    const G = "libroSoloInsercion", M = "packages/db/migrations/0100_moderacion_apelaciones.sql";
    if (!existsSync(M)) return;
    const m = readFileSync(M, "utf8");
    if (!/create trigger mod_flags_no_cambia before update or delete on mod_flags for each row execute function mod_flags_inmutable\(\)/.test(m) || !/raise exception 'mod_flags es solo de inserción'/.test(m)) falla(G, M, 0, "mod_flags sin el trigger de solo inserción");
    if (!/if tg_op = 'DELETE' then raise exception 'una apelación no se borra'/.test(m) || !/if old\.status <> 'open' then raise exception 'una apelación decidida no cambia'/.test(m)) falla(G, M, 0, "appeals: no se borra y, decidida, no cambia");
    if (!/create trigger mod_terms_no_borra before delete on mod_terms/.test(m)) falla(G, M, 0, "mod_terms: un término no se borra");
    if (!/create trigger com_edits_no_cambia before update or delete on com_edits/.test(readFileSync("packages/db/migrations/0097_comunidad_base.sql", "utf8"))) falla(G, "packages/db/migrations/0097_comunidad_base.sql", 0, "com_edits sin el trigger de solo inserción");
    // 6g · La puerta: ticket_scans (auditoría de check-ins) y door_searches son de solo inserción; un portero, una sesión, una incidencia o
    // un número de mesa no se borran (estados); la app no cambia ni borra escaneos, entradas, contadores ni búsquedas.
    const MP = "packages/db/migrations/0112_puerta.sql";
    if (existsSync(MP)) {
      const mp = readFileSync(MP, "utf8");
      if (!/create trigger ticket_scans_antes before insert or update or delete on ticket_scans/.test(mp) || !/raise exception 'ticket_scans es solo de inserción'/.test(ultimaFn("ticket_scans_antes"))) falla(G, MP, 0, "ticket_scans es de solo inserción (trigger)");
      if (!/create trigger door_searches_no_cambia before update or delete on door_searches/.test(mp)) falla(G, MP, 0, "door_searches es de solo inserción (trigger)");
      for (const [fn, msg] of [["door_staff_antes", "un portero no se borra"], ["door_sessions_antes", "una sesión de puerta no se borra"], ["door_incidents_antes", "una incidencia no se borra"], ["door_table_numbers_antes", "un número de mesa no se borra"], ["ticket_entries_antes", "una entrada no se borra"]])
        if (!new RegExp(`raise exception '${msg}`).test(ultimaFn(fn))) falla(G, MP, 0, `${msg} (estados)`);
      for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) (ticket_scans|door_searches|ticket_entries|door_counts)\b|\bdelete from (door_staff|door_sessions|door_incidents|door_table_numbers)\b/.test(q)) falla(G, x, 0, `la auditoría de la puerta no se cambia ni se borra: «${q.slice(0, 60)}»`);
    }
    // 6i · Evento privado: las propuestas, las aceptaciones y los cambios pedidos son de solo inserción (el estado de una propuesta se deriva).
    for (const [fn, msg] of [["private_event_quotes_antes", "private_event_quotes es solo de inserción"], ["private_event_acceptances_antes", "private_event_acceptances es solo de inserción"], ["private_event_asks_antes", "private_event_asks es solo de inserción"]])
      if (!new RegExp(`if tg_op <> 'INSERT' then raise exception '${msg}'`).test(ultimaFn(fn))) falla(G, "packages/db/migrations/0114_evento_privado.sql", 0, `${msg} (trigger)`);
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) private_event_(quotes|acceptances|asks)\b/.test(q)) falla(G, x, 0, "una propuesta, una aceptación o un cambio pedido no se cambian ni se borran");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      for (const q of t.match(/`[^`]*`/g) ?? []) {
        if (/\b(update|delete from) (mod_flags|com_edits)\b|\bdelete from (appeals|mod_terms)\b/.test(q)) falla(G, x, 0, `un libro de solo inserción se cambia o se borra: «${q.slice(0, 60)}»`);
        // 5f: el libro de puntos no se cambia, no se borra y la app ni siquiera inserta: solo sus funciones (pts_*).
        if (/\b(insert into|update|delete from) points_entries\b/.test(q)) falla(G, x, 0, "points_entries solo lo escriben las funciones pts_* de la base (solo inserción)");
        // 5g: el libro de monedas y los canjes: la app no los inserta, no los cambia y no los borra (solo mon_* y cup_* en la base); un cupón no se borra.
        if (/\b(insert into|update|delete from) (coin_entries|coupon_redemptions)\b/.test(q)) falla(G, x, 0, "coin_entries y coupon_redemptions solo los escriben las funciones mon_* / cup_* de la base");
        if (/\bdelete from coupons\b/.test(q)) falla(G, x, 0, "un cupón no se borra: se termina (estado)");
      }
      if (/tl\.puntos|pts_entrar\(/.test(t)) falla(G, x, 0, "la app no enciende la marca del libro de puntos");
      if (/tl\.(monedas|cupones)|(mon|cup)_entrar\(/.test(t)) falla(G, x, 0, "la app no enciende la marca del libro de monedas ni la de los canjes");
    }
    // 5f · points_entries: trigger de solo inserción, y antes de insertar exige la marca de sus funciones.
    const M2 = "packages/db/migrations/0102_puntos_rangos_tabla.sql";
    if (existsSync(M2)) {
      const m2 = readFileSync(M2, "utf8");
      if (!/create trigger points_entries_no_cambia before update or delete on points_entries for each row execute function points_entries_inmutable\(\)/.test(m2) || !/raise exception 'points_entries es solo de inserción'/.test(m2)) falla(G, M2, 0, "points_entries sin el trigger de solo inserción");
      if (!/if coalesce\(current_setting\('tl\.puntos', true\), ''\) <> 'si' then raise exception 'el libro de puntos solo lo escriben sus funciones/.test(ultimaFn("points_entries_antes"))) falla(G, M2, 0, "points_entries: solo sus funciones insertan (marca tl.puntos)");
      if (!/create unique index if not exists points_entries_unico on points_entries \(user_id, rule_key, ref_kind, ref_id\) where reverses_id is null/.test(m2) || !/points_entries_reverso on points_entries \(reverses_id\) where reverses_id is not null/.test(m2)) falla(G, M2, 0, "points_entries: idempotente por (persona, regla, referencia) y cada asiento se revierte una vez");
      if (!/if tg_op = 'DELETE' then raise exception 'un cierre de la Tabla no se borra'/.test(m2) || !/if tg_op = 'UPDATE' and old\.closed_at is not null then raise exception 'un mes cerrado no cambia'/.test(m2)) falla(G, M2, 0, "board_closures: un cierre no se borra y un mes cerrado no cambia");
    }
    // 5g · coin_entries: trigger de solo inserción, solo sus funciones insertan (marca tl.monedas), idempotente y cada canje se devuelve una vez.
    const M3 = "packages/db/migrations/0103_monedas_cupones.sql";
    if (existsSync(M3)) {
      const m3 = readFileSync(M3, "utf8");
      if (!/create trigger coin_entries_no_cambia before update or delete on coin_entries for each row execute function coin_entries_inmutable\(\)/.test(m3) || !/raise exception 'coin_entries es solo de inserción'/.test(m3)) falla(G, M3, 0, "coin_entries sin el trigger de solo inserción");
      if (!/if coalesce\(current_setting\('tl\.monedas', true\), ''\) <> 'si' then raise exception 'el libro de monedas solo lo escriben sus funciones/.test(ultimaFn("coin_entries_antes"))) falla(G, M3, 0, "coin_entries: solo sus funciones insertan (marca tl.monedas)");
      if (!/create unique index if not exists coin_entries_unico on coin_entries \(user_id, reason_key, ref_kind, ref_id\) where reverses_id is null/.test(m3) || !/coin_entries_reverso on coin_entries \(reverses_id\) where reverses_id is not null/.test(m3)) falla(G, M3, 0, "coin_entries: idempotente por (persona, motivo, referencia) y cada canje se devuelve una vez");
      const cg = ultimaFn("coupon_redemptions_guardia");
      if (!/if tg_op = 'DELETE' then raise exception 'un canje no se borra'/.test(cg) || !/if coalesce\(current_setting\('tl\.cupones', true\), ''\) <> 'si' then raise exception/.test(cg)) falla(G, M3, 0, "coupon_redemptions: no se borra y solo cup_* la escriben (marca tl.cupones)");
      if (!/create trigger coupon_redemptions_guardia before insert or update or delete on coupon_redemptions/.test(m3)) falla(G, M3, 0, "coupon_redemptions sin su trigger de guardia");
    }
  },

  /* 5d. Los límites del día los pone el servidor: publicar, comentar, votar, empezar una conversación y reportar piden limiteDia() antes de
     escribir; limiteDia cuenta el día local de la ciudad, con la mitad el primer día de la cuenta y con candado por persona (dos a la vez
     no se pasan); los cinco topes existen en platform_config. Ningún conteo propio de «24 horas» queda en esas funciones. */
  limitesEnServidor() {
    const G = "limitesEnServidor", MO = "apps/web/lib/moderacion.ts", M = "packages/db/migrations/0100_moderacion_apelaciones.sql";
    if (!existsSync(MO)) return;
    const CASOS = [["apps/web/lib/comunidad.ts", "publicar", "publicaciones", /insert into com_posts/], ["apps/web/lib/comunidad-hilo.ts", "comentar", "comentarios", /insert into com_comments/],
      ["apps/web/lib/comunidad-hilo.ts", "votar", "votos", /select com_votar\(/], ["apps/web/lib/mensajes-vecinos.ts", "enviar", "conversaciones", /insert into dm_threads/],
      ["apps/web/lib/mensajes-vecinos.ts", "reportarConversacion", "reportes", /insert into content_reports/], [MO, "reportar", "reportes", /insert into content_reports/]];
    for (const [f, fn, que, w] of CASOS) {
      const b = cuerpoFn(sinComent(f), fn), iL = b.search(new RegExp(`await limiteDia\\(c, \\w+, "${que}"\\)`)), iW = b.search(w);
      if (iL < 0 || iW < 0 || iL > iW) falla(G, f, 0, `«${fn}» escribe sin pedir antes limiteDia(…, "${que}")`);
      if (/created_at > now\(\) - interval '24 hours'/.test(b) && fn !== "votar") falla(G, f, 0, `«${fn}» cuenta su propio límite de 24 horas (usa limiteDia: día local)`);
    }
    const l = cuerpoFn(sinComent(MO), "limiteDia");
    if (!/pg_advisory_xact_lock\(hashtextextended\(\$1, 0\)\)`, \[`lim:\$\{que\}:\$\{userId\}`\]/.test(l)) falla(G, MO, 0, "limiteDia sin candado por persona y tipo");
    if (!/date_trunc\('day', now\(\) at time zone z\.tz\) at time zone z\.tz/.test(l)) falla(G, MO, 0, "limiteDia debe contar el día local de la ciudad");
    if (!/u\.nueva \? Math\.max\(1, Math\.floor\(u\.tope \/ 2\)\)/.test(l)) falla(G, MO, 0, "limiteDia: la mitad el primer día de la cuenta (§6 #21)");
    const m = readFileSync(M, "utf8");
    for (const k of ["com_lim_publicaciones", "com_lim_comentarios", "com_lim_votos", "com_lim_conversaciones", "com_lim_reportes"]) if (!m.includes(`('${k}', '`)) falla(G, M, 0, `falta el límite ${k} en platform_config`);
  },

  /* 5d (clase: reportes en manada para esconder a alguien). Auto-ocultar cuenta PERSONAS: las cuentas que comparten algún dispositivo (sus
     sesiones o el del reporte) cuentan como una, las cuentas nuevas (edad_h) no cuentan, y el dispositivo del reporte sale de la cookie del
     servidor (nunca del cliente). Nada se oculta solo por otra vía. */
  reportesSinManada() {
    const G = "reportesSinManada", MO = "apps/web/lib/moderacion.ts", AC = "apps/web/app/(app)/comunidad/acciones.ts";
    if (!existsSync(MO)) return;
    const b = cuerpoFn(sinComent(MO), "autoOcultar");
    if (!/array\(select distinct s\.device::text from sessions s where s\.user_id = cr\.reporter_user_id and s\.device is not null\) as devs/.test(b)) falla(G, MO, 0, "autoOcultar debe mirar los dispositivos de cada cuenta que reporta (sesiones)");
    if (!/u\.created_at <= now\(\) - make_interval\(hours => \$3\) as vieja/.test(b) || !/\.filter\(\(x\) => x\.vieja\)/.test(b)) falla(G, MO, 0, "autoOcultar no debe contar cuentas nuevas (edad_h)");
    if (!/padre\[raiz\(i\)\] = raiz\(j\)/.test(b) || !/const peso = \[\.\.\.grupos\.values\(\)\]\.reduce/.test(b) || !/if \(peso < umbral\) return null;/.test(b)) falla(G, MO, 0, "autoOcultar debe unir las cuentas que comparten dispositivo y contar grupos, no reportes");
    const ac = cuerpoFn(sinComent(AC), "comReportar");
    if (!/await dispositivo\(false\)\);/.test(ac)) falla(G, AC, 0, "el dispositivo del reporte sale de la cookie del servidor (dispositivo()), nunca del cliente");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === MO) continue;
      if (/\bset\b[^`;]*hidden_by = 'auto'/.test(sinComent(x))) falla(G, x, 0, "solo autoOcultar (lib/moderacion.ts) oculta «auto»");
    }
  },

  /* ── Fase 5 · Comunidad (5e) ── */
  /* 5e. La cuenta oficial «To'Latino {Ciudad}» no es una persona: la base exige author_user_id null cuando el autor es oficial; solo
     lib/oficial.ts la escribe (insert con 'official', null y el staff_id de quien la escribe, después de revisar rol Admin/Ciudad y su
     ciudad) y nunca crea una fila en users; el muro la arma sin id (no se sigue, no se le escribe, no abre perfil) y con el sello; y
     todo lo que reparta puntos o arme la Tabla (5f) filtra author_kind (nunca gana puntos ni sale en rankings). */
  oficialNoEsPersona() {
    const G = "oficialNoEsPersona", M = "packages/db/migrations/0097_comunidad_base.sql", O = "apps/web/lib/oficial.ts", C = "apps/web/lib/comunidad.ts";
    if (!existsSync(M)) return;
    if (!/check \(\(author_kind = 'official'\) = \(author_user_id is null\)\)/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "com_posts debe exigir author_user_id null para la cuenta oficial (y solo para ella)");
    if (!existsSync(O)) return falla(G, O, 0, "falta lib/oficial.ts (la cuenta oficial la escribe el equipo)");
    const t = sinComent(O), b = cuerpoFn(t, "publicarOficial"), iP = b.search(/if \(!puedeOficial\(s, ciudad\)\) return no\(/), iW = b.search(/insert into com_posts/);
    if (iP < 0 || iW < 0 || iP > iW) falla(G, O, 0, "publicarOficial escribe sin revisar antes puedeOficial(s, ciudad)");
    if (!/values \(\$1, 'official', null, \$2,/.test(b)) falla(G, O, 0, "la cuenta oficial se escribe con author_kind 'official', author_user_id null y staff_id = quien la escribe");
    if (!/ROLES_OFICIAL = \["admin", "ciudad"\]/.test(t)) falla(G, O, 0, "solo Admin y Ciudad manager escriben como la cuenta oficial");
    if (!/ROLES_OFICIAL\.includes\(s\.role\) && s\.puede\("cont", "editar"\) && \(!ciudad \|\| !s\.cities\.length \|\| s\.cities\.includes\(ciudad\)\)/.test(t)) falla(G, O, 0, "puedeOficial debe mirar el rol, el permiso de Contenido y la ciudad");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const u = sinComent(x);
      if (x === O && /\binsert into users\b/i.test(u)) falla(G, x, 0, "la cuenta oficial nunca crea una fila en users");
      if (x !== O && /insert into com_posts[\s\S]{0,400}'official'/.test(u)) falla(G, x, 0, "solo lib/oficial.ts escribe como la cuenta oficial");
      // 5f: lo que lee el libro de puntos o arma la Tabla va siempre unido a users (la cuenta oficial no tiene fila en users: nunca sale).
      for (const q of u.match(/`[^`]*`/g) ?? []) if (/\bfrom (points_entries|monthly_boards)\b/.test(q) && !/\bjoin users\b/.test(q) && !/^`select 1 from points_entries where rule_key = 'primera_rec'/.test(q)) falla(G, x, 0, "lo que lee el libro de puntos o arma la Tabla debe ir unido a users (la cuenta oficial nunca sale)");
    }
    // 5f · La cuenta oficial nunca gana puntos: el libro y la Tabla piden una persona (users); pts_sumar rechaza sin persona; el voto a lo
    // oficial (sin autor) no llega a sumar.
    const M2 = "packages/db/migrations/0102_puntos_rangos_tabla.sql", PU = "apps/web/lib/puntos.ts";
    if (existsSync(M2)) {
      const m2 = readFileSync(M2, "utf8");
      if (!/create table if not exists points_entries \(\s*id[^\n]*\n\s*user_id\s+uuid not null references users \(id\)/.test(m2)) falla(G, M2, 0, "points_entries.user_id debe ser una persona (not null, users)");
      if (!/create table if not exists monthly_boards \([\s\S]*?user_id\s+uuid not null references users \(id\)/.test(m2)) falla(G, M2, 0, "monthly_boards.user_id debe ser una persona (not null, users)");
      if (!/if uid is null then raise exception 'los puntos son de una persona/.test(ultimaFn("pts_sumar"))) falla(G, M2, 0, "pts_sumar debe rechazar sumar sin persona (la cuenta oficial)");
    }
    if (existsSync(PU)) {
      const v = cuerpoFn(sinComent(PU), "puntosDelVoto"), iA = v.search(/if \(!t\?\.autor\) return null;/), iS = v.search(/sumar\(/);
      if (iA < 0 || iS < 0 || iA > iS) falla(G, PU, 0, "puntosDelVoto: lo de la cuenta oficial (sin autor) no da puntos a nadie");
      if (/staff_id/.test(sinComent(PU))) falla(G, PU, 0, "los puntos nunca van a quien escribió como la cuenta oficial (staff_id)");
    }
    if (existsSync(C)) {
      const a = cuerpoFn(sinComent(C), "armar");
      if (!/oficial \? \{ id: null, nombre: [^}]*foto: SELLO_OFICIAL, rango: 0, oficial: true \}/.test(a)) falla(G, C, 0, "armar(): la cuenta oficial sale sin id (no se sigue ni se le escribe), con el sello y sin rango");
    }
    const MU = "apps/web/app/(app)/comunidad/Muro.tsx";
    if (existsSync(MU) && !/onAuthor=\{p\.autor\.id && !p\.autor\.oficial \?/.test(sinComent(MU))) falla(G, MU, 0, "tocar a la cuenta oficial no abre un perfil de persona");
  },

  /* 5e. Hoy en el barrio solo muestra lo que está en vivo: la regla vive en la base (post_en_hoy = post_en_vivo + para todos + < 24 h + no
     retirada de Hoy; post_en_vivo = live, no oculta, ya publicada, sin vencer, negocio activo Pro con Novedades encendido y sin pausa) y
     toda consulta de Hoy (lib/hoy.ts, el Super Admin) la usa. Al revés: quitar post_en_hoy de una consulta o una condición de la regla →
     falla. */
  hoySoloEnVivo() {
    const G = "hoySoloEnVivo", H = "apps/web/lib/hoy.ts";
    const vivo = ultimaFn("post_en_vivo"), hoy = ultimaFn("post_en_hoy");
    if (!hoy) return falla(G, "packages/db/migrations", 0, "falta post_en_hoy (la regla de Hoy en el barrio vive en la base)");
    for (const [re, que] of [[/post_en_vivo\(p\)/, "en vivo"], [/p\.audience = 'all'/, "para todos (no «solo seguidores»)"], [/p\.hoy_off_at is null/, "no retirada de Hoy"], [/p\.publish_at > now\(\) - interval '24 hours'/, "menos de 24 h"]])
      if (!re.test(hoy)) falla(G, "packages/db/migrations", 0, `post_en_hoy sin «${que}»`);
    for (const [re, que] of [[/p\.status = 'live'/, "no detenida"], [/p\.hidden_at is null/, "no oculta"], [/p\.publish_at <= now\(\)/, "ya publicada"], [/p\.ends_at is null or p\.ends_at > now\(\)/, "sin vencer"],
      [/s\.plan = 'pro'/, "negocio Pro (no Free)"], [/b\.status = 'active'/, "negocio activo"], [/'nov' = any\(b\.modules_on\) and not \(b\.modules_off \? 'nov'\)/, "Novedades encendido y sin pausa de To'Latino"],
      // 6b: la novedad con enlace a un evento sale solo con el evento en vivo (una fecha listable que no terminó, del mismo negocio).
      [/p\.link_kind <> 'event' or exists \(select 1 from event_dates d join events e on e\.id = d\.event_id\s+where d\.event_id = p\.event_id and e\.business_id = p\.business_id and d\.listable and d\.ends_at > now\(\)\)/, "evento en vivo (link_kind 'event')"]])
      if (!re.test(vivo)) falla(G, "packages/db/migrations", 0, `post_en_vivo sin «${que}»`);
    if (!existsSync(H)) return falla(G, H, 0, "falta lib/hoy.ts");
    const t = sinComent(H);
    for (const fn of ["hoyEnElBarrio", "quedanEnHoy", "avisarHoyGuardados"]) {
      const b = cuerpoFn(t, fn);
      if (!b) { falla(G, H, 0, `falta ${fn}()`); continue; }
      for (const q of b.match(/`[^`]*`/g) ?? []) if (/from business_posts\b/.test(q) && !/post_en_hoy\(/.test(q)) falla(G, H, 0, `«${fn}» lee novedades para Hoy sin post_en_hoy()`);
    }
    const A = "apps/web/lib/admin-contenido.ts";
    if (existsSync(A)) { const h = cuerpoFn(sinComent(A), "hoyAdmin"); if (!/post_en_hoy\(p\) as "enHoy"/.test(h) || !/\n\s*where [\s\S]*\(post_en_hoy\(p\) or p\.hoy_off_at is not null\)/.test(h)) falla(G, A, 0, "«hoyAdmin» debe usar post_en_hoy() para decir qué está en Hoy (y para filtrar)"); }
    // Nadie más arma Hoy por su cuenta: una consulta que mira hoy_off_at también usa post_en_hoy().
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === H) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/hoy_off_at is null/.test(q) && !/post_en_hoy\(/.test(q)) falla(G, x, 0, "consulta de Hoy en el barrio sin post_en_hoy()");
    }
  },

  /* 5e. Buscar › Vecinos solo con cuenta: buscarVecinos() no lee nada sin quien mira y pasa por sinBloqueos(); quien la llama lo hace con
     la sesión (u.id, después de revisar que hay sesión); la búsqueda en vivo (/api/buscar) nunca lee publicaciones de vecinos; la
     pestaña «vec» no existe sin sesión. */
  buscarVecinosConSesion() {
    const G = "buscarVecinosConSesion", L = "apps/web/lib/comunidad-portada.ts", P = "apps/web/app/(app)/buscar/page.tsx";
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/comunidad-portada.ts");
    const b = cuerpoFn(sinComent(L), "buscarVecinos");
    if (!/export async function buscarVecinos\(viewer: string,[^\n]*\n\s*if \(!viewer \|\| !consulta\) return \{ items: \[\], mas: null, total: 0 \};/.test(b)) falla(G, L, 0, "buscarVecinos debe empezar devolviendo nada sin quien mira");
    if (!/w: string\[\] = \[[^\]]*sinBloqueos\("p\.author_user_id", "\$1"\)/.test(b)) falla(G, L, 0, "buscarVecinos sin sinBloqueos()");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === L) continue;
      const t = sinComent(x);
      if (/^apps\/web\/app\/api\/buscar\//.test(x) && /buscarVecinos|comunidad-portada|lib\/comunidad|from com_posts|com_comments/.test(t)) falla(G, x, 0, "la búsqueda en vivo no lee publicaciones de vecinos");
      for (const m of t.matchAll(/buscarVecinos\(([^,]*),/g)) {
        if (m[1].trim() !== "u.id") falla(G, x, 0, "buscarVecinos se llama con la sesión (u.id)");
        const antes = t.slice(Math.max(0, m.index - 400), m.index);
        if (!/\bu && [^\n]*$/.test(antes) && !/if \(!u\) return/.test(antes)) falla(G, x, 0, "buscarVecinos sin revisar antes que hay sesión");
      }
    }
    if (existsSync(P) && !/sp\.tab === "vec" && u \? "vec"/.test(sinComent(P))) falla(G, P, 0, "la pestaña Vecinos no existe sin sesión");
  },

  /* 5g. Las monedas no son dinero (§3, §6 #3): no se compran, no se venden, no se transfieren entre personas, no se cambian por dinero ni
     por saldo y no vencen. En el código de las monedas y los cupones no hay pagos, pasarela, Stripe, monedero, centavos, precio, compra
     de monedas, transferencias ni retiros; el libro no tiene columnas de dinero ni motivos de compra o transferencia; los dos libros
     (puntos y monedas) no se mezclan; y la pantalla del vecino y el Super Admin dicen «Sin valor en dinero». */
  monedasSinDinero() {
    const G = "monedasSinDinero", M = "packages/db/migrations/0103_monedas_cupones.sql";
    if (!existsSync(M)) return;
    const ARCH = ["apps/web/lib/monedas.ts", "apps/web/lib/monedas-comun.ts", "apps/web/lib/cupones.ts", "apps/web/app/panel/acciones-cupones.ts", "apps/web/app/panel/CuponesPanel.tsx",
      "apps/web/app/(app)/comunidad/monedas/Monedas.tsx", "apps/web/app/(app)/comunidad/monedas/page.tsx"];
    const DINERO = /\b(payments?|pasarela|stripe|wallet\w*|monedero|\w*_cents|cents|precio|price|pagar|pago|cobro|comprar monedas|buy coins|compra de monedas|transferir|transfer\w*|cash ?out|retirar|retiro|withdraw\w*|venta de monedas|sell coins)\b/i;
    for (const f of ARCH) {
      if (!existsSync(f)) { falla(G, f, 0, "falta el archivo de monedas o cupones"); continue; }
      sinComent(f).split("\n").forEach((l, i) => { const m = DINERO.exec(l); if (m) falla(G, f, i + 1, `«${m[0]}» junto a las monedas: no tienen valor en dinero (ni pagos, ni compra, ni transferencia, ni retiro)`); });
      if (/points_entries|pts_sumar|pts_ajustar/.test(sinComent(f))) falla(G, f, 0, "puntos y monedas son dos libros que nunca se mezclan");
    }
    const sql = readFileSync(M, "utf8").replace(/--.*$/gm, "");
    { const m = DINERO.exec(sql); if (m) falla(G, M, 0, `«${m[0]}» en la migración de monedas: las monedas no tienen valor en dinero`); }
    const tabla = /create table if not exists coin_entries \(([\s\S]*?)\n\);/.exec(sql)?.[1] ?? "";
    if (!tabla) falla(G, M, 0, "falta el libro coin_entries");
    if (/amount|money|cents|payment|wallet|to_user|from_user|recipient|destino/i.test(tabla)) falla(G, M, 0, "el libro de monedas no tiene columnas de dinero ni de otra persona (no se transfieren)");
    if (!/reason_key\s+text not null check \(reason_key in \('welcome', 'premio_mes', 'canje', 'devolucion', 'ajuste'\)\)/.test(tabla)) falla(G, M, 0, "los motivos del libro son solo bienvenida, premio del mes, canje, devolución y ajuste (sin compra, venta ni transferencia)");
    if (/create or replace function mon_(transferir|enviar|regalar|comprar|vender|cambiar|retirar)/i.test(sql)) falla(G, M, 0, "no hay funciones para transferir, comprar, vender o retirar monedas");
    if (/references (payments|wallet_entries)/.test(sql)) falla(G, M, 0, "monedas y cupones no se enlazan con pagos ni con el monedero");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      if (/coin_entries/.test(t) && /\b(payments|wallet_entries)\b/.test(t) && !/^apps\/web\/(app\/admin|lib\/admin)/.test(x)) falla(G, x, 0, "un mismo archivo toca monedas y dinero: las monedas no se cambian por dinero ni por saldo");
      if (/comprar monedas|buy coins|monedas en venta|coins for sale/i.test(t)) falla(G, x, 0, "las monedas nunca se compran");
    }
    // La pantalla del vecino y el Super Admin lo dicen siempre.
    const C = "apps/web/lib/monedas-comun.ts", V = "apps/web/app/(app)/comunidad/monedas/Monedas.tsx", A = "apps/web/app/admin/Gamificacion.tsx";
    if (existsSync(C) && !/export const SIN_VALOR: Bi = \{ es: "Sin valor en dinero", en: "No cash value" \}/.test(readFileSync(C, "utf8"))) falla(G, C, 0, "SIN_VALOR dice «Sin valor en dinero» / «No cash value»");
    if (existsSync(V) && !/\{t\(SIN_VALOR\)\.toUpperCase\(\)\}/.test(sinComent(V))) falla(G, V, 0, "la pantalla de monedas muestra «Sin valor en dinero» junto al saldo");
    if (existsSync(A) && !/v: SIN_VALOR\.es, s: "no se compran ni se cambian"/.test(sinComent(A))) falla(G, A, 0, "el Super Admin › Monedas muestra VALOR «Sin valor en dinero»");
  },

  /* 5g. Un código se usa una sola vez y la última unidad no se vende dos veces: cup_canjear bloquea el cupón antes de contar el cupo del
     mes, revisa «uno por persona» y gasta antes de crear el código (misma transacción); un índice único impide dos códigos vivos de la
     misma persona y cupón; cup_validar bloquea el código y solo pasa de emitido a usado una vez; el trigger no deja que un código usado o
     vencido cambie; solo lib/cupones.ts llama a cup_*; el costo en monedas solo lo escribe el equipo (acciones-gam.ts), nunca el negocio. */
  cuponUnaVez() {
    const G = "cuponUnaVez", M = "packages/db/migrations/0103_monedas_cupones.sql";
    if (!existsSync(M)) return;
    const m = readFileSync(M, "utf8"), K = ultimaFn("cup_canjear"), V = ultimaFn("cup_validar"), U = ultimaFn("cup_vencer_uno"), GR = ultimaFn("coupon_redemptions_guardia");
    const iL = K.search(/where c\.id = cid for update of c;/), iC = K.search(/select count\(\*\) into usados from coupon_redemptions/), iS = K.search(/if usados >= cp\.monthly_stock then raise exception/),
      iU = K.search(/r\.status in \('issued', 'used'\)\) then raise exception 'cupon ya canjeado'/), iG = K.search(/e := mon_gastar\(uid, cp\.cost_coins/), iI = K.search(/insert into coupon_redemptions/);
    if (iL < 0 || iC < 0 || iL > iC) falla(G, M, 0, "cup_canjear debe bloquear el cupón («for update») antes de contar el cupo del mes");
    if (iS < 0 || iS < iC) falla(G, M, 0, "cup_canjear: con el cupo del mes lleno no se canjea");
    if (iU < 0 || iU > iG) falla(G, M, 0, "cup_canjear: uno por persona (vivo o usado) antes de gastar");
    if (iG < 0 || iI < 0 || iG > iI) falla(G, M, 0, "cup_canjear: gastar las monedas antes de crear el código, en la misma transacción");
    if (!/create unique index if not exists coupon_redemptions_uno on coupon_redemptions \(coupon_id, user_id\) where status in \('issued', 'used'\)/.test(m)) falla(G, M, 0, "falta el índice único: una persona no tiene dos códigos vivos del mismo cupón");
    if (!/code\s+text not null unique check \(code ~ '\^TL-CQ-\[2-9A-HJ-NP-Z\]\{4,6\}\$'\)/.test(m)) falla(G, M, 0, "el código TL-CQ-xxxx es único y sin 0/O/1/I");
    if (!/select \* into r from coupon_redemptions where code = upper\(btrim\(cod\)\) for update;/.test(V) || !/if r\.id is null or r\.business_id <> negocio then/.test(V)) falla(G, M, 0, "cup_validar: el código bloqueado y solo del negocio del cupón");
    const iUs = V.search(/if r\.status = 'used' then/), iUp = V.search(/update coupon_redemptions set status = 'used'[^;]*where id = r\.id and status = 'issued'/);
    if (iUs < 0 || iUp < 0 || iUs > iUp) falla(G, M, 0, "cup_validar: un código usado no se usa otra vez (y solo pasa de emitido a usado)");
    if (!/if old\.status <> 'issued' then raise exception 'un código usado o vencido no cambia'/.test(GR)) falla(G, M, 0, "el trigger no deja que un código usado o vencido cambie");
    if (!/if r\.id is null or r\.status <> 'issued' or r\.expires_at > now\(\) then return 0; end if;/.test(U) || !/n := mon_devolver\(r\.coin_entry_id, 'vencido'\);/.test(U)) falla(G, M, 0, "cup_vencer_uno: solo un código emitido y vencido, y las monedas vuelven");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      for (const q of t.match(/`[^`]*`/g) ?? []) {
        if (/\bcup_(canjear|validar|vencer)\(/.test(q) && x !== "apps/web/lib/cupones.ts") falla(G, x, 0, "canjear, validar y vencer cupones pasan solo por lib/cupones.ts");
        if ((/\bupdate coupons\b[\s\S]*\bcost_coins\s*=/.test(q) || /\binsert into coupons\b[^)]*cost_coins/.test(q)) && x !== "apps/web/app/admin/acciones-gam.ts") falla(G, x, 0, "el costo en monedas de un cupón lo fija solo To'Latino (acciones-gam.ts)");
      }
    }
    const P = "apps/web/app/panel/acciones-cupones.ts";
    if (existsSync(P) && /\b(costo|cost|cost_coins)\b/.test(sinComent(P).replace(/"[^"\n]*"/g, ""))) falla(G, P, 0, "el panel del negocio no recibe ni escribe el costo en monedas");
  },

  /* 5h. El texto de los vecinos nunca sale de nuestros servidores (§3 «Traducción», D3): ningún traductor de terceros (Google, DeepL,
     Microsoft, Yandex, MyMemory, el LibreTranslate público) en ningún código ni dependencia; ningún modelo de lenguaje externo en un
     archivo que traduce; la única dirección de traducción es TRADUCTOR_URL, que lee solo lib/traductor.ts (sin direcciones escritas a
     mano y sin otro fetch que el de esa base) y que el compose apunta al servicio interno (http://traductor:5000). */
  traduccionPropia() {
    const G = "traduccionPropia", TD = "apps/web/lib/traductor.ts", TR = "apps/web/lib/traduccion.ts", C = "infra/pruebas/docker-compose.yml";
    if (!existsSync(TD)) return;
    const TERCEROS = /translat(e|ion)\.googleapis\.com|translate\.google\.[a-z.]+\/(translate_a|m\?)|api(-free)?\.deepl\.com|microsofttranslator\.com|translator\.azure|translate\.yandex|mymemory\.translated\.net|libretranslate\.(com|de|org)|translate\.argosopentech\.com|api\.reverso\.net|papago\.naver/i;
    const LLM = /api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|api\.mistral\.ai|api\.cohere\.(ai|com)/i;
    const PAQ = /"(@google-cloud\/translate|deepl-node|deepl|@vitalets\/google-translate-api|google-translate-api[\w-]*|translate|bing-translate-api|@iamtraction\/google-translate|libretranslate)"\s*:/;
    for (const f of archivos) {
      if (f.startsWith("guardianes/") || f.startsWith("docs/") || !/\.(tsx?|jsx?|mjs|cjs|sh|ya?ml|json|py|conf)$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      t.split("\n").forEach((l, i) => { const m = TERCEROS.exec(l); if (m) falla(G, f, i + 1, `«${m[0]}»: un traductor de terceros; el texto de los vecinos no sale de nuestros servidores`); });
      if (/traduc|translat/i.test(t) && LLM.test(t)) falla(G, f, 0, `«${LLM.exec(t)[0]}» en un archivo que traduce: la traducción es propia (un modelo pago es decisión del fundador, §6 #15)`);
      if (/(^|\/)package\.json$/.test(f) && PAQ.test(t)) falla(G, f, 0, `dependencia de traducción de terceros (${PAQ.exec(t)[1]})`);
    }
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      if (/TRADUCTOR_URL/.test(t) && x !== TD) falla(G, x, 0, "TRADUCTOR_URL solo la lee lib/traductor.ts");
      if (x !== TD && /fetch\([^)]*["'`/](translate|detect)\b/.test(t)) falla(G, x, 0, "solo lib/traductor.ts le habla al traductor");
    }
    const d = sinComent(TD);
    if (!/const base = \(\) => \(process\.env\.TRADUCTOR_URL \?\? ""\)/.test(d)) falla(G, TD, 0, "la dirección del traductor sale solo de TRADUCTOR_URL");
    if (/https?:\/\//.test(d)) falla(G, TD, 0, "lib/traductor.ts no lleva direcciones escritas a mano");
    for (const m of d.matchAll(/fetch\(([^,)]*)/g)) if (!/^b \+ /.test(m[1])) falla(G, TD, 0, `fetch(${m[1]}) no usa la base de TRADUCTOR_URL`);
    if (existsSync(TR) && (/fetch\(/.test(sinComent(TR)) || !/from "\.\/traductor"/.test(sinComent(TR)))) falla(G, TR, 0, "lib/traduccion.ts traduce solo con lib/traductor.ts (sin fetch propio)");
    if (existsSync(C) && !/\n      TRADUCTOR_URL: http:\/\/traductor:5000\n/.test(readFileSync(C, "utf8"))) falla(G, C, 0, "la app apunta TRADUCTOR_URL al servicio interno (http://traductor:5000)");
  },

  /* 5h. El traductor va en su propio perfil del compose y deploy.sh lo enciende APARTE con `|| true` (lección de 5d: un servicio que no
     se puede bajar o construir no frena el despliegue de la app). Imagen con versión exacta, solo español e inglés, sin actualizar
     modelos solo, memoria acotada, sin puertos hacia afuera y solo en la red interna (sin salida a internet). */
  traductorEnPerfil() {
    const G = "traductorEnPerfil", C = "infra/pruebas/docker-compose.yml", D = "infra/pruebas/deploy.sh";
    if (!existsSync(C) || !existsSync(D)) return;
    const c = readFileSync(C, "utf8").replace(/^\s*#.*$/gm, ""), d = readFileSync(D, "utf8");
    const bloque = (n) => { const i = c.search(new RegExp(`\\n  ${n}:\\n`)); if (i < 0) return ""; const r = c.slice(i + 1); const j = r.slice(3).search(/\n  [a-z][\w-]*:\n|\n[a-z]/); return j < 0 ? r : r.slice(0, j + 3); };
    const T = bloque("traductor"), M = bloque("traductor-modelos");
    if (!T) { falla(G, C, 0, "falta el servicio «traductor»"); return; }
    for (const [b, n] of [[T, "traductor"], [M, "traductor-modelos"]]) {
      if (!b) { falla(G, C, 0, `falta el servicio «${n}»`); continue; }
      if (!/\n    profiles: \["traductor"\]\n/.test(b)) falla(G, C, 0, `«${n}» va en su perfil propio (profiles: ["traductor"])`);
      if (!/\n    image: libretranslate\/libretranslate:v\d+\.\d+\.\d+\n/.test(b)) falla(G, C, 0, `«${n}»: imagen con versión exacta (nunca latest ni sin etiqueta)`);
      if (/\n    ports:/.test(b)) falla(G, C, 0, `«${n}» no publica puertos: solo la app le habla`);
      if (!/\n    mem_limit: \d+[mg]\n/.test(b)) falla(G, C, 0, `«${n}» con memoria acotada (mem_limit)`);
      if (/\n    build:/.test(b)) falla(G, C, 0, `«${n}» usa la imagen publicada, sin construir`);
    }
    const img = (b) => /\n    image: (\S+)\n/.exec(b)?.[1];
    if (M && img(M) !== img(T)) falla(G, C, 0, "los modelos se bajan con la misma imagen del traductor");
    if (!/\n    networks: \[interna\]\n/.test(T)) falla(G, C, 0, "el traductor vive solo en la red «interna»");
    if (!/\n  interna:\n    internal: true\n/.test(c)) falla(G, C, 0, "la red «interna» es internal: true (sin salida a internet)");
    if (!/\n      LT_LOAD_ONLY: es,en\n/.test(T) || !/\n      LT_UPDATE_MODELS: "false"\n/.test(T)) falla(G, C, 0, "solo los modelos español e inglés, sin actualizarlos solo (LT_LOAD_ONLY: es,en · LT_UPDATE_MODELS: \"false\")");
    if (!/--load_only_lang_codes es,en/.test(M)) falla(G, C, 0, "traductor-modelos baja solo español e inglés");
    if (!/\n      - traductor-modelos:\/home\/libretranslate\/\.local\n/.test(T)) falla(G, C, 0, "los modelos viven en un volumen (un reinicio no los vuelve a bajar)");
    const web = bloque("web");
    if (!/\n    networks: \[default, interna\]\n/.test(web)) falla(G, C, 0, "la app está en «default» y en «interna» (para hablarle al traductor)");
    if (/\n      traductor:/.test(web)) falla(G, C, 0, "la app no espera al traductor para arrancar (sin depends_on)");
    if (!/COMPOSE_TRAD=\(docker compose [^)]*--profile traductor\)/.test(d)) falla(G, D, 0, "deploy.sh enciende el traductor con su perfil (COMPOSE_TRAD … --profile traductor)");
    if (!/\n  systemd-run --unit tolatino-traductor --collect [^\n]*traductor-modelos && [^\n]*up -d traductor[^\n]*\|\| true\n/.test(d)) falla(G, D, 0, "deploy.sh baja los modelos y enciende el traductor APARTE (systemd-run … || true)");
    for (const l of d.split("\n")) if (/^docker compose .* up -d --build/.test(l) && /--profile/.test(l)) falla(G, D, 0, "el despliegue de la app no enciende perfiles: cada uno va aparte");
  },

  /* 5h. El Super Admin ve siempre el original (§4 5h): nada del Super Admin traduce ni lee la caché de traducciones; lo que ve es el texto
     tal como lo escribió la persona (para moderar, decidir y auditar). Solo puede ver si el traductor responde y su tope. */
  adminVeOriginal() {
    const G = "adminVeOriginal";
    if (!existsSync("apps/web/lib/traduccion.ts")) return;
    for (const x of codigo) {
      if (!/^apps\/web\/(app\/admin\/|lib\/admin[^/]*\.ts$)/.test(x)) continue;
      const t = sinComent(x), m = /useTraducir|verTraduccion|LineaTr|acciones-traducir|Traducir"|traduccion"|ugc_translations|\btraducir\(|traducirTexto/.exec(t);
      if (m) falla(G, x, 0, `«${m[0]}» en el Super Admin: el equipo ve siempre el original`);
    }
    // Y al revés: las pantallas de la Comunidad y de reseñas sí lo ofrecen (lo de los vecinos, en su idioma con «Ver traducción»).
    for (const [f, re] of [["apps/web/app/(app)/comunidad/Tarjeta.tsx", /translate=\{t\.translate\}/], ["apps/web/app/(app)/comunidad/p/[id]/Hilo.tsx", /translate: t\.translate/], ["apps/web/app/(app)/n/[id]/Resenas.tsx", /translate: tb\.translate/], ["apps/web/app/(app)/n/[id]/Novedades.tsx", /<LineaTr t=\{t\.translate\}/]])
      if (existsSync(f) && !re.test(sinComent(f))) falla(G, f, 0, "esta pantalla de vecinos ofrece «Ver traducción»");
  },

  /* 5h. Nunca la red dentro de una transacción: detectar el idioma o traducir se llama ANTES de abrir tx() (publicar no retiene la base
     esperando al traductor), y todo lo que publica texto de una persona guarda su idioma detectado (para «Ver traducción»). */
  traductorFueraDeTx() {
    const G = "traductorFueraDeTx";
    if (!existsSync("apps/web/lib/traductor.ts")) return;
    for (const x of codigo) {
      if (!/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(x) || x === "apps/web/lib/traductor.ts") continue;
      const t = sinComent(x);
      if (!/detectarIdioma\(|traducirTexto\(/.test(t)) continue;
      for (const p of t.split(/\n(?=(?:export )?(?:async )?function )/)) {
        const iT = p.search(/\btx\(/), iD = p.search(/detectarIdioma\(|traducirTexto\(/);
        if (iD >= 0 && iT >= 0 && iD > iT) falla(G, x, 0, `«${p.slice(0, p.indexOf("(")).replace(/^(export )?(async )?function /, "")}» llama al traductor dentro de una transacción`);
      }
    }
    for (const [f, fns] of [["apps/web/lib/comunidad.ts", ["publicar", "editar"]], ["apps/web/lib/comunidad-hilo.ts", ["comentar"]], ["apps/web/lib/resenas.ts", ["guardarResena", "responderResena"]], ["apps/web/lib/novedades.ts", ["comentarPost"]]]) {
      if (!existsSync(f)) continue;
      const t = sinComent(f);
      for (const fn of fns) if (!/detectarIdioma\(/.test(cuerpoFn(t, fn))) falla(G, f, 0, `«${fn}» guarda texto sin detectar su idioma (detectarIdioma)`);
    }
  },

  /* ── Fase 5 · 5i ── Configuración: un solo lugar, con límites; analítica sin personas; el lote nunca toca la cuenta oficial. */
  /* 5i (clase: un plazo copiado en dos lugares que se desincronizan; un valor leído sin límites). Las claves del catálogo (config_keys de
     0105) se leen SOLO con lib/config.ts (valor/valores/cfgSql → cfg_int de la base) y se escriben SOLO con cambiarConfig: ninguna consulta
     fuera de lib/config.ts toca platform_config con una clave del catálogo, una clave en variable ($n, any(...)) o una clave armada; el
     tipo ClaveConfig es exactamente el catálogo; y el código de la Comunidad no guarda copias de esos valores (30 min de editar, 14 días
     de apelar, 60 traducciones, 7 PM del resumen, 1·3·7 días de encuesta, 30 días del cupón, límites del día). Al revés: devolver una
     constante o leer platform_config directo → falla. */
  configDesdeUnLugar() {
    const G = "configDesdeUnLugar", K = "packages/db/migrations/0105_configuracion_comunidad.sql", CF = "apps/web/lib/config.ts";
    if (!existsSync(K)) return;
    // 6a: el catálogo crece en migraciones nuevas (0106 · Eventos): se leen todas las que insertan en config_keys.
    const claves = catalogoConfig().map((x) => x.k);
    if (claves.length < 10) return falla(G, K, 0, "no encuentro el catálogo config_keys");
    if (!existsSync(CF)) return falla(G, CF, 0, "falta lib/config.ts (el único lector de la configuración)");
    const tipo = /export type ClaveConfig =([\s\S]*?);/.exec(sinComent(CF))?.[1] ?? "", enTipo = new Set([...tipo.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]));
    for (const k of claves) if (!enTipo.has(k)) falla(G, CF, 0, `ClaveConfig no tiene «${k}» del catálogo`);
    for (const k of enTipo) if (!claves.includes(k)) falla(G, CF, 0, `ClaveConfig tiene «${k}», que no está en config_keys`);
    const CAT = new RegExp(`'(${claves.join("|")})'`);
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === CF) continue;
      const t = sinComent(x);
      for (const q of t.match(/`[^`]*`/g) ?? []) {
        if (!/platform_config/.test(q)) continue;
        if (CAT.test(q) || /key = (\$\d|any\()|key = '\$\{/.test(q)) falla(G, x, 0, "lee o escribe platform_config para una clave de Configuración: usa valor()/cfgSql()/cambiarConfig() de lib/config.ts");
      }
    }
    const COM = (x) => /^apps\/web\/lib\/(comunidad[^/]*|moderacion[^/]*|apelaciones|traduccion|cupones|oficial|evt-publico|rsvp)\.ts$/.test(x) || /^apps\/web\/app\/\(app\)\/eventos\/(?!publicar\/)/.test(x) || /^apps\/web\/app\/\(app\)\/(comunidad|cuenta\/avisos|cuenta\/moderacion)\//.test(x)
      || /^apps\/web\/app\/admin\/(ColasComunidad|Confianza|AutoModeracion|HoyAdmin|Contenido|Notificaciones)\.tsx$/.test(x) || x === "apps/web/app/panel/CuponesPanel.tsx";
    const COPIAS = [[/\b30 min(utos|utes)?\b/i, "los minutos para editar (com_editar_min)"], [/(apela[rn]?|apelaci[oó]n|appeal)[^"`\n]{0,24}\b14 (d[ií]as|days)/i, "los días para apelar (com_apelar_dias)"],
      [/\b60 (traducciones|translations)\b|de f[aá]brica: 60\b/i, "las traducciones por hora (com_traduccion_hora)"], [/A LAS 7 PM|AT 7 PM/, "la hora del resumen (com_resumen_hora)"],
      [/\bDIAS_ENCUESTA\b|\[1, 3, 7\]\.map|\bEDITAR_MIN\b|\bFILA_VIVA_MIN\b/, "una constante de un plazo de Configuración"], [/dias: 30\b|diasDef \?\? 30\b/, "los días del cupón (cup_dias_def)"],
      [/\bdef: \d+/, "el valor de fábrica de un límite (vive en config_keys)"], [/\b(10|100|500|20) (publicaciones|comentarios|votos|reportes) al d[ií]a/i, "un límite del día (com_lim_*)"]];
    for (const x of codigo) {
      if (!COM(x)) continue;
      sinComent(x).split("\n").forEach((l, i) => { for (const [re, que] of COPIAS) if (re.test(l)) falla(G, x, i + 1, `copia de ${que}: léelo de Configuración (lib/config.ts)`); });
    }
  },

  /* 5i. Cada valor de Configuración tiene límites y el servidor rechaza lo que se sale: el catálogo pide min < max y el de fábrica dentro;
     la base rechaza en platform_config un valor fuera de [min, max] o no entero (trigger); cambiarConfig revisa clave, que se cambie ahí,
     entero y límites ANTES de escribir, y deja la auditoría antes → después en la misma transacción; solo un Admin cambia desde
     Configuración. Al revés: quitar una revisión o poner un de fábrica fuera de sus límites → falla. */
  configConLimites() {
    const G = "configConLimites", K = "packages/db/migrations/0105_configuracion_comunidad.sql", CF = "apps/web/lib/config.ts", AC = "apps/web/app/admin/acciones-config.ts";
    if (!existsSync(K)) return;
    const m = readFileSync(K, "utf8");
    if (!/min\s+numeric not null,\s*\n\s*max\s+numeric not null,\s*\n\s*def\s+numeric not null,/.test(m) || !/check \(min < max\),\s*\n\s*check \(def >= min and def <= max\)/.test(m)) falla(G, K, 0, "config_keys debe exigir min, max y def con min < max y def dentro");
    for (const x of catalogoConfig()) if (!(x.a < x.b && x.d >= x.a && x.d <= x.b)) falla(G, x.f, 0, `«${x.k}»: de fábrica ${x.d} fuera de ${x.a}–${x.b}`);
    const tr = /create or replace function platform_config_limites\(\)[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(m)?.[1] ?? "";
    if (!/if v < c\.min or v > c\.max then raise exception/.test(tr) || !/v <> trunc\(v\) then raise exception/.test(tr) || !/create trigger platform_config_limites before insert or update on platform_config/.test(m))
      falla(G, K, 0, "la base debe rechazar en platform_config un valor fuera de sus límites o no entero (trigger platform_config_limites)");
    if (!/greatest\(c\.min, least\(c\.max, coalesce\(v, c\.def\)\)\)/.test(ultimaFn("cfg_int"))) falla(G, K, 0, "cfg_int debe acotar el valor a [min, max] y usar el de fábrica si no hay fila");
    if (!existsSync(CF)) return;
    const b = cuerpoFn(sinComent(CF), "cambiarConfig"), iW = b.search(/insert into platform_config/);
    for (const [re, que] of [[/if \(!x\.editable\) return/, "que se pueda cambiar aquí"], [/if \(x\.edit_in && o\.desde !== x\.edit_in\) return/, "que se cambie en su pantalla"],
      [/!Number\.isInteger\(v\)\) return/, "que sea un entero"], [/if \(v < x\.min \|\| v > x\.max\) return/, "los límites"]]) {
      const i = b.search(re);
      if (i < 0 || iW < 0 || i > iW) falla(G, CF, 0, `cambiarConfig escribe sin revisar antes ${que}`);
    }
    const iA = b.search(/await auditar\(c, \{ actor, action: "config\.cambiar"/);
    if (iA < 0 || iA < iW || !/before: \{ \[x\.label\.es\]: conUnidad\(k, x\.antes, x\.unit\) \}, after: \{ \[x\.label\.es\]: conUnidad\(k, v, x\.unit\) \}/.test(b)) falla(G, CF, 0, "cambiarConfig debe dejar la auditoría con antes → después en la misma transacción");
    if (existsSync(AC)) {
      const a = cuerpoFn(sinComent(AC), "configCambiar"), i1 = a.search(/s\.role !== "admin"/), i2 = a.search(/cambiarConfig\(/);
      if (i1 < 0 || i2 < 0 || i1 > i2) falla(G, AC, 0, "solo un Admin cambia la configuración (revisar el rol antes de cambiarConfig)");
    }
  },

  /* 5i. Analítica › Comunidad nunca muestra personas: comunidadAnalitica solo lee las vistas por ciudad y día de 0105, cuántos por rango
     (com_activos_por_rango) y nombres de ciudades, rangos y negocios; ninguna columna de una persona. Las vistas no sacan columnas de
     personas. Al revés: unir users o pedir author_user_id → falla. */
  analiticaSinPersonas() {
    const G = "analiticaSinPersonas", A = "apps/web/lib/admin-analitica.ts", K = "packages/db/migrations/0105_configuracion_comunidad.sql", UI = "apps/web/app/admin/Analitica.tsx";
    if (!existsSync(A) || !existsSync(K)) return;
    const b = cuerpoFn(sinComent(A), "comunidadAnalitica");
    if (!b) return falla(G, A, 0, "falta comunidadAnalitica");
    const OK = new Set(["com_analitica_dia", "com_canjes_negocio_dia", "com_activos_por_rango", "cities", "ranks"]);
    for (const [, t] of b.matchAll(/\b(?:from|join)\s+([a-z_]+)/g)) if (!OK.has(t)) falla(G, A, 0, `comunidadAnalitica lee «${t}»: solo las vistas sin personas de 0105`);
    const P = /\b(user_id|author_user_id|reporter_user_id|promoter_user_id|first_name|last_name|phone|nick|photo_url|email)\b/;
    if (P.test(b)) falla(G, A, 0, `comunidadAnalitica pide «${P.exec(b)[0]}»: nunca personas`);
    const m = readFileSync(K, "utf8"), v = /create or replace view com_canjes_negocio_dia as([\s\S]*?);/.exec(m)?.[1] ?? "", d = /\nselect d\.city_id, d\.dia,([\s\S]*?)\n  from d /.exec(m)?.[1] ?? "";
    if (!v || !d) falla(G, K, 0, "no encuentro las vistas de la analítica de la Comunidad");
    if (P.test(v) || P.test(d)) falla(G, K, 0, "una vista de la analítica de la Comunidad saca una columna de una persona");
    if (!/returns table \(rango smallint, activos integer\)/.test(m)) falla(G, K, 0, "com_activos_por_rango devuelve solo rango y cuántos");
    if (existsSync(UI)) { const u = readFileSync(UI, "utf8"), i = u.indexOf('d.tab === "com"'), j = u.indexOf("} else if", i + 10); if (i >= 0 && /admin\/usuarios|\.uid\b/.test(u.slice(i, j))) falla(G, UI, 0, "Analítica › Comunidad no lleva a personas"); }
  },

  /* 5i (MEM 651). «Ocultar los N reportados» nunca oculta la cuenta oficial: el lote pasa por loteOcultarUno, que lee author_kind y se
     niega ANTES de ocultar; la pantalla manda cada uno a esa acción (nunca a pubOcultar). Al revés: quitar la revisión → falla. */
  loteNoTocaOficial() {
    const G = "loteNoTocaOficial", A = "apps/web/app/admin/acciones-contenido.ts", UI = "apps/web/app/admin/Contenido.tsx";
    if (!existsSync(A)) return falla(G, A, 0, "falta la acción del lote (acciones-contenido.ts)");
    const b = cuerpoFn(sinComent(A), "loteOcultarUno"), iO = b.search(/if \(x\.oficial \|\| !x\.autor\) return/), iH = b.search(/set status = 'hidden'/);
    if (!/t\.author_kind = 'official'/.test(b) || iO < 0 || iH < 0 || iO > iH) falla(G, A, 0, "loteOcultarUno debe negarse con la cuenta oficial antes de ocultar");
    if (!/where t\.id = \$1::bigint and \(cardinality\(\$2::text\[\]\) = 0 or t\.city_id = any\(\$2::text\[\]\)\) for update/.test(b)) falla(G, A, 0, "loteOcultarUno: ciudad de quien actúa y fila bloqueada");
    if (existsSync(UI)) { const u = readFileSync(UI, "utf8"), e = /const enLote = \(\) => setConf\(\{([\s\S]*?)\n  \}\);/.exec(u)?.[1] ?? "";
      if (!/loteOcultarUno\(x\.k, x\.id, motivo\)/.test(e) || /pubOcultar|cmComOcultar/.test(e)) falla(G, UI, 0, "el lote manda cada uno a loteOcultarUno (nunca a pubOcultar)"); }
  },

  /* 6c. Boletos sin sobreventa (fase6 §3): la base trae el check (sold_n + held_n <= quantity) en ticket_stock y table_stock (y en extras y
     códigos); apartar sube held_n SOLO con el update condicional (… where sold_n + held_n + q <= quantity) dentro de lib/boletos.ts; nadie más
     escribe existencias, usos de códigos ni boletos. Al revés: quitar el check, la condición o escribir held_n / sold_n desde otro archivo → falla. */
  boletosSinSobreventa() {
    const G = "boletosSinSobreventa", M = "packages/db/migrations/0108_boletos_venta.sql", L = "apps/web/lib/boletos.ts";
    if (!existsSync(M)) return;
    const m = readFileSync(M, "utf8");
    for (const tb of ["ticket_stock", "table_stock"]) {
      const def = new RegExp(`create table if not exists ${tb} \\(([\\s\\S]*?)\\n\\);`).exec(m)?.[1] ?? "";
      if (!/check \(sold_n \+ held_n <= quantity\)/.test(def)) falla(G, M, 0, `${tb} sin el check (sold_n + held_n <= quantity)`);
    }
    if (!/check \(quantity is null or sold_n \+ held_n <= quantity\)/.test(m)) falla(G, M, 0, "event_addons sin el check de su cantidad");
    if (!/check \(used_n \+ held_n <= uses_max\)/.test(m)) falla(G, M, 0, "discount_codes sin el check del tope de usos");
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/boletos.ts");
    const a = cuerpoFn(sinComent(L), "apartar");
    if (!/set held_n = s\.held_n \+ \$3[\s\S]*?and s\.sold_n \+ s\.held_n \+ \$3 <= s\.quantity/.test(a)) falla(G, L, 0, "apartar: los boletos se apartan con el update condicional (sold_n + held_n + q <= quantity)");
    if (!/set held_n = s\.held_n \+ 1[\s\S]*?and s\.sold_n \+ s\.held_n \+ 1 <= s\.quantity/.test(a)) falla(G, L, 0, "apartar: la mesa se aparta con el update condicional");
    if (!/used_n \+ held_n < uses_max returning kind, value/.test(a)) falla(G, L, 0, "apartar: el uso del código se aparta con la condición del tope");
    if (!/sort\(\(x, y\) => Number\(x\.id\) - Number\(y\.id\)\)/.test(a)) falla(G, L, 0, "apartar: las filas se toman siempre en el mismo orden (por id)");
    // 6d · Después de comprar: la lista de espera (lib/espera.ts) aparta y las cortesías (lib/boletos-despues.ts) toman existencia; las dos solo
    // con el MISMO update condicional (sold_n + held_n + q <= quantity). Los boletos nuevos fuera de lib/boletos.ts: solo una cortesía (kind
    // 'comp', sin dinero) o la copia de un boleto que se recibe (insert … select … from tickets). Bajar existencias fuera de la venta: nunca
    // (al devolver, la suelta la base: trigger tickets_libera).
    const D6 = new Set(["apps/web/lib/boletos-despues.ts", "apps/web/lib/espera.ts"]);
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === L) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) {
        const escribe = /\bupdate (ticket_stock|table_stock|event_addons|discount_codes)\b[^`]*\b(held_n|sold_n|used_n)\s*=/.test(q);
        if (escribe && !(D6.has(x) && /\bupdate ticket_stock set (held_n = held_n|sold_n = sold_n) \+ \$\d\b[^`]*and sold_n \+ held_n \+ \$\d <= quantity/.test(q)))
          falla(G, x, 0, D6.has(x) ? "la lista de espera y las cortesías solo suben existencias con el update condicional (sold_n + held_n + q <= quantity)" : "las existencias y los usos los escribe solo lib/boletos.ts");
        if (/\binsert into tickets\b/.test(q) && !(x === "apps/web/lib/boletos-despues.ts" && (/'comp', 0, 0, 0/.test(q) || /\bselect event_date_id, event_id, city_id, valid_days, ticket_type_id[^`]*from tickets where id = \$1::bigint/.test(q))))
          falla(G, x, 0, "los boletos los emite solo lib/boletos.ts (en 6d: una cortesía sin dinero o la copia de un boleto que se recibe)");
      }
    }
    const DB = "packages/db/migrations/0109_boletos_comprador.sql";
    if (existsSync(DB) && !/create trigger tickets_libera after update of status on tickets/.test(readFileSync(DB, "utf8"))) falla(G, DB, 0, "al devolver un boleto la existencia la suelta la base (trigger tickets_libera)");
  },

  /* 6c. El apartado lo lleva el servidor: vence a now() + evt_apartado_min (Configuración) y lo suelta el barrido (vencerApartados) o la lectura;
     soltar por vencido exige que de verdad haya vencido (expires_at <= now()); la pantalla solo cuenta hacia atrás, nunca suelta ni vence por su
     cuenta, y ningún texto del cliente escribe los minutos a mano. Al revés: vencer desde el teléfono, sin la clave o sin el barrido → falla. */
  apartadoLoLlevaElServidor() {
    const G = "apartadoLoLlevaElServidor", L = "apps/web/lib/boletos.ts", B = "apps/web/lib/barrido.ts", P = "apps/web/app/(app)/eventos/pagar/[apartado]/Pagar.tsx";
    if (!existsSync(L)) return;
    const t = sinComent(L);
    if (!/expires_at\)\s*\n?\s*values \([^`]*now\(\) \+ make_interval\(mins => \$13::int\)/.test(cuerpoFn(t, "apartar")) || !/cfg\.evt_apartado_min\]\)\)\.rows\[0\]!\.id/.test(cuerpoFn(t, "apartar"))) falla(G, L, 0, "apartar: expires_at = now() + evt_apartado_min de Configuración");
    if (!/\$\{estado === "expired" \? "and expires_at <= now\(\)" : ""\}/.test(cuerpoFn(t, "soltarEn"))) falla(G, L, 0, "soltarEn: vencer solo lo que de verdad venció (expires_at <= now())");
    if (!existsSync(B) || !/bol\.vencerApartados\(\)/.test(readFileSync(B, "utf8"))) falla(G, B, 0, "el barrido central vence los apartados (vencerApartados)");
    if (!/await vencerApartados\(\{ fecha \}\)/.test(cuerpoFn(t, "pantallaBoletos")) || !/await vencerApartados\(\{ fecha \}\)/.test(cuerpoFn(t, "ventaFicha"))) falla(G, L, 0, "una lectura nunca cuenta un apartado vencido (vencerApartados al leer)");
    if (existsSync(P)) {
      const p = sinComent(P), iv = /setInterval\(([^\n]*)\)/.exec(p)?.[1] ?? "";
      if (/evt(Soltar|Pagar|Apartar)|router\./.test(iv)) falla(G, P, 0, "el contador de la pantalla de pago es solo pantalla: no suelta ni vence nada");
    }
    for (const x of codigo) {
      if (!/^apps\/web\/app\/\(app\)\/(eventos|cuenta\/boletos)\/.*\.tsx?$/.test(x)) continue;
      sinComent(x).split("\n").forEach((l, i) => { if (/\b8 (min|minutos|minutes)\b/.test(l)) falla(G, x, i + 1, "los minutos del apartado salen de Configuración (evt_apartado_min), no se escriben a mano"); });
    }
  },

  /* 6c. Nada se cobra sin boleto (y ningún boleto sin cobro): pagarBoletos autoriza, crea la orden y los boletos en la transacción, confirma y
     SOLO entonces captura; si la captura falla, anula los boletos y libera; si algo falla antes, libera la autorización. Solo lib/boletos.ts
     captura un cobro de la plataforma. Al revés: capturar antes de crear los boletos, o no liberar → falla. */
  nadaSeCobraSinBoleto() {
    const G = "nadaSeCobraSinBoleto", L = "apps/web/lib/boletos.ts";
    if (!existsSync(L)) return;
    const b = cuerpoFn(sinComent(L), "pagarBoletos");
    const iR = b.search(/pasarela\.retenerPlataforma\(/), iT = b.search(/insert into tickets/), iC = b.search(/await c\.query\("commit"\);\s*\n\s*convertido = true;/), iK = b.search(/pasarela\.capturarPlataforma\(/);
    if (iR < 0 || iT < 0 || iC < 0 || iK < 0 || !(iR < iT && iT < iC && iC < iK)) falla(G, L, 0, "pagarBoletos: autorizar → boletos en la transacción → commit → capturar, en ese orden");
    if (!/if \(!cap\.ok\) \{\s*\n\s*await anularPorCobro\(op, pi,/.test(b)) falla(G, L, 0, "pagarBoletos: si la captura falla, se anulan los boletos y se libera");
    if (!/if \(!convertido\) \{[\s\S]*?if \(pi\) await pasarela\.liberar\(pi\)/.test(b)) falla(G, L, 0, "pagarBoletos: si algo falla antes de convertir, se libera la autorización");
    if (!/update tickets set status = 'void'/.test(cuerpoFn(sinComent(L), "anularPorCobro")) || !/pasarela\.liberar\(pi\)/.test(cuerpoFn(sinComent(L), "anularPorCobro"))) falla(G, L, 0, "anularPorCobro: anula los boletos y libera la tarjeta");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x) && x !== L && x !== "apps/web/lib/pagos/pasarela.ts" && /capturarPlataforma\(|retenerPlataforma\(/.test(sinComent(x))) falla(G, x, 0, "solo lib/boletos.ts cobra boletos");
    if (!/'tickets'\) limit 20/.test(readFileSync("apps/web/lib/cobros.ts", "utf8"))) falla(G, "apps/web/lib/cobros.ts", 0, "repararPagos no toca boletos (los repara repararBoletos, que captura sin comisión de destino)");
  },

  /* 6c. El precio que ves es el que pagas (§6 #1): lo cobrado = lo apartado (suma de precios − descuento, calculado en el servidor) y la
     comisión sale de fee_rules «bol» y de lo del organizador; ninguna pantalla suma un «cargo de servicio» al total (dice «Incluidos»). Al revés:
     sumar la comisión al total o mostrar un cargo con monto → falla. */
  precioConCargos() {
    const G = "precioConCargos", L = "apps/web/lib/boletos.ts";
    if (!existsSync(L)) return;
    const t = sinComent(L), a = cuerpoFn(t, "apartar"), p = cuerpoFn(t, "pagarBoletos");
    if (!/const sub = lineas\.reduce\(\(s, l\) => s \+ l\.unit \* l\.q, 0\), total = sub - desc;/.test(a)) falla(G, L, 0, "apartar: total = suma de precios − descuento (sin cargos encima)");
    if (!/retenerPlataforma\(\{ centavos: h\.total,/.test(p) || !/capturarPlataforma\(pi, h\.total\)/.test(p)) falla(G, L, 0, "pagarBoletos cobra exactamente el total del apartado");
    if (!/comision\(c, "bol", pagado, 1\)/.test(p)) falla(G, L, 0, "la comisión de cada boleto sale de fee_rules «bol» sobre el precio pagado");
    if (/total[^\n]*\+ fee\b|h\.total \+/.test(p)) falla(G, L, 0, "la comisión no se suma al total: sale de lo del organizador");
    for (const x of codigo) {
      if (!/^apps\/web\/(app\/\(app\)\/(eventos|cuenta\/boletos)\/.*\.tsx?|lib\/correo\/recibos\.ts)$/.test(x)) continue;
      sinComent(x).split("\n").forEach((l, i) => { if (/(Cargos? de servicio|Service fees?)/.test(l) && !/Incluidos|Included/.test(l)) falla(G, x, i + 1, "«Cargos de servicio» se muestran «Incluidos», nunca como un monto que se suma"); });
    }
  },

  /* 6c. El QR lo firma solo el servidor con Ed25519 (§3, §6 #10): la llave privada sale del entorno (QR_LLAVE_PRIVADA), la lee solo
     lib/boletos-qr.ts, nunca va a la base (qr_keys guarda la pública), a un log, a una semilla ni al navegador; en producción sin la llave no se
     firma; verificar usa la llave pública de la base. Nada de HMAC compartido con la puerta. Al revés: leer la llave en otro archivo, guardarla
     en la base o firmar con HMAC → falla. */
  qrFirmado() {
    const G = "qrFirmado", Q = "apps/web/lib/boletos-qr.ts", M = "packages/db/migrations/0108_boletos_venta.sql";
    if (!existsSync(Q)) return falla(G, Q, 0, "falta lib/boletos-qr.ts");
    const q = sinComent(Q);
    if (!/sign\(null, Buffer\.from\(msg\), k\.priv\)/.test(q)) falla(G, Q, 0, "el QR se firma con Ed25519 (sign(null, …, llave privada))");
    if (!/if \(ENTORNO === "produccion"\) throw new Error\("Falta QR_LLAVE_PRIVADA/.test(q)) falla(G, Q, 0, "en producción, sin QR_LLAVE_PRIVADA no se firma nada");
    if (!/verify\(null, Buffer\.from\(msg\), pub,/.test(q) || !/from qr_keys where kid = \$1 and retired_at is null/.test(q)) falla(G, Q, 0, "verificar usa la llave pública publicada en qr_keys");
    if (/createHmac\([^)]*\)\.update\(msg|hmac[^\n]*firma/i.test(q)) falla(G, Q, 0, "el QR no se firma con HMAC (la puerta podría fabricar boletos)");
    if (existsSync(M)) { const def = /create table if not exists qr_keys \(([\s\S]*?)\n\);/.exec(readFileSync(M, "utf8"))?.[1] ?? ""; if (!/public_key/.test(def) || /priv/i.test(def)) falla(G, M, 0, "qr_keys guarda solo la llave pública"); }
    for (const x of archivos) {
      if (/\.(png|jpe?g|gif|webp|svg|woff2?|ico|lock)$/.test(x) || x.startsWith("docs/diseno/")) continue;
      const t = readFileSync(x, "utf8");
      if (/MC4CAQAwBQYDK2VwBCIEI[A-Za-z0-9+/]{20,}/.test(t)) falla(G, x, 0, "una llave privada Ed25519 escrita en el repo");
      if (x !== Q && x !== "infra/pruebas/deploy.sh" && x !== "infra/pruebas/docker-compose.yml" && !x.startsWith("guardianes/") && !x.startsWith("docs/") && !x.endsWith(".sql") && /QR_LLAVE_PRIVADA/.test(t)) falla(G, x, 0, "solo lib/boletos-qr.ts lee QR_LLAVE_PRIVADA");
    }
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x) && x !== Q && x !== "apps/web/lib/boletos.ts" && /\bfirmarQR\(/.test(sinComent(x))) falla(G, x, 0, "solo lib/boletos.ts pide firmar un QR (servidor)");
  },

  /* 6c. El QR no lleva datos personales: solo kid, id del boleto, id de la fecha, versión y entradas (+ la firma). Al revés: meter el nombre o
     el teléfono en el texto firmado → falla. */
  qrSinDatosPersonales() {
    const G = "qrSinDatosPersonales", Q = "apps/web/lib/boletos-qr.ts";
    if (!existsSync(Q)) return;
    const q = sinComent(Q);
    if (!/const k = cargar\(\), msg = `TL1\.\$\{k\.kid\}\.\$\{t\.id\}\.\$\{t\.fecha\}\.\$\{t\.ver\}\.\$\{t\.admits\}`;/.test(q)) falla(G, Q, 0, "el texto del QR es TL1.kid.id.fecha.versión.entradas, nada más");
    if (!/export type DatosQR = \{ id: string; fecha: string; ver: number; admits: number \};/.test(q)) falla(G, Q, 0, "DatosQR trae solo id, fecha, versión y entradas");
  },

  /* 6c. Nadie ve los boletos de otro (IDOR): cada lectura o acción del cliente en lib/boletos.ts filtra por la persona; el panel, por su
     negocio. Al revés: quitar el filtro de una función → falla. */
  boletosSoloSuyos() {
    const G = "boletosSoloSuyos", L = "apps/web/lib/boletos.ts";
    if (!existsSync(L)) return;
    const t = sinComent(L);
    for (const [fn, re] of [["ordenBoletos", /o\.kind = 'tickets' and o\.user_id = \$2/], ["misBoletos", /where t\.holder_user_id = \$1/], ["miBoleto", /where t\.code = \$1 and t\.holder_user_id = \$2/],
      ["pantallaPago", /where h\.id = \$1::uuid and h\.user_id = \$2/], ["pagarBoletos", /where h\.id = \$1::uuid and h\.user_id = \$2/], ["soltarApartado", /where id = \$1::uuid and user_id = \$2/],
      ["ventasPanel", /where id = \$1::bigint and business_id = \$2 and entry = 'tickets'/], ["reenviarDesdePanel", /kind = 'tickets' and business_id = \$2/]])
      if (!re.test(cuerpoFn(t, fn))) falla(G, L, 0, `«${fn}» no filtra por la persona o el negocio`);
    const V = /select [^`]*\bphone\b/;
    for (const fn of ["ventasPanel", "ordenBoletos", "misBoletos", "miBoleto"]) if (V.test(cuerpoFn(t, fn))) falla(G, L, 0, `«${fn}» no saca teléfonos`);
  },

  /* 6c. Libros de los boletos (solo inserción): ticket_log y discount_attempts; un boleto, un apartado y un código no se borran (estados). */
  libroBoletos() {
    const G = "libroBoletos", M = "packages/db/migrations/0108_boletos_venta.sql";
    if (!existsSync(M)) return;
    const m = readFileSync(M, "utf8");
    if (!/create trigger ticket_log_no_cambia before update or delete on ticket_log/.test(m) || !/create trigger discount_attempts_no_cambia before update or delete on discount_attempts/.test(m)) falla(G, M, 0, "ticket_log y discount_attempts son de solo inserción (trigger)");
    if (!/raise exception 'un boleto no se borra/.test(ultimaFn("tickets_antes")) || !/raise exception 'lo comprado en un boleto no cambia'/.test(ultimaFn("tickets_antes"))) falla(G, M, 0, "un boleto no se borra y lo comprado no cambia");
    if (!/raise exception 'un apartado no se borra/.test(ultimaFn("ticket_holds_antes")) || !/raise exception 'lo apartado y su precio no cambian'/.test(ultimaFn("ticket_holds_antes"))) falla(G, M, 0, "un apartado no se borra y su precio no cambia");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) (ticket_log|discount_attempts|ticket_refund_lines)\b|\bdelete from (tickets|ticket_holds|discount_codes|ticket_transfers|waitlist|refunds)\b/.test(q)) falla(G, x, 0, "un libro de boletos no se cambia y nada de los boletos se borra");
    // 6d · ticket_refund_lines es de solo inserción; una transferencia y un lugar en la lista de espera no se borran (estados).
    const M6 = "packages/db/migrations/0109_boletos_comprador.sql";
    if (existsSync(M6)) {
      const t = readFileSync(M6, "utf8");
      if (!/create trigger ticket_refund_lines_no_cambia before update or delete on ticket_refund_lines/.test(t)) falla(G, M6, 0, "ticket_refund_lines es de solo inserción (trigger)");
      if (!/raise exception 'una transferencia no se borra/.test(ultimaFn("ticket_transfers_antes")) || !/raise exception 'la lista de espera no se borra/.test(ultimaFn("waitlist_antes"))) falla(G, M6, 0, "una transferencia y la lista de espera no se borran (estados)");
    }
  },

  /* 6d. «EL QR ANTERIOR QUEDA ANULADO»: transferir (y deshacer o vencer) sube qr_ver; mientras la transferencia está pendiente NINGÚN QR de ese
     boleto se firma (vistaBoleto) ni entra (bol_vigente); al recibirlo el original queda 'replaced' y nace otro boleto; la verificación del
     Super Admin (y la puerta, 6g/6h) usa la versión y bol_vigente. Lo recibe solo la cuenta con ESE teléfono (huella), nunca quien lo mandó,
     una sola vez y antes de vencer (la base también). Al revés: sin subir la versión, firmando con la transferencia pendiente, sin la
     huella del teléfono o sin el check de quien lo manda → falla. */
  qrViejoNoEntra() {
    const G = "qrViejoNoEntra", D = "apps/web/lib/boletos-despues.ts", B = "apps/web/lib/boletos.ts", A = "apps/web/lib/boletos-admin.ts", M = "packages/db/migrations/0109_boletos_comprador.sql";
    if (!existsSync(D)) return falla(G, D, 0, "falta lib/boletos-despues.ts");
    const d = sinComent(D);
    for (const fn of ["transferir", "cancelarTransferencia"]) if (!/update tickets set qr_ver = qr_ver \+ 1 where id = \$1::bigint/.test(cuerpoFn(d, fn))) falla(G, D, 0, `«${fn}» tiene que subir qr_ver (el QR anterior queda anulado)`);
    if (!/update tickets set qr_ver = qr_ver \+ 1/.test(cuerpoFn(d, "vencerTransferencias"))) falla(G, D, 0, "lo que vence vuelve con un QR nuevo (qr_ver + 1)");
    const rc = cuerpoFn(d, "reclamar");
    if (!/set status = 'replaced', replaced_by = \$2::bigint/.test(rc)) falla(G, D, 0, "al recibirlo, el original queda 'replaced' (nace otro boleto)");
    if (!/if \(huella\(yo\.phone\) !== x\.ph\) throw no\(/.test(rc)) falla(G, D, 0, "solo lo recibe la cuenta con el teléfono al que se mandó (huella)");
    if (!/if \(x\.from === userId\) throw no\(/.test(rc)) falla(G, D, 0, "quien lo mandó no lo puede recibir");
    if (!/for update/.test(rc) || !/x\.st !== "pending" \|\| x\.vence/.test(rc)) falla(G, D, 0, "se recibe una sola vez y antes de vencer, con la fila bloqueada");
    if (!/claim_hash = \$1/.test(rc) || /claim_hash = \$1/.test(cuerpoFn(d, "transferir")) && !/sha\(token\)/.test(cuerpoFn(d, "transferir"))) falla(G, D, 0, "del token solo se guarda la huella (sha256)");
    if (/to_phone_enc|descifrar/.test(cuerpoFn(d, "verTransferencia"))) falla(G, D, 0, "la pantalla de recibir nunca saca el teléfono");
    if (existsSync(B) && !/conQR && vale && !b\.envio/.test(cuerpoFn(sinComent(B), "vistaBoleto"))) falla(G, B, 0, "con una transferencia pendiente no se firma ningún QR del boleto");
    if (existsSync(A)) { const q = cuerpoFn(sinComent(A), "buscarBoletosAdmin"); if (!/bol_vigente\(t\.id\) as vig,/.test(q) || !/b\.ver === v\.d\.ver && b\.fid === v\.d\.fecha && b\.admits === v\.d\.admits && b\.vig;/.test(q)) falla(G, A, 0, "la verificación del QR pregunta la versión y bol_vigente (válido y sin transferencia pendiente)"); }
    // 6h · Sin conexión igual: el teléfono rechaza la versión vieja y el «se está transfiriendo» con su paquete, y al subir la base lo
    // vuelve a decidir (un QR viejo o en transferencia que entró sin señal queda rejected con incidencia).
    const LO = "apps/web/app/(puerta)/puerta/sin-conexion/local.ts", M13 = "packages/db/migrations/0113_puerta_sin_conexion.sql";
    if (existsSync(LO)) { const d6 = cuerpoFn(sinComent(LO), "decidir"); if (!/if \(st === "replaced" \|\| \(x\.ver != null && x\.ver !== fila\[1\]\)\) return vista\("replaced"\);/.test(d6) || !/if \(st === "pending"\) return vista\("pending_transfer"\);/.test(d6)) falla(G, LO, 0, "sin conexión: la versión vieja → QR ANULADO y en transferencia → no entra"); }
    if (existsSync(M13)) {
      if (!/elsif t\.status = 'replaced' or \(p_ver is not null and p_ver <> t\.qr_ver\) then r := 'replaced';/.test(ultimaFn("puerta_offline")) || !/z\.status = 'pending' and z\.kind = 'transfer'\) then r := 'pending_transfer';/.test(ultimaFn("puerta_offline"))) falla(G, M13, 0, "al subir la cola, la versión vieja y la transferencia pendiente no entran");
      if (!/z\.status = 'pending' and z\.kind = 'transfer'\) then 'pending' else t\.status end/.test(ultimaFn("puerta_paquete_filas"))) falla(G, M13, 0, "el paquete marca el boleto en transferencia");
    }
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      if (!/create or replace function bol_vigente[\s\S]*?status = 'valid' and not exists \(select 1 from ticket_transfers x where x\.ticket_id = t\.id and x\.status = 'pending'/.test(m)) falla(G, M, 0, "bol_vigente: válido y sin transferencia pendiente");
      if (!/check \(claimed_by is null or claimed_by <> from_user_id\)/.test(m)) falla(G, M, 0, "la base no deja que quien lo manda lo reciba");
      if (!/create unique index if not exists ticket_transfers_vivo_idx on ticket_transfers \(ticket_id\) where status = 'pending'/.test(m)) falla(G, M, 0, "una sola transferencia pendiente por boleto");
      if (!/old\.status <> 'pending' then raise exception 'esa transferencia ya terminó'/.test(ultimaFn("ticket_transfers_antes")) || !/old\.expires_at <= now\(\) then raise exception 'esa transferencia ya venció'/.test(ultimaFn("ticket_transfers_antes"))) falla(G, M, 0, "la base no deja recibir dos veces ni después de vencer");
    }
  },

  /* 6d. Una cortesía no es dinero: precio, comisión y descuento en 0 (check), va en una orden sin cobro (pay_mode 'none', la base lo exige),
     nunca se devuelve (trigger) ni entra a una devolución; el panel la da con tope por fecha (Configuración, con la fecha bloqueada) y toma
     existencia con el update condicional. Al revés: una cortesía con precio, en una orden cobrada, devuelta o sin tope → falla. */
  cortesiaSinDinero() {
    const G = "cortesiaSinDinero", D = "apps/web/lib/boletos-despues.ts", M = "packages/db/migrations/0109_boletos_comprador.sql";
    if (!existsSync(M) || !existsSync(D)) return falla(G, M, 0, "faltan la migración 0109 o lib/boletos-despues.ts");
    const m = readFileSync(M, "utf8");
    if (!/add constraint tickets_cortesia_sin_dinero check \(kind <> 'comp' or \(price_cents = 0 and fee_cents = 0 and discount_cents = 0\)\)/.test(m)) falla(G, M, 0, "check: una cortesía tiene precio, comisión y descuento en 0");
    const ta = ultimaFn("tickets_antes");
    if (!/new\.kind = 'comp' and pm is distinct from 'none' then raise exception/.test(ta)) falla(G, M, 0, "una cortesía solo va en una orden sin cobro (pay_mode 'none')");
    if (!/new\.status = 'refunded' and old\.kind = 'comp' then raise exception/.test(ta)) falla(G, M, 0, "una cortesía no se devuelve (se anula)");
    if (!/raise exception 'cortesia_sin_dinero: una cortesía no se devuelve'/.test(ultimaFn("ticket_refund_lines_antes"))) falla(G, M, 0, "una cortesía no entra a una devolución");
    const dc = cuerpoFn(sinComent(D), "darCortesia");
    if (/pasarela|comision\(|payments/.test(dc)) falla(G, D, 0, "darCortesia no cobra ni calcula comisión");
    if (!/'comp', 0, 0, 0/.test(dc) || !/0, 0, 'none'/.test(dc)) falla(G, D, 0, "darCortesia: boletos 'comp' en $0 y una orden sin cobro (pay_mode 'none')");
    if (!/cfgSql\("evt_cortesias_max"\)/.test(dc) || !/if \(ya \+ q > k0\.max\) throw no\(/.test(dc) || !/from event_dates where id = \$1::bigint for update/.test(dc)) falla(G, D, 0, "darCortesia: tope por fecha de Configuración (lo lee la base) con la fecha bloqueada");
    for (const fn of ["cancelarBoletos", "devolverDesdePanel"]) if (!/b\.kind !== "paid"/.test(cuerpoFn(sinComent(D), fn))) falla(G, D, 0, `«${fn}» solo devuelve boletos pagados`);
  },

  /* 6d. Lista de espera en orden: la fila es por created_at (la base no deja cambiarlo), una oferta = un apartado a nombre de esa persona con
     el update condicional, con un candado por fecha (nadie se salta ni se ofrece dos veces), y lo que se libera es primero para la fila (antes
     de apartar y de mostrar); una oferta vencida no se vuelve a apartar (pasa a la siguiente) y el barrido la cierra. Al revés: sin orden,
     sin candado, apartar sin mirar la fila o pagar una oferta vencida → falla. */
  listaDeEsperaEnOrden() {
    const G = "listaDeEsperaEnOrden", E = "apps/web/lib/espera.ts", B = "apps/web/lib/boletos.ts", M = "packages/db/migrations/0109_boletos_comprador.sql", R = "apps/web/lib/barrido.ts";
    if (!existsSync(E)) return falla(G, E, 0, "falta lib/espera.ts");
    const of = cuerpoFn(sinComent(E), "ofrecer");
    if (!/status = 'waiting' order by created_at, id/.test(of)) falla(G, E, 0, "ofrecer: en orden de llegada (created_at, id)");
    if (!/pg_advisory_xact_lock\(hashtext\('espera:' \|\| \$1\)\)/.test(of)) falla(G, E, 0, "ofrecer: un candado por fecha");
    if (!/sold_n \+ held_n \+ \$3 <= quantity/.test(of) || !/waitlist_id\)/.test(of)) falla(G, E, 0, "ofrecer: la oferta es un apartado (update condicional) con waitlist_id");
    if (existsSync(M)) { const w = ultimaFn("waitlist_antes"); if (!/new\.created_at\) is distinct from \(old\.event_date_id, old\.event_id, old\.city_id, old\.user_id, old\.party, old\.created_at\)/.test(w) && !/old\.created_at\) then\s*raise exception 'el lugar en la lista de espera no cambia'/.test(w)) falla(G, M, 0, "la base no deja cambiar el lugar en la fila (created_at)"); }
    if (existsSync(B)) {
      const b = sinComent(B);
      for (const fn of ["apartar", "pantallaBoletos", "ventaFicha"]) if (!/await primeroLaFila\(fecha\)/.test(cuerpoFn(b, fn))) falla(G, B, 0, `«${fn}»: lo que se libera es primero para la lista de espera`);
      if (!/if \(h\.wl && \(h\.st === "expired" \|\| !h\.vivo\)\) throw/.test(cuerpoFn(b, "pagarBoletos"))) falla(G, B, 0, "una oferta vencida no se vuelve a apartar al pagar");
      if (!/update waitlist set status = 'converted'/.test(cuerpoFn(b, "pagarBoletos"))) falla(G, B, 0, "al pagar la oferta, la persona sale de la fila (converted)");
    }
    if (existsSync(R) && !/espera\.barrerEspera\(\)/.test(readFileSync(R, "utf8"))) falla(G, R, 0, "las ofertas que vencen las cierra el barrido de cada minuto");
  },

  /* 6d. Una devolución de boletos se hace una vez y nunca de más: el servidor calcula de lo guardado (precio y cargo de cada boleto), en dos
     pasos (boletos 'refunded' + devolución 'pending' en una transacción; Stripe con la llave; 'done' una sola vez); la base no deja que lo
     pendiente + lo hecho pase de lo cobrado (trigger con el pago bloqueado) ni que un boleto se devuelva dos veces (índice único); el
     simulador devuelve una vez por llave; el barrido reintenta con la misma llave. Al revés: sin el tope, sin el índice, marcar 'done' sin
     la condición, o el simulador sin la llave → falla. */
  devolucionUnaVez() {
    const G = "devolucionUnaVez", D = "apps/web/lib/boletos-despues.ts", P = "apps/web/lib/pagos/pasarela.ts", M = "packages/db/migrations/0109_boletos_comprador.sql", R = "apps/web/lib/barrido.ts";
    if (!existsSync(D) || !existsSync(M)) return falla(G, M, 0, "faltan la migración 0109 o lib/boletos-despues.ts");
    const m = readFileSync(M, "utf8");
    if (!/create unique index if not exists ticket_refund_lines_boleto_idx on ticket_refund_lines \(ticket_id\) where ticket_id is not null/.test(m)) falla(G, M, 0, "un boleto se devuelve una sola vez (índice único)");
    const tp = ultimaFn("refunds_tope");
    if (!/from payments where id = new\.payment_id for update/.test(tp) || !/status in \('pending', 'done'\)/.test(tp) || !/ya \+ new\.amount_cents > p\.amount_cents then raise exception/.test(tp)) falla(G, M, 0, "la base no deja que lo pendiente + lo hecho pase de lo cobrado");
    const d = sinComent(D);
    if (!/'pending', \$6, 'platform'/.test(cuerpoFn(d, "anotarDevolucion")) || !/update tickets set status = 'refunded' where id = any\(\$1::bigint\[\]\) and status = 'valid'/.test(cuerpoFn(d, "anotarDevolucion"))) falla(G, D, 0, "paso 1: los boletos devueltos y la devolución pendiente en la misma transacción");
    const ej = cuerpoFn(d, "ejecutarDevolucion");
    if (!/set status = 'done'[^`]*where id = \$1::bigint and status = 'pending'`/.test(ej) || !/if \(!u\.rowCount\) return;/.test(ej) || ej.indexOf("status = 'done'") > ej.indexOf("update payments set refunded_cents")) falla(G, D, 0, "paso 2: 'done' una sola vez (where status = 'pending') antes de sumar a lo devuelto");
    if (!/pasarela\.devolver\(r\.pi, r\.amt, r\.idem/.test(ej)) falla(G, D, 0, "paso 2: Stripe con la llave guardada de la devolución (la misma en cada reintento)");
    const ca = cuerpoFn(d, "calcular");
    if (!/b\.precio - b\.cargo/.test(ca) || /monto\s*[:=]\s*x\./.test(ca)) falla(G, D, 0, "lo que vuelve se calcula de lo guardado (precio − cargo), nunca de lo que manda la pantalla");
    for (const fn of ["cancelarBoletos"]) if (!/cfgSql\("bol_cancelar_h"\)/.test(cuerpoFn(d, fn))) falla(G, D, 0, "cancelar con devolución hasta bol_cancelar_h (Configuración), lo decide la base");
    if (existsSync(P)) { const p = readFileSync(P, "utf8"), i = p.indexOf("insert into sim_refunds"), j = p.indexOf("update sim_intents set refunded_cents"); if (i < 0 || j < 0 || i > j || !/insert into sim_refunds[^`]*on conflict \(id\) do nothing/.test(p)) falla(G, P, 0, "el simulador devuelve una sola vez por llave (sim_refunds antes del saldo)"); }
    if (existsSync(R) && !/desp\.barrerDevolucionesBoletos\(\)/.test(readFileSync(R, "utf8"))) falla(G, R, 0, "las devoluciones pendientes las reintenta el barrido");
  },

  /* 6e (y la falla del CI de 6d). Todo script de scripts/ e infra/ que corre en el CI o a mano se puede leer: `node --check` en cada .cjs y .mjs.
     La prueba de contrato de Stripe tenía la misma variable declarada dos veces y no corrió nunca (nadie la ejecutó en local). Al revés:
     una declaración repetida o una llave sin cerrar → falla. */
  scriptsSeLeen() {
    const G = "scriptsSeLeen";
    for (const f of codigo.filter((x) => /^(scripts|infra)\/.*\.(cjs|mjs)$/.test(x))) {
      try { execSync(`node --check ${JSON.stringify(f)}`, { stdio: ["ignore", "ignore", "pipe"] }); }
      catch (e) { falla(G, f, 0, `no se puede leer (node --check): ${String(e.stderr ?? e.message).split("\n").find((l) => /Error/.test(l)) ?? "error de sintaxis"}`); }
    }
  },

  /* 6e. Cada llamada a Stripe de la pasarela está en la prueba de contrato (scripts/contrato-stripe/prueba.cjs corre contra stripe-mock en
     el CI): un método de `pasarela` que llama a stripe() y que la prueba no usa, nunca se validó contra la API. Al revés: quitar de la
     prueba transferir o revertirTransferencia → falla. */
  contratoCubreLaPasarela() {
    const G = "contratoCubreLaPasarela", P = "apps/web/lib/pagos/pasarela.ts", T = "scripts/contrato-stripe/prueba.cjs";
    if (!existsSync(P) || !existsSync(T)) return falla(G, T, 0, "falta la pasarela o su prueba de contrato");
    const p = sinComent(P), t = readFileSync(T, "utf8"), i = p.indexOf("export const pasarela = {");
    const cuerpo = p.slice(i);
    const metodos = [...cuerpo.matchAll(/\n  (?:async )?(\w+)\(/g)].map((m) => m[1]);
    // Lee la base antes de llamar a Stripe y el contrato corre sin base: queda anotado en LAUNCH-CHECKLIST (6e).
    const SIN_CONTRATO = new Set(["cliente"]);
    for (let k = 0; k < metodos.length; k++) {
      const desde = cuerpo.search(new RegExp(`\\n  (?:async )?${metodos[k]}\\(`)), hasta = k + 1 < metodos.length ? cuerpo.search(new RegExp(`\\n  (?:async )?${metodos[k + 1]}\\(`)) : cuerpo.length;
      if (!SIN_CONTRATO.has(metodos[k]) && /\bstripe\s*(<|\()/.test(cuerpo.slice(desde, hasta)) && !new RegExp(`pasarela\\.${metodos[k]}\\(`).test(t)) falla(G, T, 0, `«pasarela.${metodos[k]}» llama a Stripe y la prueba de contrato no lo prueba`);
    }
  },

  /* 6e. Cancelar (el organizador o To'Latino) devuelve el 100 % de cada orden: boletos (también los usados), mesa y extras, la comisión no
     se cobra; idempotente por orden (`evtcx-<cancelación>-<orden>`) y por boleto (la base), nunca más de lo que queda del cobro, con la
     devolución en dos pasos de 6d (la misma llave en cada reintento) y reanudable: el barrido sigue las cancelaciones a medias. Una orden
     con el cobro a medias espera. Al revés: devolver como comprador (menos el cargo), sin la llave por orden, sin el tope, sin el barrido
     o sin esperar el cobro a medias → falla. */
  devolucionTotalAlCancelar() {
    const G = "devolucionTotalAlCancelar", C = "apps/web/lib/evt-cambios.ts", D = "apps/web/lib/boletos-despues.ts", R = "apps/web/lib/barrido.ts", M = "packages/db/migrations/0110_eventos_cambios_dinero.sql";
    if (!existsSync(C) || !existsSync(D) || !existsSync(M)) return falla(G, C, 0, "faltan lib/evt-cambios.ts, lib/boletos-despues.ts o la migración 0110");
    const c = sinComent(C), d = sinComent(D), m = readFileSync(M, "utf8");
    const pc = cuerpoFn(c, "procesarCancelacion");
    if (!/anotarDevolucionTotal\(c, \{ op, por: "event_cancelled",[\s\S]*?idem: `evtcx-\$\{cx\.id\}-\$\{op\}`[\s\S]*?usados: true \}\)/.test(pc)) falla(G, C, 0, "procesarCancelacion: devolución total con la llave por orden (evtcx-<cancelación>-<orden>), también los boletos usados");
    if (!/and not exists \(select 1 from payments p where p\.operation_id = o\.id and p\.status = 'held'\)/.test(pc) || !/await tx\(/.test(pc) || !/ejecutarDevolucion\(r\.rf\)/.test(pc)) falla(G, C, 0, "procesarCancelacion: una orden por transacción, espera el cobro a medias y hace la devolución con su llave");
    if (!/procesarCancelacion\(cx, \{ ordenes: lote/.test(cuerpoFn(c, "cancelarEvento"))) falla(G, C, 0, "cancelarEvento: las devoluciones salen en el acto (evt_cancelar_lote) y el resto en el barrido");
    const at = cuerpoFn(d, "anotarDevolucionTotal");
    if (!/calcular\(c, o\.id, o\.fee, sel, "business"\)/.test(at)) falla(G, D, 0, "anotarDevolucionTotal: 100 % (calcular como el organizador: la comisión no se cobra)");
    if (!/const resto = Math\.max\(0, o\.amt - o\.ya\)/.test(at) || !/k\.total = Math\.min\(k\.total, resto\)/.test(at)) falla(G, D, 0, "anotarDevolucionTotal: nunca más de lo que queda del cobro");
    if (!/select amount_cents as amt from refunds where idem_key = \$1/.test(at)) falla(G, D, 0, "anotarDevolucionTotal: la misma llave = la misma devolución");
    if (!/d\.status in \('needs_response', 'under_review', 'lost', 'accepted'\)/.test(at)) falla(G, D, 0, "anotarDevolucionTotal: un cobro en disputa no se devuelve otra vez (el banco ya lo lleva)");
    if (existsSync(R) && !/cxs\.barrerCancelaciones\(\)/.test(readFileSync(R, "utf8"))) falla(G, R, 0, "las cancelaciones a medias las sigue el barrido de cada minuto");
    if (!/create unique index if not exists event_cancellations_una_idx/.test(m)) falla(G, M, 0, "una cancelación por fecha (o por evento): índice único");
    if (!/check \(initiated_by in \([^)]*'event_cancelled'/.test(m)) falla(G, M, 0, "refunds.initiated_by admite 'event_cancelled'");
  },

  /* 6e. Al organizador se le paga después de la fecha y solo lo que dice el libro: la base calcula los montos al pasar a 'paying'
     (evt_liq_calc + evt_liq_deuda) y solo deja pasar una fecha terminada, con su martes llegado, sin disputas abiertas, sin devoluciones
     pendientes, sin la retención del organizador nuevo y con la cuenta habilitada; una vez en camino, nada cambia. Una transferencia por
     fecha (llave única); solo pagarUna transfiere, con el monto y la llave guardados. Al revés: quitar una de esas reglas, mandar otra llave
     o un monto de otro lado, o que la app escriba los montos → falla. */
  pagoDespuesDelEvento() {
    const G = "pagoDespuesDelEvento", M = "packages/db/migrations/0110_eventos_cambios_dinero.sql", L = "apps/web/lib/evt-liquidacion.ts", R = "apps/web/lib/barrido.ts";
    if (!existsSync(M) || !existsSync(L)) return falla(G, M, 0, "faltan la migración 0110 o lib/evt-liquidacion.ts");
    const t = ultimaFn("event_settlements_antes");
    const reglas = [
      [/if d\.ends_at > now\(\) then raise exception 'evt_liq_antes/, "la fecha tiene que haber terminado"],
      [/\(now\(\) at time zone tz\)::date < old\.pay_on then raise exception 'evt_liq_antes/, "no antes de su martes"],
      [/if k\.abiertas > 0 then raise exception 'evt_liq_disputa/, "sin disputas abiertas"],
      [/if k\.pendientes > 0 then raise exception 'evt_liq_devolucion/, "sin devoluciones pendientes"],
      [/if k\.vivos_cx > 0 then raise exception/, "una fecha cancelada, solo con todo devuelto"],
      [/if evt_liq_retener_nuevo\(new\.event_id, new\.business_id\) then raise exception 'evt_liq_nuevo/, "la retención del organizador nuevo"],
      [/a\.payouts_paused then raise exception 'evt_liq_cuenta/, "la cuenta de cobro habilitada y sin retener"],
      [/new\.base_cents := k\.base;/, "los montos los pone la base (evt_liq_calc)"],
      [/deuda := evt_liq_deuda\(new\.business_id, new\.id\);/, "la deuda de ajustes la calcula la base"],
      [/raise exception 'evt_liq_fija: lo que se transfiere ya quedó fijo'/, "en camino o pagada, lo calculado no cambia"],
      [/pg_advisory_xact_lock\(hashtext\('evt-liq:' \|\| new\.business_id\)\)/, "candado por negocio al descontar la deuda"],
    ];
    for (const [re, que] of reglas) if (!re.test(t)) falla(G, M, 0, `event_settlements_antes: ${que}`);
    const m = readFileSync(M, "utf8");
    if (!/idem_key       text not null unique check \(idem_key ~ '\^evt-liq-\\d\{1,18\}\$'\)/.test(m) || !/new\.idem_key := 'evt-liq-' \|\| new\.event_date_id;/.test(t)) falla(G, M, 0, "una llave por fecha (evt-liq-<fecha>, única), la pone la base");
    if (!/event_date_id  bigint not null unique references event_dates/.test(m)) falla(G, M, 0, "una liquidación por fecha");
    const l = sinComent(L), pu = cuerpoFn(l, "pagarUna");
    if (!/pasarela\.transferir\(\{ centavos: s\.net, destino: s\.dest, grupo: `evt-\$\{s\.eid\}`, idem: s\.idem,/.test(pu)) falla(G, L, 0, "pagarUna: el monto, el destino y la llave guardados por la base");
    if (!/if \(!s \|\| s\.st !== "paying"\) return/.test(pu) || !/set status = 'paid'[^`]*where id = \$1::bigint and status = 'paying'`/.test(pu)) falla(G, L, 0, "pagarUna: solo desde 'paying' y 'paid' una vez");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const tx = sinComent(x);
      if (x !== L && x !== "apps/web/lib/pagos/pasarela.ts" && /pasarela\.transferir\(|revertirTransferencia\(/.test(tx)) falla(G, x, 0, "solo lib/evt-liquidacion.ts transfiere al organizador");
      for (const q of tx.match(/`[^`]*`/g) ?? []) if (/update event_settlements set[^`]*\b(gross_cents|fee_cents|refunded_cents|disputed_cents|base_cents|carry_cents|net_cents|destination)\s*=/.test(q)) falla(G, x, 0, "los montos de una liquidación los pone la base, nunca la app");
    }
    if (existsSync(R) && !/liq\.liquidar\(\)/.test(readFileSync(R, "utf8"))) falla(G, R, 0, "la liquidación del martes corre en el barrido");
  },

  /* 6e (§6 #7). Los avisos de Eventos con SMS son SOLO los críticos de la plataforma: cancelación, cambio de fecha u hora, el boleto que te
     mandan, la cortesía, el lugar de la lista de espera (y el sí / no de la revisión al negocio, 6a). Los avisos del organizador van por
     push y en la app. Al revés: una plantilla evt_/bol_/rsvp_/puerta_/evp_/espera_ con SMS fuera de la lista → falla. */
  avisoEventoSmsSoloCritico() {
    const G = "avisoEventoSmsSoloCritico", dir = "packages/db/migrations";
    // 6g: puerta_invitado lleva el código para entrar a la puerta (§2 0112, como el Repartidor): sin él, el portero no entra.
    const OK = new Set(["evt_aprobado", "evt_rechazado", "bol_transfer_in", "bol_cortesia", "espera_lugar", "evt_cancelado", "evt_fecha_cancelada", "evt_movido", "evt_hora_cambio", "puerta_invitado",
      // 6i: evento privado (§2 0114): la solicitud nueva al restaurante (si no responde a tiempo, vence), la propuesta (vence en evp_propuesta_h),
      // la confirmación con el depósito cobrado y la cancelación del restaurante (dinero que vuelve).
      "evp_nueva", "evp_propuesta", "evp_ok", "evp_cancelado_negocio"]);
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql")).sort()) {
      const t = readFileSync(`${dir}/${x}`, "utf8");
      for (const mm of t.matchAll(/\('((?:evt|bol|rsvp|puerta|evp|espera)_[a-z0-9_]+)', '[a-z]+', (?:null|'[a-z]+'), (true|false),/g)) if (mm[2] === "true" && !OK.has(mm[1])) falla(G, `${dir}/${x}`, 0, `la plantilla «${mm[1]}» manda SMS y no es crítica (§6 #7)`);
    }
    const C = "apps/web/lib/evt-cambios.ts";
    if (existsSync(C) && !/avisarMuchos\(r\.L, "evt_aviso"/.test(cuerpoFn(sinComent(C), "avisarAsistentes"))) falla(G, C, 0, "los avisos del organizador van con evt_aviso (sin SMS)");
  },

  /* 6e. Libros de los cambios del evento: event_changes, event_notices, ticket_choices son de solo inserción y una liquidación, una
     cancelación o una reversión no se borran (estados). Al revés: sin su trigger o con un update / delete desde la app → falla. */
  libroCambiosEvento() {
    const G = "libroCambiosEvento", M = "packages/db/migrations/0110_eventos_cambios_dinero.sql";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración 0110");
    const m = readFileSync(M, "utf8");
    if (!/create trigger event_changes_no_cambia before update or delete on event_changes/.test(m) || !/create trigger ticket_choices_no_cambia before update or delete on ticket_choices/.test(m)) falla(G, M, 0, "event_changes y ticket_choices son de solo inserción (trigger)");
    if (!/if tg_op <> 'INSERT' then raise exception 'event_notices es solo de inserción'/.test(ultimaFn("event_notices_antes"))) falla(G, M, 0, "event_notices es de solo inserción");
    for (const [fn, msg] of [["event_settlements_antes", "una liquidación no se borra"], ["event_cancellations_antes", "una cancelación no se borra"], ["event_settlement_reversals_antes", "una reversión no se borra"]]) if (!new RegExp(`raise exception '${msg}`).test(ultimaFn(fn))) falla(G, M, 0, `${msg} (estados)`);
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) (event_changes|event_notices|ticket_choices)\b|\bdelete from (event_settlements|event_cancellations|event_settlement_reversals)\b/.test(q)) falla(G, x, 0, "un libro de los cambios del evento no se cambia y el dinero no se borra");
  },

  /* 6e. Dinero que no se desborda: en SQL, centavos × centavos (p. ej. la comisión × lo que queda del cobro) pasa de integer con un cobro
     de $2,250 (11 750 × 225 000 > 2 147 483 647) y la página se cae. Se multiplica en bigint (::bigint). Al revés: quitar el cast → falla. */
  dineroSinDesbordar() {
    const G = "dineroSinDesbordar";
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) for (const m of q.matchAll(/\b[\w.]*_cents(::\w+)?\s*\*\s*\(?\s*[\w.]*_cents/g)) if (!/::(bigint|numeric|int8|float8)/.test(m[0])) falla(G, x, 0, `«${m[0].slice(0, 60)}»: centavos × centavos en integer se desborda; multiplica en bigint`);
    }
  },

  /* 6f. Las fechas de una serie y de un evento de varios días las genera la base (evt_generar_fechas): la app nunca inserta ni borra
     fechas; el generador lee los topes de Configuración en el momento (cfg_int evt_fechas_max y evt_dias_adelante) y NUNCA salta ni mueve una
     fecha con gente (cada «skipped» y cada cambio de hora del generador va con «not evt_fecha_con_gente»); una fecha movida a mano no vuelve
     a su hora (moved_at); el barrido extiende las series (evtSeries); saltar desde el panel (lib/evt-series.ts) rechaza una fecha con gente.
     Al revés: insertar una fecha desde la app, quitar un control de gente o un tope, o sacar evtSeries del barrido → falla. */
  fechasLasGeneraLaBase() {
    const G = "fechasLasGeneraLaBase", M = "packages/db/migrations/0111_series_y_dias.sql", S6 = "apps/web/lib/evt-series.ts", BA = "apps/web/lib/barrido.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración 0111 (series y varios días)");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) {
        if (/\binsert into event_dates\b/.test(q)) falla(G, x, 0, "las fechas de un evento las crea solo la base (evt_generar_fechas), nunca la app");
        if (/\bdelete from event_dates\b/.test(q)) falla(G, x, 0, "una fecha no se borra: se salta o se cancela (estados)");
      }
    }
    const g = ultimaFn("evt_generar_fechas");
    if (!/cfg_int\('evt_fechas_max'\)/.test(g) || !/cfg_int\('evt_dias_adelante'\)/.test(g)) falla(G, M, 0, "evt_generar_fechas debe leer los topes de Configuración en el momento (evt_fechas_max, evt_dias_adelante)");
    // Cada sentencia que salta una fecha (con su «if … then» delante) mira si tiene gente.
    const sent = g.split(";");
    sent.forEach((l) => {
      if (/set status = 'skipped'/.test(l) && !/not evt_fecha_con_gente\(/.test(l)) falla(G, M, 0, `evt_generar_fechas salta una fecha sin mirar si tiene gente: «${l.trim().slice(0, 90)}»`);
    });
    if (!/d\.moved_at is null and d\.starts_at > now\(\) and not evt_fecha_con_gente\(d\.id\)/.test(g)) falla(G, M, 0, "evt_generar_fechas: una fecha movida a mano o con gente no vuelve a la hora de la regla");
    if (/\bdelete from event_dates\b/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "una fecha no se borra");
    if (!/sold_n > 0 or d\.rsvp_n > 0/.test(ultimaFn("evt_fecha_con_gente")) || !/ticket_holds h where h\.event_date_id = fid and h\.status = 'held'/.test(ultimaFn("evt_fecha_con_gente"))) falla(G, M, 0, "evt_fecha_con_gente: boletos vivos, RSVP y apartados cuentan como gente");
    if (!existsSync(S6)) return falla(G, S6, 0, "falta lib/evt-series.ts");
    const sf = cuerpoFn(sinComent(S6), "saltarFecha");
    if (!/if \(d\.gente\) throw/.test(sf) || !/business_id = \$2 for update/.test(sf)) falla(G, S6, 0, "saltarFecha: solo una fecha sin gente, del evento de ESE negocio (IDOR)");
    if (!existsSync(BA) || !/\["evtSeries", \(\) => ser\.extenderSeries\(\)\]/.test(readFileSync(BA, "utf8"))) falla(G, BA, 0, "el barrido extiende las series (evtSeries)");
  },

  /* 6f. Varios días: el aforo de cada día lo cuenta la base (event_day_stock con check capacity = 0 or sold_n + held_n <= capacity, sumado por el
     trigger ticket_stock_dia desde la existencia del ancla: el pase en todos los días, el boleto de un día en el suyo); los días que vale un
     boleto los pone la base al emitirlo (tickets_dias) y la puerta (6g/6h) los lee con bol_fechas_validas; un boleto de un día se vende hasta el
     corte de su día (bol_tipo_hasta en apartar). Al revés: quitar el check, el trigger, el corte o el mensaje del aforo → falla. */
  aforoPorDia() {
    const G = "aforoPorDia", M = "packages/db/migrations/0111_series_y_dias.sql", L = "apps/web/lib/boletos.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración 0111");
    const m = readFileSync(M, "utf8");
    if (!/constraint event_day_stock_cupo check \(capacity = 0 or sold_n \+ held_n <= capacity\)/.test(m)) falla(G, M, 0, "event_day_stock sin el check del aforo por día");
    if (!/create trigger ticket_stock_dia after update of held_n, sold_n on ticket_stock for each row execute function ticket_stock_dia\(\);/.test(m)) falla(G, M, 0, "el aforo por día se suma con el trigger ticket_stock_dia (toda ruta que aparte o venda)");
    const t = ultimaFn("ticket_stock_dia");
    if (!/set held_n = s\.held_n \+ dh, sold_n = s\.sold_n \+ ds/.test(t) || !/t\.valid_day is null or d\.day_index = t\.valid_day/.test(t)) falla(G, M, 0, "ticket_stock_dia: el pase cuenta en todos los días; el boleto de un día, en el suyo");
    if (!/create trigger tickets_dias before insert on tickets/.test(m) || !/new\.valid_days := case when vd is null then array\(select generate_series\(0, n - 1\)\)::smallint\[\] else array\[vd\] end;/.test(ultimaFn("tickets_dias"))) falla(G, M, 0, "los días que vale un boleto los pone la base al emitirlo (tickets_dias)");
    if (!/d\.day_index = any\(t\.valid_days\)/.test(ultimaFn("bol_fechas_validas"))) falla(G, M, 0, "bol_fechas_validas (gancho de la puerta) sale de valid_days");
    if (!/kind <> 'span' or d\.id = ancla/.test(ultimaFn("evt_sincronizar_venta"))) falla(G, M, 0, "la existencia de un evento de varios días vive solo en su ancla");
    if (!existsSync(L)) return;
    const a = cuerpoFn(sinComent(L), "apartar");
    if (!/and bol_tipo_hasta\(t\.id\) > now\(\)/.test(a)) falla(G, L, 0, "apartar: un boleto de un día se vende hasta el corte de su día (bol_tipo_hasta)");
    if (!/constraint === "event_day_stock_cupo"/.test(a)) falla(G, L, 0, "apartar: el aforo de un día lleno se dice con palabras (event_day_stock_cupo)");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\bupdate event_day_stock\b/.test(q) || /\binsert into event_day_stock\b/.test(q)) falla(G, x, 0, "el aforo por día lo lleva solo la base");
    }
  },

  /* 6f. Una serie (o un evento de varios días) sale UNA vez en cada lista pública: su primera fecha viva dentro del mismo filtro (PRIMERA), con
     el cursor (starts_at, id) de siempre; cada lista de lib/evt-publico.ts que lee fechas lo usa. Al revés: quitar PRIMERA de una lista → falla. */
  serieUnaVezEnLista() {
    const G = "serieUnaVezEnLista", L = "apps/web/lib/evt-publico.ts";
    if (!existsSync(L)) return;
    const t = sinComent(L);
    if (!/\(p\.starts_at, p\.id\) < \(d\.starts_at, d\.id\)/.test(t)) falla(G, L, 0, "PRIMERA: la primera fecha viva de cada evento por (starts_at, id)");
    for (const fn of ["eventosCiudad", "estaNoche", "destacado", "eventosSemana", "eventosDelOrganizador", "buscarEventos", "relacionados"]) {
      if (!/PRIMERA\(/.test(cuerpoFn(t, fn))) falla(G, L, 0, `«${fn}»: una serie sale una vez (PRIMERA)`);
    }
  },

  /* 6g. D1 · La puerta SOLO escanea (fase6 §3 «La puerta»): nada de /puerta, lib/puerta*, /api/puerta ni del modo puerta del panel importa
     la pasarela, los cobros, la compra de boletos, los códigos, la lista de espera ni la liquidación; no crea órdenes, boletos, pagos ni
     devoluciones; no lee montos. Los eventos no tienen entrada «door» y ninguna cadena de Eventos dice «pagar en la puerta» (el cover de
     Noche sí se paga en el local: es otra cosa y no está aquí). Al revés: un import de lib/cobros, un «insert into operations» o un
     «price_cents» en la puerta, o «pay at the door» en Eventos → falla. */
  sinVentaEnLaPuerta() {
    const G = "sinVentaEnLaPuerta";
    const PUERTA = (f) => /^apps\/web\/lib\/puerta[^/]*\.ts$/.test(f) || /^apps\/web\/app\/\(puerta\)\//.test(f) || /^apps\/web\/app\/api\/puerta\//.test(f) || /^apps\/web\/app\/panel\/(EventosPuerta\.tsx|acciones-puerta\.ts)$/.test(f);
    const PROHIBIDO = /(?:from\s+|import\()\s*["'](?:@\/lib\/|\.\.?\/(?:\.\.\/)*(?:lib\/)?)(pagos(\/[^"']*)?|cobros|boletos|boletos-despues|codigos-evt|espera|evt-liquidacion|tarjetas?|suscripcion|planes|apartados|pedir)["']/;
    let n = 0;
    for (const f of codigo) {
      if (!PUERTA(f) || !/\.tsx?$/.test(f)) continue;
      n++;
      const t = sinComent(f);
      t.split("\n").forEach((l, i) => { if (PROHIBIDO.test(l)) falla(G, f, i + 1, "la puerta no importa cobros, pagos ni la compra de boletos (D1: solo escanea)"); });
      for (const q of t.match(/`[^`]*`/g) ?? []) {
        if (/\b(insert into|update|delete from)\s+(operations|tickets|payments|refunds|ticket_holds|ticket_stock|table_stock|discount_codes)\b/.test(q)) falla(G, f, 0, `la puerta no crea ni cambia órdenes, boletos ni pagos: «${q.slice(0, 70)}»`);
        if (/\b(price_cents|fee_cents|total_cents|amount_cents|subtotal_cents|deposit_cents|discount_cents|cash_collected|refunded_cents|door_cents|cover_cents)\b/.test(q)) falla(G, f, 0, "la puerta no lee montos");
      }
    }
    if (!n) falla(G, "apps/web/lib/puerta.ts", 0, "no encuentro la puerta (lib/puerta*.ts, app/(puerta))");
    const M = "packages/db/migrations/0112_puerta.sql";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración de la puerta");
    for (const fn of ["puerta_entrada", "puerta_rsvp", "puerta_contar", "puerta_noche", "puerta_registrar"]) {
      const b = ultimaFn(fn);
      if (!b) falla(G, M, 0, `falta ${fn}`);
      if (/\b(insert into|update)\s+(operations|payments|refunds|ticket_holds|ticket_stock|table_stock)\b|insert into tickets\b|price_cents|total_cents|amount_cents/.test(b)) falla(G, M, 0, `${fn}: la puerta no vende ni toca dinero`);
    }
    if (!/entry\s+text not null check \(entry in \('free', 'rsvp', 'tickets'\)\)/.test(readFileSync("packages/db/migrations/0106_eventos_base.sql", "utf8"))) falla(G, "packages/db/migrations/0106_eventos_base.sql", 0, "events.entry sin «door» (D1)");
    const EVT = (f) => /^apps\/web\/lib\/(evt[^/]*|boletos[^/]*|puerta[^/]*|codigos-evt|espera|rsvp)\.ts$/.test(f) || /^apps\/web\/app\/(\(app\)\/eventos|\(puerta\)|api\/puerta)\//.test(f) || /^apps\/web\/app\/panel\/(Eventos[^/]*|acciones-(eventos|puerta))\.tsx?$/.test(f) || /^apps\/web\/app\/admin\/(EventosAdmin|BoletoAdmin|PuertaAdmin|ColasEventos)\.tsx$/.test(f);
    for (const f of codigo) {
      if (!EVT(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/pag(ar|a|as|an|o)\s+en\s+la\s+puerta|pay(ing)?\s+at\s+the\s+door|venta\s+en\s+(la\s+)?puerta|(se\s+)?vend(e|en)\s+en\s+la\s+puerta(?!\s*:)|cobr(ar|a|amos)\s+en\s+la\s+puerta|door\s+sales?\b|sell(s|ing)?\s+at\s+the\s+door/i.test(l) && !/no se vend|no se venden|is not sold|are not sold|no tickets are sold|nadie vende|no vende|en la puerta no|no selling|EN LA PUERTA NO SE VENDE|NO SE VENDE/i.test(l)) falla(G, f, i + 1, "D1: en la puerta no se vende ni se paga (ninguna cadena de «pagar en la puerta»)"); });
    }
  },

  /* 6g. Un portero solo ve y toca SU evento ese día (fase6 §3 «Porteros»): toda acción de /puerta pasa por accesoPuerta(persona, sesión) →
     puerta_acceso() de la base (sesión abierta + portero activo con ESE evento, o miembro con «evt» + negocio activo + ventana del día de
     Configuración) antes de leer o escribir; las funciones de la base vuelven a preguntar (puerta_sesion); toda lectura filtra por el
     evento y la fecha de la sesión; ningún DTO de la puerta trae teléfono, correo ni montos. Al revés: una acción sin accesoPuerta, la
     ventana o el alcance quitados de la base, una consulta sin el evento, o un «u.phone» en un select → falla. */
  porteroSoloSuEvento() {
    const G = "porteroSoloSuEvento", A = "apps/web/app/(puerta)/puerta/acciones.ts", R = "apps/web/app/api/puerta/escanear/route.ts", V = "apps/web/app/api/puerta/vivo/route.ts", P = "apps/web/app/(puerta)/puerta/s/[sesion]/page.tsx", L = "apps/web/lib/puerta.ts", M = "packages/db/migrations/0112_puerta.sql";
    for (const f of [A, R, V, P, L, M]) if (!existsSync(f)) return falla(G, f, 0, "falta un archivo de la puerta");
    const a = sinComent(A);
    if (!/async function puerta\(sesion: unknown\)[^\n]*accesoPuerta\(u\.id, String\(sesion \?\? ""\)\)/.test(a)) falla(G, A, 0, "las acciones de una puerta preguntan accesoPuerta(persona, sesión)");
    for (const p of a.split(/\nexport async function /).slice(1)) {
      const nombre = p.slice(0, p.indexOf("(")), cuerpo = p.slice(0, p.indexOf("\n}"));
      if (/\(sesion: string/.test(p.slice(0, 120)) && !/const c = await puerta\(sesion\);\s*if \(!c\) return CERRADA;/.test(cuerpo)) falla(G, A, 0, `«${nombre}» no revisa el acceso a la puerta antes de actuar`);
      if (!/await (puerta|quien)\(/.test(cuerpo)) falla(G, A, 0, `«${nombre}» no revisa quién es (cuenta y mismo origen)`);
    }
    const r = sinComent(R);
    if (!/if \(!\(await mismoOrigen\(\)\)\)/.test(r) || !/const ctx = await accesoPuerta\(u\.id, String\(b\.sesion \?\? ""\)\);\s*if \(!ctx\) return NO\(/.test(r)) falla(G, R, 0, "el escaneo pregunta mismo origen y accesoPuerta antes de todo");
    const v = sinComent(V);
    if (!/const ctx = await accesoPuerta\(u\.id, sesion\);\s*if \(!ctx\)/.test(v) || !/sigue = async \(\) => !!\(await accesoPuerta\(u\.id, sesion\)\)/.test(v) || !/accesoPanel\(negocio, "evt"\)/.test(v) || !/e\.business_id = \$2/.test(v)) falla(G, V, 0, "el SSE revisa el acceso al abrir y en cada cambio (puerta) o «evt» y la fecha de SU negocio (panel)");
    if (!/const ctx = await accesoPuerta\(u\.id, sesion\);\s*if \(!ctx\) return <PuertaCerrada/.test(sinComent(P))) falla(G, P, 0, "la pantalla de la puerta pregunta accesoPuerta en cada carga");
    const l = sinComent(L);
    if (!/where s\.id = \$1::bigint and s\.user_id = \$2 and puerta_acceso\(s\.id, \$2\)/.test(cuerpoFn(l, "accesoPuerta"))) falla(G, L, 0, "accesoPuerta decide con puerta_acceso() de la base");
    for (const [fn, re] of [["infoBoleto", /where t\.id = \$1::bigint and t\.event_id = \$2::bigint/], ["filas", /where t\.event_id = \$1::bigint/], ["filas", /where v\.event_id = \$1::bigint and v\.event_date_id = \$2::bigint/], ["darMesa", /event_id = \$2::bigint and event_date_id = \$3::bigint/], ["pregunta", /t\.event_id = \$2::bigint/]])
      if (!re.test(cuerpoFn(l, fn))) falla(G, L, 0, `«${fn}» no filtra por el evento o la fecha de la sesión`);
    const DTO = ["apps/web/lib/puerta.ts", "apps/web/lib/puerta-admin.ts", "apps/web/lib/puerta-comun.ts", "apps/web/app/api/puerta/escanear/route.ts"].concat(codigo.filter((f) => /^apps\/web\/app\/\(puerta\)\//.test(f)));
    for (const f of DTO) {
      if (!existsSync(f)) continue;
      for (const q of sinComent(f).match(/`[^`]*`/g) ?? []) {
        if (!/\bselect\b[\s\S]*\bfrom\b|\bupdate\b[\s\S]*\bset\b|\binsert into\b/i.test(q)) continue; // solo SQL
        const sinWhere = q.replace(/right\(u\.phone, 4\) = \$\{?\w*\}?/g, "");
        if (/\bphone\b|\bemail\b|phone_enc|phone_hash/.test(sinWhere)) falla(G, f, 0, `la puerta no saca teléfonos ni correos (solo compara los últimos 4): «${q.slice(0, 70)}»`);
      }
    }
    const m = readFileSync(M, "utf8"), acc = ultimaFn("puerta_puede");
    if (!/now\(\) between d\.doors_at - make_interval\(hours => cfg_int\('puerta_ventana_h'\)\) and d\.ends_at \+ make_interval\(hours => cfg_int\('puerta_ventana_h'\)\)/.test(acc)) falla(G, M, 0, "puerta_puede: solo el día (ventana de Configuración)");
    if (!/f\.user_id = uid and f\.status = 'active' and f\.business_id = e\.business_id\s*and \(f\.scope = 'all' or e\.id = any\(f\.event_ids\)\)/.test(acc)) falla(G, M, 0, "puerta_puede: portero activo, de ese negocio y con ese evento");
    if (!/m\.status = 'active'\s*and \(m\.kind = 'owner' or m\.panel_access && array\['all', 'evt'\]::text\[\]\)/.test(acc)) falla(G, M, 0, "puerta_puede: el miembro del negocio con «evt»");
    if (!/s\.user_id = uid and s\.ended_at is null\s*and puerta_puede\(s\.event_date_id, uid, s\.door_staff_id\)/.test(ultimaFn("puerta_acceso"))) falla(G, M, 0, "puerta_acceso: la sesión abierta de esa persona y puerta_puede");
    for (const fn of ["puerta_entrada", "puerta_rsvp", "puerta_contar", "puerta_noche"]) if (!/s := puerta_sesion\(p_session, p_user\);/.test(ultimaFn(fn))) falla(G, M, 0, `${fn}: la base vuelve a revisar la sesión y el acceso`);
    if (!/if not puerta_acceso\(p_session, p_user\) then raise exception 'puerta_sin_acceso/.test(ultimaFn("puerta_sesion"))) falla(G, M, 0, "puerta_sesion: sin acceso = excepción");
    if (!/if t\.event_id <> d\.event_id then r := 'wrong_event';/.test(ultimaFn("puerta_entrada"))) falla(G, M, 0, "puerta_entrada: un boleto de otro evento no entra");
    if (!/update door_sessions set ended_at = now\(\), ended_by = 'removed' where door_staff_id = new\.id and ended_at is null;/.test(m)) falla(G, M, 0, "quitar a un portero cierra sus sesiones en el acto");
    if (!/raise exception 'puerta_evento_ajeno/.test(ultimaFn("door_staff_antes"))) falla(G, M, 0, "un portero solo escanea eventos de su negocio");
  },

  /* 6g. Un escaneo cuenta una sola vez (fase6 §3): el id lo genera el teléfono (uuid, llave primaria de ticket_scans); cada función de la
     puerta primero toma el candado de ese id y devuelve lo que ya se decidió (puerta_repetido) ANTES de mirar la sesión o el boleto; solo
     puerta_registrar escribe en ticket_scans (marca tl.puerta) y la fila del boleto se bloquea (for update) antes de decidir; la entrada
     no pasa de las entradas del boleto (check). Al revés: sin el candado, el id generado en el servidor, la fila sin bloquear o el
     check quitado → falla. */
  escaneoIdempotente() {
    const G = "escaneoIdempotente", M = "packages/db/migrations/0112_puerta.sql", L = "apps/web/lib/puerta.ts", E = "apps/web/app/(puerta)/puerta/Escanear.tsx";
    for (const f of [M, L, E]) if (!existsSync(f)) return falla(G, f, 0, "falta un archivo de la puerta");
    const m = readFileSync(M, "utf8");
    if (!/id\s+uuid primary key,\s+-- lo genera el teléfono/.test(m)) falla(G, M, 0, "ticket_scans.id es el uuid del teléfono (llave primaria)");
    if (!/perform pg_advisory_xact_lock\(hashtextextended\('puerta:' \|\| p_scan::text, 0\)\);\s*select \* into sc from ticket_scans where id = p_scan;/.test(ultimaFn("puerta_repetido"))) falla(G, M, 0, "puerta_repetido: candado del id y lo que ya se decidió");
    for (const fn of ["puerta_entrada", "puerta_rsvp", "puerta_contar", "puerta_noche"]) {
      const b = ultimaFn(fn), i = b.indexOf("sc := puerta_repetido(p_scan);\n  if sc.id is not null then return sc; end if;"), j = b.indexOf("puerta_sesion(");
      if (i < 0 || j < 0 || i > j) falla(G, M, 0, `${fn}: primero el escaneo repetido (mismo id), después todo lo demás`);
    }
    // 6h · La cola sin conexión: el mismo id del teléfono (lo de la cola sube con su id: repetirla no cuenta dos veces); un id de OTRA
    // puerta no devuelve nada; el teléfono solo saca de la cola lo que el servidor contestó.
    const o = ultimaFn("puerta_offline"), oi = o.indexOf("sc := puerta_repetido(p_scan);"), oj = o.indexOf("puerta_sesion_cola(");
    if (oi < 0 || oj < 0 || oi > oj || !/if sc\.session_id <> p_session then raise exception 'puerta_id_ajeno/.test(o)) falla(G, "packages/db/migrations/0113_puerta_sin_conexion.sql", 0, "puerta_offline: primero el escaneo repetido (y de ESTA puerta), después todo lo demás");
    const HL = "apps/web/app/(puerta)/puerta/sin-conexion/usePuertaLocal.ts";
    if (existsSync(HL)) { const h = sinComent(HL); if (!/const e = est\.current, id = String\(c\.id \?\? ""\)/.test(h) || (h.match(/L\.encolar\(sesion, \{/g) ?? []).length !== (h.match(/L\.encolar\(sesion, \{ id, at,/g) ?? []).length || !/await L\.quitarDeCola\(lote\.map\(\(x, i\) => \(hechos\[i\] \? x\.id : ""\)\)/.test(h)) falla(G, HL, 0, "la cola guarda el id del escaneo del teléfono y solo saca lo que el servidor contestó"); }
    if (!/select \* into t from tickets where id = p_ticket for update;/.test(ultimaFn("puerta_entrada")) || !/select \* into x from ticket_entries where ticket_id = t\.id and event_date_id = d\.id for update;/.test(ultimaFn("puerta_entrada"))) falla(G, M, 0, "puerta_entrada: la fila del boleto y la de su entrada del día se bloquean antes de decidir");
    if (!/select \* into v from rsvps where id = p_rsvp for update;/.test(ultimaFn("puerta_rsvp"))) falla(G, M, 0, "puerta_rsvp: la fila del RSVP se bloquea");
    if (!/constraint ticket_entries_una_vez check \(entered_n between 0 and admits\)/.test(m)) falla(G, M, 0, "ticket_entries: nadie entra más veces que las entradas del boleto (check)");
    if (!/if tg_op <> 'INSERT' then raise exception 'ticket_scans es solo de inserción'; end if;\s*if coalesce\(current_setting\('tl\.puerta', true\), ''\) <> 'si' then raise exception/.test(ultimaFn("ticket_scans_antes"))) falla(G, M, 0, "ticket_scans: solo inserción y solo desde puerta_registrar (marca)");
    const l = sinComent(L);
    if (!/const UUID = \/\^\[0-9a-f\]\{8\}-/.test(l) || !/if \(!UUID\.test\(id\)\) return null;/.test(cuerpoFn(l, "limpiarIn"))) falla(G, L, 0, "cada escaneo trae su id uuid (sin id no hay escaneo)");
    if (!/select \(puerta_repetido\(\$1::uuid\)\)\.id::text as id/.test(cuerpoFn(l, "llegadaNoche"))) falla(G, L, 0, "la lista de la noche toma el candado del id antes de marcar");
    if (!/id: uuid\(\)/.test(sinComent(E)) || !/id: q\.p\.id/.test(sinComent(E))) falla(G, E, 0, "el teléfono genera el id del escaneo (y la confirmación reusa el de la pregunta)");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) { const t = sinComent(x); if (/tl\.puerta/.test(t)) falla(G, x, 0, "la app no enciende la marca de la puerta"); for (const q of t.match(/`[^`]*`/g) ?? []) if (/\binsert into (ticket_scans|ticket_entries|door_counts)\b/.test(q)) falla(G, x, 0, "solo la base escribe escaneos, entradas y contadores"); }
  },

  /* 6h. El paquete sin conexión de la puerta trae SOLO lo que la validación necesita y nunca queda legible fuera de su sesión (fase6 §3 «Sin
     conexión»): la base arma las filas (puerta_paquete_filas: id, versión, entradas, estado, nombre + inicial, últimos 4 y huella del código,
     días, tipo, banderas, entraron / adentro / última puerta y hora; por RSVP id, personas, estado, nombre, llegaron) sin teléfonos, correos,
     montos ni pagos; el servidor lo firma (Ed25519, firmarPaquete) y lo cifra con la llave derivada de ESA sesión (AES-256-GCM) solo para
     una puerta abierta (accesoPuerta + door_packages exige puerta_acceso) y el teléfono que la abrió; el teléfono verifica la firma antes de
     usarlo, lo guarda cifrado con una llave NO exportable, lo borra al vencer, al cerrarse o revocarse la sesión y al salir de la cuenta; el
     paquete vence (expires_at = fin + puerta_paquete_h) y el barrido lo revoca. Al revés: un «phone» o un monto en las filas, la llave
     exportable, guardar sin cifrar, no verificar la firma, servir el paquete sin accesoPuerta o sin revocar al cerrar → falla. */
  paqueteMinimo() {
    const G = "paqueteMinimo", M = "packages/db/migrations/0113_puerta_sin_conexion.sql", L = "apps/web/lib/puerta-paquete.ts", R = "apps/web/app/api/puerta/paquete/route.ts",
      C = "apps/web/app/(puerta)/puerta/sin-conexion/local.ts", H = "apps/web/app/(puerta)/puerta/sin-conexion/usePuertaLocal.ts", BR = "apps/web/lib/barrido.ts";
    for (const f of [M, L, R, C, H, BR]) if (!existsSync(f)) return falla(G, f, 0, "falta un archivo de la puerta sin conexión");
    const m = readFileSync(M, "utf8"), filas = ultimaFn("puerta_paquete_filas");
    const cols = /create or replace function puerta_paquete_filas\([^)]*\)\s*returns table \(([\s\S]*?)\)\s*language/.exec(m)?.[1]?.replace(/\s+/g, " ").trim();
    if (cols !== "k text, id bigint, v integer, a smallint, st text, nom text, c4 text, ch text, dias smallint[], tipo jsonb, mesa boolean, comp boolean, tr boolean, e smallint, i smallint, ud text, uh text, cambio timestamptz")
      falla(G, M, 0, `puerta_paquete_filas devuelve otras columnas (solo las de §3): «${cols?.slice(0, 80)}»`);
    if (/\bphone|email|_cents\b|price|amount|payment|stripe|card|door_code|first_name as|last_name as/.test(filas.replace(/puerta_nombre\(u\.first_name, u\.last_name\)/g, ""))) falla(G, M, 0, "el paquete no trae teléfonos, correos, montos, pagos ni el código de la lista (solo nombre + inicial)");
    if (!/new\.expires_at := d\.ends_at \+ make_interval\(hours => cfg_int\('puerta_paquete_h'\)\);/.test(ultimaFn("door_packages_antes")) || !/not puerta_acceso\(s\.id, s\.user_id\) then raise exception 'puerta_cerrada/.test(ultimaFn("door_packages_antes"))) falla(G, M, 0, "el paquete solo sale para una puerta abierta con acceso y vence al final de la fecha + puerta_paquete_h");
    if (!/update door_packages set revoked_at = now\(\), revoked_reason = new\.ended_by where session_id = new\.id and revoked_at is null;/.test(ultimaFn("door_sessions_despues"))) falla(G, M, 0, "al cerrarse la sesión, su paquete queda revocado");
    const l = sinComent(L);
    if (!/from puerta_paquete_filas\(\$1::bigint/.test(l) || (l.match(/`[^`]*`/g) ?? []).some((q) => /\bselect\b[\s\S]*\bfrom\b/i.test(q) && /\b(phone|email|price_cents|fee_cents|total_cents|amount_cents|stripe)\b/.test(q))) falla(G, L, 0, "lib/puerta-paquete.ts arma las filas solo con puerta_paquete_filas y no lee teléfonos ni montos");
    if (!/\{ kid, firma \} = await firmarPaquete\(j\);/.test(l) || !/createCipheriv\("aes-256-gcm", llave, iv\)/.test(l) || !/llaveDerivada\("puerta-paquete", `\$\{sesion\}\|\$\{userId\}\|\$\{device \?\? "-"\}`\)/.test(l)) falla(G, L, 0, "el paquete se firma (Ed25519) y se cifra (AES-256-GCM) con la llave de ESA sesión, persona y teléfono");
    if (!/s\.user_id = \$2 and s\.ended_at is null/.test(cuerpoFn(l, "armarPaquete")) || !/device\.toLowerCase\(\) !== s\.device\.toLowerCase\(\)/.test(cuerpoFn(l, "armarPaquete"))) falla(G, L, 0, "el paquete solo para la sesión abierta de esa persona y el teléfono que la abrió");
    const r = sinComent(R);
    if (!/if \(!\(await mismoOrigen\(\)\)\)/.test(r) || !/const ctx = await accesoPuerta\(u\.id, String\(b\?\.sesion \?\? ""\)\);\s*if \(!ctx\) return NO\(/.test(r) || !/no-store/.test(r)) falla(G, R, 0, "/api/puerta/paquete: mismo origen, accesoPuerta y sin caché");
    const c = sinComent(C);
    if (!/importKey\("raw", b64\(raw\), \{ name: "AES-GCM" \}, false, \["encrypt", "decrypt"\]\)/.test(c)) falla(G, C, 0, "la llave de la sesión en el teléfono es NO exportable (importKey …, false, …)");
    if (!/datos: await cifrar\(k, e\)/.test(cuerpoFn(c, "guardarEstado")) || !/datos: await cifrar\(k, x\)/.test(cuerpoFn(c, "encolar"))) falla(G, C, 0, "el paquete y la cola se guardan cifrados");
    if (!/throw new Error\("paquete_firma"\)/.test(cuerpoFn(c, "abrirSobre")) || !/verificarEd\(pub, new TextEncoder\(\)\.encode\(`TLPK1\\n\$\{sobre\.j\}`\)/.test(cuerpoFn(c, "abrirSobre"))) falla(G, C, 0, "el teléfono verifica la firma del paquete antes de usarlo");
    if (!/if \(Date\.parse\(f\.vence\) < Date\.now\(\)\) \{ await borrarSesion\(s\); return null; \}/.test(cuerpoFn(c, "leerEstado"))) falla(G, C, 0, "un paquete vencido se borra del teléfono");
    for (const q of c.match(/put\(\{[^}]*\}\)/g) ?? []) if (!/datos|k\b|v\b/.test(q)) falla(G, C, 0, `algo se guarda sin cifrar: «${q.slice(0, 60)}»`);
    const h = sinComent(H);
    if ((h.match(/r\.j\.cerrada\) (\{ )?await olvidar\(/g) ?? []).length < 3 || !/await L\.borrarSesion\(sesion\)/.test(cuerpoFn(h, "usePuertaLocal"))) falla(G, H, 0, "cerrada, revocada o vencida (al bajar el paquete, al subir la cola y al bajar los cambios): el teléfono borra todo de esa puerta");
    if (!/\["puertaPaquetes", \(\) => paq\.vencerPaquetes\(\)\]/.test(readFileSync(BR, "utf8"))) falla(G, BR, 0, "el barrido vence los paquetes");
  },

  /* 6h. Los choques entre porteros sin conexión se resuelven igual en cualquier orden de subida (fase6 §3 pasos 1–5): la hora que cuenta es
     la del teléfono corregida con el desfase medido en esa subida (acotada a la sesión y nunca en el futuro); puerta_rehacer vuelve a decidir
     TODOS los escaneos que dejaron entrar a ese boleto en esa fecha ordenados por (hora que cuenta, llegada al servidor, id), con la fila del
     boleto y la de su entrada bloqueadas; lo que cambia queda como corrección de solo inserción (ticket_scan_fixes, el escaneo original no se
     toca) y la resolución vigente sale de ticket_scans_ef; el que pierde es «duplicate» con incidencia; lo que ya no valía al subir es
     rejected con incidencia. Las lecturas de la puerta, el panel y el Super Admin usan la resolución vigente. Al revés: ordenar por la
     llegada, no bloquear el boleto, corregir con un update, leer ticket_scans para resultados o no corregir el reloj → falla. */
  choqueDePuertaDeterminista() {
    const G = "choqueDePuertaDeterminista", M = "packages/db/migrations/0113_puerta_sin_conexion.sql", Y = "apps/web/lib/puerta-sync.ts";
    for (const f of [M, Y]) if (!existsSync(f)) return falla(G, f, 0, "falta un archivo de la puerta sin conexión");
    const m = readFileSync(M, "utf8"), rh = ultimaFn("puerta_rehacer"), of = ultimaFn("puerta_offline");
    if (!/\) q order by q\.eff, q\.srv, q\.id/.test(rh)) falla(G, M, 0, "puerta_rehacer decide por (hora que cuenta, llegada al servidor, id)");
    if (!/\(not ef\.offline and ef\.orig_resolution = 'accepted'\) or \(ef\.offline and ef\.local_in/.test(rh)) falla(G, M, 0, "puerta_rehacer vuelve a decidir todos los que dejaron entrar (en línea aceptados y sin conexión que el teléfono dejó pasar)");
    if (!/select \* into x from ticket_entries where ticket_id = t\.id and event_date_id = d\.id for update;/.test(rh) || !/select \* into t from tickets where id = p_ticket for update;/.test(of)) falla(G, M, 0, "el boleto y su entrada del día se bloquean antes de volver a decidir");
    if (!/insert into ticket_scan_fixes/.test(rh) || /\bupdate ticket_scans\b/.test(m)) falla(G, M, 0, "lo que cambia queda como corrección (ticket_scan_fixes); ticket_scans no se toca");
    if (!/if tg_op <> 'INSERT' then raise exception 'ticket_scan_fixes es solo de inserción'/.test(ultimaFn("ticket_scan_fixes_antes"))) falla(G, M, 0, "ticket_scan_fixes es de solo inserción");
    if (!/order by x\.id desc limit 1\) f on true/.test(m)) falla(G, M, 0, "ticket_scans_ef: la resolución vigente es la última corrección");
    if (!/insert into door_incidents [^;]*'duplicado'[^;]*on conflict \(scan_id, kind\) where auto do nothing/.test(rh)) falla(G, M, 0, "un duplicado abre su incidencia (una por escaneo)");
    if (!/'sin_valor'/.test(of)) falla(G, M, 0, "lo que ya no valía al subir abre su incidencia");
    if (!/eff := p_at_device \+ make_interval\(secs => coalesce\(p_offset_ms, 0\) \/ 1000\.0\);/.test(of) || !/eff := least\(greatest\(coalesce\(eff, now\(\)\), s\.started_at\), coalesce\(s\.ended_at, now\(\)\), now\(\)\);/.test(of)) falla(G, M, 0, "la hora que cuenta: la del teléfono + su desfase, dentro de la sesión y nunca en el futuro");
    if (!/new\.at_eff := case when new\.offline and new\.at_eff is not null then least\(new\.at_eff, new\.at_server\) else new\.at_server end;/.test(ultimaFn("ticket_scans_antes"))) falla(G, M, 0, "en línea la hora que cuenta es la del servidor");
    const y = sinComent(Y);
    if (!/desfase = [^;]*Math\.round\(Date\.now\(\) - tel\)/.test(y)) falla(G, Y, 0, "el desfase se mide en cada subida (hora del servidor − hora del teléfono)");
    for (const f of ["apps/web/lib/puerta.ts", "apps/web/lib/puerta-admin.ts", "apps/web/lib/puerta-equipo.ts", "apps/web/lib/puerta-sync.ts"]) {
      if (!existsSync(f)) continue;
      for (const q of sinComent(f).match(/`[^`]*`/g) ?? []) if (/\bfrom ticket_scans\b(?!_ef)[^`]*\b(resolution|first_n|result)\b|\b(resolution|first_n)\b[^`]*\bfrom ticket_scans\b(?!_ef)/.test(q)) falla(G, f, 0, `los resultados de la puerta se leen con la resolución vigente (ticket_scans_ef): «${q.slice(0, 70)}»`);
    }
  },

  /* 6h. El service worker de la Puerta y el de Mis boletos guardan solo su cáscara estática y archivos con huella: nunca /api/ ni el HTML de
     una puerta o de un boleto (traen datos de la cuenta); las cáscaras son páginas estáticas sin cuenta. El QR del cliente se guarda cifrado
     con la llave de la sesión (cookie tl_bk), sin precio, y salir de la cuenta borra la base y la cookie. Al revés: guardar /api/ o el HTML
     de la navegación, una cáscara que lee la cuenta, guardar el boleto sin cifrar o no borrar al salir → falla. */
  sinConexionSinDatosAjenos() {
    const G = "sinConexionSinDatosAjenos", W = ["apps/web/public/puerta/sw.js", "apps/web/public/sw-boletos.js"], K = ["apps/web/app/(puerta)/puerta/sin-conexion/page.tsx", "apps/web/app/(sin-senal)/cuenta/boletos/sin-conexion/page.tsx"];
    const BS = "apps/web/lib/boletos-sin-conexion.ts", CU = "apps/web/lib/cuenta.ts";
    for (const f of [...W, ...K, BS, CU]) if (!existsSync(f)) return falla(G, f, 0, "falta un archivo del modo sin conexión");
    for (const f of W) {
      const t = sinComent(f);
      try { execSync(`node --check ${JSON.stringify(f)}`, { stdio: ["ignore", "ignore", "pipe"] }); } catch { falla(G, f, 0, "el service worker no se puede leer (node --check)"); }
      if (!/if \(url\.pathname\.indexOf\("\/api\/"\) === 0\) return;/.test(t)) falla(G, f, 0, "el service worker no toca /api/");
      const nav = /if \(req\.mode === "navigate"\) \{([\s\S]*?)\n  \}\n/.exec(t)?.[1] ?? "";
      if (!nav || /\.put\(|cache\.add|caches\.open/.test(nav)) falla(G, f, 0, "una navegación nunca se guarda (el HTML de una puerta o de un boleto trae datos de la cuenta)");
      if (!/var ESTATICO = \/\^\\\/\(_next\\\/static\\\/\|fuentes\\\/\)\/;/.test(t)) falla(G, f, 0, "solo se guardan archivos con huella (/_next/static) y fuentes");
      for (const m of t.matchAll(/c\.put\(([^,]+),/g)) if (!/^(u|CASCARA|req)$/.test(m[1].trim())) falla(G, f, 0, `se guarda algo que no es la cáscara ni un archivo estático: «${m[1]}»`);
    }
    for (const f of K) { const t = sinComent(f); if (!/export const dynamic = "force-static";/.test(t) || /\byo\(|cookies\(|headers\(|@\/lib\/(cuenta|db|boletos|puerta)\b/.test(t)) falla(G, f, 0, "la cáscara es estática y no lee la cuenta"); }
    const b = sinComent(BS);
    if (!/crypto\.subtle\.encrypt\(\{ name: "AES-GCM", iv \}, k,/.test(cuerpoFn(b, "guardarBoleto")) || /precio|price/.test(b)) falla(G, BS, 0, "el boleto se guarda cifrado y sin precio");
    if (!/if \(!v\) \{ await pedir\(st\("readwrite"\)\.clear\(\)\); return; \}/.test(cuerpoFn(b, "guardarBoleto")) || !/x\.kid !== kid/.test(cuerpoFn(b, "leerBoletos"))) falla(G, BS, 0, "sin la llave de la sesión no se guarda nada y lo de otra cuenta se borra");
    if (!/jar\.delete\(\{ name: COOKIE_BOLETOS, path: "\/cuenta\/boletos" \}\);/.test(cuerpoFn(sinComent(CU), "salir"))) falla(G, CU, 0, "salir de la cuenta borra la llave de los boletos sin señal");
    for (const x of codigo) { if (!/^apps\/web\/app\/.*\.tsx$/.test(x)) continue; const t = sinComent(x); if (/fetch\("\/api\/cuenta\/salir"/.test(t) && !/await olvidarSinConexion\(\); await fetch\("\/api\/cuenta\/salir"/.test(t)) falla(G, x, 0, "al salir de la cuenta, primero se borra lo guardado sin conexión (olvidarSinConexion)"); }
  },

  /* 6i. Evento privado: el depósito sale SOLO de la propuesta guardada (la base calcula líneas, subtotal, impuesto, total y depósito en el
     trigger de private_event_quotes), ninguna acción del cliente ni el formulario traen un monto, y aceptar va en orden: retener → aceptación
     (la base revisa última versión, vigencia y estado; una por solicitud) → commit → cobrar; si algo falla antes, se libera. Al revés: un monto
     desde el teléfono, la base sin calcular, la aceptación sin revisar vencida o reemplazada, o cobrar antes de registrar → falla. */
  depositoDeLaPropuesta() {
    const G = "depositoDeLaPropuesta", M = "packages/db/migrations/0114_evento_privado.sql", L = "apps/web/lib/evento-privado.ts";
    if (!existsSync(M) || !existsSync(L)) return falla(G, L, 0, "faltan 0114 o lib/evento-privado.ts");
    const q = ultimaFn("private_event_quotes_antes"), a = ultimaFn("private_event_acceptances_antes");
    if (!/new\.subtotal_cents := sub;/.test(q) || !/new\.total_cents := new\.subtotal_cents \+ new\.tax_cents;/.test(q) || !/from tax_rules t where t\.city_id = o\.city_id and t\.category_id = 'NEG-FOOD'/.test(q)) falla(G, M, 0, "la base calcula subtotal, impuesto de la ciudad y total de cada propuesta");
    if (!/new\.deposit_cents := greatest\(100, round\(new\.total_cents \* new\.deposit_pct \/ 100\.0\)\);/.test(q) || !/new\.deposit_cents := paid;/.test(q)) falla(G, M, 0, "la base calcula el depósito (el % del negocio; en un cambio, lo ya pagado)");
    if (!/raise exception 'evp: esa propuesta ya fue reemplazada'/.test(a) || !/raise exception 'evp: esa propuesta ya venció'/.test(a) || !/raise exception 'evp: solo acepta quien pidió'/.test(a)) falla(G, M, 0, "aceptar: solo la última versión, vigente y de quien pidió (en la base)");
    if (!/create unique index if not exists private_event_acceptances_deposito_uq on private_event_acceptances \(operation_id\) where kind <> 'change'/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "una sola aceptación con depósito por solicitud (índice único)");
    const t = sinComent(L), b = cuerpoFn(t, "aceptarEvp");
    const iR = b.search(/pasarela\.retener\(\{ centavos: dep,/), iA = b.search(/insert into private_event_acceptances/), iC = b.search(/await c\.query\("commit"\);\s*\n\s*retenido = null;/), iK = b.search(/await cobrarOperacion\(opId\);/);
    if (iR < 0 || iA < 0 || iC < 0 || iK < 0 || !(iR < iA && iA < iC && iC < iK)) falla(G, L, 0, "aceptarEvp: retener → aceptación en la transacción → commit → cobrar, en ese orden");
    if (iC > 0 && /cobrarOperacion\(|pasarela\.cobrar\(/.test(b.slice(0, iC))) falla(G, L, 0, "aceptarEvp: nada se cobra antes de registrar la aceptación y hacer commit");
    if (!/const dep = q\.dep,/.test(b) || !/const Q = await propuestas\(c, o\.id\), q = Q\[Q\.length - 1\];/.test(b)) falla(G, L, 0, "aceptarEvp: el depósito sale de la última propuesta guardada");
    if (!/if \(retenido\) await pasarela\.liberar\(retenido\)/.test(b)) falla(G, L, 0, "aceptarEvp: si algo falla antes del commit, se libera la tarjeta");
    for (const m of t.matchAll(/export type (EvpIn|CambioIn) = \{([^}]*)\}/g)) if (/\b(cents|price|precio|total|tax|impuesto|subtotal|deposit|dep|monto)\w*\??:/i.test(m[2])) falla(G, L, 0, `«${m[1]}» trae un monto desde el teléfono`);
    if (/\b(total|deposit|dep|subtotal|tax)\w*\??:/i.test(/export type PropuestaIn = \{([^\n]*)\};/.exec(t)?.[1] ?? "x")) falla(G, L, 0, "PropuestaIn: el panel manda líneas (cantidad × precio), nunca un total ni un depósito");
    for (const A of ["apps/web/app/(app)/privado/[num]/acciones.ts", "apps/web/app/(app)/n/[id]/evento-privado/acciones.ts", "apps/web/app/panel/acciones-evento-privado.ts"])
      if (existsSync(A)) for (const m of readFileSync(A, "utf8").matchAll(/export async function (\w+)\(([^)]*)\)/g)) if (/\b(cents|price|precio|total|monto|deposit|dep|devuelve|refund)\w*\s*:/i.test(m[2])) falla(G, A, 0, `«${m[1]}» recibe un monto`);
  },

  /* 6i. Devolver un depósito de evento privado: lo calcula el servidor con la regla (a tiempo = todo lo cobrado; tarde = nada; el restaurante
     cancela = todo), nunca más de lo cobrado menos lo devuelto, con una llave fija por solicitud (una sola devolución aunque se reintente) y el
     barrido reintenta lo que Stripe no hizo. Al revés: sin tope, llave al azar, plazo leído del momento (no del acuerdo) o sin reintento → falla. */
  devolucionEvpAcotada() {
    const G = "devolucionEvpAcotada", L = "apps/web/lib/evento-privado.ts";
    if (!existsSync(L)) return;
    const t = sinComent(L), m = cuerpoFn(t, "moverDinero"), cx = cuerpoFn(t, "cancelarEvp"), bx = cuerpoFn(t, "cancelarEvpNegocio"), v = cuerpoFn(t, "vencerEvp");
    if (!/const cap = Math\.max\(0, \(o\.amount \?\? 0\) - \(o\.refunded \?\? 0\)\);/.test(m) || !/const n = Math\.min\(dev, cap\);/.test(m)) falla(G, L, 0, "moverDinero: nunca más de lo cobrado menos lo devuelto");
    if (!/if \(yaHecha\) return;/.test(m) || !/\^evp\(bx\|cx\)-EP-/.test(m)) falla(G, L, 0, "moverDinero: una sola devolución por su llave fija");
    if (!/devIdem: `evpcx-\$\{numero\}`/.test(cx) || !/devIdem: `evpbx-\$\{numero\}`/.test(bx)) falla(G, L, 0, "la llave de la devolución es fija por solicitud (evpcx- / evpbx-)");
    if (!/const ac = acuerdoDe\(await propuestas\(c, o\.id\)\), plazo = ac\?\.cancelH \?\? 72, aTiempo = o\.h_left >= plazo;/.test(cx) || !/const dev = aTiempo \? cobrado : 0/.test(cx)) falla(G, L, 0, "cancelar: el plazo es el de la propuesta aceptada y a tiempo se devuelve lo cobrado; tarde, nada");
    if (!/const dev = o\.pst === "captured" \|\| o\.pst === "partially_refunded" \? Math\.max\(0, \(o\.amount \?\? 0\) - \(o\.refunded \?\? 0\)\) : 0;/.test(bx)) falla(G, L, 0, "el restaurante cancela: se devuelve todo lo cobrado");
    if (!/for \(const v of debe\) await moverDinero\(v\.num\)/.test(v)) falla(G, L, 0, "el barrido reintenta las devoluciones que quedaron a medias");
  },

  /* 6i. Sin teléfonos entre las partes: el panel ve nombre + inicial (nunca users.phone), y la nota, el cambio, la propuesta y los motivos no
     admiten un teléfono; hablar es por Mensajes (2p). Al revés: leer el teléfono del cliente o quitar el filtro → falla. */
  evpSinTelefonos() {
    const G = "evpSinTelefonos", L = "apps/web/lib/evento-privado.ts";
    if (!existsSync(L)) return;
    const t = sinComent(L);
    for (const fn of ["evpHoy", "evpPanel", "leer"]) if (/u\.phone|users\.phone/.test(cuerpoFn(t, fn))) falla(G, L, 0, `«${fn}» lee el teléfono del cliente`);
    if (!/const SEL = `[^`]*left\(nullif\(u\.last_name, ''\), 1\)/.test(t)) falla(G, L, 0, "el restaurante ve nombre + inicial del cliente");
    for (const [fn, re] of [["pedirEvp", /if \(TEL\.test\(nota\)\)/], ["pedirCambioEvp", /if \(TEL\.test\(nota\)\)/], ["proponerEvp", /if \(TEL\.test\(incluye\) \|\| TEL\.test\(nota\)\)/], ["noPuedoEvp", /if \(TEL\.test\(mot\)\)/], ["cancelarEvpNegocio", /if \(TEL\.test\(mot\)\)/]])
      if (!re.test(cuerpoFn(t, fn))) falla(G, L, 0, `«${fn}» acepta un teléfono en el texto`);
    const P = "apps/web/app/panel/EventoPrivado.tsx";
    if (existsSync(P) && /tel:|phone|telefono/.test(sinComent(P))) falla(G, P, 0, "el panel del evento privado no muestra ni llama al teléfono del cliente");
  },

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
