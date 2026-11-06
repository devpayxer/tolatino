"use client";
/* Un correo de la bandeja: encabezado del panel y el correo tal cual en un marco aislado (sandbox, sin scripts). */
import { PanelBloques } from "@tolatino/ui";
import { useRouter } from "next/navigation";

const EST: Record<string, string> = { pruebas: "En modo pruebas (no salió)", pendiente: "Pendiente", enviado: "Enviado", fallo: "Falló", sin_proveedor: "Sin proveedor" };
export function VerCorreo({ c }: { c: { id: string; subject: string; to: string; html: string; status: string; at: string; uid: string | null } }) {
  const router = useRouter();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[
        { type: "head", eye: "NOTIFICACIONES · CORREO", t: c.subject, onBack: () => router.push("/admin/notificaciones?tab=mail"), h1: 22 },
        { type: "kv", cols: 3, items: [{ k: "PARA", v: c.to }, { k: "ESTADO", v: EST[c.status] ?? c.status }, { k: "CUÁNDO", v: new Date(c.at).toLocaleString("es-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }) }] },
      ]} />
      <iframe title={c.subject} sandbox="" srcDoc={c.html} style={{ width: "100%", height: 720, border: "1px solid rgba(11,14,18,.08)", borderRadius: 18, background: "var(--tl-white)" }} />
    </div>
  );
}
