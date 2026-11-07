-- SOLO SANDBOX. Quien renta cuartos en su casa (la semilla 0028 puso el cuarto de Doña Mary en la misma calle que el negocio):
-- el negocio pasa a «trabaja desde casa» y en lo público sale como zona aproximada, igual que hace lib/inmuebles.ts al guardar.
begin;
update businesses b set works_from_home = true, updated_at = now()
 where b.is_demo and not b.works_from_home and b.geo is not null
   and exists (select 1 from property_listings pl join items i on i.id = pl.item_id
                where pl.business_id = b.id and not pl.addr_public and i.removed_at is null
                  and ((pl.geom is not null and st_dwithin(pl.geom, b.geo, 60))
                    or (pl.addr_line is not null and lower(b.address) like lower(pl.addr_line) || '%')));
commit;
