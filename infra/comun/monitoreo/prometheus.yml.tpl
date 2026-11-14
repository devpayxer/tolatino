# 9o · Prometheus en la réplica (fase9-apertura.md §3.5, HERRAMIENTAS #4, #14). PLANTILLA: deploy.sh cambia __RED_*__ y __DOMINIO_URL__. Mide las tres
# máquinas por la red privada (node_exporter), la base (postgres_exporter, con las cifras de la plataforma de postgres-consultas.yml) y la app DESDE
# FUERA (blackbox: el dominio por Cloudflare, /api/salud, el webhook de Stripe vivo y el certificado). Sistema › Salud es su tablero (sin Grafana).
global:
  scrape_interval: 30s
  evaluation_interval: 30s
  external_labels:
    entorno: __ENTORNO__

rule_files:
  - /etc/prometheus/reglas.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

scrape_configs:
  - job_name: maquinas
    static_configs:
      - targets: ["__RED_APP__:9100"]
        labels: { maquina: app }
      - targets: ["__RED_BASE__:9100"]
        labels: { maquina: base }
      - targets: ["__RED_REPLICA__:9100"]
        labels: { maquina: replica }

  - job_name: base
    static_configs:
      - targets: ["__RED_BASE__:9187"]
        labels: { maquina: base }

  - job_name: salud
    metrics_path: /probe
    params: { module: [salud] }
    static_configs:
      - targets: ["__DOMINIO_URL__/api/salud"]
    relabel_configs:
      - { source_labels: [__address__], target_label: __param_target }
      - { source_labels: [__param_target], target_label: instance }
      - { target_label: __address__, replacement: "blackbox:9115" }

  - job_name: webhook
    metrics_path: /probe
    params: { module: [webhook] }
    static_configs:
      - targets: ["__DOMINIO_URL__/api/stripe/webhook"]
    relabel_configs:
      - { source_labels: [__address__], target_label: __param_target }
      - { source_labels: [__param_target], target_label: instance }
      - { target_label: __address__, replacement: "blackbox:9115" }

  - job_name: prometheus
    static_configs:
      - targets: ["localhost:9090"]
