import "server-only";
import { ENTORNO } from "../entorno";
import { JWKS_GITHUB } from "./oidc";

/* 8h · Las direcciones de los servicios de las tiendas, en UN solo lugar (guardián tiendasSimuladorAislado). Fuera de producción, un
   simulador del contrato público las puede reemplazar por variables del entorno (como el push de 8c y Wallet de 8g); en producción esas
   variables NO se leen y la dirección es la de Apple, Google y GitHub. 8f empezó con ASC_API_URL en lib/beta.ts: vive aquí desde 8h. */
const PROD = ENTORNO === "produccion";
export const URL_ASC = () => (!PROD && process.env.ASC_API_URL ? process.env.ASC_API_URL : "https://api.appstoreconnect.apple.com");
export const URL_PLAY = () => (!PROD && process.env.PLAY_API_URL ? process.env.PLAY_API_URL : "https://androidpublisher.googleapis.com");
export const URL_PLAY_OAUTH = () => (!PROD && process.env.PLAY_OAUTH_URL ? process.env.PLAY_OAUTH_URL : "https://oauth2.googleapis.com/token");
export const URL_GITHUB = () => (!PROD && process.env.TIENDAS_GITHUB_API_URL ? process.env.TIENDAS_GITHUB_API_URL : "https://api.github.com");
export const URL_JWKS = () => (!PROD && process.env.TIENDAS_OIDC_JWKS_URL ? process.env.TIENDAS_OIDC_JWKS_URL : JWKS_GITHUB);
