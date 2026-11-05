-- Catálogo de licencias (diseño: datos/neg-pro.js TLPro.LIC, Licencia.dc.html SRC y NO). Configuración real del
-- producto, repetible. nmls usa el registro que cita el diseño (neg-inm-kind.js:123); arq, el genérico del diseño.
begin;
insert into license_kinds (key, category_id, title, can, cannot, issuer, registry_site, registry_url, number_label, sort) values
 ('abogado', 'NEG-PRO', '{"es":"Abogado con licencia","en":"Licensed attorney"}', '{"es":"Da consejo legal y te representa en corte y ante USCIS.","en":"Gives legal advice and represents you in court and before USCIS."}', null,
  '{"es":"Disciplinary Board · Corte Suprema de PA","en":"Disciplinary Board · PA Supreme Court"}', 'padisciplinaryboard.org', 'https://www.padisciplinaryboard.org/for-the-public/find-attorney', 'PA ID #', 1),
 ('acreditado', 'NEG-PRO', '{"es":"Representante acreditado (DOJ)","en":"Accredited representative (DOJ)"}', '{"es":"Puede aconsejarte y llenar formularios de inmigración. Trabaja en una organización reconocida.","en":"Can advise you and file immigration forms. Works at a recognized organization."}', '{"es":"Solo trabaja a través de su organización reconocida.","en":"Only works through its recognized organization."}',
  '{"es":"Departamento de Justicia (EOIR)","en":"Department of Justice (EOIR)"}', 'justice.gov/eoir', 'https://www.justice.gov/eoir/recognized-organizations-and-accredited-representatives-roster-state-and-city', 'DOJ #', 2),
 ('notario', 'NEG-PRO', '{"es":"Notario comisionado en PA","en":"PA commissioned notary"}', '{"es":"Certifica firmas. En EE. UU. un notario no es abogado: no da consejo legal ni llena formularios de inmigración.","en":"Certifies signatures. In the U.S. a notary is not a lawyer: no legal advice or immigration forms."}', '{"es":"No es abogado: no da consejo legal ni llena formularios de inmigración.","en":"Not a lawyer: no legal advice or immigration forms."}',
  '{"es":"Departamento de Estado de PA","en":"PA Department of State"}', 'notaries.pa.gov', 'https://www.notaries.pa.gov', 'Comisión #', 3),
 ('ata', 'NEG-PRO', '{"es":"Traductor certificado","en":"Certified translator"}', '{"es":"Traduce actas y documentos con certificación que acepta USCIS.","en":"Translates records and documents with a certification USCIS accepts."}', '{"es":"No da consejo legal sobre lo que traduce.","en":"Gives no legal advice about what it translates."}',
  '{"es":"American Translators Association","en":"American Translators Association"}', 'atanet.org', 'https://www.atanet.org/directory', 'ATA #', 4),
 ('cpa', 'NEG-PRO', '{"es":"Contador público (CPA)","en":"Certified Public Accountant"}', '{"es":"Hace impuestos, libros y te representa ante el IRS.","en":"Does taxes, books and represents you before the IRS."}', null,
  '{"es":"Junta Estatal de Contadores de PA","en":"PA State Board of Accountancy"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'CPA #', 5),
 ('ptin', 'NEG-PRO', '{"es":"Preparador con PTIN","en":"Preparer with PTIN"}', '{"es":"Puede preparar y firmar tu declaración de impuestos.","en":"Can prepare and sign your tax return."}', '{"es":"No te representa ante el IRS en una auditoría.","en":"Does not represent you before the IRS in an audit."}',
  '{"es":"IRS · directorio de preparadores","en":"IRS · preparer directory"}', 'irs.treasury.gov/rpo', 'https://irs.treasury.gov/rpo/rpo.jsf', 'PTIN P', 6),
 ('caa', 'NEG-PRO', '{"es":"Agente certificador de ITIN","en":"ITIN Certifying Acceptance Agent"}', '{"es":"Verifica tu pasaporte aquí; no lo mandas por correo al IRS.","en":"Verifies your passport here; you do not mail it to the IRS."}', null,
  '{"es":"IRS · agentes certificadores de ITIN","en":"IRS · ITIN acceptance agents"}', 'irs.gov', 'https://www.irs.gov/individuals/itin-acceptance-agent-program', 'CAA #', 7),
 ('nmls', 'NEG-PRO', '{"es":"Originador de préstamos con licencia (NMLS)","en":"Licensed loan originator (NMLS)"}', '{"es":"Puede ofrecerte préstamos e hipotecas de varios bancos. Quien aprueba es el banco.","en":"Can offer loans and mortgages from several lenders. The lender approves."}', null,
  '{"es":"NMLS Consumer Access","en":"NMLS Consumer Access"}', 'nmlsconsumeraccess.org', 'https://www.nmlsconsumeraccess.org', 'NMLS #', 8),
 ('arq', 'NEG-PRO', '{"es":"Arquitecto e ingeniero con licencia en PA","en":"PA licensed architect and engineer"}', '{"es":"Firma y sella planos para permisos de la ciudad.","en":"Signs and seals plans for city permits."}', null,
  '{"es":"Estado de Pensilvania","en":"State of Pennsylvania"}', 'pa.gov', 'https://www.pa.gov', '#', 9),
 ('agente', 'NEG-PRO', '{"es":"Agente de seguros con licencia","en":"Licensed insurance agent"}', '{"es":"Puede venderte y cambiarte pólizas de varias compañías.","en":"Can sell and change policies from several insurers."}', null,
  '{"es":"Departamento de Seguros de PA","en":"PA Insurance Department"}', 'pa.gov/insurance', 'https://www.pa.gov/agencies/insurance', 'Licencia #', 10)
on conflict (key) do update set category_id = excluded.category_id, title = excluded.title, can = excluded.can, cannot = excluded.cannot, issuer = excluded.issuer,
  registry_site = excluded.registry_site, registry_url = excluded.registry_url, number_label = excluded.number_label, sort = excluded.sort;

-- Lo que declararon en Publica antes de que existiera la ficha Licencia: entra «en revisión» con su caso en la cola.
insert into licenses (business_id, city_id, kind, title, can, cannot, issuer, registry_url, status, source, sort)
select b.id, b.city_id, k.key, k.title, k.can, coalesce(k.cannot, '[]'::jsonb), k.issuer->>'es', k.registry_url, 'review', 'publica', o.n
  from businesses b cross join lateral jsonb_array_elements_text(case when jsonb_typeof(b.category_attrs->'onb'->'cx'->'lic') = 'array' then b.category_attrs->'onb'->'cx'->'lic' else '[]'::jsonb end) with ordinality o(k, n)
  join license_kinds k on k.key = o.k
 where not b.is_demo and b.status <> 'merged'
on conflict do nothing;
insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, opened_at)
select 'lic', 'license', l.id::text, l.business_id, l.city_id, l.created_at from licenses l where l.status = 'review' and l.source = 'publica'
on conflict do nothing;
commit;
