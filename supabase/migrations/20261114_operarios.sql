/* =======================================================
 * TABLA: operarios (maestro de matrículas)
 * =======================================================
 *
 * Catálogo de operarios de almacén. Se usa para validar el
 * login de la app móvil y para saber quién registro cada
 * movimiento (matricula en la tabla conteo).
 *
 * La app móvil valida contra una copia local (operarios.json)
 * para funcionar sin conexi�n. Esta tabla es la fuente de
 * verdad en Supabase para administrar operarios desde el
 * panel web o scripts de importaci�n.
 */

create table if not exists public."operarios" (
  matricula character varying primary key,
  nombre character varying not null,
  activo boolean not null default true,
  es_admin_emergencia boolean not null default false,
  created_at timestamp with time zone default now()
);

comment on table public."operarios" is 'Catálogo de operarios de almacén';
comment on column public."operarios".matricula is 'Matrícula del operario (identificador de login)';
comment on column public."operarios".nombre is 'Nombre completo del operario';
comment on column public."operarios".activo is 'Si el operario puede acceder a la app';
comment on column public."operarios".es_admin_emergencia is 'Si el operario puede activar la importación de emergencia';

-- RLS: lectura para autenticados, escritura solo para admin
alter table public."operarios" enable row level security;

create policy "operarios_select_authenticated"
  on public."operarios" for select
  to authenticated
  using (true);

create policy "operarios_insert_admin"
  on public."operarios" for insert
  to authenticated
  with check (public.is_web_admin());

create policy "operarios_update_admin"
  on public."operarios" for update
  to authenticated
  using (public.is_web_admin())
  with check (public.is_web_admin());

create policy "operarios_delete_admin"
  on public."operarios" for delete
  to authenticated
  using (public.is_web_admin());

grant select on public."operarios" to anon, authenticated;
grant insert, update, delete on public."operarios" to authenticated;

-- Datos de ejemplo (opcional, borrar en producci�n real)
insert into public."operarios" (matricula, nombre, activo, es_admin_emergencia) values
  ('00123', 'Juan Pérez', true, false),
  ('00456', 'María García', true, true)
on conflict (matricula) do nothing;
