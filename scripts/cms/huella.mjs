/* 9f · Lo que comparten el extractor (scripts/cms/extraer.mjs, con el código y TypeScript) y el indexador (scripts/cms/indexar.mjs, que corre en el despliegue
   con el node de la imagen base, sin node_modules): la huella de una cadena y su largo máximo. Sin dependencias a propósito. */
import { createHash } from "node:crypto";

/* La huella de una cadena: si no cambió, el despliegue no la toca (cms_indexar → «igual»). */
export const sha = (c) => createHash("sha256").update(`${c.id}\u0000${c.es}\u0000${c.en}\u0000${c.max_len}\u0000${c.locked}`).digest("hex");
/* El largo máximo de una cadena editable es lo que cabe en su lugar: 1,5 veces la más larga de las dos lenguas (mínimo 40, máximo 600). */
const redondear = (n) => Math.ceil(n / 10) * 10;
export const largo = (es, en) => Math.min(600, Math.max(40, redondear(Math.max(es.length, en.length) * 1.5)));
/* 9f-3 · La llave de una cadena que sale de un E2("…", "…") escrito en una pantalla: <PANTALLA>.e2-<12 de la huella del par>. */
export const AUTO = /\.e2-[0-9a-f]{12}$/;
export const huellaPar = (es, en) => createHash("sha256").update(`${es}\u0001${en}`).digest("hex").slice(0, 12);
