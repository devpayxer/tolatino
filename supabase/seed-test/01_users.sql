do $$
declare
  hz_lat double precision := 40.9584; hz_lng double precision := -75.9746;
  bx_lat double precision := 40.8498; bx_lng double precision := -73.8664;
  names_h text[] := array['Marisol Vega','José Ramírez','Lucía Fernández','Carlos Mendoza','Ana Torres','Diego Herrera','Gabriela Ruiz','Miguel Santos','Rosa Delgado'];
  inits_h text[] := array['MV','JR','LF','CM','AT','DH','GR','MS','RD'];
  names_b text[] := array['Yesenia Peña','Rafael Núñez','Carmen Ortiz','Luis Castillo','Daniela Rosario','Héctor Guzmán','Patricia Jiménez','Óscar Reyes','Ingrid Morales'];
  inits_b text[] := array['YP','RN','CO','LC','DR','HG','PJ','OR','IM'];
  colors text[] := array['#7B61FF','#1F9D57','#D6336C','#E8954A','#2A5C8A','#9333EA','#0E9384','#DC2626','#F4B740'];
  i int;
begin
  for i in 1..9 loop
    perform public._seed_user(i||'@1.com', names_h[i], inits_h[i], colors[i], 'Hazleton, PA',
      hz_lat + (random()-0.5)*0.03, hz_lng + (random()-0.5)*0.03);
    perform public._seed_user(i||'@2.com', names_b[i], inits_b[i], colors[i], 'The Bronx, NY',
      bx_lat + (random()-0.5)*0.03, bx_lng + (random()-0.5)*0.03);
  end loop;
end $$;
select count(*) as regular_users from auth.users where email ~ '@[12]\.com$';
