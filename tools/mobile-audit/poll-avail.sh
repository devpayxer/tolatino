#!/bin/bash
cd /home/user/tolatino
OLD="page-74aa7b141c2e599c.js"
for i in $(seq 1 14); do
  CHUNK=$(node scripts/sbsql.mjs --raw "select (regexp_matches(content, 'negocios/(page-[a-f0-9]+\.js)'))[1] as c from extensions.http_get('https://tolatino.vercel.app/negocios/');" 2>/dev/null | grep -oE 'page-[a-f0-9]+\.js' | head -1)
  echo "[$i] live negocios chunk: $CHUNK"
  if [ -n "$CHUNK" ] && [ "$CHUNK" != "$OLD" ]; then
    RES=$(node scripts/sbsql.mjs --raw "select (position('Agotado para esas fechas' in content) > 0) as avail from extensions.http_get('https://tolatino.vercel.app/_next/static/chunks/app/%28cliente%29/negocios/$CHUNK');" 2>/dev/null)
    echo "verify: $RES"
    if echo "$RES" | grep -q '"avail":true'; then echo "FASE 2 DEPLOY VERIFIED LIVE ✓"; exit 0; fi
  fi
  sleep 25
done
echo "TIMEOUT"; exit 1
