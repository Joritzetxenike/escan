create or replace function public.is_web_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce(
    auth.uid() is not null
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

revoke all on function public.is_web_admin() from public;
grant execute on function public.is_web_admin() to authenticated;

create or replace function public.actualizar_estado_ubicacion(
  p_seccion character varying,
  p_area character varying,
  p_subzona character varying,
  p_stat text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_total integer;
  v_fin integer;
  v_inicio integer;
  v_estado_area text;
  v_total_areas integer;
  v_areas_fin integer;
  v_areas_inicio integer;
  v_estado_seccion text;
begin
  if not public.is_web_admin() then
    raise exception using errcode = '42501', message = 'Se requiere permiso de administrador';
  end if;

  if p_stat not in ('Inicio', 'Proceso', 'Fin') then
    raise exception using errcode = '22023', message = 'Estado no válido';
  end if;

  perform 1
    from public."maestroSeccion"
   where seccion = p_seccion
     for update;

  perform 1
    from public."maestroUbicacion"
   where seccion = p_seccion
     and area = p_area
     and subzona = p_subzona
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Ubicación no encontrada';
  end if;

  execute format(
    'update public."maestroUbicacion"
        set stat = %L
      where seccion = %L
        and area = %L
        and subzona = %L',
    p_stat,
    p_seccion,
    p_area,
    p_subzona
  );

  select count(*),
         count(*) filter (where stat::text = 'Fin'),
         count(*) filter (where stat::text = 'Inicio')
    into v_total, v_fin, v_inicio
    from public."maestroUbicacion"
   where seccion = p_seccion
     and area = p_area;

  v_estado_area := case
    when v_total = 0 then 'Inicio'
    when v_fin = v_total then 'Fin'
    when v_inicio = v_total then 'Inicio'
    else 'Proceso'
  end;

  execute format(
    'update public."maestroArea"
        set stat = %L
      where seccion = %L
        and area = %L',
    v_estado_area,
    p_seccion,
    p_area
  );

  select count(*),
         count(*) filter (where stat::text = 'Fin'),
         count(*) filter (where stat::text = 'Inicio')
    into v_total_areas, v_areas_fin, v_areas_inicio
    from public."maestroArea"
   where seccion = p_seccion;

  v_estado_seccion := case
    when v_total_areas = 0 then 'Inicio'
    when v_areas_fin = v_total_areas then 'Fin'
    when v_areas_inicio = v_total_areas then 'Inicio'
    else 'Proceso'
  end;

  execute format(
    'update public."maestroSeccion"
        set stat = %L
      where seccion = %L',
    v_estado_seccion,
    p_seccion
  );

  return jsonb_build_object(
    'seccion', p_seccion,
    'area', p_area,
    'subzona', p_subzona,
    'ubicacion', concat_ws('-', p_seccion, p_area, p_subzona),
    'stat', p_stat,
    'area_stat', v_estado_area,
    'seccion_stat', v_estado_seccion
  );
end;
$$;

revoke all on function public.actualizar_estado_ubicacion(character varying, character varying, character varying, text) from public;
grant execute on function public.actualizar_estado_ubicacion(character varying, character varying, character varying, text) to authenticated;

drop policy if exists "web_admin_select_maestro_seccion" on public."maestroSeccion";
create policy "web_admin_select_maestro_seccion"
  on public."maestroSeccion"
  for select
  to authenticated
  using (public.is_web_admin());

drop policy if exists "web_admin_select_maestro_area" on public."maestroArea";
create policy "web_admin_select_maestro_area"
  on public."maestroArea"
  for select
  to authenticated
  using (public.is_web_admin());

drop policy if exists "web_admin_select_maestro_ubicacion" on public."maestroUbicacion";
create policy "web_admin_select_maestro_ubicacion"
  on public."maestroUbicacion"
  for select
  to authenticated
  using (public.is_web_admin());

drop policy if exists "web_admin_select_maestro_articulo" on public."maestroArticulo";
create policy "web_admin_select_maestro_articulo"
  on public."maestroArticulo"
  for select
  to authenticated
  using (public.is_web_admin());

drop policy if exists "web_admin_select_conteo" on public."conteo";
create policy "web_admin_select_conteo"
  on public."conteo"
  for select
  to authenticated
  using (public.is_web_admin());

grant select on public."maestroSeccion" to authenticated;
grant select on public."maestroArea" to authenticated;
grant select on public."maestroUbicacion" to authenticated;
grant select on public."maestroArticulo" to authenticated;
grant select on public."conteo" to authenticated;
