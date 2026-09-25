# TODO

> Lista de tareas pendientes del proyecto. Sobrevive entre sesiones (este fichero se versiona en el repo).

## Pendientes

- [ ] **Renombrar app (opción 1)**: cambiar `expo.name` en `app.json` al nuevo nombre, sin tocar `android.package` (`conteo.koxka`), `extra.eas.projectId`, `updates.url` ni `GITHUB_REPO` de `updateService.js`. Requiere un `eas build` nuevo (el nombre se incrusta en el APK en build time; un OTA no lo cambia en el launcher). Preparar tag `v1.0.5` para el build.
  - Prioridad: baja.

- [x] **Import masivo de `maestroArticulo`** (HECHO): 211.578 artículos importados (0→211.578) desde `maestro_articulos.xlsx` con la hoja `articulos_escan` (item=col1, filtrar `Fantasma==2`, `tipo` solo MRP/SIC, `dsca='-'`). 67.438 filas descartadas por filtro. `maestro_articulos.xlsx` añadido a `.gitignore`.

- [ ] **Descripción de artículos (`dsca`)**: decidir qué hacer con la descripción más adelante. Hoy se importa con `'-'` como placeholder (luego quizás se borre/rellene).
  - Prioridad: baja.

- [ ] **Filtrar más los artículos** (NOTA para el usuario al crear el Excel): refinar los filtros del maestro de artículos antes del import (fantasma, método, posibles exclusores de ítems, etc.).
  - Prioridad: media.

## Visualización de datos vía web

- [x] **Crear un panel web administrativo separado**: iniciar una aplicación React + Vite, responsive y sin módulos nativos de la app móvil.
  - Reutilizar el cliente Supabase y los mappings existentes.
  - Prioridad: alta.

- [ ] **Configurar autenticación de administradores**:
  - Inicio de sesión mediante Supabase Auth.
  - Identificar administradores mediante un rol de backend.
  - Proteger consultas y cambios con RLS; nunca incluir `service_role` en el panel.
  - Prioridad: alta.

- [x] **Crear consultas de consulta y resumen**:
  - Obtener totales y porcentajes de ubicaciones en `Inicio`, `Proceso` y `Fin`.
  - Permitir buscar y filtrar por sección, área, ubicación y estado.
  - Reutilizar la lógica de `obtenerEstadoUbicaciones()` y `resumirEstados()`.
  - Prioridad: alta.

- [x] **Permitir consultar los artículos contados**:
  - Navegar desde el resumen hasta sección → área → ubicación.
  - Mostrar código, descripción, tipo y cantidad de cada artículo contado.
  - Reutilizar `obtenerArticulosUbicacion()` con paginación.
  - Prioridad: alta.

- [x] **Permitir cambiar el estado de una ubicación**:
  - Seleccionar `Inicio`, `Proceso` o `Fin`.
  - Pedir confirmación y actualizar la pantalla después del cambio.
  - Prioridad: alta.

- [x] **Propagar automáticamente los estados**:
  - Crear una RPC transaccional para actualizar la ubicación, área y sección.
  - Área `Fin` cuando todas sus ubicaciones estén `Fin`.
  - Área `Inicio` cuando todas estén `Inicio`; en cualquier mezcla, `Proceso`.
  - Aplicar la misma regla a las áreas para calcular la sección.
  - Si falla alguna actualización, no debe quedar ninguna modificación parcial.
  - La RPC y la serialización por sección están implementadas; falta aplicar y verificar contra Supabase.
  - Prioridad: alta.

- [ ] **Gestionar errores y permisos**:
  - Mostrar estados de carga, vacío y error.
  - Impedir modificaciones no autorizadas o sobre ubicaciones inexistentes.
  - Informar claramente cuando otro administrador ya haya realizado el cambio.
  - Prioridad: media.

- [ ] **Añadir pruebas**:
  - Resumen y filtros.
  - Navegación hasta los artículos contados.
  - Cambio de estado y propagación a área/sección.
  - RLS, autenticación, errores y reversión de la transacción.
  - Las pruebas unitarias web están creadas; las pruebas de integración Supabase siguen pendientes.
  - Prioridad: media.

- [ ] **Preparar despliegue web**:
  - Build de producción, variables públicas de Supabase y despliegue del panel.
  - Integrar el build y las pruebas en CI/CD.
  - Documentar uso, configuración y seguridad en `README.md`.
  - Prioridad: media.

## Conectividad: CSV local y sincronización diferida

- [ ] **P0. Hacer que el CSV sea la fuente local de movimientos**:
  - Escribir el CSV antes de intentar cualquier operación con Supabase.
  - Mantener el formato actual de tres columnas para no romper la exportación.
  - Actualizar el CSV al guardar, editar o eliminar un artículo.
  - Permitir escanear sin conexión y conservar los datos tras reiniciar la app.
  - Prioridad: alta.

- [ ] **P0. Mantener los dos maestros locales**:
  - Sincronizar `maestroUbicacion` y `maestroArticulo` cuando haya conexión.
  - Guardarlos en archivos JSON separados del CSV de movimientos.
  - Usarlos para validar códigos conocidos y obtener descripción/tipo.
  - Si no existe un código en la copia local, aceptarlo provisionalmente como pendiente de validación.
  - Prioridad: alta.

- [ ] **P0. Crear la cola de operaciones pendientes**:
  - Usar `pending-operations.json` para registrar guardados, ediciones, borrados y finalizaciones.
  - Incluir `operation_id`, tipo, ubicación, artículo, valor, fecha, intentos y último error.
  - Mantener el CSV actualizado incluso si Supabase no está disponible.
  - Prioridad: alta.

