/* =======================================================
 * RPC: finalizar_ubicacion v2
 * =======================================================
 *
 * Sustituye a 20261114000100_rpc_finalizar_ubicacion.sql. Misma
 * firma y mismo resultado.
 *
 * 1. Mismo orden de bloqueo que el resto de RPC
 *    `guardar_movimiento` v2 y `actualizar_estado_ubicacion`
 *    (web-admin) bloquean primero la SECCIÓN y luego la
 *    ubicación. La v1 bloqueaba solo la ubicación y después
 *    actualizaba la sección: con un guardado simultáneo en la
 *    misma sección, cada transacción esperaba a la otra
 *    (deadlock, Postgres aborta una). Bloquear siempre en el
 *    mismo orden lo evita.
 *
 * 2. Propagación correcta con varios dispositivos
 *    Con el bloqueo por sección, dos dispositivos que terminan
 *    a la vez las dos últimas ubicaciones de un área se
 *    ejecutan uno detrás de otro: el segundo ve el `Fin` del
 *    primero y el área (y la sección) pasan a `Fin`. En la v1
 *    ninguno veía el del otro y el área se quedaba en `Proceso`.
 *
 * 3. Literales sin tipo para el enum
 *    La v1 usaba `'Fin'::"Stat"`, que depende de que el enum se
 *    llame exactamente "Stat". Un literal sin tipo se adapta al
 *    tipo de la columna.
 * ======================================================= */

create or replace function public.finalizar_ubicacion(
  p_seccion character varying,
  p_area character varying,
  p_subzona character varying
)
returns jsonb
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_total_ubicaciones integer;
  v_ubicaciones_fin integer;
  v_total_areas integer;
  v_areas_fin integer;
begin
  -- Serializar por sección (mismo orden que guardar_movimiento)
  perform 1
     from public."maestroSeccion"
    where seccion = p_seccion
      for update;

  -- Verificar que la ubicacion existe
  perform 1
    from public."maestroUbicacion"
   where seccion = p_seccion
     and area = p_area
     and subzona = p_subzona
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Ubicacion no encontrada';
  end if;

  -- 1. Ubicacion => Fin
  update public."maestroUbicacion"
     set stat = 'Fin'
   where seccion = p_seccion
     and area = p_area
     and subzona = p_subzona;

  -- 2. ¿Todas las ubicaciones del area en Fin?
  select count(*),
         count(*) filter (where stat::text = 'Fin')
    into v_total_ubicaciones, v_ubicaciones_fin
    from public."maestroUbicacion"
   where seccion = p_seccion
     and area = p_area;

  if v_total_ubicaciones > 0
     and v_ubicaciones_fin = v_total_ubicaciones then

    update public."maestroArea"
       set stat = 'Fin'
     where seccion = p_seccion
       and area = p_area;

    -- 3. ¿Todas las areas de la seccion en Fin?
    select count(*),
           count(*) filter (where stat::text = 'Fin')
      into v_total_areas, v_areas_fin
      from public."maestroArea"
     where seccion = p_seccion;

    if v_total_areas > 0
       and v_areas_fin = v_total_areas then

      update public."maestroSeccion"
         set stat = 'Fin'
       where seccion = p_seccion;

    end if;

  end if;

  return jsonb_build_object(
    'seccion', p_seccion,
    'area', p_area,
    'subzona', p_subzona,
    'ubicacion', concat_ws('-', p_seccion, p_area, p_subzona),
    'stat', 'Fin'
  );
end;
$$;

comment on function public.finalizar_ubicacion(character varying, character varying, character varying)
  is 'Finaliza una ubicacion y propaga Fin a area/seccion si corresponde, en una transaccion serializada por seccion';

grant execute on function public.finalizar_ubicacion(character varying, character varying, character varying) to anon, authenticated;
