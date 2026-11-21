/* =======================================================
 * PLANOS: LECTURA DESDE LA APP MÓVIL
 * =======================================================
 *
 * El bucket `planos` (20261118000200_planos_storage.sql) es
 * privado y solo lo leían los administradores del panel. La app
 * móvil entra con la clave pública (`anon`, sin usuario), así
 * que no veía nada.
 *
 * Esta política da a `anon` SOLO LECTURA del bucket: listar las
 * carpetas y pedir URLs firmadas para ver los ficheros. Subir,
 * sustituir y borrar siguen siendo solo de los administradores.
 *
 * Contrapartida (aceptada, app de uso interno): quien tenga la
 * clave pública, que va dentro del APK, puede ver los planos,
 * igual que ya puede leer el resto de datos del inventario.
 * ======================================================= */

drop policy if exists "planos_select_anon" on storage.objects;
create policy "planos_select_anon"
  on storage.objects for select
  to anon
  using (bucket_id = 'planos');
