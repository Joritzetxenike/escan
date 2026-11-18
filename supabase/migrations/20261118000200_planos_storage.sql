/* =======================================================
 * PLANOS DE SECCIÓN / ÁREA (web-admin)
 * =======================================================
 *
 * Bucket PRIVADO `planos` en Supabase Storage. Se usa solo
 * desde el panel web, el día del inventario, para consultar el
 * plano de una sección (o de un área).
 *
 * Estructura: una carpeta por sección y, opcionalmente, una
 * subcarpeta por área. Cualquier nombre de fichero.
 *
 *   planos/LIN2/plano general.pdf
 *   planos/LIN2/estanterias.png
 *   planos/LIN2/A01/detalle.jpg
 *
 * Formatos: PDF, PNG, JPG y WEBP (los que el navegador muestra
 * sin plugins). Máximo 50 MB por fichero.
 *
 * Acceso: SOLO administradores del panel (`is_web_admin()`,
 * el mismo control que el cambio de estado). La clave pública
 * de la app móvil (`anon`) no puede ni listar ni descargar.
 * El panel muestra los ficheros con URLs firmadas temporales.
 *
 * Subida: desde el panel (modo edición) o a mano desde el
 * dashboard de Supabase (Storage → planos), que entra como
 * service_role y no necesita estas políticas.
 * ======================================================= */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'planos',
  'planos',
  false,
  52428800,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "planos_select_admin" on storage.objects;
create policy "planos_select_admin"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'planos' and public.is_web_admin());

drop policy if exists "planos_insert_admin" on storage.objects;
create policy "planos_insert_admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'planos' and public.is_web_admin());

drop policy if exists "planos_update_admin" on storage.objects;
create policy "planos_update_admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'planos' and public.is_web_admin())
  with check (bucket_id = 'planos' and public.is_web_admin());

drop policy if exists "planos_delete_admin" on storage.objects;
create policy "planos_delete_admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'planos' and public.is_web_admin());
