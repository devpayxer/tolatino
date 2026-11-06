import json, re, sys
# Uso: python3 scripts/semilla/generar-resenas.py docs/diseno/pantallas/datos/neg-rev.js infra/pruebas/semilla/0007_resenas.sql
# Genera infra/pruebas/semilla/0007_resenas.sql desde las 14 reseñas de Sabor Dominicano del prototipo (datos/neg-rev.js).
src = open(sys.argv[1], encoding='utf-8').read()
block = src[src.index('const SD = ['):src.index('const SD_STATS')]
rows = re.findall(r"\{ id: 'sd\d+'.*?\}(?=,\s*(?:\{ id: 'sd|\];))", block, re.S)
LAST = {'Yokasta M.': 'Méndez', 'Mariela S.': 'Santos', 'Ramón A.': 'Almonte', 'Luis R.': 'Reyes', 'Daisy T.': 'Tavárez', 'José L.': 'López',
        'Kathy P.': 'Peña', 'Wilfredo C.': 'Cabrera', 'Anny V.': 'Vásquez', 'Héctor B.': 'Batista', 'Carmen G.': 'García', 'Pedro N.': 'Núñez',
        'Rosanna F.': 'Féliz', 'Freddy D.': 'Durán'}
DISH = {'bandera': 'La bandera', 'mangu': 'Mangú con los tres golpes', 'morir': 'Morir soñando', 'chivo': 'Chivo guisado', 'mofongo': 'Mofongo de chicharrón',
        'flan': 'Flan de leche', 'picapollo': 'Pica pollo', 'sancocho': 'Sancocho', 'chicharron': 'Chicharrón de cerdo', 'chinola': 'Jugo de chinola'}
q = lambda s: "'" + s.replace("'", "''") + "'"
def val(r, k):
    m = re.search(r"\b" + k + r": (-?\d+)", r)
    return int(m.group(1)) if m else None
def strv(r, k):
    m = re.search(r"\b" + k + r": '((?:[^'\\]|\\.)*)'", r)
    return m.group(1).replace("\\'", "'") if m else None
out = ["-- GENERADO por scripts/semilla/generar-resenas.py — no editar a mano.", "-- SOLO SANDBOX. Reseñas de Sabor Dominicano (Fase 2 · 2g), las 14 del prototipo (datos/neg-rev.js): vecinos de ejemplo",
       "-- (teléfonos 555-02xx, ficción), respuestas del dueño, «Útil» entre ellos y sus fotos. Al final, ★ y conteo de TODOS los",
       "-- negocios se recalculan desde las reseñas reales (antes venían fijos en la semilla). Repetible.",
       "begin;"]
users = []
for i, r in enumerate(rows):
    name = strv(r, 'name'); first = name.split(' ')[0]
    phone = '+157055502%02d' % (i + 1)
    users.append(phone)
    out.append(f"insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ({q(phone)}, now(), {q(first)}, {q(LAST[name])}, 'hzl') on conflict (phone) do nothing;")
for i, r in enumerate(rows):
    phone = users[i]
    d = val(r, 'd'); stars = val(r, 'stars'); s = strv(r, 'src')
    es = strv(r, 'es')
    ans = {k: val(r, k) for k in ('taste', 'hot', 'val') if val(r, k) is not None}
    facts = {'late': val(r, 'late')} if s in ('dl', 'pk') and val(r, 'late') is not None else {}
    rec = re.search(r"rec: \[([^\]]*)\]", r).group(1)
    recs = [DISH[x.strip(" '")] for x in rec.split(',') if x.strip(" '")]
    ph = [x.strip() for x in re.search(r"ph: \[([^\]]*)\]", r).group(1).split(',') if x.strip()]
    rep = re.search(r"reply: \['((?:[^'\\]|\\.)*)', '(?:[^'\\]|\\.)*', (\d+)\]", r)
    edited = 'edited: 1' in r
    reply = rep.group(1).replace("\\'", "'") if rep else None
    rep_d = int(rep.group(2)) if rep else None
    u = f"(select id from users where phone = {q(phone)})"
    out.append(f"""insert into reviews (business_id, city_id, user_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, created_at, edited_at)
select 'sabor-dominicano', 'hzl', {u}, {q(s)}, {stars}, {q(es)}, 'es', {q(json.dumps(ans))}::jsonb, {q(json.dumps(facts))}::jsonb,
       array(select id::text from items where business_id = 'sabor-dominicano' and removed_at is null and name->>'es' = any(array[{', '.join(q(x) for x in recs)}]::text[])),
       {q(reply) if reply else 'null'}, {f"now() - interval '{rep_d} days'" if reply else 'null'}, {"(select id from users where phone = '+15705550133')" if reply else 'null'},
       now() - interval '{d} days', {f"now() - interval '{max(d - 1, 0)} days'" if edited else 'null'}
 where exists (select 1 from businesses where id = 'sabor-dominicano' and is_demo)
   and not exists (select 1 from reviews where business_id = 'sabor-dominicano' and user_id = {u} and status <> 'removed');""")
    for k, pid in enumerate(ph):
        url = f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg"
        out.append(f"""insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5({q(f'semilla:resena:{phone}:{k}')})::uuid, 'review', r.id::text, {q(url)}, 'Pexels', {k}, r.user_id from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = {u} and r.status <> 'removed'
on conflict (id) do nothing;""")
# «Útil» entre los vecinos de ejemplo (determinista; nadie marca la suya).
for i in range(len(rows)):
    for j in range(len(rows)):
        if i != j and (i * 7 + j * 3) % 4 == 0:
            out.append(f"""insert into review_helpful (review_id, user_id)
select r.id, (select id from users where phone = {q(users[j])}) from reviews r
 where r.business_id = 'sabor-dominicano' and r.user_id = (select id from users where phone = {q(users[i])}) and r.status <> 'removed'
on conflict do nothing;""")
out.append("update reviews r set helpful_count = (select count(*) from review_helpful h where h.review_id = r.id) where r.business_id = 'sabor-dominicano';")
out.append("do $$ begin perform reviews_stats(id) from businesses where is_demo; end $$;")
out.append("commit;")
open(sys.argv[2], 'w', encoding='utf-8').write("\n".join(out) + "\n")
print(len(rows), 'reseñas')
