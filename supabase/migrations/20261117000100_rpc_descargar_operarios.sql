/* =======================================================
 * RPC: descargar_operarios
 * =======================================================
 *
 * La app valida el login contra una copia local de los
 * operarios. Hasta ahora esa copia era la plantilla del bundle
 * (`src/data/operarios.json`, dos operarios de ejemplo), así que
 * dar de alta a alguien exigía una OTA o una build nueva.
 *
 * La tabla `operarios` tiene RLS con `select` solo para
 * `authenticated`, y la app móvil usa `anon`: un `select`
 * directo devuelve cero filas. Esta función devuelve SOLO las
 * tres columnas que necesita el login, sin abrir la tabla
 * entera a `anon`.
 *
 * `security definer` a propósito (para saltar la RLS de la
 * tabla), con `search_path` fijo para que no se pueda
 * secuestrar con objetos de otro esquema.
 *
 * Alta/baja de operarios: `npm run import:operarios` o desde
 * el panel de Supabase. La app recoge los cambios al arrancar
 * con conexión, o al intentar entrar con una matrícula que aún
 * no conoce.
 * ======================================================= */

create or replace function public.descargar_operarios()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'matricula', o.matricula,
        'nombre', o.nombre,
        'activo', o.activo
      )
      order by o.matricula
    ),
    '[]'::jsonb
  )
  from public."operarios" o;
$$;

comment on function public.descargar_operarios()
  is 'Lista de operarios (matricula, nombre, activo) para la copia local del login de la app';

revoke all on function public.descargar_operarios() from public;
grant execute on function public.descargar_operarios() to anon, authenticated;