- [ ] **P0. Sincronizar únicamente lo pendiente**:
  - Enviar a Supabase solo las operaciones de `pending-operations.json`.
  - Intentar al iniciar, recuperar conexión, volver al primer plano o pulsar «Sincronizar».
  - Eliminar una operación de la cola solo después de recibir confirmación del servidor.
  - Reutilizar el mismo `operation_id` en reintentos para evitar duplicados.
  - Respetar el orden de las operaciones de cada ubicación.
  - Prioridad: alta.

- [ ] **P0. Validar códigos provisionales**:
  - Cuando un código no esté en los maestros locales, permitir escanearlo y marcarlo `PENDIENTE_VALIDAR`.
  - Validarlo contra Supabase al recuperar conexión.
  - Si no existe, conservar la operación y mostrar el error; nunca eliminarla silenciosamente.
  - Prioridad: alta.

- [ ] **P0. Hacer segura la sincronización con Supabase**:
  - Usar una RPC transaccional para aplicar cada operación pendiente.
  - Actualizar conteo y estados sin dejar cambios parciales.
  - Si varios dispositivos escanean ubicaciones distintas, no añadir resolución manual de conflictos.
  - Prioridad: alta.

- [ ] **P1. Mostrar el estado de sincronización**:
  - Mostrar `Sincronizado`, `Pendiente` o `Error` por ubicación/operación.
  - Mostrar fecha de última sincronización y botón de reintento.
  - Un fallo de red no debe mostrar la operación como guardada en Supabase.
  - Prioridad: media.

- [ ] **P1. Adaptar exportación y borrado**:
  - Mantener el CSV como exportación local.
  - Borrar un CSV no debe borrar operaciones pendientes.
  - La cola pendiente debe conservarse aunque el usuario elimine o comparta el CSV.
  - Prioridad: media.

- [ ] **P0. Añadir pruebas de conectividad**:
  - Escanear y guardar sin conexión.
  - Reiniciar la app y comprobar que el CSV y la cola persisten.
  - Recuperar conexión y verificar sincronización sin duplicados.
  - Probar códigos provisionales válidos e inválidos.
  - Probar fallos durante sincronización y reintentos.
  - Prioridad: alta.

## Optimización de peticiones (NO por ahora)

> Reducir round-trips a Supabase para agilizar operaciones y evitar rate-limit.

- [ ] **Agrupar operaciones en RPC de Postgres**: `guardarMovimiento` hoy hace 4 peticiones (upsert en `conteo` + update `maestroUbicacion`/`maestroArea`/`maestroSeccion`) y `finalizarUbicacion` hasta 5. Se podrían implementar funciones SQL (`guardar_movimiento`, `finalizar_ubicacion`) y llamarlas con `.rpc()` en una única transacción.
  - Prioridad: media.

- [ ] **Optimizar/quitar selects redundantes**: revisar selects anidados y paginación de `obtenerUltimosMovimientos`; valorar caché local + cola offline (AsyncStorage con batcheo) para no disparar 1 request por escaneo.
  - Impacto principal en `SupabaseProvider.js` y sus tests.
  - Prioridad: media.

## Optimización de BD (NO hacer por ahora)

> Sustituir `conteo.ubicacion` (varchar `seccion-area-subzona`) por FKs reales para reducir tamaño y mejorar integridad. Cambiaría bastante backend + app + migración de datos.

- [ ] **Esquema SQL**:
  - **Opción A (recomendada, menos invasiva)**: FK real en `conteo` hacia `maestroUbicacion` con la PK compuesta ya existente `(seccion, area, subzona)`, con `ON UPDATE/DELETE` adecuados. Añadir índice en `conteo(item)`.
  - **Opción B**: PK numéricas (`identity`) en `maestroSeccion` / `maestroArea` / `maestroUbicacion` + FK en `conteo`. Ahorra más espacio pero implica reescribir más queries e índices.
  - En ambas: backfill en transacción (INSERT..SELECT mapeado), añadir constraints, revisar RLS (políticas por FK) y valorar columna `updated_at` en `conteo` para orden real. Migración con downtime breve; coordinar OTA + build para instalaciones existentes.
  - Prioridad: baja.

- [ ] **SupabaseProvider.js**: reescribir todas las queries (`guardarMovimiento`, `actualizarMovimiento`, `eliminarMovimiento`, `obtenerArticulosUbicacion`, `obtenerUltimosMovimientos`, `finalizarUbicacion`, `obtenerUbicacionesArea`, `obtenerEstadoUbicaciones`) para usar las FK/ids y mapear `id ↔ string seccion-area-subzona` (`buildUbicacionId`/`parseUbicacionId`), manteniendo intacto el contrato de salida para no propagar cambios.
  - Prioridad: baja.

- [ ] **Capa offline/servicios**: comprobar que `csvProvider.js`, `InventoryService.js` (respaldo CSV local), `csvHelper.js` y `ListaScreen.js` sigan usando el string `seccion-area-subzona` como clave de archivo. El mapeo `id↔string` debe quedar encapsulado en el provider de datos para que el respaldo CSV y el borrado/sync no dependan del nuevo id. Revisar `UbicacionValidator.js` (formato) y `HomeLogic.js` (estado de sesión).
  - Prioridad: baja.

- [ ] **Scripts y tests**: adaptar `scripts/importExcel.js` para insertar/mapear ids (o mantener la composición string si la FK usa la PK compuesta), actualizar los `__tests__` que mockean el provider (fixtures, queries anidadas de `obtenerEstadoUbicaciones`) y documentar en README el nuevo esquema + nota de migración para instalaciones existentes.
  - Prioridad: baja.