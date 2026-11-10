import type { Metadata } from "next";
import { BoletosSinSenal } from "./BoletosSinSenal";

/* 6h · /cuenta/boletos/sin-conexion: la cáscara que guarda el service worker de Mis boletos (/sw-boletos.js). Estática: sin cuenta ni datos
   en el HTML; los QR salen del teléfono (cifrados con la llave de la sesión de la cuenta). Vive fuera del marco de la app (que trae datos de
   la cuenta) para que el service worker nunca guarde nada de nadie. */
export const metadata: Metadata = { title: "Tus boletos sin señal · To'Latino", robots: { index: false } };
export const dynamic = "force-static";

export default function Page() {
  return <BoletosSinSenal />;
}
