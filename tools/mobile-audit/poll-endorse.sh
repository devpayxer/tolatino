#!/bin/bash
cd /home/user/tolatino
OLD="page-591565359c22b7eb.js"
for i in $(seq 1 14); do
  CHUNK=$(node scripts/sbsql.mjs --raw "select (regexp_matches(content, 'negocios/(page-[a-f0-9]+\.js)'))[1] as c from extensions.http_get('https://tolatino.vercel.app/negocios/');" 2>/dev/null | grep -oE 'page-[a-f0-9]+\.js' | head -1)
  echo "[$i] live chunk: $CHUNK"
  if [ -n "$CHUNK" ] && [ "$CHUNK" != "$OLD" ]; then
    RES=$(node scripts/sbsql.mjs --raw "select (position('lo recomiendas' in content) > 0) as endo from extensions.http_get('https://tolatino.vercel.app/_next/static/chunks/app/%28cliente%29/negocios/$CHUNK');" 2>/dev/null)
    echo "verify: $RES"
    if echo "$RES" | grep -q '"endo":true'; then echo "ENDORSE DEPLOY VERIFIED LIVE ✓"; exit 0; fi
  fi
  sleep 25
done
echo "TIMEOUT"; exit 1
