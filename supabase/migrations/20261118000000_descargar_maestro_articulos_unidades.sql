/* =======================================================
 * COPIA LOCAL DEL MAESTRO — UNIDADES
 * =======================================================
 *
 * Sustituye a 20261014000000_maestro_genericos.sql (y a la
 * snapshot original): devuelve lo mismo (`codigos`, `sic`,
 * `genericos`) y además la UNIDAD de cada artículo, que la app
 * muestra en el modal de cantidad, en la lista de artículos,
 * en el aviso de artículo ya contado y en la entrada manual.
 *
 * Mandar `item → unit` de los ~279.000 artículos añadiría unos
 * 6 MB a la descarga, y el 99 % son `U`. Se envía:
 *
 *   unidad_defecto : la unidad más común (hoy `U`)
 *   unidades       : { item: unit } SOLO de los que tienen otra
 *                    (unos 2.250: K, M, M2, L, M3, LB...). Un
 *                    artículo sin unidad va como "".
 *
 * La app resuelve: `unidades[item]` si está; si no, la unidad
 * por defecto. Las copias locales antiguas (sin estos campos)
 * siguen funcionando y muestran `—` hasta refrescarse (⟳).
 *
 * `genericos` incluye GEN y GENERICO (ver migración de
 * genéricos), aunque hoy el enum solo admite GEN.
 * ======================================================= */

create or replace function public.descargar_maestro_articulos()
returns jsonb
language sql
stable
set search_path = public
as $$
  with defecto as (
    select m.unit
      from public."maestroArticulo" m
     where m.unit is not null
     group by m.unit
     order by count(*) desc
     limit 1
  )
  select jsonb_build_object(
    'codigos',
      coalesce(
        (select jsonb_agg(m.item) from public."maestroArticulo" m),
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
      ),
    'genericos',
      coalesce(
        (
          select jsonb_agg(m.item)
            from public."maestroArticulo" m
           where upper(m.tipo::text) in ('GEN', 'GENERICO')
        ),
        '[]'::jsonb
      ),
    'unidad_defecto',
      (select unit from defecto),
    'unidades',
      coalesce(
        (
          select jsonb_object_agg(m.item, coalesce(m.unit, ''))
            from public."maestroArticulo" m
           where m.unit is distinct from (select unit from defecto)
        ),
        '{}'::jsonb
      )
  );
$$;

comment on function public.descargar_maestro_articulos()
  is 'Maestro de artículos para la copia local: {codigos, sic, genericos, unidad_defecto, unidades (solo excepciones)}';

grant execute on function public.descargar_maestro_articulos()
  to anon, authenticated;
