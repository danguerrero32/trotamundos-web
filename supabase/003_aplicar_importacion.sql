-- Los Trotamundos · 003 · aplicar una importación de LastApp en una sola operación.
-- Si algo falla, no se aplica nada a medias. Idempotente: se puede ejecutar varias veces.
-- La llama /api/panel/importar (paso "aplicar") con la clave secreta; no está abierta al público.
--
-- p_decisiones: { nuevos: { <lastapp_id>: {destino:'plato', categoria, emoji} | {destino:'no_web'} | {destino:'mismo', plato_id} | {destino:'pendiente'} },
--                 renombrar: [<plato_id>], ocultar_desaparecidos: true|false, recuperar_no_web: [<lastapp_id>] }
-- p_resumen: lo calcula el servidor (resumenAplicado) para el historial y el panel.

create or replace function aplicar_importacion(p_id uuid, p_decisiones jsonb, p_quien text, p_resumen jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare
  imp       importaciones%rowtype;
  k         text;
  d         jsonb;
  f         jsonb;
  v_plato   uuid;
  v_orden   smallint;
  tocados   uuid[] := '{}';
  renombrar text[] := array(select jsonb_array_elements_text(coalesce(p_decisiones->'renombrar', '[]'::jsonb)));
begin
  select * into imp from importaciones where id = p_id for update;
  if not found then raise exception 'no_encontrada'; end if;
  if imp.estado <> 'vista_previa' then raise exception 'ya_aplicada'; end if;
  if exists (select 1 from importaciones where estado = 'aplicada' and aplicada_en > imp.en) then raise exception 'vista_caducada'; end if;

  -- Todo lo que trae el archivo queda como "visto" (y se recuerda si ya era "no va en la web").
  insert into productos_lastapp (id, nombre, precio, categoria, descripcion, primera_vez, ultima_vez)
  select x->>'id', x->>'nombre', (x->>'precio')::numeric, nullif(x->>'categoria', ''), nullif(x->>'descripcion', ''), now(), now()
  from jsonb_array_elements(imp.filas) x
  on conflict (id) do update set nombre = excluded.nombre, precio = excluded.precio, categoria = excluded.categoria,
    descripcion = excluded.descripcion, ultima_vez = now();

  -- Productos nuevos: plato nuevo, "no va en la web" o "es el mismo que…".
  for k, d in select * from jsonb_each(coalesce(p_decisiones->'nuevos', '{}'::jsonb)) loop
    select x into f from jsonb_array_elements(imp.filas) x where x->>'id' = k limit 1;
    continue when f is null;
    if d->>'destino' = 'plato' then
      select coalesce(max(orden), 0) + 1 into v_orden from platos where categoria_id = d->>'categoria';
      insert into platos (categoria_id, nombre, descripcion, precio, emoji, orden, lastapp_id, lastapp_nombre, traduccion)
      values (d->>'categoria', jsonb_build_object('es', f->>'nombre'),
              case when coalesce(f->>'descripcion', '') <> '' then jsonb_build_object('es', f->>'descripcion') else '{}'::jsonb end,
              (f->>'precio')::numeric, coalesce(d->>'emoji', ''), v_orden, k, f->>'nombre', '{"pendiente":true,"manual":[]}')
      returning id into v_plato;
      tocados := tocados || v_plato;
    elsif d->>'destino' = 'no_web' then
      update productos_lastapp set no_web = true where id = k;
    elsif d->>'destino' = 'mismo' then
      update platos set lastapp_id = k, lastapp_nombre = f->>'nombre',
             precio = case when precio_fijo or f->>'precio' is null then precio else (f->>'precio')::numeric end
      where id = (d->>'plato_id')::uuid and lastapp_id is null;
    end if;
  end loop;

  -- Precios de los platos vinculados, salvo los que tienen el precio fijo en la web.
  update platos p set precio = (x->>'precio')::numeric
  from jsonb_array_elements(imp.filas) x
  where p.lastapp_id = x->>'id' and not p.precio_fijo and x->>'precio' is not null
    and p.precio is distinct from (x->>'precio')::numeric;

  -- Renombrar en la web los que Daniel marcó (queda pendiente de traducir).
  update platos p set nombre = p.nombre || jsonb_build_object('es', x->>'nombre'),
         traduccion = coalesce(p.traduccion, '{}'::jsonb) || '{"pendiente":true}'::jsonb
  from jsonb_array_elements(imp.filas) x
  where p.id::text = any(renombrar) and p.lastapp_id = x->>'id';
  tocados := tocados || array(select id from platos where id::text = any(renombrar));

  -- El nombre que tiene cada producto en LastApp, siempre al día.
  update platos p set lastapp_nombre = x->>'nombre'
  from jsonb_array_elements(imp.filas) x
  where p.lastapp_id = x->>'id' and p.lastapp_nombre is distinct from x->>'nombre';

  -- Los que ya no están en LastApp se ocultan (no se borran), si así se decidió.
  if coalesce((p_decisiones->>'ocultar_desaparecidos')::boolean, false) then
    update platos set visible = false
    where lastapp_id is not null and not archivado
      and lastapp_id not in (select x->>'id' from jsonb_array_elements(imp.filas) x);
  end if;

  update productos_lastapp set no_web = false
  where id in (select jsonb_array_elements_text(coalesce(p_decisiones->'recuperar_no_web', '[]'::jsonb)));

  update importaciones set estado = 'aplicada', aplicada_en = now(), decisiones = p_decisiones, resumen = p_resumen where id = p_id;
  insert into historial (quien, accion, tabla, registro_id, detalle)
  values (p_quien, format('Importó la carta de LastApp: %s platos nuevos, %s precios, %s ocultados',
            coalesce(p_resumen->>'nuevos', '0'), coalesce(p_resumen->>'precios', '0'), coalesce(p_resumen->>'ocultados', '0')),
          'importaciones', p_id::text, p_resumen);

  return jsonb_build_object('resumen', p_resumen, 'platos_tocados', to_jsonb(tocados));
end $$;

revoke all on function aplicar_importacion(uuid, jsonb, text, jsonb) from public, anon, authenticated;
grant execute on function aplicar_importacion(uuid, jsonb, text, jsonb) to service_role;
