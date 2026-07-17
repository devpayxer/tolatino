#!/bin/bash
cd /home/user/tolatino
OLD="page-dfa0a0dea38122c7.js"
for i in $(seq 1 14); do
  CHUNK=$(node scripts/sbsql.mjs --raw "select (regexp_matches(content, 'negocio/(page-[a-f0-9]+\.js)'))[1] as c from extensions.http_get('https://tolatino.vercel.app/negocio/');" 2>/dev/null | grep -oE 'page-[a-f0-9]+\.js' | head -1)
  echo "[$i] live negocio chunk: $CHUNK"
  if [ -n "$CHUNK" ] && [ "$CHUNK" != "$OLD" ]; then
    RES=$(node scripts/sbsql.mjs --raw "select (position('Retenido en tarjeta' in content) > 0) as dep from extensions.http_get('https://tolatino.vercel.app/_next/static/chunks/app/negocio/$CHUNK');" 2>/dev/null)
    echo "verify: $RES"
    if echo "$RES" | grep -q '"dep":true'; then echo "FASE 3 DEPLOY VERIFIED LIVE ✓"; exit 0; fi
  fi
  sleep 25
done
echo "TIMEOUT"; exit 1
