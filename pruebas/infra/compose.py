#!/usr/bin/env python3
"""9o · Revisión de los compose y las configuraciones YAML de la producción como código, sin Docker (aquí no hay; en el CI corre además
«docker compose config»). Por cada compose: se lee; cada servicio tiene imagen (o build) con versión fija; cada red y volumen nombrado existe o es
externo; cada variable ${X} del compose de producción está en la lista cerrada infra/comun/secretos.json y no es «prohibida». Y las configuraciones de
Prometheus, Alertmanager, blackbox y postgres_exporter se leen y tienen lo que se espera."""
import json, re, sys
from pathlib import Path
import yaml

RAIZ = Path(__file__).resolve().parents[2]
LISTA = {k: v for k, v in json.loads((RAIZ / "infra/comun/secretos.json").read_text()).items() if not k.startswith("_")}
mal = []
def falla(m): mal.append(m); print(f"  ✗ {m}")

COMPOSE = ["infra/produccion/compose-app.yml", "infra/produccion/compose-app-fijos.yml", "infra/produccion/compose-base.yml", "infra/produccion/compose-replica.yml",
           "infra/ensayo/compose-almacen.yml", "infra/pruebas/docker-compose.yml"]
for f in COMPOSE:
    texto = (RAIZ / f).read_text()
    try: d = yaml.safe_load(texto)
    except yaml.YAMLError as e: falla(f"{f}: no se lee ({e})"); continue
    servicios = d.get("services") or {}
    if not servicios: falla(f"{f}: sin servicios")
    redes = set((d.get("networks") or {}).keys()); vols = set((d.get("volumes") or {}).keys())
    for n, s in servicios.items():
        img = s.get("image")
        if not img and not s.get("build"): falla(f"{f}: {n} sin imagen ni build")
        if img and "${" not in img and ":" not in img: falla(f"{f}: {n} con imagen sin versión ({img})")
        if img and re.search(r":latest$", img): falla(f"{f}: {n} con :latest")
        for r in (s.get("networks") or []):
            if r not in redes: falla(f"{f}: {n} usa la red «{r}» que no está declarada")
        for v in (s.get("volumes") or []):
            src = str(v).split(":")[0]
            if not src.startswith(("/", ".", "$")) and src not in vols: falla(f"{f}: {n} usa el volumen «{src}» que no está declarado")
    if f.startswith(("infra/produccion/", "infra/ensayo/")):
        for var in sorted(set(re.findall(r"\$\{([A-Z_][A-Z0-9_]*)", texto))):
            if var not in LISTA: falla(f"{f}: ${{{var}}} no está en infra/comun/secretos.json (cada variable tiene dueño)")
            elif LISTA[var].get("origen") == "prohibida": falla(f"{f}: ${{{var}}} está prohibida en producción")
        for prohibida in ("TOLATINO_SMS_MODO: pruebas", "SIMULADOR", "semilla"):
            if prohibida in texto: falla(f"{f}: «{prohibida}» en un compose de producción")
    print(f"  ✓ {f}: {len(servicios)} servicios")

def leer(f):
    try: return yaml.safe_load((RAIZ / f).read_text())
    except Exception as e: falla(f"{f}: no se lee ({e})"); return {}
p = leer("infra/comun/monitoreo/prometheus.yml.tpl")
trabajos = {j["job_name"] for j in p.get("scrape_configs", [])}
for j in ("maquinas", "base", "salud", "webhook"):
    if j not in trabajos: falla(f"prometheus: falta el trabajo «{j}»")
r = leer("infra/comun/monitoreo/reglas.yml")
alertas = [x for g in r.get("groups", []) for x in g.get("rules", [])]
casos = {Path(x.name).stem for x in (RAIZ / "docs/incidentes").glob("*.md")} if (RAIZ / "docs/incidentes").exists() else set()
for a in alertas:
    l = a.get("labels", {})
    if l.get("severity") not in ("critica", "alta", "media", "baja", "latido"): falla(f"reglas: {a.get('alert')} sin severidad válida")
    if l.get("severity") != "latido" and l.get("caso") not in casos: falla(f"reglas: {a.get('alert')} apunta al caso «{l.get('caso')}» que no está en docs/incidentes/")
for n in ("AppNoResponde", "BaseNoResponde", "DiscoLleno", "BarridoCallado", "RestauracionDePrueba", "RespaldoAtrasado", "Latido"):
    if n not in {a.get("alert") for a in alertas}: falla(f"reglas: falta la alerta {n}")
am = leer("infra/comun/monitoreo/alertmanager.yml.tpl")
if not any(rc.get("name") == "latido" for rc in am.get("receivers", [])): falla("alertmanager: falta el receptor del latido")
b = leer("infra/comun/monitoreo/blackbox.yml")
if set(b.get("modules", {})) != {"salud", "webhook"}: falla("blackbox: los módulos son salud y webhook")
q = leer("infra/comun/monitoreo/postgres-consultas.yml")
metricas = {list(m)[0] for m in q.get("tolatino", {}).get("metrics", [])}
for m in re.findall(r"tolatino_([a-z_]+)", (RAIZ / "infra/comun/monitoreo/reglas.yml").read_text()):
    if m not in metricas: falla(f"reglas usa tolatino_{m} y postgres_exporter no la mide")
ci = leer("infra/produccion/cloud-init.yml")
if "tolatino-sync" not in json.dumps(ci) or ci.get("ssh_pwauth") is not False: falla("cloud-init de producción: sin tolatino-sync o con contraseña por SSH")
if "ssh_authorized_keys" in json.dumps(ci): falla("cloud-init de producción: con llave SSH (nadie entra a mano)")
print(f"  ✓ monitoreo: {len(trabajos)} trabajos de Prometheus, {len(alertas)} alertas (cada una con su caso del manual), cloud-init sin SSH")
sys.exit(1 if mal else 0)
