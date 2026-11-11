import "server-only";

/* 8h · «Pedir un build»: lanza el flujo de las tiendas (.github/workflows/tiendas.yml) con la API REST de GitHub
   (POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches → 204; X-GitHub-Api-Version 2022-11-28). El token es el del fundador
   (llavero, github_token; permiso «Actions: write» solo en este repositorio): no vive en el repo ni en GitHub. GitHub rechaza (422) un input
   que el flujo no declara: el simulador (scripts/tiendas-sim/github.cjs) lo revisa contra los inputs de tiendas.yml.
   Módulo autocontenido (sin la base). */
export type Res = { status: number; error: string | null };
export const VERSION_API = "2022-11-28";

export async function lanzar(base: string, token: string, x: { repo: string; flujo: string; ref: string; inputs: Record<string, string> }): Promise<Res> {
  const r = await fetch(`${base.replace(/\/$/, "")}/repos/${x.repo}/actions/workflows/${encodeURIComponent(x.flujo)}/dispatches`, {
    method: "POST", signal: AbortSignal.timeout(15_000), redirect: "error",
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": VERSION_API, "content-type": "application/json", "user-agent": "tolatino-tiendas" },
    body: JSON.stringify({ ref: x.ref, inputs: x.inputs }),
  });
  if (r.status === 204) return { status: 204, error: null };
  const j = (await r.json().catch(() => null)) as { message?: unknown } | null;
  return { status: r.status, error: `${r.status}${typeof j?.message === "string" ? ` · ${j.message.slice(0, 140)}` : ""}` };
}
