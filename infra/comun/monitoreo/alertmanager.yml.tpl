# 9o · Alertmanager en la réplica. PLANTILLA: deploy.sh la llena en el servidor (/etc/tolatino/alertmanager.yml, 0600) con el correo y la clave de SES
# (llegan en el sobre sellado) y el token de las alertas (llega de la app en su sobre privado). Aquí no hay ni un secreto ni un correo de nadie.
#   · Todo lo que no es el latido → a la app (/api/interno/alerta: abre el incidente con su caso del manual y avisa al equipo; lo crítico con SMS) Y
#     por correo directo (SES SMTP), que sale aunque la app esté caída.
#   · El latido → a la app cada 5 min (deja health_checks «vigia», que el segundo testigo de GitHub Actions mira desde fuera).
global:
  smtp_smarthost: __SMTP_HOST__:587
  smtp_from: __SMTP_DE__
  smtp_auth_username: __SMTP_USUARIO__
  smtp_auth_password: __SMTP_CLAVE__
  smtp_require_tls: true
  resolve_timeout: 5m

route:
  receiver: equipo
  group_by: [alertname, caso]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - matchers: [ 'severity="latido"' ]
      receiver: latido
      group_wait: 0s
      group_interval: 1m
      repeat_interval: 5m

receivers:
  - name: equipo
    webhook_configs:
      - url: http://__RED_APP__:3000/api/interno/alerta
        send_resolved: true
        http_config:
          authorization: { type: Bearer, credentials: __ALERTA_TOKEN__ }
    email_configs:
      - to: __ALERTA_CORREO__
        send_resolved: true
        headers: { Subject: "To'Latino · {{ .Status }} · {{ .CommonLabels.alertname }} · {{ .CommonLabels.caso }}" }
  - name: latido
    webhook_configs:
      - url: http://__RED_APP__:3000/api/interno/alerta
        send_resolved: false
        http_config:
          authorization: { type: Bearer, credentials: __ALERTA_TOKEN__ }
