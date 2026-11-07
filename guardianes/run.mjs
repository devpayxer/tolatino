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

  /* 4e. Ninguna emergencia sin la línea del 911 (plan 4e): «Si huele a gas, hay chispas o humo, sal de la casa y llama al
     911.» La línea vive en lib/solicitudes.ts (LINE911) y la muestran el formulario y el estado de la emergencia. */
  emergencia911() {
    const L = "apps/web/lib/solicitudes.ts", F = "apps/web/app/(app)/emergencia/Emergencia.tsx", S = "apps/web/app/(app)/pre/[num]/Solicitud.tsx";
    if (!existsSync(L)) return;
    if (!/LINE911[^;]*llama al 911/.test(readFileSync(L, "utf8"))) falla("emergencia911", L, 1, "LINE911 debe decir «…sal de la casa y llama al 911.»");
    if (existsSync(F) && !/linea911\.es/.test(readFileSync(F, "utf8"))) falla("emergencia911", F, 1, "el formulario de emergencia debe mostrar la línea del 911");
    if (existsSync(S) && !/em && <div role="note"[^\n]*linea911/.test(readFileSync(S, "utf8"))) falla("emergencia911", S, 1, "el estado de la emergencia debe mostrar la línea del 911");
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
    const PERMITIDOS = new Set(["apps/web/lib/citas-salud.ts", "apps/web/lib/citas-panel.ts", "apps/web/lib/citas-flujo.ts", "apps/web/lib/citas-pro.ts", "apps/web/lib/cifrado.ts", "apps/web/lib/viajes.ts", "apps/web/lib/envios.ts", "apps/web/lib/ninos-privado.ts"]); // crear · ver en el panel · borrar a los 30 d · 4y-2: el destinatario de la caja (crear en viajes, ver en envios)
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
    if (!/o\.status not in \('pending', 'change_proposed'\) and o\.kind not in \('market_order', 'hold'\)/.test(c)) falla("capturaMercado", C, 1, "repararPagos no puede capturar completo lo retenido de un pedido del mercado ni de un envío de la tienda");
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
      if (f.endsWith("/inscripciones.ts") && !/const mat = s\.k === "curso" && s\.mat > 0 && x\.cuenta \? s\.mat : 0;/.test(t)) falla("soloMatriculaEnLaApp", f, 0, "lo que se retiene en la app tiene que salir solo de la matrícula de un curso");
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
      if (!/^apps\/web\/lib\/inscripciones[^/]*\.ts$/.test(f)) continue;
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
    for (const k of ["price_cents: s.cents", "mat_cents:", "contract_m:", "cancel_fee_cents:", "cert: s.cert", "starts_on: g?.inicio"]) if (!t.includes(k)) falla("copiaDelPrecio", f, 0, `la inscripción no copia «${k}» al enviar`);
    const v = /async function vista\([\s\S]*?\n}\n/.exec(t)?.[0] ?? "";
    if (/from items|svc_attrs|insc_settings/.test(v)) falla("copiaDelPrecio", f, 0, "la vista de una inscripción lee la herramienta o el servicio de hoy en vez de lo copiado al enviar");
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
    const pref = [...h.matchAll(/startsWith\("([A-Z])-"\)/g)].map((m) => m[1]);
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
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/'(sop|cuidado|salir)',\s*'help_request'/.test(l)) falla("colaAyudaRuteada", f, i + 1, "la cola de una ayuda sale de su motivo (COLA_AYUDA_SQL), no se escribe a mano"); });
    }
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
      if (!/^apps\/web\//.test(f) || /^apps\/web\/lib\/(transporte|viajes|inscripciones)[^/]*\.ts$/.test(f)) continue;
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
    const TOPE = 193;
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
    if (!/export const FILA_VIVA_MIN = 60;/.test(t)) falla("filaNoFalsa", C, 0, "la fila «ahora» vale 60 minutos (FILA_VIVA_MIN = 60)");
    if (!/if \(f\.viva\) return f\.min \? E2\(`Fila ahora/.test(t) || !/if \(f\.viva\) return E2\(`Ahora · lo puso/.test(t) || !/f\.viva \? \(es \? "FILA AHORA"/.test(t)) falla("filaNoFalsa", C, 0, "«Fila ahora» solo dentro de if (f.viva)");
    if (existsSync(L) && !/s\.line_at > now\(\) - make_interval\(mins => \$\{FILA_VIVA_MIN\}\)/.test(readFileSync(L, "utf8"))) falla("filaNoFalsa", L, 0, "«viva» se calcula en el servidor con FILA_VIVA_MIN");
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
