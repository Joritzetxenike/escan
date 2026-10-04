/* =======================================================
 * COPIA LOCAL DEL MAESTRO DE ARTÍCULOS
 * =======================================================
 *
 * La app valida los códigos escaneados contra una copia local
 * del maestro, para que escanear sin conexión no dependa de la
 * red. `maestroArticulo` tiene ~211.000 filas y el servidor de
 * PostgREST está limitado a 1.000 filas por petición, así que
 * bajarla desde el cliente serían ~212 peticiones (unos 40 s).
 *
 * Esta función lo resuelve en UNA sola petición y devuelve
 * dos arrays planos en lugar de objetos: se parsean mucho más
 * rápido y ocupan menos memoria en el móvil.
 *
 * Se devuelve solo lo necesario para validar:
 *   - `codigos`: todos los `item` válidos.
 *   - `sic`: los subconjunto de esos que son de tipo SIC, para
 *     poder avisar al operario sin volver a consultar.
 *
 * No se copia `dsca` (la descripción) a propósito: ocupa la
 * mitad del tamaño y el CSV local no la guarda, así que el
 * único efecto sería ensuciar el fichero de 3 MB.
 *
 * OJO con las mayúsculas: en esta base de datos las tablas se
 * crearon entrecomilladas, así que el nombre real es
 * `public."maestroArticulo"` con `A` mayúscula. Escrito sin
 * comillas, Postgres lo pliega a `maestroarticulo` y falla con
 * `relation "maestroarticulo" does not exist`. Por PostgREST sí
 * funciona sin comillas porque las rutas de la API no se pliegan
 * a minúsculas. Todas las tablas del proyecto (sección, área,
 * ubicación, conteo) tienen este mismo nombre sensible a mayúsculas.
 *
 * `tipo` es un enum (`public.tipo`), no texto: `upper(m.tipo)`
 * no resolvería, porque de enum a texto solo hay cast de
 * asignación, no implícito. Hay que castear a `::text`.
 *
 * IMPORTANTE: la función NO es `security definer`. A propósito,
 * para que si algún día se activa RLS sobre el maestro siga
 * respetándolo, en vez de saltárselas.
 * ======================================================= */

create or replace function public.descargar_maestro_articulos()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'codigos',
      coalesce(
        (
          select jsonb_agg(m.item)
          from public."maestroArticulo" m
        ),
        '[]'::jsonb
      ),
    'sic',
      coalesce(
        (
          select jsonb_agg(m.item)
          from public."maestroArticulo" m
          where upper(m.tipo::text) = 'SIC'
        ),
        '[]'::jsonb
      )
  );
$$;

comment on function public.descargar_maestro_articulos()
  is 'Devuelve {codigos: text[], sic: text[]} con el maestro de artículos, para la copia local offline';

grant execute on function public.descargar_maestro_articulos()
  to anon, authenticated;